import { useState, useEffect } from "react";
import { Key, Plus, Shield, Copy, Check } from 'lucide-react';
import TokenTable from '../components/TokenTable';
import api from '../lib/api';
import { ApiToken } from '../types';
import toast from 'react-hot-toast';

export const ApiSettings = () => {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await api.get('/tokens');
      setTokens(response.data);
    } catch (err) {
      console.error('Failed to fetch tokens', err);
    }
  };

  const handleCreateToken = async () => {
    const name = prompt('Enter a name for the new token:');
    if (!name) return;

    try {
      const response = await api.post('/tokens', { name });
      setNewToken(response.data.token);
      fetchTokens();
      toast.success('Token created');
    } catch (err: any) {
      toast.error(err?.error || 'Failed to create token');
    }
  };

  const handleDeleteToken = async (id: number) => {
    if (!confirm('Are you sure you want to revoke this token?')) return;
    try {
      await api.delete(`/tokens/${id}`);
      fetchTokens();
      toast.success('Token revoked');
    } catch (err: any) {
      toast.error(err?.error || 'Failed to revoke token');
    }
  };

  const handleRegenerateToken = async (id: number) => {
    if (!confirm('Regenerate this token? The old token will stop working immediately.')) return;
    try {
      const response = await api.post(`/tokens/${id}/regenerate`);
      setNewToken(response.data.token);
      fetchTokens();
      toast.success('Token regenerated');
    } catch (err: any) {
      toast.error(err?.error || 'Failed to regenerate token');
    }
  };

  const handleCopy = () => {
    if (newToken) {
      navigator.clipboard.writeText(newToken);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-text">
          <h1>API Settings</h1>
          <p>Manage API tokens for programmatic access to ServerVault.</p>
        </div>
        <button onClick={handleCreateToken} className="sv-btn-primary">
          <Plus className="w-4 h-4" /> New Token
        </button>
      </header>

      {newToken && (
        <div className="sv-card border-2 border-primary/30 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold text-[hsl(var(--fg))]">Save this token now!</span>
          </div>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 p-3 rounded-lg font-mono text-sm break-all"
              style={{ background: 'hsl(var(--surface-2))', color: 'hsl(var(--fg))' }}
            >
              {newToken}
            </code>
            <button
              onClick={handleCopy}
              className="sv-btn-ghost p-2"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: 'hsl(var(--fg-2))' }}>
            This token will never be shown again. Store it securely.
          </p>
          <button
            onClick={() => setNewToken(null)}
            className="sv-btn-ghost text-xs mt-3"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="sv-card">
        <div className="flex items-center gap-3 mb-6">
          <Key className="w-5 h-5 text-primary" />
          <span className="text-lg font-semibold" style={{ color: 'hsl(var(--fg))' }}>Your API Tokens</span>
        </div>

        <TokenTable tokens={tokens} onRevoke={handleDeleteToken} onRegenerate={handleRegenerateToken} />

        {tokens.length === 0 && (
          <div className="text-center py-8" style={{ color: 'hsl(var(--fg-2))' }}>
            <Key className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No API tokens yet</p>
            <p className="text-sm mt-1">Create a token to access the API programmatically.</p>
          </div>
        )}
      </div>

      <div className="sv-card mt-6">
        <h3 className="font-semibold mb-3" style={{ color: 'hsl(var(--fg))' }}>Usage Example</h3>
        <pre
          className="p-4 rounded-lg text-sm overflow-x-auto"
          style={{ background: 'hsl(var(--surface-2))', color: 'hsl(var(--fg-2))' }}
        >
{`curl -H "Authorization: Bearer sv_your_token" \\
     http://localhost:8080/api/servers`}
        </pre>
      </div>
    </div>
  );
};
