import { Pool } from 'pg';
import { env } from '../config/env';
import { schema } from './schema';
import { runMigrations } from './migrations';

function buildPoolConfig() {
  if (env.databaseUrl) {
    console.log('Using DATABASE_URL for database connection (SSL enabled)');
    return {
      connectionString: env.databaseUrl,
      ssl: { rejectUnauthorized: false },
    };
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

const pool = new Pool(buildPoolConfig());

export const initDB = async () => {
  try {
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
