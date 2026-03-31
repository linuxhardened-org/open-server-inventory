import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, Download, Trash2, Columns, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ServerTable } from '../components/ServerTable';
import { ServerDrawer } from '../components/ServerDrawer';
import { AddServerModal } from '../components/AddServerModal';
import type { CustomColumn, Server, Group, Tag } from '../types';
import api, { getApiErrorMessage } from '../lib/api';
import { useRealtimeResource } from '../hooks/useRealtimeResource';

type ApiListResponse<T> = { success: boolean; data: T };

export const Servers = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [servers, setServers] = useState<Server[]>([]);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServerIds, setSelectedServerIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Get filter params from URL
  const filterGroupId = searchParams.get('group');
  const filterTagId = searchParams.get('tag');
  const serverIdFromUrl = searchParams.get('server');

  const load = useCallback(async () => {
    try {
      const [sRes, cRes, gRes, tRes] = await Promise.allSettled([
        api.get<ApiListResponse<Server[]>>('/servers'),
        api.get<ApiListResponse<CustomColumn[]>>('/custom-columns'),
        api.get<ApiListResponse<Group[]>>('/groups'),
        api.get<ApiListResponse<Tag[]>>('/tags'),
      ]);

      if (sRes.status === 'fulfilled') {
        const rows = sRes.value?.data;
        setServers(Array.isArray(rows) ? rows : []);
        setSelectedServerIds((prev) => prev.filter((id) => (Array.isArray(rows) ? rows : []).some((s) => s.id === id)));
      } else {
        toast.error(getApiErrorMessage(sRes.reason, 'Failed to load servers'));
      }

      if (cRes.status === 'fulfilled') {
        const cols = cRes.value?.data;
        setCustomColumns(Array.isArray(cols) ? cols : []);
      } else {
        toast.error(getApiErrorMessage(cRes.reason, 'Failed to load custom columns'));
      }

      if (gRes.status === 'fulfilled') {
        const grps = gRes.value?.data;
        setGroups(Array.isArray(grps) ? grps : []);
      }

      if (tRes.status === 'fulfilled') {
        const tgs = tRes.value?.data;
        setTags(Array.isArray(tgs) ? tgs : []);
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
  useRealtimeResource('servers', () => void load());
  useRealtimeResource('groups', () => void load());
  useRealtimeResource('tags', () => void load());
  useRealtimeResource('custom-columns', () => void load());

  // Open server drawer when linked from IP inventory (?server=id)
  useEffect(() => {
    if (!serverIdFromUrl || loading) return;
    const id = parseInt(serverIdFromUrl, 10);
    if (Number.isNaN(id)) return;
    const match = servers.find((s) => s.id === id);
    if (match) setSelectedServer(match);
  }, [serverIdFromUrl, servers, loading]);

  const [showExportMenu, setShowExportMenu] = useState(false);

  const closeDrawer = () => {
    setSelectedServer(null);
    if (searchParams.get('server')) {
      const next = new URLSearchParams(searchParams);
      next.delete('server');
      setSearchParams(next, { replace: true });
    }
  };

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
      toast.error(getApiErrorMessage(err, 'Could not add column'));
    }
  };

  const handleDeleteColumn = async (id: number, label: string) => {
    if (!window.confirm(`Delete column "${label}" and all values in that column?`)) return;
    try {
      await api.delete(`/custom-columns/${id}`);
      toast.success('Column removed');
      await load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not remove column'));
    }
  };

  // Clear filter from URL
  const clearFilters = () => {
    setSearchParams({});
  };

  // Get active filter info
  const activeFilterGroup = filterGroupId ? groups.find(g => g.id === parseInt(filterGroupId)) : null;
  const activeFilterTag = filterTagId ? tags.find(t => t.id === parseInt(filterTagId)) : null;

  // Filter servers by group or tag
  const filteredByParams = servers.filter((s) => {
    if (filterGroupId) {
      return s.group_id === parseInt(filterGroupId);
    }
    if (filterTagId) {
      const tagIdNum = parseInt(filterTagId);
      return s.tags?.some((t) => (typeof t === 'object' ? t.id : t) === tagIdNum);
    }
    return true;
  });

  const onlineCount = filteredByParams.filter((s) => s.status === 'online' || s.status === 'active').length;
  const offlineCount = filteredByParams.filter(
    (s) => s.status !== 'online' && s.status !== 'active' && s.status !== 'maintenance'
  ).length;
  const maintenanceCount = filteredByParams.filter((s) => s.status === 'maintenance').length;
  const visibleServers = useMemo(
    () =>
      filteredByParams.filter((s) => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
          s.hostname?.toLowerCase().includes(q) ||
          s.ip_address?.toLowerCase().includes(q) ||
          s.name?.toLowerCase().includes(q) ||
          s.os?.toLowerCase().includes(q) ||
          s.tags?.some((t) => (typeof t === 'string' ? t : t.name).toLowerCase().includes(q))
        );
      }),
    [filteredByParams, searchTerm]
  );
  const allVisibleSelected = visibleServers.length > 0 && visibleServers.every((s) => selectedServerIds.includes(s.id));

  const toggleServerSelected = (id: number) => {
    setSelectedServerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAllVisible = () => {
    setSelectedServerIds((prev) => {
      if (allVisibleSelected) return prev.filter((id) => !visibleServers.some((s) => s.id === id));
      const merged = new Set(prev);
      for (const s of visibleServers) merged.add(s.id);
      return [...merged];
    });
  };

  const handleBulkDeleteServers = async () => {
    if (selectedServerIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedServerIds.length} selected server(s)?`)) return;
    setBulkDeleting(true);
    try {
      const settled = await Promise.allSettled(selectedServerIds.map((id) => api.delete(`/servers/${id}`)));
      const ok = settled.filter((r) => r.status === 'fulfilled').length;
      const fail = settled.length - ok;
      if (ok > 0) toast.success(`Deleted ${ok} server${ok !== 1 ? 's' : ''}`);
      if (fail > 0) toast.error(`${fail} server delete operation${fail !== 1 ? 's' : ''} failed`);
      setSelectedServerIds([]);
      await load();
    } finally {
      setBulkDeleting(false);
    }
  };

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

      {/* Active filter banner */}
      {(activeFilterGroup || activeFilterTag) && (
        <div
          className="flex items-center gap-3"
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: 'hsl(var(--primary) / 0.08)',
            border: '1px solid hsl(var(--primary) / 0.2)',
          }}
        >
          <Filter style={{ width: 14, height: 14, color: 'hsl(var(--primary))' }} />
          <span style={{ fontSize: 13, color: 'hsl(var(--fg))' }}>
            Showing servers in{' '}
            {activeFilterGroup && (
              <strong style={{ color: 'hsl(var(--primary))' }}>Group: {activeFilterGroup.name}</strong>
            )}
            {activeFilterTag && (
              <strong style={{ color: activeFilterTag.color || 'hsl(var(--primary))' }}>Tag: {activeFilterTag.name}</strong>
            )}
          </span>
          <button
            type="button"
            onClick={clearFilters}
            className="sv-btn-ghost"
            style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 12, gap: 4 }}
          >
            <X style={{ width: 12, height: 12 }} /> Clear filter
          </button>
        </div>
      )}

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
              <span style={{ fontWeight: 600, color: 'hsl(var(--fg))' }}>{filteredByParams.length}</span> total
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
          <span style={{ fontSize: 12, color: 'hsl(var(--fg-2))' }}>
            {selectedServerIds.length} selected
          </span>
          <button
            type="button"
            className="sv-btn-ghost"
            style={{ border: '1px solid hsl(var(--border-2))', gap: 6 }}
            disabled={visibleServers.length === 0}
            onClick={toggleSelectAllVisible}
          >
            {allVisibleSelected ? 'Clear selection' : 'Select visible'}
          </button>
          <button
            type="button"
            className="sv-btn-ghost"
            style={{ border: '1px solid hsl(var(--border-2))', color: 'hsl(var(--danger))' }}
            disabled={selectedServerIds.length === 0 || bulkDeleting}
            onClick={handleBulkDeleteServers}
          >
            {bulkDeleting ? 'Deleting...' : 'Delete selected'}
          </button>
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
            servers={visibleServers}
            customColumns={customColumns}
            onRowClick={(server) => setSelectedServer(server)}
            selectedIds={selectedServerIds}
            onToggleSelect={toggleServerSelected}
            allSelected={allVisibleSelected}
            onToggleSelectAll={toggleSelectAllVisible}
          />
        )}
      </div>

      {selectedServer && (
        <ServerDrawer
          server={selectedServer}
          isOpen={!!selectedServer}
          onClose={closeDrawer}
          onUpdate={() => {
            load();
            setSelectedServer(null);
            if (searchParams.get('server')) {
              const next = new URLSearchParams(searchParams);
              next.delete('server');
              setSearchParams(next, { replace: true });
            }
          }}
          onRefresh={load}
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
