import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Cloud, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from '../lib/api';
import toast from 'react-hot-toast';

interface CloudProvider {
  id: number;
  name: string;
  provider_type: string;
  auto_sync: boolean;
  last_synced_at: string | null;
  server_count?: number;
}

export const CloudIntegrations = () => {
  const [providers, setProviders] = useState<CloudProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingProvider, setAddingProvider] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [newProvider, setNewProvider] = useState({ name: '', api_token: '', auto_sync: true });

  const fetchProviders = useCallback(async () => {
    try {
      const res = (await axios.get('/cloud-providers')) as { success: boolean; data: CloudProvider[] };
      setProviders(Array.isArray(res?.data) ? res.data : []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvider.name.trim() || !newProvider.api_token.trim()) return;
    try {
      await axios.post('/cloud-providers', {
        name: newProvider.name.trim(),
        provider_type: 'linode',
        api_token: newProvider.api_token.trim(),
        auto_sync: newProvider.auto_sync,
      });
      toast.success('Cloud provider added');
      setAddingProvider(false);
      setNewProvider({ name: '', api_token: '', auto_sync: true });
      await fetchProviders();
    } catch (err: unknown) {
      toast.error((err as { error?: string })?.error || 'Failed to add provider');
    }
  };

  const handleSyncProvider = async (id: number) => {
    setSyncingId(id);
    try {
      await axios.post(`/cloud-providers/${id}/sync`);
      toast.success('Sync complete');
      await fetchProviders();
    } catch (err: unknown) {
      toast.error((err as { error?: string })?.error || 'Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  const handleToggleAutoSync = async (id: number, currentValue: boolean) => {
    try {
      await axios.patch(`/cloud-providers/${id}`, { auto_sync: !currentValue });
      await fetchProviders();
      toast.success(`Auto-sync ${!currentValue ? 'enabled' : 'disabled'}`);
    } catch (err: unknown) {
      toast.error((err as { error?: string })?.error || 'Failed to update');
    }
  };

  const handleDeleteProvider = async (id: number) => {
    if (!confirm('Delete this cloud provider? Imported servers will remain.')) return;
    try {
      await axios.delete(`/cloud-providers/${id}`);
      toast.success('Provider removed');
      await fetchProviders();
    } catch (err: unknown) {
      toast.error((err as { error?: string })?.error || 'Failed to delete');
    }
  };

  return (
    <div className="page animate-in">
      <header className="page-header">
        <div className="page-header-text">
          <h1>Cloud Integrations</h1>
          <p>Connect cloud providers to auto-import and sync servers.</p>
        </div>
        <button type="button" onClick={() => setAddingProvider(true)} className="sv-btn-primary">
          <Plus style={{ width: 15, height: 15 }} /> Add Provider
        </button>
      </header>

      <div className="sv-card">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'hsl(var(--fg-3))' }}>
            <span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid hsl(var(--border))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : providers.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Cloud style={{ width: 48, height: 48, color: 'hsl(var(--fg-3))', opacity: 0.3, margin: '0 auto 16px' }} />
            <p style={{ color: 'hsl(var(--fg-2))', fontSize: 14 }}>No cloud providers configured yet.</p>
            <p style={{ color: 'hsl(var(--fg-3))', fontSize: 13, marginTop: 4 }}>Add a provider to start importing servers automatically.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {providers.map((provider) => (
              <div
                key={provider.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: 'hsl(var(--surface-2))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Cloud style={{ width: 20, height: 20, color: 'hsl(var(--primary))' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--fg))' }}>{provider.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, background: 'hsl(var(--surface-3))', color: 'hsl(var(--fg-2))', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>
                        {provider.provider_type}
                      </span>
                      {provider.server_count !== undefined && (
                        <span style={{ fontSize: 12, color: 'hsl(var(--fg-2))' }}>
                          {provider.server_count} server{provider.server_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {provider.last_synced_at && (
                      <div style={{ fontSize: 11, color: 'hsl(var(--fg-3))', marginTop: 4 }}>
                        Last synced: {new Date(provider.last_synced_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'hsl(var(--fg-2))' }}>
                    <input
                      type="checkbox"
                      checked={provider.auto_sync}
                      onChange={() => handleToggleAutoSync(provider.id, provider.auto_sync)}
                      style={{ width: 15, height: 15, accentColor: 'hsl(var(--primary))' }}
                    />
                    Auto-sync
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSyncProvider(provider.id)}
                    disabled={syncingId === provider.id}
                    className="sv-btn-primary"
                    style={{ padding: '6px 12px', fontSize: 12, gap: 5 }}
                  >
                    <RefreshCw style={{ width: 13, height: 13, animation: syncingId === provider.id ? 'spin 1s linear infinite' : 'none' }} />
                    {syncingId === provider.id ? 'Syncing...' : 'Sync Now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProvider(provider.id)}
                    className="sv-btn-ghost"
                    style={{ padding: 8, color: 'hsl(var(--danger))' }}
                    title="Delete provider"
                  >
                    <Trash2 style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Provider Modal */}
      {addingProvider && createPortal(
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
          onClick={() => setAddingProvider(false)}
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
            <div style={{ padding: '14px 16px', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--surface-2))' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--fg))', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cloud style={{ width: 16, height: 16, color: 'hsl(var(--primary))' }} />
                Add Cloud Provider
              </h2>
            </div>
            <form onSubmit={handleAddProvider} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'hsl(var(--fg-2))', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Name <span style={{ color: 'hsl(var(--danger))' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                  className="sv-input"
                  style={{ width: '100%' }}
                  placeholder="e.g., Production Linode"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'hsl(var(--fg-2))', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Provider
                </label>
                <div style={{ padding: '10px 12px', background: 'hsl(var(--surface-2))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 13, color: 'hsl(var(--fg-2))' }}>
                  Linode (more providers coming soon)
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'hsl(var(--fg-2))', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  API Token <span style={{ color: 'hsl(var(--danger))' }}>*</span>
                </label>
                <input
                  type="password"
                  value={newProvider.api_token}
                  onChange={(e) => setNewProvider({ ...newProvider, api_token: e.target.value })}
                  className="sv-input"
                  style={{ width: '100%' }}
                  placeholder="Linode Personal Access Token"
                  required
                />
                <p style={{ fontSize: 11, color: 'hsl(var(--fg-3))', marginTop: 6 }}>
                  Generate a read-only token at cloud.linode.com/profile/tokens
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="auto-sync-checkbox"
                  checked={newProvider.auto_sync}
                  onChange={(e) => setNewProvider({ ...newProvider, auto_sync: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: 'hsl(var(--primary))' }}
                />
                <label htmlFor="auto-sync-checkbox" style={{ fontSize: 13, color: 'hsl(var(--fg))' }}>
                  Enable automatic daily sync (2 AM)
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => setAddingProvider(false)} className="sv-btn-ghost" style={{ flex: 1, border: '1px solid hsl(var(--border-2))' }}>
                  Cancel
                </button>
                <button type="submit" className="sv-btn-primary" style={{ flex: 1 }}>
                  Add Provider
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};
