import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Download, Upload, Trash2, ShieldAlert, Settings2, Database, CheckCircle2, XCircle, Cloud, RefreshCw, Plus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import axios, { getApiErrorMessage } from '../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { LINODE_LOGO_URL } from '../lib/cloudAssets';
import { useRealtimeResource } from '../hooks/useRealtimeResource';

interface CloudProvider {
  id: number;
  name: string;
  provider?: string;
  provider_type?: string;
  auto_sync: boolean;
  last_synced_at: string | null;
  server_count?: number;
}

type DbStatus = { connected: boolean; provider?: string; version?: string; error?: string } | null;

function providerKind(p: CloudProvider): string {
  return p.provider ?? p.provider_type ?? '';
}

export const Settings = () => {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';
  const { appName, appLogoUrl, setAppName, setAppLogoUrl } = useSettingsStore();
  const [appNameInput, setAppNameInput] = useState(appName);
  const [appLogoInput, setAppLogoInput] = useState(appLogoUrl);
  const [savingName, setSavingName] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [dbStatus, setDbStatus] = useState<DbStatus>(null);
  const [dbChecking, setDbChecking] = useState(false);

  // Cloud providers state
  const [providers, setProviders] = useState<CloudProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [addingProvider, setAddingProvider] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedProviderIds, setSelectedProviderIds] = useState<number[]>([]);
  const [newProvider, setNewProvider] = useState({ name: '', api_token: '', auto_sync: true });

  const fetchProviders = useCallback(async () => {
    setProvidersLoading(true);
    try {
      const res = (await axios.get('/cloud-providers')) as { success: boolean; data: CloudProvider[] };
      const rows = Array.isArray(res?.data) ? res.data : [];
      setProviders(rows);
      setSelectedProviderIds((prev) => prev.filter((id) => rows.some((p) => p.id === id)));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not load cloud providers'));
    } finally {
      setProvidersLoading(false);
    }
  }, []);

  useEffect(() => {
    checkDb();
    fetchProviders();
  }, [fetchProviders]);
  useRealtimeResource('cloud-providers', () => void fetchProviders());
  useRealtimeResource('settings', () => {
    void checkDb();
    void useSettingsStore.getState().fetchSettings();
  });

  useEffect(() => {
    setAppNameInput(appName);
  }, [appName]);

  useEffect(() => {
    setAppLogoInput(appLogoUrl);
  }, [appLogoUrl]);

  const checkDb = async () => {
    setDbChecking(true);
    try {
      const res = (await axios.get('/settings/db-status')) as { success: boolean; data: DbStatus };
      setDbStatus(res.data);
    } catch {
      setDbStatus({ connected: false, error: 'Could not reach server' });
    } finally {
      setDbChecking(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const blob = (await axios.get('/export-import/export', {
        responseType: 'blob',
      })) as Blob;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `servervault-export-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported to ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAdmin) {
      toast.error('Only administrators can import data');
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      await axios.post('/export-import/import', { data: parsed });
      toast.success('Import successful');
      window.location.reload();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'error' in err
          ? String((err as { error: string }).error)
          : 'Import failed';
      toast.error(msg);
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Only administrators can change the application name');
      return;
    }
    const name = appNameInput.trim();
    const logo = appLogoInput.trim();
    if (!name) return;
    setSavingName(true);
    try {
      await axios.put('/settings', { app_name: name, app_logo_url: logo });
      setAppName(name);
      setAppLogoUrl(logo);
      toast.success('Branding updated');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save'));
    } finally {
      setSavingName(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      e.target.value = '';
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error('Logo image must be under 1MB');
      e.target.value = '';
      return;
    }
    setUploadingLogo(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
      });
      setAppLogoInput(dataUrl);
      toast.success('Logo uploaded. Click Save to apply.');
    } catch {
      toast.error('Failed to process logo image');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvider.name.trim() || !newProvider.api_token.trim()) return;
    try {
      await axios.post('/cloud-providers', {
        name: newProvider.name.trim(),
        provider: 'linode',
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
      toast.success('Sync started');
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
    } catch (err: unknown) {
      toast.error((err as { error?: string })?.error || 'Failed to update');
    }
  };

  const handleDeleteProvider = async (id: number) => {
    if (!confirm('Delete this cloud provider integration? Imported servers will remain.')) return;
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

  const handleReset = async () => {
    if (!confirm('CRITICAL: This will delete ALL inventory data (servers, groups, tags, keys). This cannot be undone. Proceed?')) return;
    const password = prompt('Please enter your administrator password to confirm:');
    if (!password) return;

    try {
      await axios.post('/settings/reset', { password });
      toast.success('System reset complete');
      window.location.reload();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Reset failed'));
    }
  };

  return (
      <div className="page animate-in">
        <header className="page-header">
          <div className="page-header-text">
            <h1>Settings</h1>
            <p>System-wide configuration, data portability, and maintenance.</p>
          </div>
        </header>

        <div className="space-y-6">
          <section className="sv-card">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
              <Settings2 className="h-4 w-4 text-primary" />
              General
            </h2>
            <form
              onSubmit={handleSaveName}
              className={`flex flex-col gap-4 max-w-md ${!isAdmin ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">Application Name</label>
                <input
                  type="text"
                  value={appNameInput}
                  onChange={(e) => setAppNameInput(e.target.value)}
                  className="sv-input w-full"
                  placeholder="ServerVault"
                  maxLength={80}
                  required
                  disabled={!isAdmin}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">Brand Logo (Upload Image)</label>
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  style={{ display: 'none' }}
                  disabled={!isAdmin || uploadingLogo}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => logoFileRef.current?.click()}
                    disabled={!isAdmin || uploadingLogo}
                    className="sv-btn-ghost"
                    style={{ border: '1px solid hsl(var(--border-2))', padding: '6px 14px', fontSize: 13, gap: 6 }}
                  >
                    <Upload style={{ width: 13, height: 13 }} />
                    {uploadingLogo ? 'Processing…' : 'Choose File'}
                  </button>
                  {appLogoInput.trim() && (
                    <button
                      type="button"
                      onClick={() => setAppLogoInput('')}
                      className="sv-btn-ghost"
                      style={{ padding: '6px 8px', color: 'hsl(var(--danger))' }}
                      title="Clear logo"
                    >
                      <X style={{ width: 13, height: 13 }} />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-secondary">Recommended PNG/SVG, max 1MB.</p>
              </div>

              {appLogoInput.trim() && (
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">Preview</label>
                  <img
                    src={appLogoInput.trim()}
                    alt="Logo preview"
                    style={{
                      width: 48,
                      height: 48,
                      objectFit: 'contain',
                      borderRadius: 8,
                      border: '1px solid hsl(var(--border))',
                      padding: 6,
                      background: 'hsl(var(--surface-2))',
                    }}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">Logo URL (Optional fallback)</label>
                <input
                  type="url"
                  value={appLogoInput}
                  onChange={(e) => setAppLogoInput(e.target.value)}
                  className="sv-input w-full"
                  placeholder="https://example.com/logo.png or /images/logo.png"
                  maxLength={2048}
                  disabled={!isAdmin}
                />
                <p className="mt-1 text-xs text-secondary">
                  Use this only when upload is not available. Accepts http(s), app path, or uploaded image data URL.
                </p>
              </div>

              <div>
                <button type="submit" disabled={savingName || !isAdmin} className="sv-btn-primary">
                  {savingName ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
            {!isAdmin && (
              <p className="mt-2 text-xs text-amber-500/90">Only administrators can change the application name.</p>
            )}
          </section>

          {/* Database connection status */}
          <section className="sv-card">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
              <Database className="h-4 w-4 text-primary" />
              Database
            </h2>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {dbChecking ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
                ) : dbStatus?.connected ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {dbChecking ? 'Checking…' : dbStatus?.connected ? 'Connected' : 'Not connected'}
                  </p>
                  <p className="text-xs text-secondary">
                    {dbStatus?.connected
                      ? `${dbStatus.provider === 'supabase' ? 'Supabase' : dbStatus.provider === 'external' ? 'External PostgreSQL' : 'Local PostgreSQL'} · ${dbStatus.version ?? ''}`
                      : dbStatus?.error ?? ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {dbStatus?.provider === 'local' && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                    Local
                  </span>
                )}
                {dbStatus?.provider === 'supabase' && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                    Supabase
                  </span>
                )}
                <button type="button" onClick={checkDb} disabled={dbChecking} className="sv-btn-outline text-xs h-8 px-3">
                  Recheck
                </button>
              </div>
            </div>
            {dbStatus?.provider !== 'supabase' && (
              <p className="mt-3 text-xs text-secondary border-t border-border pt-3">
                To use Supabase: set <code className="rounded bg-muted px-1 py-0.5 font-mono">DATABASE_URL</code> in{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono">server/.env</code> and restart.
                Get the connection string from <span className="text-foreground font-medium">Supabase Dashboard → Project Settings → Database → Session mode (port 5432)</span>.
              </p>
            )}
          </section>

          <section className="sv-card">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground">
              <Download className="h-5 w-5 text-primary" />
              Data Export
            </h2>
            <p className="mb-6 text-sm text-secondary">
              Download your entire inventory database in portable formats for backup or migration.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleExport('json')}
                className="flex-1 rounded-lg border border-border bg-surface-lighter p-4 text-center transition-colors hover:bg-foreground/[0.04]"
              >
                <div className="mb-1 font-semibold text-foreground">Export JSON</div>
                <div className="text-xs text-secondary">Recommended for backups</div>
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="flex-1 rounded-lg border border-border bg-surface-lighter p-4 text-center transition-colors hover:bg-foreground/[0.04]"
              >
                <div className="mb-1 font-semibold text-foreground">Export CSV</div>
                <div className="text-xs text-secondary">Best for spreadsheets</div>
              </button>
            </div>
          </section>

          <section className="sv-card">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground">
              <Upload className="h-5 w-5 text-success" />
              Data Import
            </h2>
            <p className="mb-6 text-sm text-secondary">
              Import servers, groups, and tags from a previously exported JSON file.{' '}
              {!isAdmin && <span className="text-amber-500/90">Only administrators can import.</span>}
            </p>
            <div className={`relative group ${!isAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={!isAdmin}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
              />
              <div className="rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors group-hover:border-primary/50">
                <Upload className="mx-auto mb-2 h-8 w-8 text-secondary" />
                <div className="text-sm font-medium text-foreground">Click to upload or drag & drop</div>
                <div className="mt-1 text-xs text-secondary">Only .json files supported</div>
              </div>
            </div>
          </section>

          {/* Cloud Integrations */}
          <section className="sv-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: 'hsl(var(--fg))', margin: 0 }}>
                  <Cloud style={{ width: 18, height: 18, color: 'hsl(var(--primary))' }} />
                  Cloud Integrations
                </h2>
                <p style={{ fontSize: 13, color: 'hsl(var(--fg-2))', marginTop: 4 }}>
                  Connect cloud providers to auto-import servers
                </p>
              </div>
              <button type="button" onClick={() => setAddingProvider(true)} className="sv-btn-primary" style={{ gap: 6 }}>
                <Plus style={{ width: 14, height: 14 }} />
                Add Provider
              </button>
            </div>

            {providersLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'hsl(var(--fg-3))' }}>
                <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid hsl(var(--border))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : providers.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'hsl(var(--fg-3))', fontSize: 13, border: '1px dashed hsl(var(--border))', borderRadius: 8 }}>
                No cloud providers configured yet.
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
                      padding: '14px 16px',
                      background: 'hsl(var(--surface-2))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="checkbox"
                        checked={selectedProviderIds.includes(provider.id)}
                        onChange={() => toggleSelected(provider.id)}
                        style={{ width: 15, height: 15, accentColor: 'hsl(var(--primary))' }}
                        aria-label={`Select ${provider.name}`}
                      />
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: 'hsl(var(--primary) / 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 5,
                        }}
                      >
                        {providerKind(provider) === 'linode' ? (
                          <img
                            src={LINODE_LOGO_URL}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Cloud style={{ width: 18, height: 18, color: 'hsl(var(--primary))' }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'hsl(var(--fg))' }}>{provider.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'hsl(var(--surface-3))', color: 'hsl(var(--fg-2))', textTransform: 'uppercase', fontWeight: 500 }}>
                            {providerKind(provider)}
                          </span>
                          {provider.server_count !== undefined && (
                            <span style={{ fontSize: 11, color: 'hsl(var(--fg-3))' }}>
                              {provider.server_count} server{provider.server_count !== 1 ? 's' : ''}
                            </span>
                          )}
                          {provider.last_synced_at && (
                            <span style={{ fontSize: 11, color: 'hsl(var(--fg-3))' }}>
                              Last synced: {new Date(provider.last_synced_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Auto-sync toggle */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'hsl(var(--fg-2))' }}>
                        <input
                          type="checkbox"
                          checked={provider.auto_sync}
                          onChange={() => handleToggleAutoSync(provider.id, provider.auto_sync)}
                          style={{ width: 14, height: 14, accentColor: 'hsl(var(--primary))' }}
                        />
                        Auto-sync
                      </label>
                      {/* Sync Now button */}
                      <button
                        type="button"
                        onClick={() => handleSyncProvider(provider.id)}
                        disabled={syncingId === provider.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '6px 10px',
                          fontSize: 12,
                          fontWeight: 500,
                          color: 'hsl(var(--primary))',
                          background: 'hsl(var(--primary) / 0.1)',
                          border: '1px solid hsl(var(--primary) / 0.2)',
                          borderRadius: 6,
                          cursor: syncingId === provider.id ? 'not-allowed' : 'pointer',
                          opacity: syncingId === provider.id ? 0.6 : 1,
                        }}
                      >
                        <RefreshCw style={{ width: 13, height: 13, animation: syncingId === provider.id ? 'spin 1s linear infinite' : 'none' }} />
                        {syncingId === provider.id ? 'Syncing...' : 'Sync Now'}
                      </button>
                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteProvider(provider.id)}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          border: 'none',
                          background: 'none',
                          color: 'hsl(var(--danger))',
                          cursor: 'pointer',
                        }}
                        title="Delete provider"
                      >
                        <Trash2 style={{ width: 15, height: 15 }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {isAdmin && (
          <section className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-red-500">
              <ShieldAlert className="w-5 h-5" />
              Danger Zone
            </h2>
            <div className="flex items-center justify-between gap-8">
              <div>
                <div className="font-semibold">Reset System Database</div>
                <div className="mt-1 text-sm text-secondary">
                  Wipe all inventory data. User accounts and API tokens will be preserved.
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg px-6 py-2 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Reset Data
              </button>
            </div>
          </section>
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
                    Enable automatic sync
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
}
