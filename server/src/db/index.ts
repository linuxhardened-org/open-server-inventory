import { Pool, PoolConfig } from 'pg';
import { env } from '../config/env';
import { schema } from './schema';
import { runMigrations } from './migrations';

export function buildPoolConfig(databaseUrl?: string | null): PoolConfig {
  const url = databaseUrl ?? env.databaseUrl;
  if (url) {
    return { connectionString: url, ssl: { rejectUnauthorized: false } };
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
    ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
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

export const initDB = async () => {
  try {
    console.log(env.databaseUrl ? 'Using DATABASE_URL (SSL)' : 'Using local PostgreSQL');
    await pool.query(schema);
    await runMigrations(pool);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

export default {
  query: (text: string, params?: any[]) => pool.query(text, params),
  pool,
};
