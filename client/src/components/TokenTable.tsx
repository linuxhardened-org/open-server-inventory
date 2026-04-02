import { Trash2, Key, Clock, Calendar, RefreshCw, AlertTriangle } from 'lucide-react';
import { ApiToken } from '../types';

interface TokenTableProps {
  tokens: ApiToken[];
  onRevoke: (id: number) => void;
  onRegenerate?: (id: number) => void;
}

function getExpiryStatus(expiresAt: string | null): { label: string; isExpired: boolean; isExpiringSoon: boolean } {
  if (!expiresAt) {
    return { label: 'Never expires', isExpired: false, isExpiringSoon: false };
  }
  const expiry = new Date(expiresAt);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return { label: 'Expired', isExpired: true, isExpiringSoon: false };
  }
  if (daysUntilExpiry <= 7) {
    return { label: `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`, isExpired: false, isExpiringSoon: true };
  }
  return { label: `Expires ${expiry.toLocaleDateString()}`, isExpired: false, isExpiringSoon: false };
}

/** Renders inside a parent `.sv-card` so global table polish in index.css applies. */
export default function TokenTable({ tokens, onRevoke, onRegenerate }: TokenTableProps) {
  return (
    <div className="overflow-x-auto -mx-5">
      <table
        className="w-full text-left"
        style={{ minWidth: 560, borderCollapse: 'separate', borderSpacing: 0 }}
      >
        <thead>
          <tr style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <th
              className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-fg-2"
              style={{ background: 'hsl(var(--surface-3))', borderBottom: '1px solid hsl(var(--border))' }}
            >
              Token Name
            </th>
            <th
              className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-fg-2"
              style={{ background: 'hsl(var(--surface-3))', borderBottom: '1px solid hsl(var(--border))' }}
            >
              Expiration
            </th>
            <th
              className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-fg-2"
              style={{ background: 'hsl(var(--surface-3))', borderBottom: '1px solid hsl(var(--border))' }}
            >
              Last Used
            </th>
            <th
              className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-fg-2"
              style={{ background: 'hsl(var(--surface-3))', borderBottom: '1px solid hsl(var(--border))' }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => {
            const expiry = getExpiryStatus(token.expires_at);
            return (
            <tr key={token.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Key className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="font-medium text-foreground">{token.name}</span>
                    <div className="text-xs text-secondary flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Created {new Date(token.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm">
                <div className="flex items-center gap-1" style={{
                  color: expiry.isExpired ? 'hsl(var(--danger))' : expiry.isExpiringSoon ? 'hsl(var(--warning))' : 'hsl(var(--fg-2))'
                }}>
                  {(expiry.isExpired || expiry.isExpiringSoon) && <AlertTriangle className="h-3 w-3" />}
                  {expiry.label}
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-secondary">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {token.last_used_at ? new Date(token.last_used_at).toLocaleString() : 'Never'}
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  {onRegenerate && (
                    <button
                      type="button"
                      onClick={() => onRegenerate(token.id)}
                      className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10"
                      title="Regenerate Token"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRevoke(token.id)}
                    className="rounded-lg p-2 text-danger transition-colors hover:bg-danger/10"
                    title="Revoke Token"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          );})}
          {tokens.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-12 text-center text-secondary">
                No API tokens generated yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
