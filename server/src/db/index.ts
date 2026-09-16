import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dataDir = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(path.join(dataDir, "app.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS oauth_tokens (
    platform TEXT PRIMARY KEY,
    access_token_enc TEXT NOT NULL,
    refresh_token_enc TEXT,
    expires_at INTEGER,
    metadata TEXT,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS oauth_states (
    state TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    verifier TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS local_pos_sales (
    id TEXT PRIMARY KEY,
    occurred_at TEXT NOT NULL,
    order_number TEXT NOT NULL,
    currency TEXT NOT NULL,
    gross_amount INTEGER NOT NULL,
    fees INTEGER NOT NULL,
    net_amount INTEGER NOT NULL,
    item_count INTEGER NOT NULL,
    customer_name TEXT,
    channel TEXT,
    imported_at INTEGER NOT NULL
  );
`);

const localPosColumns = db.prepare(`PRAGMA table_info(local_pos_sales)`).all() as { name: string }[];
if (!localPosColumns.some((col) => col.name === "line_items_json")) {
  db.exec(`ALTER TABLE local_pos_sales ADD COLUMN line_items_json TEXT`);
}
