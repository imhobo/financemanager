import { query } from './db.js';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    google_sub  TEXT UNIQUE NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    avatar_url  TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    type        TEXT NOT NULL,
    name        TEXT NOT NULL,
    data        TEXT NOT NULL,
    value       REAL NOT NULL,
    currency    TEXT DEFAULT 'INR',
    source      TEXT DEFAULT 'manual',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS liabilities (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    type        TEXT NOT NULL,
    name        TEXT NOT NULL,
    data        TEXT NOT NULL,
    value       REAL NOT NULL,
    currency    TEXT DEFAULT 'INR',
    source      TEXT DEFAULT 'manual',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS net_worth_snapshots (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id),
    total_assets    REAL NOT NULL,
    total_liabilities REAL NOT NULL,
    net_worth       REAL NOT NULL,
    snapped_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

export async function initSchema() {
  await query(SCHEMA_SQL);
  console.log('Database schema initialized');
}
