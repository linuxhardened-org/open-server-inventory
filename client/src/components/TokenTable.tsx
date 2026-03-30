import { Trash2, Key, Clock, Calendar, RefreshCw } from 'lucide-react';
import { ApiToken } from '../types';

interface TokenTableProps {
  tokens: ApiToken[];
  onRevoke: (id: number) => void;
  onRegenerate?: (id: number) => void;
}

export default function TokenTable({ tokens, onRevoke, onRegenerate }: TokenTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <table className="w-full text-left">
        <thead className="bg-surface-lighter text-xs uppercase tracking-wider text-secondary">
          <tr>
            <th className="px-6 py-4">Token Name</th>
            <th className="px-6 py-4">Created</th>
            <th className="px-6 py-4">Last Used</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tokens.map((token) => (
            <tr key={token.id} className="group transition-colors hover:bg-foreground/[0.02]">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Key className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium text-foreground">{token.name}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-secondary">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(token.created_at).toLocaleDateString()}
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
          ))}
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
