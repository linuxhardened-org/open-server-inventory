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

  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = async (format: 'json' | 'csv') => {
    setShowExportMenu(false);
    try {
      const endpoint = format === 'csv' ? '/api/export-import/export/csv' : '/api/export-import/export';
      const response = await fetch(endpoint, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `servervault-export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`${format.toUpperCase()} export downloaded`);
    } catch (err) {
      toast.error('Failed to export data');
    }
  };

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

  const onlineCount = servers.filter((s) => s.status === 'online' || s.status === 'active').length;
  const offlineCount = servers.filter(
    (s) => s.status !== 'online' && s.status !== 'active' && s.status !== 'maintenance'
  ).length;
  const maintenanceCount = servers.filter((s) => s.status === 'maintenance').length;

  return (
    <div className="page animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page header */}
      <header className="page-header">
        <div className="page-header-text">
          <div className="flex items-center gap-2">
            <h1>Servers</h1>
            {!loading && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 24,
                  height: 20,
                  borderRadius: 9999,
                  padding: '0 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  background: 'hsl(var(--surface-3))',
                  color: 'hsl(var(--fg-2))',
                  border: '1px solid hsl(var(--border-2))',
                }}
              >
                {servers.length}
              </span>
            )}
          </div>
          <p>Manage and monitor your infrastructure nodes.</p>
        </div>
        <button type="button" onClick={() => setIsModalOpen(true)} className="sv-btn-primary">
          <Plus style={{ width: 15, height: 15 }} aria-hidden /> Add Server
        </button>
      </header>

      {/* Stat pills row */}
      {!loading && (
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center gap-2"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: 'hsl(var(--surface-2))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            <span
              style={{ width: 7, height: 7, borderRadius: '50%', background: 'hsl(var(--fg-3))', flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}>
              <span style={{ fontWeight: 600, color: 'hsl(var(--fg))' }}>{servers.length}</span> total
            </span>
          </div>
          <div
            className="flex items-center gap-2"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: 'hsl(var(--surface-2))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            <span
              style={{ width: 7, height: 7, borderRadius: '50%', background: '#3ecf8e', flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}>
              <span style={{ fontWeight: 600, color: '#3ecf8e' }}>{onlineCount}</span> online
            </span>
          </div>
          <div
            className="flex items-center gap-2"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: 'hsl(var(--surface-2))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            <span
              style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}>
              <span style={{ fontWeight: 600, color: '#ef4444' }}>{offlineCount}</span> offline
            </span>
          </div>
          <div
            className="flex items-center gap-2"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: 'hsl(var(--surface-2))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            <span
              style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}>
              <span style={{ fontWeight: 600, color: '#f59e0b' }}>{maintenanceCount}</span> maintenance
            </span>
          </div>
        </div>
      )}

      {/* Custom columns + search + table card */}
      <div className="sv-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Custom columns section */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            gap: 16,
            paddingBottom: 16,
            borderBottom: '1px solid hsl(var(--border))',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--fg-2))' }}>
              <Columns style={{ width: 14, height: 14, color: 'hsl(var(--primary))' }} aria-hidden />
              Custom columns
            </div>
            <form onSubmit={handleAddColumn} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="e.g. Rack, Owner, Cost center"
                className="sv-input"
                style={{ minWidth: 200, maxWidth: 320, flex: 1 }}
                maxLength={200}
                autoComplete="off"
              />
              <button type="submit" className="sv-btn-primary">
                Add column
              </button>
            </form>
            {customColumns.length > 0 && (
              <ul className="flex flex-wrap gap-2" style={{ paddingTop: 4 }}>
                {customColumns.map((col) => (
                  <li
                    key={col.id}
                    className="inline-flex items-center gap-1"
                    style={{
                      borderRadius: 8,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--surface-2))',
                      padding: '4px 4px 4px 10px',
                      fontSize: 12,
                      color: 'hsl(var(--fg))',
                    }}
                  >
                    <span
                      style={{ maxWidth: '12rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={col.name}
                    >
                      {col.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteColumn(col.id, col.name)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 22,
                        height: 22,
                        borderRadius: 5,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: 'hsl(var(--fg-3))',
                        transition: 'background 80ms, color 80ms',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--danger) / 0.12)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--danger))';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'none';
                        (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--fg-3))';
                      }}
                      aria-label={`Remove column ${col.name}`}
                    >
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Search + filter toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative" style={{ minWidth: 300, flex: 1 }}>
            <Search
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 14,
                height: 14,
                color: 'hsl(var(--fg-3))',
                pointerEvents: 'none',
              }}
              aria-hidden
            />
            <input
              type="text"
              placeholder="Search by hostname, IP, or tag..."
              className="sv-input font-mono"
              style={{ paddingLeft: 32, fontFamily: undefined }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="sv-btn-ghost"
            style={{ border: '1px solid hsl(var(--border-2))', gap: 6 }}
          >
            <Filter style={{ width: 14, height: 14 }} aria-hidden /> Filters
          </button>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="sv-btn-ghost"
              style={{ border: '1px solid hsl(var(--border-2))', gap: 6 }}
            >
              <Download style={{ width: 14, height: 14 }} aria-hidden /> Export
            </button>
            {showExportMenu && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                  onClick={() => setShowExportMenu(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 4,
                    background: 'hsl(var(--surface))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    overflow: 'hidden',
                    zIndex: 50,
                    minWidth: 140,
                    boxShadow: '0 4px 12px hsl(var(--bg) / 0.5)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleExport('json')}
                    className="sv-btn-ghost"
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      borderRadius: 0,
                      padding: '10px 14px',
                      fontSize: 13,
                    }}
                  >
                    Export as JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('csv')}
                    className="sv-btn-ghost"
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      borderRadius: 0,
                      padding: '10px 14px',
                      fontSize: 13,
                      borderTop: '1px solid hsl(var(--border-2))',
                    }}
                  >
                    Export as CSV
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />
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
        <ServerDrawer
          server={selectedServer}
          isOpen={!!selectedServer}
          onClose={() => setSelectedServer(null)}
          onUpdate={() => { load(); setSelectedServer(null); }}
        />
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
