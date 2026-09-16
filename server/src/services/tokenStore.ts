import crypto from "node:crypto";
import { db } from "../db";
import { config, PlatformId } from "../config";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  if (!config.tokenEncryptionKey) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not set. Generate one with: " +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\" " +
        "and put it in your .env file."
    );
  }
  const key = Buffer.from(config.tokenEncryptionKey, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded).");
  }
  return key;
}

function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
}

export function saveTokens(platform: PlatformId, tokens: StoredTokens): void {
  db.prepare(
    `INSERT INTO oauth_tokens (platform, access_token_enc, refresh_token_enc, expires_at, metadata, updated_at)
     VALUES (@platform, @accessTokenEnc, @refreshTokenEnc, @expiresAt, @metadata, @updatedAt)
     ON CONFLICT(platform) DO UPDATE SET
       access_token_enc = excluded.access_token_enc,
       refresh_token_enc = excluded.refresh_token_enc,
       expires_at = excluded.expires_at,
       metadata = excluded.metadata,
       updated_at = excluded.updated_at`
  ).run({
    platform,
    accessTokenEnc: encrypt(tokens.accessToken),
    refreshTokenEnc: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
    expiresAt: tokens.expiresAt ?? null,
    metadata: tokens.metadata ? JSON.stringify(tokens.metadata) : null,
    updatedAt: Date.now(),
  });
}

export function loadTokens(platform: PlatformId): StoredTokens | null {
  const row = db
    .prepare(
      `SELECT access_token_enc, refresh_token_enc, expires_at, metadata FROM oauth_tokens WHERE platform = ?`
    )
    .get(platform) as
    | { access_token_enc: string; refresh_token_enc: string | null; expires_at: number | null; metadata: string | null }
    | undefined;

  if (!row) return null;

  return {
    accessToken: decrypt(row.access_token_enc),
    refreshToken: row.refresh_token_enc ? decrypt(row.refresh_token_enc) : undefined,
    expiresAt: row.expires_at ?? undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

export function deleteTokens(platform: PlatformId): void {
  db.prepare(`DELETE FROM oauth_tokens WHERE platform = ?`).run(platform);
}

export function isTokenExpired(tokens: StoredTokens, skewMs = 60_000): boolean {
  if (!tokens.expiresAt) return false;
  return Date.now() + skewMs >= tokens.expiresAt;
}
