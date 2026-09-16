export type PlatformId = "etsy" | "square" | "shopify" | "localPos";

export interface SaleLineItem {
  sku?: string;
  title: string;
  quantity: number;
  unitPriceAmount: number;
  lineTotalAmount: number;
}

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
  lineItems?: SaleLineItem[];
}

export interface SkuMetric {
  key: string;
  sku?: string;
  title: string;
  platforms: PlatformId[];
  unitsSold: number;
  revenue: number;
  avgUnitPrice: number;
  velocityPerDay: number;
  revenueShare: number;
  orderCount: number;
  firstSoldAt: string;
  lastSoldAt: string;
}

export interface SkuMetricsResponse {
  range: { start: string; end: string };
  rangeDays: number;
  totalRevenue: number;
  skus: SkuMetric[];
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
