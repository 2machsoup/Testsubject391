import axios from "axios";
import { config } from "../config";
import { ConnectionStatus, DateRange, SaleLineItem, SaleRecord, SalesAdapter } from "./types";
import * as etsyAuth from "../auth/etsyAuth";

const API_BASE = "https://api.etsy.com/v3/application";

interface EtsyMoney {
  amount: number;
  divisor: number;
  currency_code: string;
}

interface EtsyTransaction {
  title: string;
  quantity: number;
  sku: string | null;
  price: EtsyMoney;
}

interface EtsyReceipt {
  receipt_id: number;
  created_timestamp: number;
  grandtotal: EtsyMoney;
  subtotal: EtsyMoney;
  name: string;
  was_paid: boolean;
  transactions?: EtsyTransaction[];
}

interface EtsyShop {
  shop_id: number;
  shop_name: string;
}

function moneyToMinorUnits(money: EtsyMoney): number {
  return Math.round((money.amount / money.divisor) * 100);
}

// Etsy's x-api-key must be "<keystring>:<shared_secret>", not the keystring
// alone: https://developer.etsy.com/documentation/essentials/authentication/
function apiKeyHeader(): string {
  return `${config.etsy.keystring}:${config.etsy.sharedSecret}`;
}

async function getShopId(accessToken: string, userId: string): Promise<number> {
  const { data } = await axios.get(`${API_BASE}/users/${userId}/shops`, {
    headers: {
      "x-api-key": apiKeyHeader(),
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const shop = data as EtsyShop;
  return shop.shop_id;
}

export const etsyAdapter: SalesAdapter = {
  platform: "etsy",
  label: "Etsy",

  async isConnected() {
    const token = await etsyAuth.getValidAccessToken();
    return token !== null;
  },

  async getConnectionStatus(): Promise<ConnectionStatus> {
    const connected = await this.isConnected();
    return {
      platform: "etsy",
      connected,
      label: "Etsy",
      detail: connected ? "Connected" : "Not connected",
    };
  },

  async fetchSales(range: DateRange): Promise<SaleRecord[]> {
    const token = await etsyAuth.getValidAccessToken();
    if (!token || !token.userId) return [];

    const shopId = await getShopId(token.accessToken, token.userId);

    const minCreated = Math.floor(range.start.getTime() / 1000);
    const maxCreated = Math.floor(range.end.getTime() / 1000);

    const results: SaleRecord[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const { data } = await axios.get(`${API_BASE}/shops/${shopId}/receipts`, {
        headers: {
          "x-api-key": apiKeyHeader(),
          Authorization: `Bearer ${token.accessToken}`,
        },
        params: {
          min_created: minCreated,
          max_created: maxCreated,
          limit,
          offset,
          was_paid: true,
          includes: "Transactions",
        },
      });

      const receipts = data.results as EtsyReceipt[];
      for (const receipt of receipts) {
        const gross = moneyToMinorUnits(receipt.grandtotal);
        const lineItems: SaleLineItem[] | undefined = receipt.transactions?.map((txn) => {
          const unitPriceAmount = moneyToMinorUnits(txn.price);
          return {
            sku: txn.sku || undefined,
            title: txn.title,
            quantity: txn.quantity,
            unitPriceAmount,
            lineTotalAmount: unitPriceAmount * txn.quantity,
          };
        });

        results.push({
          id: `etsy-${receipt.receipt_id}`,
          platform: "etsy",
          occurredAt: new Date(receipt.created_timestamp * 1000).toISOString(),
          orderNumber: String(receipt.receipt_id),
          currency: receipt.grandtotal.currency_code,
          grossAmount: gross,
          // Etsy doesn't expose per-receipt fees via this endpoint; the shop's
          // ledger/finances API would be needed for an exact figure.
          fees: 0,
          netAmount: gross,
          itemCount: lineItems?.reduce((sum, li) => sum + li.quantity, 0) ?? 1,
          customerName: receipt.name,
          channel: "Etsy",
          lineItems,
          raw: receipt,
        });
      }

      if (receipts.length < limit) break;
      offset += limit;
    }

    return results;
  },

  async disconnect() {
    etsyAuth.disconnect();
  },
};
