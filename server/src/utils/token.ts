import crypto from 'crypto';

/** Opaque API token prefix + random secret (shown once on creation). */
export function generateApiToken(): string {
  return 'sv_' + crypto.randomBytes(32).toString('hex');
}

/** SHA-256 hex digest for at-rest storage and lookup (not reversible). */
export function hashApiToken(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext, 'utf8').digest('hex');
}
