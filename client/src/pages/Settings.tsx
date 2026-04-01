import { useState, useEffect, useCallback } from 'react';
import { Download, Upload, Trash2, ShieldAlert, Settings2, Database, CheckCircle2, XCircle, X } from 'lucide-react';
import { SvFileButton } from '../components/SvFileButton';
import axios, { getApiErrorMessage } from '../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useRealtimeResource } from '../hooks/useRealtimeResource';

type DbStatus = { connected: boolean; provider?: string; version?: string; error?: string } | null;
type Tab = 'general' | 'database' | 'data' | 'danger';

export const Settings = () => {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';
  const { appName, appLogoUrl, setAppName, setAppLogoUrl } = useSettingsStore();
  const [appNameInput, setAppNameInput] = useState(appName);
  const [appLogoInput, setAppLogoInput] = useState(appLogoUrl);
  const [savingName, setSavingName] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [dbStatus, setDbStatus] = useState<DbStatus>(null);
  const [dbChecking, setDbChecking] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('general');

  const checkDb = useCallback(async () => {
    setDbChecking(true);
    try {
      const res = (await axios.get('/settings/db-status')) as { success: boolean; data: DbStatus };
      setDbStatus(res.data);
    } catch {
      setDbStatus({ connected: false, error: 'Could not reach server' });
    } finally {
      setDbChecking(false);
    }
  }, []);

  useEffect(() => {
    checkDb();
  }, [checkDb]);

  useRealtimeResource('settings', () => {
    void checkDb();
    void useSettingsStore.getState().fetchSettings();
  });

  useEffect(() => { setAppNameInput(appName); }, [appName]);
  useEffect(() => { setAppLogoInput(appLogoUrl); }, [appLogoUrl]);

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const blob = (await axios.get('/export-import/export', { responseType: 'blob' })) as Blob;
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
    if (!isAdmin) { toast.error('Only administrators can import data'); e.target.value = ''; return; }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      await axios.post('/export-import/import', { data: parsed });
      toast.success('Import successful');
      window.location.reload();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'error' in err ? String((err as { error: string }).error) : 'Import failed';
      toast.error(msg);
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) { toast.error('Only administrators can change the application name'); return; }
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

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 1024 * 1024) { toast.error('Logo image must be under 1MB'); return; }
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
    }
  };

  const safeLogo = (() => {
    const v = appLogoInput.trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v) || v.startsWith('/') || /^data:image\/(png|jpeg|gif|webp);base64,/i.test(v)) return v;
    return '';
  })();

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

  const tabs: { id: Tab; label: string; icon: typeof Settings2 }[] = [
    { id: 'general', label: 'General', icon: Settings2 },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'data', label: 'Data', icon: Download },
    ...(isAdmin ? [{ id: 'danger' as Tab, label: 'Danger', icon: ShieldAlert }] : []),
  ];

  return (
    <div className="page animate-in">
      <header className="page-header">
        <div className="page-header-text">
          <h1>Settings</h1>
          <p>System-wide configuration, data portability, and maintenance.</p>
        </div>
      </header>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid hsl(var(--border))', marginBottom: 24 }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              borderBottom: activeTab === id ? '2px solid hsl(var(--primary))' : '2px solid transparent',
              background: 'none',
              color: activeTab === id ? 'hsl(var(--primary))' : 'hsl(var(--fg-2))',
              cursor: 'pointer',
              marginBottom: -1,
              borderRadius: id === 'danger' ? undefined : 0,
              ...(id === 'danger' ? { color: activeTab === id ? '#ef4444' : 'hsl(var(--fg-3))', borderBottomColor: activeTab === id ? '#ef4444' : 'transparent' } : {}),
            }}
          >
            <Icon style={{ width: 14, height: 14 }} />
            {label}
          </button>
        ))}
      </div>

      {/* General tab */}
      {activeTab === 'general' && (
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
              <div className="flex items-center gap-2">
                <SvFileButton onFile={handleLogoUpload} label="Choose File" loading={uploadingLogo} disabled={!isAdmin} />
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
                  src={safeLogo}
                  alt="Logo preview"
                  style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, border: '1px solid hsl(var(--border))', padding: 6, background: 'hsl(var(--surface-2))' }}
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
                placeholder="https://example.com/logo.png"
                maxLength={2048}
                disabled={!isAdmin}
              />
              <p className="mt-1 text-xs text-secondary">Accepts http(s), app path, or uploaded image data URL.</p>
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
      )}

      {/* Database tab */}
      {activeTab === 'database' && (
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
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">Local</span>
              )}
              {dbStatus?.provider === 'supabase' && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">Supabase</span>
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
      )}

      {/* Data tab */}
      {activeTab === 'data' && (
        <div className="space-y-6">
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
        </div>
      )}

      {/* Danger tab */}
      {activeTab === 'danger' && isAdmin && (
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
  );
};
