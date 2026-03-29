import { Pool } from 'pg';
import { env } from '../config/env';
import { schema } from './schema';
import { runMigrations } from './migrations';

const pool = new Pool({
  host: env.postgres.host,
  port: env.postgres.port,
  user: env.postgres.user,
  password: env.postgres.password,
  database: env.postgres.database,
});

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
