import axios from "axios";
import { ConnectionStatus, DateRange, SaleRecord, SalesAdapter } from "./types";
import * as shopifyAuth from "../auth/shopifyAuth";

const API_VERSION = "2024-10";

interface ShopifyOrder {
  id: number;
  order_number: number;
  created_at: string;
  currency: string;
  current_total_price: string;
  current_total_discounts: string;
  line_items: unknown[];
  customer?: { first_name?: string; last_name?: string };
  financial_status: string;
}

function parseNextPageInfo(linkHeader: string | undefined): string | undefined {
  if (!linkHeader) return undefined;
  const match = linkHeader.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/);
  return match ? match[1] : undefined;
}

export const shopifyAdapter: SalesAdapter = {
  platform: "shopify",
  label: "Shopify",

  async isConnected() {
    return shopifyAuth.getStoredCredentials() !== null;
  },

  async getConnectionStatus(): Promise<ConnectionStatus> {
    const creds = shopifyAuth.getStoredCredentials();
    return {
      platform: "shopify",
      connected: creds !== null,
      label: "Shopify",
      detail: creds ? `Connected to ${creds.shop}` : "Not connected",
    };
  },

  async fetchSales(range: DateRange): Promise<SaleRecord[]> {
    const creds = shopifyAuth.getStoredCredentials();
    if (!creds) return [];

    const results: SaleRecord[] = [];
    let pageInfo: string | undefined;
    const baseUrl = `https://${creds.shop}/admin/api/${API_VERSION}/orders.json`;

    do {
      const params: Record<string, string | number> = pageInfo
        ? { limit: 250, page_info: pageInfo }
        : {
            limit: 250,
            status: "any",
            created_at_min: range.start.toISOString(),
            created_at_max: range.end.toISOString(),
          };

      const response = await axios.get(baseUrl, {
        headers: { "X-Shopify-Access-Token": creds.accessToken },
        params,
      });

      const orders = response.data.orders as ShopifyOrder[];
      for (const order of orders) {
        const gross = Math.round(parseFloat(order.current_total_price) * 100);
        results.push({
          id: `shopify-${order.id}`,
          platform: "shopify",
          occurredAt: order.created_at,
          orderNumber: String(order.order_number),
          currency: order.currency,
          grossAmount: gross,
          // Shopify Payments transaction fees require the separate Shopify
          // Payments/Payouts API and are omitted here.
          fees: 0,
          netAmount: gross,
          itemCount: order.line_items?.length ?? 0,
          customerName: order.customer
            ? [order.customer.first_name, order.customer.last_name].filter(Boolean).join(" ")
            : undefined,
          channel: "Shopify",
          raw: order,
        });
      }

      pageInfo = parseNextPageInfo(response.headers.link as string | undefined);
    } while (pageInfo);

    return results;
  },

  async disconnect() {
    shopifyAuth.disconnect();
  },
};
