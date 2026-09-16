import crypto from "node:crypto";
import { db } from "../db";
import { PlatformId } from "../config";

const STATE_TTL_MS = 10 * 60 * 1000;

export function createState(platform: PlatformId, verifier?: string): string {
  const state = crypto.randomBytes(24).toString("base64url");
  db.prepare(
    `INSERT INTO oauth_states (state, platform, verifier, created_at) VALUES (?, ?, ?, ?)`
  ).run(state, platform, verifier ?? null, Date.now());
  return state;
}

export function consumeState(state: string, platform: PlatformId): { verifier: string | null } | null {
  const row = db
    .prepare(`SELECT platform, verifier, created_at FROM oauth_states WHERE state = ?`)
    .get(state) as { platform: string; verifier: string | null; created_at: number } | undefined;

  db.prepare(`DELETE FROM oauth_states WHERE state = ?`).run(state);

  if (!row || row.platform !== platform) return null;
  if (Date.now() - row.created_at > STATE_TTL_MS) return null;

  return { verifier: row.verifier };
}

export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}
