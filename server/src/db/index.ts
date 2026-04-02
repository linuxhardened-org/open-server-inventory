import { Pool, PoolConfig } from 'pg';
import { env } from '../config/env';
import { schema } from './schema';
import { runMigrations } from './migrations';
import { hashPassword } from '../utils/crypto';

export function buildPoolConfig(databaseUrl?: string | null): PoolConfig {
  const url = databaseUrl ?? env.databaseUrl;
  if (url) {
    const isProd = process.env.NODE_ENV === 'production';
    return { connectionString: url, ssl: isProd ? { rejectUnauthorized: true } : { rejectUnauthorized: false } };
  }
  const isLocal =
    env.postgres.host === 'localhost' ||
    env.postgres.host === '127.0.0.1' ||
    env.postgres.host === 'db';
  return {
    host: env.postgres.host,
    port: env.postgres.port,
    user: env.postgres.user,
    password: env.postgres.password,
    database: env.postgres.database,
    ...(isLocal ? {} : { ssl: { rejectUnauthorized: process.env.NODE_ENV !== 'production' ? false : true } }),
  };
}

/** Create and verify a pool, then init schema + migrations on it. */
export async function initPoolWithConfig(config: PoolConfig): Promise<Pool> {
  const p = new Pool(config);
  await p.query(schema);
  await runMigrations(p);
  return p;
}

const pool = new Pool(buildPoolConfig());

export async function seedDefaultAdmin(p: Pool): Promise<void> {
  const { rows } = await p.query('SELECT COUNT(*)::int AS count FROM users');
  if ((rows[0] as { count: number }).count > 0) return;
  const hash = await hashPassword('Admin@123');
  await p.query(
    `INSERT INTO users (username, password_hash, role, password_change_required)
     VALUES ($1, $2, 'admin', TRUE)`,
    ['Admin', hash]
  );
  console.log('Default admin seeded — username: Admin (change password on first login)');
}

export const initDB = async () => {
  console.log(env.databaseUrl ? 'Using DATABASE_URL (SSL)' : 'Using local PostgreSQL');
  const maxRetries = 15;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pool.query(schema);
      await runMigrations(pool);
      console.log('Database initialized successfully');
      return;
    } catch (error: any) {
      const isNotReady = error?.code === '3D000' || error?.message?.includes('does not exist') || error?.code === 'ECONNREFUSED';
      if (isNotReady && attempt < maxRetries) {
        console.log(`Database not ready (attempt ${attempt}/${maxRetries}), retrying in 2s...`);
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        console.error('Failed to initialize database:', error);
        process.exit(1);
      }
    }
  }
};

export default {
  query: (text: string, params?: any[]) => pool.query(text, params),
  pool,
};
