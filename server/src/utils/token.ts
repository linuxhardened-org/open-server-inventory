import crypto from 'crypto';

/** Opaque API token prefix + random secret (shown once on creation). */
export function generateApiToken(): string {
  return 'sv_' + crypto.randomBytes(32).toString('hex');
}

/** SHA-256 hex digest for at-rest storage and lookup.
 *  API tokens are 256-bit cryptographically random strings — SHA-256 is
 *  appropriate here. This is NOT a password hash. */
// codeql[js/insufficient-password-hash] - high-entropy random token, not a password
export function hashApiToken(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext, 'utf8').digest('hex'); // codeql[js/insufficient-password-hash]
}
