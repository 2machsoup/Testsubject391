import axios from "axios";
import { ConnectionStatus, DateRange, SaleRecord, SalesAdapter } from "./types";
import * as squareAuth from "../auth/squareAuth";

const SQUARE_VERSION = "2024-10-17";

interface SquareMoney {
  amount: number;
  currency: string;
}

interface SquareProcessingFee {
  amount_money: SquareMoney;
}

interface SquarePayment {
  id: string;
  created_at: string;
  order_id?: string;
  receipt_number?: string;
  amount_money: SquareMoney;
  total_money: SquareMoney;
  processing_fee?: SquareProcessingFee[];
}

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Square-Version": SQUARE_VERSION,
    "Content-Type": "application/json",
  };
}

export const squareAdapter: SalesAdapter = {
  platform: "square",
  label: "Square",

  async isConnected() {
    const token = await squareAuth.getValidAccessToken();
    return token !== null;
  },

  async getConnectionStatus(): Promise<ConnectionStatus> {
    const connected = await this.isConnected();
    return {
      platform: "square",
      connected,
      label: "Square",
      detail: connected ? "Connected" : "Not connected",
    };
  },

  async fetchSales(range: DateRange): Promise<SaleRecord[]> {
    const token = await squareAuth.getValidAccessToken();
    if (!token) return [];

    const results: SaleRecord[] = [];
    let cursor: string | undefined;

    do {
      const { data } = await axios.get(`${squareAuth.SQUARE_API_BASE}/v2/payments`, {
        headers: authHeaders(token.accessToken),
        params: {
          begin_time: range.start.toISOString(),
          end_time: range.end.toISOString(),
          sort_order: "ASC",
          cursor,
        },
      });

      const payments = (data.payments ?? []) as SquarePayment[];
      for (const payment of payments) {
        const fees = (payment.processing_fee ?? []).reduce(
          (sum, fee) => sum + fee.amount_money.amount,
          0
        );
        const gross = payment.total_money.amount;

        results.push({
          id: `square-${payment.id}`,
          platform: "square",
          occurredAt: payment.created_at,
          orderNumber: payment.receipt_number ?? payment.order_id ?? payment.id,
          currency: payment.total_money.currency,
          grossAmount: gross,
          fees,
          netAmount: gross - fees,
          itemCount: 1,
          channel: "Square",
          raw: payment,
        });
      }

      cursor = data.cursor;
    } while (cursor);

    return results;
  },

  async disconnect() {
    squareAuth.disconnect();
  },
};
