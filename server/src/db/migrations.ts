import { Pool } from 'pg';
import { hashApiToken } from '../utils/token';

/**
 * Migrates legacy `api_tokens.token` (plaintext) to `token_hash` (SHA-256 hex).
 * New installs create `token_hash` directly; this is a no-op when `token` is absent.
 */
export async function runMigrations(pool: Pool): Promise<void> {
  await migrateLegacyApiTokens(pool);
  await migratePasswordChangeRequired(pool);
  await migrateUserRealName(pool);
  await migrateServerRegion(pool);
  await migrateCloudProviderSyncHour(pool);
  await migrateApiTokenExpiry(pool);
  await migrateServerIpFields(pool);
}

async function migrateServerIpFields(pool: Pool): Promise<void> {
  await pool.query(`
    ALTER TABLE servers
    ADD COLUMN IF NOT EXISTS private_ip VARCHAR(50)
  `);
  await pool.query(`
    ALTER TABLE servers
    ADD COLUMN IF NOT EXISTS ipv6_address VARCHAR(100)
  `);

  // Create server_ips table for multiple IPs per server
  await pool.query(`
    CREATE TABLE IF NOT EXISTS server_ips (
      id SERIAL PRIMARY KEY,
      server_id INTEGER NOT NULL,
      ip_address VARCHAR(100) NOT NULL,
      ip_type VARCHAR(20) NOT NULL DEFAULT 'public',
      label VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_server_ips_server_id ON server_ips(server_id)
  `);
}

async function migrateApiTokenExpiry(pool: Pool): Promise<void> {
  await pool.query(`
    ALTER TABLE api_tokens
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ
  `);
}

async function migrateCloudProviderSyncHour(pool: Pool): Promise<void> {
  await pool.query(`
    ALTER TABLE cloud_providers
    ADD COLUMN IF NOT EXISTS sync_hour INTEGER DEFAULT 0
  `);
}

async function migrateServerRegion(pool: Pool): Promise<void> {
  await pool.query(`
    ALTER TABLE servers
    ADD COLUMN IF NOT EXISTS region VARCHAR(100)
  `);
}

async function migrateUserRealName(pool: Pool): Promise<void> {
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS real_name VARCHAR(255)
  `);
}

async function migratePasswordChangeRequired(pool: Pool): Promise<void> {
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN DEFAULT FALSE
  `);
}

async function migrateLegacyApiTokens(pool: Pool): Promise<void> {
  const { rows: colRows } = await pool.query<{ column_name: string }>(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'api_tokens'
  `);
  const columns = new Set(colRows.map((r) => r.column_name));

  if (!columns.has('token')) {
    if (!columns.has('token_hash')) {
      throw new Error('api_tokens must have a token_hash column');
    }
    return;
  }

  if (!columns.has('token_hash')) {
    await pool.query('ALTER TABLE api_tokens ADD COLUMN token_hash TEXT');
  }

  const { rows } = await pool.query<{ id: number; token: string }>(
    'SELECT id, token FROM api_tokens WHERE token IS NOT NULL'
  );
  for (const row of rows) {
    const h = hashApiToken(row.token);
    await pool.query('UPDATE api_tokens SET token_hash = $1 WHERE id = $2', [h, row.id]);
  }

  await pool.query('ALTER TABLE api_tokens DROP COLUMN token');
  await pool.query('ALTER TABLE api_tokens ALTER COLUMN token_hash SET NOT NULL');
  await pool.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS api_tokens_token_hash_key ON api_tokens (token_hash)'
  );
}
