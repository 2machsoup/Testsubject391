import "./KpiTile.css";

interface KpiTileProps {
  label: string;
  value: string;
  sub?: string;
}

export function KpiTile({ label, value, sub }: KpiTileProps) {
  return (
    <div className="kpi-tile">
      <p className="kpi-tile__label">{label}</p>
      <p className="kpi-tile__value">{value}</p>
      {sub && <p className="kpi-tile__sub">{sub}</p>}
    </div>
  );
}
