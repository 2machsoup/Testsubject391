import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PlatformSummary } from "../types";
import { PLATFORM_META, formatMoney } from "../platformMeta";

interface PlatformBreakdownChartProps {
  byPlatform: PlatformSummary[];
}

export function PlatformBreakdownChart({ byPlatform }: PlatformBreakdownChartProps) {
  const data = byPlatform
    .map((p) => ({
      platform: p.platform,
      label: PLATFORM_META[p.platform].label,
      grossAmount: p.grossAmount / 100,
    }))
    .sort((a, b) => b.grossAmount - a.grossAmount);

  const hasAny = data.some((d) => d.grossAmount > 0);
  if (!hasAny) {
    return <p style={{ color: "var(--text-muted)" }}>No sales to break down yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 24 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: "var(--text-secondary)", fontSize: 13 }}
          axisLine={false}
          tickLine={false}
          width={90}
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
        <Bar dataKey="grossAmount" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {data.map((entry) => (
            <Cell key={entry.platform} fill={PLATFORM_META[entry.platform].color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
