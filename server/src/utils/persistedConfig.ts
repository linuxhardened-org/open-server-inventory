import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

export interface PersistedConfig {
  database_url?: string;
}

export function loadPersistedConfig(): PersistedConfig {
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as PersistedConfig;
  } catch {
    return {};
  }
}

export function savePersistedConfig(data: PersistedConfig): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
}
