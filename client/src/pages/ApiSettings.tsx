import { useState, useEffect } from "react";
import { createPortal } from 'react-dom';
import { Key, Plus, Shield, Copy, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import TokenTable from '../components/TokenTable';
import api from '../lib/api';
import { ApiToken } from '../types';
import toast from 'react-hot-toast';

const expiryOptions = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '365d', label: '1 year' },
  { value: 'never', label: 'No expiration' },
];

export const ApiSettings = () => {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [tokenExpiry, setTokenExpiry] = useState('90d');

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

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) return;

    try {
      const response = await api.post('/tokens', { name: tokenName.trim(), expiry: tokenExpiry });
      setNewToken(response.data.token);
      setShowCreateModal(false);
      setTokenName('');
      setTokenExpiry('90d');
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
        <button onClick={() => setShowCreateModal(true)} className="sv-btn-primary">
          <Plus className="w-4 h-4" /> New Token
        </button>
      </header>

      {/* Create Token Modal */}
      {showCreateModal && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'hsl(var(--bg) / 0.7)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: 420,
              background: 'hsl(var(--surface))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 16px 48px hsl(var(--bg) / 0.4)',
            }}
          >
            <div style={{ padding: '14px 16px', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--surface-2))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--fg))', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Key style={{ width: 16, height: 16, color: 'hsl(var(--primary))' }} />
                Create API Token
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="sv-btn-ghost"
                style={{ padding: 4 }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <form onSubmit={handleCreateToken} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'hsl(var(--fg-2))', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Token Name <span style={{ color: 'hsl(var(--danger))' }}>*</span>
                </label>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  className="sv-input"
                  style={{ width: '100%' }}
                  placeholder="e.g., CI/CD Pipeline"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'hsl(var(--fg-2))', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Expiration
                </label>
                <select
                  value={tokenExpiry}
                  onChange={(e) => setTokenExpiry(e.target.value)}
                  className="sv-input"
                  style={{ width: '100%' }}
                >
                  {expiryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p style={{ fontSize: 11, color: 'hsl(var(--fg-3))', marginTop: 6 }}>
                  {tokenExpiry === 'never'
                    ? 'Token will never expire (not recommended for production)'
                    : `Token will expire ${expiryOptions.find(o => o.value === tokenExpiry)?.label.toLowerCase()} from now`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="sv-btn-ghost" style={{ flex: 1, border: '1px solid hsl(var(--border-2))' }}>
                  Cancel
                </button>
                <button type="submit" className="sv-btn-primary" style={{ flex: 1 }}>
                  Create Token
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

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
     ${window.location.origin}/api/servers`}
        </pre>
      </div>
    </div>
  );
};
