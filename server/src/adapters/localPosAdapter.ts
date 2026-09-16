import { db } from "../db";
import { ConnectionStatus, DateRange, SaleRecord, SalesAdapter } from "./types";

interface LocalSaleRow {
  id: string;
  occurred_at: string;
  order_number: string;
  currency: string;
  gross_amount: number;
  fees: number;
  net_amount: number;
  item_count: number;
  customer_name: string | null;
  channel: string | null;
}

function countImportedRows(): number {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM local_pos_sales`).get() as { count: number };
  return row.count;
}

/**
 * Adapter for the local business's own sales program. Most such systems
 * only export CSV reports, so this reads whatever has been imported via
 * POST /api/local-pos/import (see services/csvImport.ts). Swap this
 * implementation out for a real API or direct DB-read adapter later —
 * it only needs to keep satisfying the SalesAdapter interface.
 */
export const localPosAdapter: SalesAdapter = {
  platform: "localPos",
  label: "Local POS",

  async isConnected() {
    return countImportedRows() > 0;
  },

  async getConnectionStatus(): Promise<ConnectionStatus> {
    const count = countImportedRows();
    return {
      platform: "localPos",
      connected: count > 0,
      label: "Local POS",
      detail: count > 0 ? `${count} imported sales records` : "No CSV imported yet",
    };
  },

  async fetchSales(range: DateRange): Promise<SaleRecord[]> {
    const rows = db
      .prepare(
        `SELECT id, occurred_at, order_number, currency, gross_amount, fees, net_amount, item_count, customer_name, channel
         FROM local_pos_sales
         WHERE occurred_at >= ? AND occurred_at <= ?
         ORDER BY occurred_at ASC`
      )
      .all(range.start.toISOString(), range.end.toISOString()) as LocalSaleRow[];

    return rows.map((row) => ({
      id: row.id,
      platform: "localPos",
      occurredAt: row.occurred_at,
      orderNumber: row.order_number,
      currency: row.currency,
      grossAmount: row.gross_amount,
      fees: row.fees,
      netAmount: row.net_amount,
      itemCount: row.item_count,
      customerName: row.customer_name ?? undefined,
      channel: row.channel ?? "Local POS",
    }));
  },

  async disconnect() {
    db.prepare(`DELETE FROM local_pos_sales`).run();
  },
};
