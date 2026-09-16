import { getAggregatedSales } from "./aggregator";
import { DateRange } from "../adapters/types";
import { PlatformId } from "../config";

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

interface SkuAccumulator {
  key: string;
  sku?: string;
  title: string;
  platforms: Set<PlatformId>;
  unitsSold: number;
  revenue: number;
  saleIds: Set<string>;
  firstSoldAt: string;
  lastSoldAt: string;
}

export async function getSkuMetrics(range: DateRange): Promise<SkuMetricsResponse> {
  const { sales } = await getAggregatedSales(range);

  const rangeDays = Math.max((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24), 1);

  const groups = new Map<string, SkuAccumulator>();

  for (const sale of sales) {
    if (!sale.lineItems) continue;

    for (const item of sale.lineItems) {
      // Group by SKU when we have one; otherwise fall back to a per-platform
      // title key so unrelated items with the same name don't get merged.
      const key = item.sku ? `sku:${item.sku}` : `title:${sale.platform}:${item.title}`;

      let group = groups.get(key);
      if (!group) {
        group = {
          key,
          sku: item.sku,
          title: item.title,
          platforms: new Set(),
          unitsSold: 0,
          revenue: 0,
          saleIds: new Set(),
          firstSoldAt: sale.occurredAt,
          lastSoldAt: sale.occurredAt,
        };
        groups.set(key, group);
      }

      group.platforms.add(sale.platform);
      group.unitsSold += item.quantity;
      group.revenue += item.lineTotalAmount;
      group.saleIds.add(sale.id);
      if (sale.occurredAt < group.firstSoldAt) group.firstSoldAt = sale.occurredAt;
      if (sale.occurredAt > group.lastSoldAt) group.lastSoldAt = sale.occurredAt;
    }
  }

  const totalRevenue = [...groups.values()].reduce((sum, g) => sum + g.revenue, 0);

  const skus: SkuMetric[] = [...groups.values()]
    .map((g) => ({
      key: g.key,
      sku: g.sku,
      title: g.title,
      platforms: [...g.platforms],
      unitsSold: g.unitsSold,
      revenue: g.revenue,
      avgUnitPrice: g.unitsSold ? Math.round(g.revenue / g.unitsSold) : 0,
      velocityPerDay: g.unitsSold / rangeDays,
      revenueShare: totalRevenue ? g.revenue / totalRevenue : 0,
      orderCount: g.saleIds.size,
      firstSoldAt: g.firstSoldAt,
      lastSoldAt: g.lastSoldAt,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    range: { start: range.start.toISOString(), end: range.end.toISOString() },
    rangeDays,
    totalRevenue,
    skus,
  };
}
