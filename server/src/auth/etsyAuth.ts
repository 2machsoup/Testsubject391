import axios from "axios";
import { config } from "../config";
import { createState, consumeState, generatePkcePair } from "../services/oauthState";
import { saveTokens, deleteTokens, loadTokens, isTokenExpired } from "../services/tokenStore";

const AUTHORIZE_URL = "https://www.etsy.com/oauth/connect";
const TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";
const SCOPES = "transactions_r shops_r";

export function buildAuthorizeUrl(): string {
  const { verifier, challenge } = generatePkcePair();
  const state = createState("etsy", verifier);

  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.etsy.keystring);
  url.searchParams.set("redirect_uri", config.etsy.redirectUri);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function handleCallback(code: string, state: string): Promise<void> {
  const stateRecord = consumeState(state, "etsy");
  if (!stateRecord || !stateRecord.verifier) {
    throw new Error("Invalid or expired OAuth state for Etsy.");
  }

  const response = await axios.post(TOKEN_URL, {
    grant_type: "authorization_code",
    client_id: config.etsy.keystring,
    redirect_uri: config.etsy.redirectUri,
    code,
    code_verifier: stateRecord.verifier,
  });

  const { access_token, refresh_token, expires_in } = response.data as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const userId = access_token.split(".")[0];

  saveTokens("etsy", {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: Date.now() + expires_in * 1000,
    metadata: { userId },
  });
}

async function refreshAccessToken(refreshToken: string): Promise<void> {
  const response = await axios.post(TOKEN_URL, {
    grant_type: "refresh_token",
    client_id: config.etsy.keystring,
    refresh_token: refreshToken,
  });

  const { access_token, refresh_token, expires_in } = response.data as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const existing = loadTokens("etsy");
  saveTokens("etsy", {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: Date.now() + expires_in * 1000,
    metadata: existing?.metadata,
  });
}

export async function getValidAccessToken(): Promise<{ accessToken: string; userId?: string } | null> {
  const tokens = loadTokens("etsy");
  if (!tokens) return null;

  if (isTokenExpired(tokens)) {
    if (!tokens.refreshToken) return null;
    await refreshAccessToken(tokens.refreshToken);
    const refreshed = loadTokens("etsy");
    if (!refreshed) return null;
    return { accessToken: refreshed.accessToken, userId: refreshed.metadata?.userId as string | undefined };
  }

  return { accessToken: tokens.accessToken, userId: tokens.metadata?.userId as string | undefined };
}

export function disconnect(): void {
  deleteTokens("etsy");
}
