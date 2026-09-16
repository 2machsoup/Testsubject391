import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SkuMetric } from "../types";
import { formatMoney } from "../platformMeta";

interface SkuRevenueChartProps {
  skus: SkuMetric[];
  limit?: number;
}

export function SkuRevenueChart({ skus, limit = 10 }: SkuRevenueChartProps) {
  const data = skus.slice(0, limit).map((s) => ({
    label: s.sku ? `${s.title} (${s.sku})` : s.title,
    revenue: s.revenue / 100,
  }));

  if (data.length === 0) {
    return <p style={{ color: "var(--text-muted)" }}>No SKU-level data in this date range yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 120)}>
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 24 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={180}
        />
        <Tooltip
          formatter={(value) => formatMoney(Number(value) * 100)}
          contentStyle={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text-primary)",
          }}
        />
        <Bar dataKey="revenue" fill="var(--series-square)" radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
