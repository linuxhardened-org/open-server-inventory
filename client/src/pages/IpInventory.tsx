import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Network, Search, ExternalLink, Trash2, Globe, Lock, Server, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api, { getApiErrorMessage } from '../lib/api';
import type { Server as ServerModel } from '../types';
import { useRealtimeResource } from '../hooks/useRealtimeResource';

interface ServerIp {
  id: number;
  ip_address: string;
  ip_type: 'public' | 'private' | 'ipv6' | 'private_ipv6';
  label: string | null;
  server_id: number;
  server_name: string;
  server_hostname: string;
  created_at: string;
  /** From servers.* columns — edit on server, not deleted here */
  source?: 'server' | 'catalog';
}

const ipTypeConfig = {
  public: { label: 'Public IPv4', icon: Globe, color: '#3b82f6' },
  private: { label: 'Private IPv4', icon: Lock, color: '#8b5cf6' },
  ipv6: { label: 'Public IPv6', icon: Network, color: '#06b6d4' },
  private_ipv6: { label: 'Private IPv6', icon: Lock, color: '#d946ef' },
};

type IpType = 'public' | 'private' | 'ipv6';

export const IpInventory = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [ips, setIps] = useState<ServerIp[]>([]);
  const [servers, setServers] = useState<ServerModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q')?.trim() ?? '');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private' | 'ipv6' | 'private_ipv6'>('all');

  const [addServerId, setAddServerId] = useState<number | ''>('');
  const [addAddress, setAddAddress] = useState('');
  const [addType, setAddType] = useState<IpType>('public');
  const [addLabel, setAddLabel] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchIps = useCallback(async () => {
    try {
      const res = (await api.get('/ips')) as { success?: boolean; data?: ServerIp[] };
      setIps(Array.isArray(res?.data) ? res.data : []);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to load IPs'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServers = useCallback(async () => {
    try {
      const res = (await api.get('/servers')) as { success?: boolean; data?: ServerModel[] };
      setServers(Array.isArray(res?.data) ? res.data : []);
    } catch {
      /* optional for add form */
    }
  }, []);

  useEffect(() => {
    void fetchIps();
    void fetchServers();
  }, [fetchIps, fetchServers]);
  useRealtimeResource('ips', () => void fetchIps());
  useRealtimeResource('servers', () => void fetchServers());

  // Keep search in sync with ?q= (shareable lookup links)
  useEffect(() => {
    setSearchTerm(searchParams.get('q')?.trim() ?? '');
  }, [searchParams]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set('q', value.trim());
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const handleDelete = async (ip: ServerIp) => {
    if (ip.source === 'server' || ip.id < 0) {
      toast.error('This address is stored on the server record. Edit the server under Servers to change it.');
      return;
    }
    if (!confirm('Delete this IP from the catalog?')) return;
    try {
      await api.delete(`/ips/${ip.id}`);
      toast.success('IP deleted');
      fetchIps();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to delete IP'));
    }
  };

  const handleAddIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addServerId === '' || !addAddress.trim()) {
      toast.error('Choose a server and enter an IP address');
      return;
    }
    setAdding(true);
    try {
      await api.post('/ips', {
        server_id: addServerId,
        ip_address: addAddress.trim(),
        ip_type: addType,
        label: addLabel.trim() || undefined,
      });
      toast.success('IP added');
      setAddAddress('');
      setAddLabel('');
      fetchIps();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not add IP'));
    } finally {
      setAdding(false);
    }
  };

  const filteredIps = ips.filter((ip) => {
    const matchesSearch =
      ip.ip_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ip.server_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ip.server_hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ip.label && ip.label.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || ip.ip_type === filterType;
    return matchesSearch && matchesType;
  });

  const publicCount = ips.filter((ip) => ip.ip_type === 'public').length;
  const privateCount = ips.filter((ip) => ip.ip_type === 'private').length;
  const ipv6Count = ips.filter((ip) => ip.ip_type === 'ipv6').length;
  const privateIpv6Count = ips.filter((ip) => ip.ip_type === 'private_ipv6').length;

  const serverRecordIpPicks = useMemo(() => {
    if (addServerId === '') return [] as { addr: string; type: IpType; hint: string }[];
    const sel = servers.find((s) => s.id === addServerId);
    if (!sel) return [];
    const out: { addr: string; type: IpType; hint: string }[] = [];
    if (sel.ip_address?.trim()) out.push({ addr: sel.ip_address.trim(), type: 'public', hint: 'Public IPv4' });
    if (sel.private_ip?.trim()) out.push({ addr: sel.private_ip.trim(), type: 'private', hint: 'Private IPv4' });
    if (sel.ipv6_address?.trim()) out.push({ addr: sel.ipv6_address.trim(), type: 'ipv6', hint: 'Public IPv6' });
    if (sel.private_ipv6?.trim()) out.push({ addr: sel.private_ipv6.trim(), type: 'ipv6', hint: 'Private IPv6 (catalog uses IPv6 type)' });
    return out;
  }, [addServerId, servers]);

  return (
    <div className="page animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header className="page-header">
        <div className="page-header-text">
          <div className="flex items-center gap-2">
            <h1>IP addresses</h1>
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
                {ips.length}
              </span>
            )}
          </div>
          <p>
            Includes every IP from your servers (public/private IPv4 and IPv6) plus extra addresses in the IP catalog.
            Search by address or hostname to see which server it belongs to.
          </p>
        </div>
      </header>

      <section className="sv-card" style={{ padding: 16 }}>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" aria-hidden />
          Add IP manually
        </h2>
        <form onSubmit={handleAddIp} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div className="min-w-0 sm:col-span-2">
              <label className="block text-xs font-medium text-secondary mb-1.5">Server</label>
              <select
                className="sv-input w-full"
                value={addServerId === '' ? '' : String(addServerId)}
                onChange={(e) => setAddServerId(e.target.value ? parseInt(e.target.value, 10) : '')}
                required
              >
                <option value="">Select server…</option>
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.hostname} ({s.hostname})
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-medium text-secondary mb-1.5">IP address</label>
              <input
                className="sv-input w-full font-mono text-sm"
                placeholder="192.0.2.10 or 2001:db8::1"
                value={addAddress}
                onChange={(e) => setAddAddress(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-medium text-secondary mb-1.5">Type</label>
              <select
                className="sv-input w-full"
                value={addType}
                onChange={(e) => setAddType(e.target.value as IpType)}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="ipv6">IPv6</option>
              </select>
            </div>
          </div>
          {serverRecordIpPicks.length > 0 && (
            <div>
              <p className="text-xs text-secondary mb-2">Pick from this server&apos;s saved addresses (click to fill the form):</p>
              <div className="flex flex-wrap gap-2">
                {serverRecordIpPicks.map((p) => (
                  <button
                    key={`${p.addr}-${p.type}`}
                    type="button"
                    className="text-xs px-2.5 py-1.5 rounded-md border border-border font-mono text-foreground transition-colors"
                    style={{ background: 'hsl(var(--surface-2))' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--surface-3))';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--surface-2))';
                    }}
                    onClick={() => {
                      setAddAddress(p.addr);
                      setAddType(p.type);
                    }}
                  >
                    {p.addr}
                    <span className="text-secondary ml-1.5 font-sans">({p.hint})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-secondary mb-1.5">Label (optional)</label>
              <input
                className="sv-input w-full"
                placeholder="e.g. eth1, VIP, management"
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
              />
            </div>
            <button type="submit" disabled={adding} className="sv-btn-primary h-[38px] shrink-0">
              {adding ? 'Adding…' : 'Add IP'}
            </button>
          </div>
        </form>
      </section>

      {!loading && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className="flex items-center gap-2"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: filterType === 'all' ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--surface-2))',
              border: filterType === 'all' ? '1px solid hsl(var(--primary) / 0.3)' : '1px solid hsl(var(--border))',
              cursor: 'pointer',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'hsl(var(--fg-3))' }} />
            <span style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}>
              <span style={{ fontWeight: 600, color: 'hsl(var(--fg))' }}>{ips.length}</span> total
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('public')}
            className="flex items-center gap-2"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: filterType === 'public' ? 'hsl(217 91% 55% / 0.1)' : 'hsl(var(--surface-2))',
              border: filterType === 'public' ? '1px solid hsl(217 91% 55% / 0.3)' : '1px solid hsl(var(--border))',
              cursor: 'pointer',
            }}
          >
            <Globe style={{ width: 12, height: 12, color: '#3b82f6' }} />
            <span style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}>
              <span style={{ fontWeight: 600, color: '#3b82f6' }}>{publicCount}</span> public
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('private')}
            className="flex items-center gap-2"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: filterType === 'private' ? 'hsl(262 83% 58% / 0.1)' : 'hsl(var(--surface-2))',
              border: filterType === 'private' ? '1px solid hsl(262 83% 58% / 0.3)' : '1px solid hsl(var(--border))',
              cursor: 'pointer',
            }}
          >
            <Lock style={{ width: 12, height: 12, color: '#8b5cf6' }} />
            <span style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}>
              <span style={{ fontWeight: 600, color: '#8b5cf6' }}>{privateCount}</span> private
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('ipv6')}
            className="flex items-center gap-2"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: filterType === 'ipv6' ? 'hsl(188 94% 43% / 0.1)' : 'hsl(var(--surface-2))',
              border: filterType === 'ipv6' ? '1px solid hsl(188 94% 43% / 0.3)' : '1px solid hsl(var(--border))',
              cursor: 'pointer',
            }}
          >
            <Network style={{ width: 12, height: 12, color: '#06b6d4' }} />
            <span style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}>
              <span style={{ fontWeight: 600, color: '#06b6d4' }}>{ipv6Count}</span> pub IPv6
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('private_ipv6')}
            className="flex items-center gap-2"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: filterType === 'private_ipv6' ? 'hsl(292 84% 61% / 0.1)' : 'hsl(var(--surface-2))',
              border: filterType === 'private_ipv6' ? '1px solid hsl(292 84% 61% / 0.3)' : '1px solid hsl(var(--border))',
              cursor: 'pointer',
            }}
          >
            <Lock style={{ width: 12, height: 12, color: '#d946ef' }} />
            <span style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}>
              <span style={{ fontWeight: 600, color: '#d946ef' }}>{privateIpv6Count}</span> prv IPv6
            </span>
          </button>
        </div>
      )}

      <div className="relative">
        <Search
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 16,
            height: 16,
            color: 'hsl(var(--fg-3))',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder="Search by IP, server name, hostname, or label…"
          className="sv-input"
          style={{ paddingLeft: 36, width: '100%', maxWidth: 480 }}
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {loading && (
        <div style={{ padding: 48, textAlign: 'center', color: 'hsl(var(--fg-3))' }}>
          <span
            style={{
              display: 'inline-block',
              width: 20,
              height: 20,
              border: '2px solid hsl(var(--border))',
              borderTopColor: 'hsl(var(--primary))',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      )}

      {!loading && filteredIps.length === 0 && (
        <div className="flex flex-col items-center justify-center" style={{ padding: '48px 0', color: 'hsl(var(--fg-3))' }}>
          <Network style={{ width: 40, height: 40, opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 13 }}>
            {searchTerm || filterType !== 'all'
              ? 'No IPs match your search.'
              : 'No IPs found. Add servers under Servers — their addresses appear here automatically.'}
          </p>
        </div>
      )}

      {!loading && filteredIps.length > 0 && (
        <div className="sv-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'hsl(var(--fg-2))',
                  }}
                >
                  IP Address
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'hsl(var(--fg-2))',
                  }}
                >
                  Type
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'hsl(var(--fg-2))',
                  }}
                >
                  Source
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'hsl(var(--fg-2))',
                  }}
                >
                  Server
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'hsl(var(--fg-2))',
                  }}
                >
                  Label
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'hsl(var(--fg-2))',
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredIps.map((ip, index) => {
                const typeConfig = ipTypeConfig[ip.ip_type];
                const TypeIcon = typeConfig?.icon ?? Network;
                const typeLabel = typeConfig?.label ?? ip.ip_type;
                const typeColor = typeConfig?.color ?? 'hsl(var(--fg-2))';
                const fromServer = ip.source === 'server' || ip.id < 0;
                return (
                  <motion.tr
                    key={`${ip.source ?? 'catalog'}-${ip.id}-${ip.ip_address}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    style={{ borderBottom: '1px solid hsl(var(--border))' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = 'hsl(var(--surface-2))';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = '';
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <code style={{ fontSize: 13, fontFamily: "'Geist Mono', monospace", color: 'hsl(var(--fg))' }}>
                        {ip.ip_address}
                      </code>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 500,
                          background: `${typeColor}15`,
                          color: typeColor,
                        }}
                      >
                        <TypeIcon style={{ width: 12, height: 12 }} />
                        {typeLabel}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: fromServer ? 'hsl(var(--surface-3))' : 'hsl(var(--primary) / 0.1)',
                          color: fromServer ? 'hsl(var(--fg-2))' : 'hsl(var(--primary))',
                        }}
                      >
                        {fromServer ? 'Server' : 'Catalog'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/servers/${ip.server_id}`)}
                        className="flex items-center gap-2"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'hsl(var(--primary))',
                          fontSize: 13,
                          padding: 0,
                        }}
                      >
                        <Server style={{ width: 12, height: 12 }} />
                        {ip.server_name}
                        <ExternalLink style={{ width: 10, height: 10, opacity: 0.5 }} />
                      </button>
                      <div style={{ fontSize: 11, color: 'hsl(var(--fg-3))' }}>{ip.server_hostname}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'hsl(var(--fg-2))' }}>{ip.label || '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {fromServer ? (
                        <span style={{ fontSize: 11, color: 'hsl(var(--fg-3))' }}>—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDelete(ip)}
                          className="sv-btn-ghost"
                          style={{ padding: 6, color: 'hsl(var(--danger))' }}
                          title="Remove from catalog"
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
