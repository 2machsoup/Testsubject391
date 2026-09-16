import axios from "axios";
import crypto from "node:crypto";
import { config } from "../config";
import { createState, consumeState } from "../services/oauthState";
import { saveTokens, deleteTokens, loadTokens } from "../services/tokenStore";

const SHOP_DOMAIN_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

export function assertValidShopDomain(shop: string): void {
  if (!SHOP_DOMAIN_RE.test(shop)) {
    throw new Error("Invalid Shopify shop domain. Expected format: your-store.myshopify.com");
  }
}

export function buildAuthorizeUrl(shop: string): string {
  assertValidShopDomain(shop);
  const state = createState("shopify");

  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", config.shopify.apiKey);
  url.searchParams.set("scope", config.shopify.scopes);
  url.searchParams.set("redirect_uri", config.shopify.redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

/** Verifies the HMAC signature Shopify attaches to every OAuth/webhook request. */
export function verifyHmac(query: Record<string, string>): boolean {
  const { hmac, ...rest } = query;
  if (!hmac) return false;

  const message = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join("&");

  const digest = crypto
    .createHmac("sha256", config.shopify.apiSecret)
    .update(message)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

export async function handleCallback(shop: string, code: string, state: string): Promise<void> {
  assertValidShopDomain(shop);
  const stateRecord = consumeState(state, "shopify");
  if (!stateRecord) {
    throw new Error("Invalid or expired OAuth state for Shopify.");
  }

  const { data } = await axios.post(`https://${shop}/admin/oauth/access_token`, {
    client_id: config.shopify.apiKey,
    client_secret: config.shopify.apiSecret,
    code,
  });

  const { access_token, scope } = data as { access_token: string; scope: string };

  saveTokens("shopify", {
    accessToken: access_token,
    metadata: { shop, scope },
  });
}

/** Shopify's offline access tokens don't expire or refresh; they're valid until revoked. */
export function getStoredCredentials(): { accessToken: string; shop: string } | null {
  const tokens = loadTokens("shopify");
  if (!tokens || !tokens.metadata?.shop) return null;
  return { accessToken: tokens.accessToken, shop: tokens.metadata.shop as string };
}

export function disconnect(): void {
  deleteTokens("shopify");
}
