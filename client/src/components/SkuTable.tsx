import { useMemo, useState } from "react";
import type { SkuMetric } from "../types";
import { PLATFORM_META, formatMoney } from "../platformMeta";
import "./SkuTable.css";

interface SkuTableProps {
  skus: SkuMetric[];
}

type SortKey = "revenue" | "unitsSold" | "velocityPerDay" | "avgUnitPrice" | "orderCount" | "revenueShare";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "unitsSold", label: "Units sold" },
  { key: "velocityPerDay", label: "Velocity" },
  { key: "avgUnitPrice", label: "Avg price" },
  { key: "orderCount", label: "Orders" },
  { key: "revenueShare", label: "% of revenue" },
];

export function SkuTable({ skus }: SkuTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = useMemo(() => {
    const copy = [...skus];
    copy.sort((a, b) => (sortDesc ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]));
    return copy;
  }, [skus, sortKey, sortDesc]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  if (skus.length === 0) {
    return (
      <p className="sku-table__empty">
        No SKU-level data yet. Connected platforms need line-item detail (Etsy/Shopify/Square provide this
        automatically once connected; Local POS needs a SKU column mapped on CSV import).
      </p>
    );
  }

  return (
    <table className="sku-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Platforms</th>
          {COLUMNS.map((col) => (
            <th key={col.key} className="numeric" onClick={() => handleSort(col.key)}>
              {col.label}
              {sortKey === col.key && <span className="sku-table__sort-arrow">{sortDesc ? "↓" : "↑"}</span>}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((sku) => (
          <tr key={sku.key}>
            <td>
              <div className="sku-table__title">{sku.title}</div>
              {sku.sku && <div className="sku-table__sku">{sku.sku}</div>}
            </td>
            <td>
              <div className="sku-table__platforms">
                {sku.platforms.map((p) => (
                  <span
                    key={p}
                    className="sku-table__dot"
                    style={{ ["--dot-color" as string]: PLATFORM_META[p].color }}
                    title={PLATFORM_META[p].label}
                  />
                ))}
              </div>
            </td>
            <td className="numeric">{formatMoney(sku.revenue)}</td>
            <td className="numeric">{sku.unitsSold.toLocaleString()}</td>
            <td className="numeric">{sku.velocityPerDay.toFixed(2)}/day</td>
            <td className="numeric">{formatMoney(sku.avgUnitPrice)}</td>
            <td className="numeric">{sku.orderCount.toLocaleString()}</td>
            <td className="numeric">{(sku.revenueShare * 100).toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
