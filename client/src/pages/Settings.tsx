import { Layout } from '../components/Layout';
import { Download, Upload, Trash2, ShieldAlert } from 'lucide-react';
import axios from '../lib/api';
import toast from 'react-hot-toast';

export const Settings = () => {
  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await axios.get(`/api/export-import/export?format=${format}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `servervault-export-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Exported to ${format.toUpperCase()}`);
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('/api/export-import/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Import successful');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Import failed');
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
    <Layout>
      <div className="p-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">System Settings</h1>
        <p className="text-gray-400 mb-8">System-wide configuration, data portability, and maintenance.</p>

        <div className="space-y-6">
          <section className="bg-[#111118] border border-[#1a1a2e] rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-500" />
              Data Export
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Download your entire inventory database in portable formats for backup or migration.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleExport('json')}
                className="flex-1 bg-[#1a1a2e] hover:bg-[#252545] border border-[#1a1a2e] rounded-lg p-4 transition-colors text-center"
              >
                <div className="font-semibold mb-1">Export JSON</div>
                <div className="text-xs text-gray-400">Recommended for backups</div>
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="flex-1 bg-[#1a1a2e] hover:bg-[#252545] border border-[#1a1a2e] rounded-lg p-4 transition-colors text-center"
              >
                <div className="font-semibold mb-1">Export CSV</div>
                <div className="text-xs text-gray-400">Best for spreadsheets</div>
              </button>
            </div>
          </section>

          <section className="bg-[#111118] border border-[#1a1a2e] rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-500" />
              Data Import
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Import servers, groups, and tags from a previously exported JSON file.
            </p>
            <div className="relative group">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="border-2 border-dashed border-[#1a1a2e] group-hover:border-blue-500/50 rounded-lg p-8 transition-colors text-center">
                <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <div className="text-sm font-medium">Click to upload or drag & drop</div>
                <div className="text-xs text-gray-400 mt-1">Only .json files supported</div>
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
                <div className="text-sm text-gray-400 mt-1">
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
    </Layout>
  );
}
