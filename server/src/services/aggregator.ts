import { adapterList } from "../adapters";
import { DateRange, SaleRecord } from "../adapters/types";
import { PlatformId } from "../config";
import { describeError } from "../utils/errors";

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

export async function getAggregatedSales(range: DateRange): Promise<AggregatedSales> {
  const perPlatform = await Promise.all(
    adapterList.map(async (adapter) => {
      const status = await adapter.getConnectionStatus();
      if (!status.connected) {
        return { adapter, status, sales: [] as SaleRecord[], error: undefined as string | undefined };
      }
      try {
        const sales = await adapter.fetchSales(range);
        return { adapter, status, sales, error: undefined as string | undefined };
      } catch (err) {
        const message = describeError(err);
        console.error(`[${adapter.platform}] fetchSales failed: ${message}`);
        return {
          adapter,
          status,
          sales: [] as SaleRecord[],
          error: message,
        };
      }
    })
  );

  const allSales = perPlatform
    .flatMap((p) => p.sales)
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

  const byPlatform: PlatformSummary[] = perPlatform.map(({ adapter, status, sales, error }) => ({
    platform: adapter.platform,
    label: adapter.label,
    connected: status.connected,
    salesCount: sales.length,
    grossAmount: sales.reduce((sum, s) => sum + s.grossAmount, 0),
    fees: sales.reduce((sum, s) => sum + s.fees, 0),
    netAmount: sales.reduce((sum, s) => sum + s.netAmount, 0),
    error,
  }));

  const totals = allSales.reduce(
    (acc, sale) => {
      acc.grossAmount += sale.grossAmount;
      acc.fees += sale.fees;
      acc.netAmount += sale.netAmount;
      acc.salesCount += 1;
      return acc;
    },
    { grossAmount: 0, fees: 0, netAmount: 0, salesCount: 0 }
  );

  return {
    range: { start: range.start.toISOString(), end: range.end.toISOString() },
    totals,
    byPlatform,
    sales: allSales,
  };
}
