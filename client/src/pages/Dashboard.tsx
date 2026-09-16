import { useEffect, useState } from "react";
import { fetchSales } from "../api/client";
import type { AggregatedSales } from "../types";
import { KpiTile } from "../components/KpiTile";
import { SalesOverTimeChart } from "../components/SalesOverTimeChart";
import { PlatformBreakdownChart } from "../components/PlatformBreakdownChart";
import { TransactionsTable } from "../components/TransactionsTable";
import { DateRangePicker } from "../components/DateRangePicker";
import type { DatePreset } from "../components/DateRangePicker";
import { formatMoney } from "../platformMeta";
import "./Dashboard.css";

export function Dashboard() {
  const [days, setDays] = useState<DatePreset>(30);
  const [data, setData] = useState<AggregatedSales | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    fetchSales(start, end)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load sales");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [days]);

  const platformErrors = data?.byPlatform.filter((p) => p.error) ?? [];

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1 style={{ fontSize: 20, margin: 0 }}>Sales overview</h1>
        <DateRangePicker activeDays={days} onChange={setDays} />
      </div>

      {error && <p className="dashboard__error">{error}</p>}

      {data && (
        <>
          <div className="dashboard__kpis">
            <KpiTile label="Gross sales" value={formatMoney(data.totals.grossAmount)} />
            <KpiTile label="Fees" value={formatMoney(data.totals.fees)} />
            <KpiTile label="Net sales" value={formatMoney(data.totals.netAmount)} />
            <KpiTile label="Orders" value={data.totals.salesCount.toLocaleString()} />
          </div>

          {platformErrors.length > 0 && (
            <div className="dashboard__platform-errors">
              {platformErrors.map((p) => (
                <p key={p.platform} className="dashboard__error">
                  {p.label}: {p.error}
                </p>
              ))}
            </div>
          )}

          <div className="dashboard__grid">
            <div className="dashboard__panel">
              <p className="dashboard__panel-title">Sales over time</p>
              <SalesOverTimeChart sales={data.sales} />
            </div>
            <div className="dashboard__panel">
              <p className="dashboard__panel-title">By platform</p>
              <PlatformBreakdownChart byPlatform={data.byPlatform} />
            </div>
          </div>

          <div className="dashboard__panel">
            <p className="dashboard__panel-title">Recent transactions</p>
            <TransactionsTable sales={data.sales} />
          </div>
        </>
      )}

      {loading && !data && <p style={{ color: "var(--text-muted)" }}>Loading sales…</p>}
    </div>
  );
}
