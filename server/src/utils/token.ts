import crypto from 'crypto';

/** Opaque API token prefix + random secret (shown once on creation). */
export function generateApiToken(): string {
  return 'sv_' + crypto.randomBytes(32).toString('hex');
}

/** SHA-256 hex digest for at-rest storage and lookup (not reversible).
 *  API tokens are 256-bit random strings — SHA-256 is appropriate here,
 *  unlike passwords. Not a password hash. */ // lgtm[js/insufficient-password-hash]
export function hashApiToken(plaintext: string): string { // lgtm[js/insufficient-password-hash]
  return crypto.createHash('sha256').update(plaintext, 'utf8').digest('hex');
}
