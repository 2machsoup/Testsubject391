import axios from "axios";
import { ConnectionStatus, DateRange, SaleLineItem, SaleRecord, SalesAdapter } from "./types";
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

interface SquareOrderLineItem {
  name?: string;
  quantity: string;
  catalog_object_id?: string;
  variation_name?: string;
  base_price_money?: SquareMoney;
}

interface SquareOrder {
  id: string;
  line_items?: SquareOrderLineItem[];
}

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Square-Version": SQUARE_VERSION,
    "Content-Type": "application/json",
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fetchOrdersByIds(accessToken: string, orderIds: string[]): Promise<Map<string, SquareOrder>> {
  const orders = new Map<string, SquareOrder>();
  for (const batch of chunk(orderIds, 100)) {
    const { data } = await axios.post(
      `${squareAuth.SQUARE_API_BASE}/v2/orders/batch-retrieve`,
      { order_ids: batch },
      { headers: authHeaders(accessToken) }
    );
    for (const order of (data.orders ?? []) as SquareOrder[]) {
      orders.set(order.id, order);
    }
  }
  return orders;
}

/** Resolves catalog_object_id -> SKU for item variations. Best-effort: entries
 * that fail to resolve (deleted items, custom line items) are simply absent. */
async function fetchCatalogSkuMap(
  accessToken: string,
  catalogObjectIds: string[]
): Promise<Map<string, string>> {
  const skuByObjectId = new Map<string, string>();
  for (const batch of chunk(catalogObjectIds, 100)) {
    const { data } = await axios.post(
      `${squareAuth.SQUARE_API_BASE}/v2/catalog/batch-retrieve`,
      { object_ids: batch },
      { headers: authHeaders(accessToken) }
    );
    for (const obj of (data.objects ?? []) as {
      id: string;
      item_variation_data?: { sku?: string };
    }[]) {
      if (obj.item_variation_data?.sku) {
        skuByObjectId.set(obj.id, obj.item_variation_data.sku);
      }
    }
  }
  return skuByObjectId;
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

    const payments: SquarePayment[] = [];
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
      payments.push(...((data.payments ?? []) as SquarePayment[]));
      cursor = data.cursor;
    } while (cursor);

    const orderIds = [...new Set(payments.map((p) => p.order_id).filter((id): id is string => Boolean(id)))];
    const ordersById = orderIds.length
      ? await fetchOrdersByIds(token.accessToken, orderIds)
      : new Map<string, SquareOrder>();

    const catalogObjectIds = [...ordersById.values()]
      .flatMap((order) => order.line_items ?? [])
      .map((li) => li.catalog_object_id)
      .filter((id): id is string => Boolean(id));
    const skuByObjectId = catalogObjectIds.length
      ? await fetchCatalogSkuMap(token.accessToken, [...new Set(catalogObjectIds)])
      : new Map<string, string>();

    const results: SaleRecord[] = payments.map((payment) => {
      const fees = (payment.processing_fee ?? []).reduce((sum, fee) => sum + fee.amount_money.amount, 0);
      const gross = payment.total_money.amount;

      const order = payment.order_id ? ordersById.get(payment.order_id) : undefined;
      const lineItems: SaleLineItem[] | undefined = order?.line_items?.map((li) => {
        const quantity = parseInt(li.quantity, 10) || 1;
        const unitPriceAmount = li.base_price_money?.amount ?? 0;
        return {
          sku: li.catalog_object_id ? skuByObjectId.get(li.catalog_object_id) : undefined,
          title: [li.name, li.variation_name].filter(Boolean).join(" — ") || "Unnamed item",
          quantity,
          unitPriceAmount,
          lineTotalAmount: unitPriceAmount * quantity,
        };
      });

      return {
        id: `square-${payment.id}`,
        platform: "square",
        occurredAt: payment.created_at,
        orderNumber: payment.receipt_number ?? payment.order_id ?? payment.id,
        currency: payment.total_money.currency,
        grossAmount: gross,
        fees,
        netAmount: gross - fees,
        itemCount: lineItems?.reduce((sum, li) => sum + li.quantity, 0) ?? 1,
        channel: "Square",
        lineItems,
        raw: payment,
      };
    });

    return results;
  },

  async disconnect() {
    squareAuth.disconnect();
  },
};
