export type PlatformId = "etsy" | "square" | "shopify" | "localPos";

export interface SaleRecord {
  id: string;
  platform: PlatformId;
  occurredAt: string;
  orderNumber: string;
  currency: string;
  grossAmount: number;
  fees: number;
  netAmount: number;
  itemCount: number;
  customerName?: string;
  channel?: string;
}

export interface PlatformSummary {
  platform: PlatformId;
  label: string;
  connected: boolean;
  salesCount: number;
  grossAmount: number;
  fees: number;
  netAmount: number;
  error?: string;
}

export interface AggregatedSales {
  range: { start: string; end: string };
  totals: { grossAmount: number; fees: number; netAmount: number; salesCount: number };
  byPlatform: PlatformSummary[];
  sales: SaleRecord[];
}

export interface ConnectionStatus {
  platform: PlatformId;
  connected: boolean;
  label: string;
  detail?: string;
}
