import type { SaleRecord } from "../types";
import { PLATFORM_META, formatMoney } from "../platformMeta";
import "./TransactionsTable.css";

interface TransactionsTableProps {
  sales: SaleRecord[];
  limit?: number;
}

export function TransactionsTable({ sales, limit = 50 }: TransactionsTableProps) {
  const rows = [...sales]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);

  if (rows.length === 0) {
    return <p className="transactions-table__empty">No transactions in this date range.</p>;
  }

  return (
    <table className="transactions-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Platform</th>
          <th>Order</th>
          <th>Customer</th>
          <th className="numeric">Items</th>
          <th className="numeric">Gross</th>
          <th className="numeric">Fees</th>
          <th className="numeric">Net</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((sale) => (
          <tr key={sale.id}>
            <td>{new Date(sale.occurredAt).toLocaleString()}</td>
            <td>
              <span
                className="transactions-table__badge"
                style={{ ["--dot-color" as string]: PLATFORM_META[sale.platform].color }}
              >
                <span className="transactions-table__dot" />
                {PLATFORM_META[sale.platform].label}
              </span>
            </td>
            <td>{sale.orderNumber}</td>
            <td>{sale.customerName ?? "—"}</td>
            <td className="numeric">{sale.itemCount}</td>
            <td className="numeric">{formatMoney(sale.grossAmount, sale.currency)}</td>
            <td className="numeric">{formatMoney(sale.fees, sale.currency)}</td>
            <td className="numeric">{formatMoney(sale.netAmount, sale.currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
