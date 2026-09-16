import { PlatformId } from "../config";

/** One SKU/item line within a sale. Omitted entirely when a source can't provide item-level detail. */
export interface SaleLineItem {
  /** The source platform's SKU string, when it has one set. */
  sku?: string;
  title: string;
  quantity: number;
  /** Price per unit, in the currency's minor unit. */
  unitPriceAmount: number;
  /** quantity * unitPriceAmount (before any line-level discount), in the currency's minor unit. */
  lineTotalAmount: number;
}

/** A single normalized sale, shape-compatible across every source platform. */
export interface SaleRecord {
  id: string;
  platform: PlatformId;
  /** ISO 8601 timestamp of when the sale occurred. */
  occurredAt: string;
  /** Order/receipt/transaction number as shown by the source platform. */
  orderNumber: string;
  currency: string;
  /** Gross amount charged to the customer, in the currency's minor unit (e.g. cents). */
  grossAmount: number;
  /** Platform/processing fees, in the currency's minor unit. Positive number. */
  fees: number;
  /** grossAmount - fees, in the currency's minor unit. */
  netAmount: number;
  itemCount: number;
  customerName?: string;
  channel?: string;
  /** Per-SKU breakdown, when the source platform exposes item-level detail. */
  lineItems?: SaleLineItem[];
  raw?: unknown;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ConnectionStatus {
  platform: PlatformId;
  connected: boolean;
  label: string;
  detail?: string;
}

/** Every sales source (Etsy, Square, Shopify, or the local POS) implements this. */
export interface SalesAdapter {
  platform: PlatformId;
  label: string;
  isConnected(): Promise<boolean>;
  getConnectionStatus(): Promise<ConnectionStatus>;
  fetchSales(range: DateRange): Promise<SaleRecord[]>;
  disconnect(): Promise<void>;
}
