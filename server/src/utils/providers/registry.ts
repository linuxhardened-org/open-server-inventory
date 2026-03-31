/**
 * Cloud provider registry — maps provider type string to sync function.
 * Add new providers here when support is implemented.
 */

export type SyncFn = (providerId: number, apiToken: string, providerName: string, storedHash: string | null) => Promise<SyncResult>;

export interface SyncResult {
  count: number;
  hash: string;
  skipped: boolean;
}

const registry: Record<string, SyncFn> = {};

export function registerProvider(type: string, fn: SyncFn): void {
  registry[type] = fn;
}

export function getSyncFn(type: string): SyncFn | null {
  return registry[type] ?? null;
}

export function getSupportedProviders(): string[] {
  return Object.keys(registry);
}
