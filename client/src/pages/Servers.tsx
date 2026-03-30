import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Filter, Download, Trash2, Columns } from 'lucide-react';
import toast from 'react-hot-toast';
import { ServerTable } from '../components/ServerTable';
import { ServerDrawer } from '../components/ServerDrawer';
import { AddServerModal } from '../components/AddServerModal';
import type { CustomColumn, Server } from '../types';
import api, { getApiErrorMessage } from '../lib/api';

type ApiListResponse<T> = { success: boolean; data: T };

export const Servers = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async () => {
    try {
      const [sRes, cRes] = await Promise.allSettled([
        api.get<ApiListResponse<Server[]>>('/servers'),
        api.get<ApiListResponse<CustomColumn[]>>('/custom-columns'),
      ]);

      if (sRes.status === 'fulfilled') {
        const rows = sRes.value?.data;
        setServers(Array.isArray(rows) ? rows : []);
      } else {
        toast.error(getApiErrorMessage(sRes.reason, 'Failed to load servers'));
      }

      if (cRes.status === 'fulfilled') {
        const cols = cRes.value?.data;
        setCustomColumns(Array.isArray(cols) ? cols : []);
      } else {
        toast.error(getApiErrorMessage(cRes.reason, 'Failed to load custom columns'));
      }
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Failed to load servers'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newColumnName.trim();
    if (!name) return;
    try {
      await api.post('/custom-columns', { name });
      setNewColumnName('');
      toast.success('Column added');
      await load();
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err && 'message' in err ? String((err as { message: string }).message) : 'Could not add column';
      toast.error(msg);
    }
  };

  const handleDeleteColumn = async (id: number, label: string) => {
    if (!window.confirm(`Delete column "${label}" and all values in that column?`)) return;
    try {
      await api.delete(`/custom-columns/${id}`);
      toast.success('Column removed');
      await load();
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: string }).message)
          : 'Could not remove column';
      toast.error(msg);
    }
  };

  return (
    <div className="page animate-in">
      <header className="page-header">
        <div className="page-header-text">
          <h1>Servers</h1>
          <p>Manage and monitor your infrastructure nodes.</p>
        </div>
        <button type="button" onClick={() => setIsModalOpen(true)} className="sv-btn-primary">
          <Plus className="h-4 w-4" /> Add Server
        </button>
      </header>

      {!loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="sv-card py-3">
            <p className="stat-card-label">Total</p>
            <p className="stat-card-value">{servers.length}</p>
          </div>
          <div className="sv-card py-3">
            <p className="stat-card-label">Online</p>
            <p className="stat-card-value text-green-600 dark:text-green-400">
              {servers.filter((s) => s.status === 'online' || s.status === 'active').length}
            </p>
          </div>
          <div className="sv-card py-3">
            <p className="stat-card-label">Offline</p>
            <p className="stat-card-value text-red-500">
              {servers.filter((s) => s.status !== 'online' && s.status !== 'active' && s.status !== 'maintenance').length}
            </p>
          </div>
          <div className="sv-card py-3">
            <p className="stat-card-label">Maintenance</p>
            <p className="stat-card-value text-yellow-500">
              {servers.filter((s) => s.status === 'maintenance').length}
            </p>
          </div>
        </div>
      )}

      <div className="sv-card space-y-4">
        <div className="flex flex-wrap items-start gap-4 border-b border-border pb-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-secondary">
              <Columns className="h-4 w-4 text-primary" aria-hidden />
              Custom columns
            </div>
            <form onSubmit={handleAddColumn} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="e.g. Rack, Owner, Cost center"
                className="sv-input h-10 min-w-[200px] max-w-md flex-1"
                maxLength={200}
                autoComplete="off"
              />
              <button type="submit" className="sv-btn-primary h-10 px-4">
                Add column
              </button>
            </form>
            {customColumns.length > 0 && (
              <ul className="flex flex-wrap gap-2 pt-1">
                {customColumns.map((col) => (
                  <li
                    key={col.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface/80 py-1 pl-2 pr-1 text-xs text-foreground"
                  >
                    <span className="max-w-[12rem] truncate" title={col.name}>
                      {col.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteColumn(col.id, col.name)}
                      className="rounded p-1 text-secondary transition-colors hover:bg-danger/15 hover:text-danger"
                      aria-label={`Remove column ${col.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative min-w-[300px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder="Search by hostname, IP, or tag..."
              className="sv-input h-11 w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="button" className="sv-btn-ghost flex h-11 items-center gap-2 border border-border px-4">
            <Filter className="h-4 w-4" /> Filters
          </button>
          <button type="button" className="sv-btn-ghost flex h-11 items-center gap-2 border border-border px-4">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>

        {loading ? (
          <div className="space-y-2 py-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-foreground/[0.04]" />
            ))}
          </div>
        ) : (
          <ServerTable
            servers={servers.filter((s) => {
              if (!searchTerm) return true;
              const q = searchTerm.toLowerCase();
              return (
                s.hostname?.toLowerCase().includes(q) ||
                s.ip_address?.toLowerCase().includes(q) ||
                s.name?.toLowerCase().includes(q) ||
                s.os?.toLowerCase().includes(q) ||
                s.tags?.some((t) => (typeof t === 'string' ? t : t.name).toLowerCase().includes(q))
              );
            })}
            customColumns={customColumns}
            onRowClick={(server) => setSelectedServer(server)}
          />
        )}
      </div>

      {selectedServer && (
        <ServerDrawer server={selectedServer} isOpen={!!selectedServer} onClose={() => setSelectedServer(null)} />
      )}

      <AddServerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customColumns={customColumns}
        onServerCreated={() => {
          load();
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};
