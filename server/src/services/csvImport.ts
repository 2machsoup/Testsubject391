import { parse } from "csv-parse/sync";
import crypto from "node:crypto";
import { db } from "../db";

/**
 * Local POS systems vary widely (Square-alikes, QuickBooks POS, custom
 * in-house software, etc.) and most only offer a CSV/Excel export rather
 * than an API. This importer accepts a CSV plus a column mapping so the
 * dashboard can absorb whatever export format the business's program
 * produces, without hard-coding one vendor's schema.
 */
export interface ColumnMapping {
  date: string;
  orderNumber?: string;
  grossAmount: string;
  fees?: string;
  itemCount?: string;
  customerName?: string;
  currency?: string;
}

export const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  date: "Date",
  orderNumber: "Order",
  grossAmount: "Total",
  fees: "Fees",
  itemCount: "Items",
  customerName: "Customer",
  currency: "Currency",
};

function toMinorUnits(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  const amount = parseFloat(cleaned);
  if (Number.isNaN(amount)) return 0;
  return Math.round(amount * 100);
}

export interface ImportResult {
  imported: number;
  skipped: number;
}

export function importCsv(fileBuffer: Buffer, mapping: ColumnMapping): ImportResult {
  const rows = parse(fileBuffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  const insert = db.prepare(`
    INSERT OR REPLACE INTO local_pos_sales
      (id, occurred_at, order_number, currency, gross_amount, fees, net_amount, item_count, customer_name, channel, imported_at)
    VALUES (@id, @occurredAt, @orderNumber, @currency, @grossAmount, @fees, @netAmount, @itemCount, @customerName, @channel, @importedAt)
  `);

  let imported = 0;
  let skipped = 0;

  const insertMany = db.transaction((records: Record<string, string>[]) => {
    for (const row of records) {
      const rawDate = row[mapping.date];
      const rawGross = row[mapping.grossAmount];
      if (!rawDate || !rawGross) {
        skipped++;
        continue;
      }

      const occurredAt = new Date(rawDate);
      if (Number.isNaN(occurredAt.getTime())) {
        skipped++;
        continue;
      }

      const gross = toMinorUnits(rawGross);
      const fees = mapping.fees ? toMinorUnits(row[mapping.fees]) : 0;
      const orderNumber = mapping.orderNumber ? row[mapping.orderNumber] : undefined;

      insert.run({
        id: `local-${crypto.randomUUID()}`,
        occurredAt: occurredAt.toISOString(),
        orderNumber: orderNumber || `local-${imported + skipped}`,
        currency: (mapping.currency ? row[mapping.currency] : undefined) || "USD",
        grossAmount: gross,
        fees,
        netAmount: gross - fees,
        itemCount: mapping.itemCount ? parseInt(row[mapping.itemCount], 10) || 1 : 1,
        customerName: mapping.customerName ? row[mapping.customerName] || null : null,
        channel: "Local POS",
        importedAt: Date.now(),
      });
      imported++;
    }
  });

  insertMany(rows);

  return { imported, skipped };
}

export function clearImportedSales(): void {
  db.prepare(`DELETE FROM local_pos_sales`).run();
}
