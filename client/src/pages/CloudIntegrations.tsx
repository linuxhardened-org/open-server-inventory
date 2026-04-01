import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Cloud, RefreshCw, Plus, Trash2, ShieldCheck, ShieldAlert, ShieldX, ChevronDown, ChevronUp } from 'lucide-react';
import { SvSelect } from '../components/SvSelect';
import { motion } from 'framer-motion';
import axios, { getApiErrorMessage } from '../lib/api';
import toast from 'react-hot-toast';
import { getProviderLogo, SUPPORTED_PROVIDERS } from '../lib/cloudAssets';
import { useRealtimeResource } from '../hooks/useRealtimeResource';
import type { CloudProvider } from '../types';

const INTERVAL_OPTIONS = [
  { value: 15, label: 'Every 15 min' },
  { value: 30, label: 'Every 30 min' },
  { value: 60, label: 'Every hour' },
  { value: 120, label: 'Every 2 hours' },
  { value: 360, label: 'Every 6 hours' },
  { value: 720, label: 'Every 12 hours' },
  { value: 1440, label: 'Daily' },
];

export const CloudIntegrations = () => {
  const [providers, setProviders] = useState<CloudProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingProvider, setAddingProvider] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedProviderIds, setSelectedProviderIds] = useState<number[]>([]);
  const [newProvider, setNewProvider] = useState({ name: '', provider: 'linode', api_token: '', auto_sync: true, sync_interval_minutes: 60 });

  type Risk = 'critical' | 'high' | 'medium' | 'low' | 'ok';
  interface AuditPermission { name: string; scope: string; present: boolean; required: boolean; risk: Risk; description: string; }
  interface AuditResult { valid: boolean; overallRisk: Risk; unnecessaryCount: number; permissions: AuditPermission[]; }
  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const auditDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchProviders = useCallback(async () => {
    try {
      const res = (await axios.get('/cloud-providers')) as { success: boolean; data: CloudProvider[] };
      const rows = Array.isArray(res?.data) ? res.data : [];
      setProviders(rows);
      setSelectedProviderIds((prev) => prev.filter((id) => rows.some((p) => p.id === id)));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not load cloud providers'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);
  useRealtimeResource('cloud-providers', () => void fetchProviders());
  useRealtimeResource('servers', () => void fetchProviders());

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!newProvider.name.trim() || !newProvider.api_token.trim()) return;
    setSubmitting(true);
    try {
      await axios.post('/cloud-providers', {
        name: newProvider.name.trim(),
        provider: newProvider.provider,
        api_token: newProvider.api_token.trim(),
        auto_sync: newProvider.auto_sync,
        sync_interval_minutes: newProvider.sync_interval_minutes,
      });
      toast.success('Cloud provider added');
      setAddingProvider(false);
      setNewProvider({ name: '', provider: 'linode', api_token: '', auto_sync: true, sync_interval_minutes: 60 });
      setAuditResult(null);
      await fetchProviders();
    } catch (err: unknown) {
      toast.error((err as { error?: string })?.error || 'Failed to add provider');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuditToken = async () => {
    if (!newProvider.api_token.trim()) { toast.error('Enter an API token first'); return; }
    setAuditing(true);
    setAuditResult(null);
    try {
      const res = await axios.post('/cloud-providers/audit-token', {
        provider: newProvider.provider,
        api_token: newProvider.api_token.trim(),
      }) as { success: boolean; data: AuditResult };
      setAuditResult(res.data);
      setAuditExpanded(true);
    } catch (err: unknown) {
      toast.error((err as { error?: string })?.error || 'Audit failed');
    } finally {
      setAuditing(false);
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

  const handleUpdateSyncInterval = async (id: number, minutes: number) => {
    try {
      await axios.patch(`/cloud-providers/${id}`, { sync_interval_minutes: minutes });
      await fetchProviders();
      const label = INTERVAL_OPTIONS.find((o) => o.value === minutes)?.label ?? `${minutes} min`;
      toast.success(`Sync interval updated: ${label}`);
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

  const allSelected = providers.length > 0 && selectedProviderIds.length === providers.length;
  const hasSelection = selectedProviderIds.length > 0;

  const toggleSelected = (id: number) => {
    setSelectedProviderIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    setSelectedProviderIds((prev) => (prev.length === providers.length ? [] : providers.map((p) => p.id)));
  };

  const handleBulkSync = async () => {
    if (!hasSelection) return;
    setBulkSyncing(true);
    try {
      const settled = await Promise.allSettled(
        selectedProviderIds.map((id) => axios.post(`/cloud-providers/${id}/sync`))
      );
      const ok = settled.filter((r) => r.status === 'fulfilled').length;
      const fail = settled.length - ok;
      if (ok > 0) toast.success(`Synced ${ok} provider${ok !== 1 ? 's' : ''}`);
      if (fail > 0) toast.error(`${fail} sync operation${fail !== 1 ? 's' : ''} failed`);
      await fetchProviders();
    } finally {
      setBulkSyncing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!hasSelection) return;
    if (!confirm(`Delete ${selectedProviderIds.length} selected provider(s)? Imported servers will remain.`)) return;
    setBulkDeleting(true);
    try {
      const settled = await Promise.allSettled(
        selectedProviderIds.map((id) => axios.delete(`/cloud-providers/${id}`))
      );
      const ok = settled.filter((r) => r.status === 'fulfilled').length;
      const fail = settled.length - ok;
      if (ok > 0) toast.success(`Deleted ${ok} provider${ok !== 1 ? 's' : ''}`);
      if (fail > 0) toast.error(`${fail} delete operation${fail !== 1 ? 's' : ''} failed`);
      await fetchProviders();
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="page animate-in">
      <header className="page-header">
        <div className="page-header-text">
          <h1>Cloud Integrations</h1>
          <p>Connect cloud providers to auto-import and sync servers.</p>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUPPORTED_PROVIDERS.filter((p) => !p.available).map((provider) => (
              <span
                key={provider.value}
                style={{
                  fontSize: 11,
                  padding: '3px 8px 3px 6px',
                  borderRadius: 9999,
                  background: 'hsl(var(--surface-3))',
                  color: 'hsl(var(--fg-2))',
                  border: '1px solid hsl(var(--border))',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <img
                  src={provider.logo}
                  alt={`${provider.label} logo`}
                  style={{ width: 14, height: 14, objectFit: 'contain' }}
                />
                {provider.label} (coming soon)
              </span>
            ))}
          </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px 2px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'hsl(var(--fg-2))' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  style={{ width: 15, height: 15, accentColor: 'hsl(var(--primary))' }}
                />
                Select all
              </label>
              <span style={{ fontSize: 12, color: 'hsl(var(--fg-3))' }}>
                {selectedProviderIds.length} selected
              </span>
              <button
                type="button"
                onClick={handleBulkSync}
                disabled={!hasSelection || bulkSyncing || bulkDeleting}
                className="sv-btn-primary"
                style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: 12, gap: 5 }}
              >
                <RefreshCw style={{ width: 13, height: 13, animation: bulkSyncing ? 'spin 1s linear infinite' : 'none' }} />
                {bulkSyncing ? 'Syncing selected...' : 'Sync selected'}
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={!hasSelection || bulkSyncing || bulkDeleting}
                className="sv-btn-ghost"
                style={{ padding: '6px 10px', color: 'hsl(var(--danger))', border: '1px solid hsl(var(--border-2))' }}
              >
                {bulkDeleting ? 'Deleting...' : 'Delete selected'}
              </button>
            </div>
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
                  <input
                    type="checkbox"
                    checked={selectedProviderIds.includes(provider.id)}
                    onChange={() => toggleSelected(provider.id)}
                    style={{ width: 15, height: 15, accentColor: 'hsl(var(--primary))' }}
                    aria-label={`Select ${provider.name}`}
                  />
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: 'hsl(var(--primary) / 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 6,
                    }}
                  >
                    {getProviderLogo(provider.provider) ? (
                      <img
                        src={getProviderLogo(provider.provider)!}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Cloud style={{ width: 20, height: 20, color: 'hsl(var(--primary))' }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--fg))' }}>{provider.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, background: 'hsl(var(--surface-3))', color: 'hsl(var(--fg-2))', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>
                        {provider.provider}
                      </span>
                      {provider.server_count !== undefined && (
                        <span style={{ fontSize: 12, color: 'hsl(var(--fg-2))' }}>
                          {provider.server_count} server{provider.server_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {provider.last_sync_at && (
                      <div style={{ fontSize: 11, color: 'hsl(var(--fg-3))', marginTop: 4 }}>
                        Last synced: {new Date(provider.last_sync_at).toLocaleString()}
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
                  {provider.auto_sync && (
                    <SvSelect
                      value={String(provider.sync_interval_minutes ?? 60)}
                      onChange={(v) => handleUpdateSyncInterval(provider.id, parseInt(v, 10))}
                      options={INTERVAL_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
                      compact
                    />
                  )}
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
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
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
            <form onSubmit={handleAddProvider} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
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
                  Provider <span style={{ color: 'hsl(var(--danger))' }}>*</span>
                </label>
                <SvSelect
                  value={newProvider.provider}
                  onChange={(v) => setNewProvider({ ...newProvider, provider: v })}
                  options={SUPPORTED_PROVIDERS.map((p) => ({
                    value: p.value,
                    label: p.label,
                    icon: p.logo,
                    disabled: !p.available,
                    badge: !p.available ? 'soon' : undefined,
                  }))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'hsl(var(--fg-2))', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  API Token <span style={{ color: 'hsl(var(--danger))' }}>*</span>
                </label>
                <input
                  type="password"
                  value={newProvider.api_token}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewProvider({ ...newProvider, api_token: val });
                    setAuditResult(null);
                    if (auditDebounceRef.current) clearTimeout(auditDebounceRef.current);
                    if (val.trim() && !submitting) {
                      auditDebounceRef.current = setTimeout(() => handleAuditToken(), 800);
                    }
                  }}
                  className="sv-input"
                  style={{ width: '100%' }}
                  placeholder="Linode Personal Access Token"
                  required
                />
                <p style={{ fontSize: 11, color: 'hsl(var(--fg-3))', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Generate a read-only token at cloud.linode.com/profile/tokens
                  {auditing && <span style={{ color: 'hsl(var(--fg-3))', fontStyle: 'italic' }}>· checking permissions...</span>}
                </p>

                {/* Audit Result Panel */}
                {auditResult && (() => {
                  const riskColor: Record<string, string> = {
                    critical: 'hsl(var(--danger))',
                    high: '#f97316',
                    medium: '#eab308',
                    low: '#3b82f6',
                    ok: 'hsl(var(--primary))',
                  };
                  const RiskIcon = auditResult.overallRisk === 'ok' ? ShieldCheck
                    : auditResult.overallRisk === 'critical' || auditResult.overallRisk === 'high' ? ShieldX
                    : ShieldAlert;

                  return (
                    <div style={{ marginTop: 10, borderRadius: 8, border: `1px solid ${riskColor[auditResult.overallRisk]}33`, background: `${riskColor[auditResult.overallRisk]}0d`, overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => setAuditExpanded(x => !x)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 10px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: riskColor[auditResult.overallRisk],
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        <RiskIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
                        {auditResult.overallRisk === 'ok'
                          ? 'Token looks good — minimal permissions'
                          : `${auditResult.unnecessaryCount} unnecessary permission${auditResult.unnecessaryCount !== 1 ? 's' : ''} detected`}
                        <span style={{ marginLeft: 'auto', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.05em', padding: '2px 6px', borderRadius: 4, background: `${riskColor[auditResult.overallRisk]}22` }}>
                          {auditResult.overallRisk}
                        </span>
                        {auditExpanded ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
                      </button>

                      {auditExpanded && (
                        <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {auditResult.permissions.filter(p => p.present || p.required).map(p => {
                            const color = !p.present && p.required ? riskColor.critical
                              : p.present && !p.required ? riskColor[p.risk]
                              : 'hsl(var(--fg-3))';
                            const statusLabel = !p.present && p.required ? 'MISSING'
                              : p.present && !p.required ? 'UNNECESSARY'
                              : p.present ? 'PRESENT' : 'NOT GRANTED';
                            return (
                              <div key={p.scope} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 6px', borderRadius: 5, background: 'hsl(var(--surface) / 0.6)' }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color, marginTop: 1, minWidth: 90, flexShrink: 0 }}>{statusLabel}</span>
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--fg))', fontFamily: 'monospace' }}>{p.scope}</div>
                                  <div style={{ fontSize: 10, color: 'hsl(var(--fg-3))', marginTop: 1 }}>{p.description}</div>
                                </div>
                              </div>
                            );
                          })}
                          {auditResult.overallRisk !== 'ok' && (
                            <p style={{ fontSize: 11, color: '#f97316', marginTop: 6, lineHeight: 1.4 }}>
                              We recommend generating a new token with only <strong>linodes:read_only</strong> scope to follow the principle of least privilege.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
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
                  Enable automatic sync
                </label>
              </div>
              {newProvider.auto_sync && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'hsl(var(--fg-2))', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Sync Interval
                  </label>
                  <SvSelect
                    value={String(newProvider.sync_interval_minutes)}
                    onChange={(v) => setNewProvider({ ...newProvider, sync_interval_minutes: parseInt(v, 10) })}
                    options={INTERVAL_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
                  />
                  <p style={{ fontSize: 11, color: 'hsl(var(--fg-3))', marginTop: 6 }}>
                    Sync only runs when data has actually changed (delta detection).
                  </p>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => setAddingProvider(false)} className="sv-btn-ghost" style={{ flex: 1, border: '1px solid hsl(var(--border-2))' }}>
                  Cancel
                </button>
                <button type="submit" className="sv-btn-primary" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Provider'}
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
