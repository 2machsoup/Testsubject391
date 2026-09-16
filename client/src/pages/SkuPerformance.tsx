import { useEffect, useState } from "react";
import { fetchSkuMetrics } from "../api/client";
import type { SkuMetricsResponse } from "../types";
import { KpiTile } from "../components/KpiTile";
import { SkuRevenueChart } from "../components/SkuRevenueChart";
import { SkuTable } from "../components/SkuTable";
import { DateRangePicker } from "../components/DateRangePicker";
import type { DatePreset } from "../components/DateRangePicker";
import { formatMoney } from "../platformMeta";
import "./Dashboard.css";

export function SkuPerformance() {
  const [days, setDays] = useState<DatePreset>(30);
  const [data, setData] = useState<SkuMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    fetchSkuMetrics(start, end)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load SKU metrics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [days]);

  const topVelocity = data?.skus.reduce(
    (best, s) => (!best || s.velocityPerDay > best.velocityPerDay ? s : best),
    undefined as (typeof data.skus)[number] | undefined
  );

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1 style={{ fontSize: 20, margin: 0 }}>SKU performance</h1>
        <DateRangePicker activeDays={days} onChange={setDays} />
      </div>

      {error && <p className="dashboard__error">{error}</p>}

      {data && (
        <>
          <div className="dashboard__kpis">
            <KpiTile label="Tracked revenue" value={formatMoney(data.totalRevenue)} sub="Sales with SKU detail" />
            <KpiTile label="Distinct SKUs" value={data.skus.length.toLocaleString()} />
            <KpiTile
              label="Fastest mover"
              value={topVelocity ? `${topVelocity.velocityPerDay.toFixed(2)}/day` : "—"}
              sub={topVelocity?.title}
            />
            <KpiTile label="Window" value={`${Math.round(data.rangeDays)} days`} />
          </div>

          <div className="dashboard__panel">
            <p className="dashboard__panel-title">Top SKUs by revenue</p>
            <SkuRevenueChart skus={data.skus} />
          </div>

          <div className="dashboard__panel">
            <p className="dashboard__panel-title">All SKUs</p>
            <SkuTable skus={data.skus} />
          </div>
        </>
      )}

      {loading && !data && <p style={{ color: "var(--text-muted)" }}>Loading SKU metrics…</p>}
    </div>
  );
}
