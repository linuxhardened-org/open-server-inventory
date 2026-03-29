import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export function generateTotpSecret() {
  const secret = speakeasy.generateSecret({
    name: 'ServerVault',
  });
  return secret.base32;
}

export async function generateTotpUri(secret: string, userEmail: string): Promise<string> {
  const uri = speakeasy.otpauthURL({
    secret: secret,
    label: userEmail,
    issuer: 'ServerVault',
    encoding: 'base32',
  });
  return QRCode.toDataURL(uri);
}

export function verifyTotp(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 1, // Allow for small clock drift
  });
}
