import type { PlatformId } from "./types";

export const PLATFORM_META: Record<PlatformId, { label: string; color: string }> = {
  square: { label: "Square", color: "var(--series-square)" },
  etsy: { label: "Etsy", color: "var(--series-etsy)" },
  shopify: { label: "Shopify", color: "var(--series-shopify)" },
  localPos: { label: "Local POS", color: "var(--series-local)" },
};

export const PLATFORM_ORDER: PlatformId[] = ["square", "etsy", "shopify", "localPos"];

export function formatMoney(minorUnits: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minorUnits / 100);
}
