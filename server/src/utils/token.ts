import crypto from 'crypto';

export function generateApiToken(): string {
  return 'sv_' + crypto.randomBytes(32).toString('hex');
}
