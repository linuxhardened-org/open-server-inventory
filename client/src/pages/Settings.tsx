import { useState } from 'react';
import { Download, Upload, Trash2, ShieldAlert, Settings2 } from 'lucide-react';
import axios from '../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';

export const Settings = () => {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';
  const { appName, setAppName } = useSettingsStore();
  const [appNameInput, setAppNameInput] = useState(appName);
  const [savingName, setSavingName] = useState(false);

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
    const name = appNameInput.trim();
    if (!name) return;
    setSavingName(true);
    try {
      await axios.put('/settings', { app_name: name });
      setAppName(name);
      toast.success('App name updated');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSavingName(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('CRITICAL: This will delete ALL inventory data (servers, groups, tags, keys). This cannot be undone. Proceed?')) return;
    const password = prompt('Please enter your administrator password to confirm:');
    if (!password) return;

    try {
      await axios.post('/api/settings/reset', { password });
      toast.success('System reset complete');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reset failed');
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
            <form onSubmit={handleSaveName} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-sm font-medium text-secondary mb-1.5">Application Name</label>
                <input
                  type="text"
                  value={appNameInput}
                  onChange={(e) => setAppNameInput(e.target.value)}
                  className="sv-input"
                  placeholder="ServerVault"
                  maxLength={80}
                  required
                />
              </div>
              <button type="submit" disabled={savingName} className="sv-btn-primary h-[38px]">
                {savingName ? 'Saving…' : 'Save'}
              </button>
            </form>
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
                onClick={handleReset}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg px-6 py-2 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Reset Data
              </button>
            </div>
          </section>
        </div>
      </div>
  );
}
