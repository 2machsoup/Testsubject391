import axios from "axios";
import { config } from "../config";
import { createState, consumeState } from "../services/oauthState";
import { saveTokens, deleteTokens, loadTokens, isTokenExpired } from "../services/tokenStore";

const isSandbox = config.square.environment === "sandbox";
export const SQUARE_API_BASE = isSandbox
  ? "https://connect.squareupsandbox.com"
  : "https://connect.squareup.com";

const SCOPES = "ORDERS_READ PAYMENTS_READ MERCHANT_PROFILE_READ";

export function buildAuthorizeUrl(): string {
  const state = createState("square");
  const url = new URL(`${SQUARE_API_BASE}/oauth2/authorize`);
  url.searchParams.set("client_id", config.square.applicationId);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("session", "false");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function handleCallback(code: string, state: string): Promise<void> {
  const stateRecord = consumeState(state, "square");
  if (!stateRecord) {
    throw new Error("Invalid or expired OAuth state for Square.");
  }

  const { data } = await axios.post(`${SQUARE_API_BASE}/oauth2/token`, {
    client_id: config.square.applicationId,
    client_secret: config.square.applicationSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.square.redirectUri,
  });

  const { access_token, refresh_token, expires_at, merchant_id } = data as {
    access_token: string;
    refresh_token: string;
    expires_at: string;
    merchant_id: string;
  };

  saveTokens("square", {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: new Date(expires_at).getTime(),
    metadata: { merchantId: merchant_id },
  });
}

async function refreshAccessToken(refreshToken: string): Promise<void> {
  const { data } = await axios.post(`${SQUARE_API_BASE}/oauth2/token`, {
    client_id: config.square.applicationId,
    client_secret: config.square.applicationSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const { access_token, refresh_token, expires_at } = data as {
    access_token: string;
    refresh_token: string;
    expires_at: string;
  };

  const existing = loadTokens("square");
  saveTokens("square", {
    accessToken: access_token,
    refreshToken: refresh_token ?? refreshToken,
    expiresAt: new Date(expires_at).getTime(),
    metadata: existing?.metadata,
  });
}

export async function getValidAccessToken(): Promise<{ accessToken: string; merchantId?: string } | null> {
  const tokens = loadTokens("square");
  if (!tokens) return null;

  if (isTokenExpired(tokens)) {
    if (!tokens.refreshToken) return null;
    await refreshAccessToken(tokens.refreshToken);
    const refreshed = loadTokens("square");
    if (!refreshed) return null;
    return { accessToken: refreshed.accessToken, merchantId: refreshed.metadata?.merchantId as string | undefined };
  }

  return { accessToken: tokens.accessToken, merchantId: tokens.metadata?.merchantId as string | undefined };
}

export function disconnect(): void {
  deleteTokens("square");
}
