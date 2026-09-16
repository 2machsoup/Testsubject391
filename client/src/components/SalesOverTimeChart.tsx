import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SaleRecord } from "../types";
import { PLATFORM_META, PLATFORM_ORDER, formatMoney } from "../platformMeta";

interface SalesOverTimeChartProps {
  sales: SaleRecord[];
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function buildDailySeries(sales: SaleRecord[]) {
  const byDay = new Map<string, Record<string, number>>();

  for (const sale of sales) {
    const key = dayKey(sale.occurredAt);
    if (!byDay.has(key)) {
      byDay.set(key, { square: 0, etsy: 0, shopify: 0, localPos: 0 });
    }
    const bucket = byDay.get(key)!;
    bucket[sale.platform] += sale.grossAmount / 100;
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amounts]) => ({ date, ...amounts }));
}

export function SalesOverTimeChart({ sales }: SalesOverTimeChartProps) {
  const data = buildDailySeries(sales);

  if (data.length === 0) {
    return <p style={{ color: "var(--text-muted)" }}>No sales in this date range yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} barCategoryGap={4} barGap={0}>
        <CartesianGrid vertical={false} stroke="var(--gridline)" />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--baseline)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => `$${value.toLocaleString()}`}
        />
        <Tooltip
          formatter={(value, name) => [
            formatMoney(Number(value) * 100),
            PLATFORM_META[name as keyof typeof PLATFORM_META]?.label ?? String(name),
          ]}
          contentStyle={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text-primary)",
          }}
        />
        <Legend
          formatter={(value: string) => PLATFORM_META[value as keyof typeof PLATFORM_META]?.label ?? value}
          wrapperStyle={{ color: "var(--text-secondary)", fontSize: 13 }}
        />
        {PLATFORM_ORDER.map((platform) => (
          <Bar
            key={platform}
            dataKey={platform}
            stackId="sales"
            fill={PLATFORM_META[platform].color}
            radius={[0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
