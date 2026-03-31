import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Server, Pencil, Trash2, Save, RefreshCw, Network } from 'lucide-react';
import { Server as ServerType } from '../types';
import api, { getApiErrorMessage } from '../lib/api';
import { nonEmptyTrim } from '../lib/utils';
import { LINODE_LOGO_URL } from '../lib/cloudAssets';
import { parseLinodeNetworkExtras } from '../lib/linodeNetworkExtras';
import toast from 'react-hot-toast';

interface ExtraIp {
  id: number;
  server_id: number;
  ip_address: string;
  ip_type: 'public' | 'private' | 'ipv6' | 'private_ipv6';
  label: string | null;
  created_at: string;
  server_name?: string;
  server_hostname?: string;
  source?: 'server' | 'catalog';
}

export const ServerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [server, setServer] = useState<ServerType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', hostname: '', ip_address: '', private_ip: '',
    ipv6_address: '', private_ipv6: '', os: '', cpu_cores: '',
    ram_gb: '', status: '', notes: '',
  });

  const [extraIps, setExtraIps] = useState<ExtraIp[]>([]);
  const [loadingIps, setLoadingIps] = useState(false);
  const [newIpAddr, setNewIpAddr] = useState('');
  const [newIpType, setNewIpType] = useState<'public' | 'private' | 'ipv6'>('public');
  const [newIpLabel, setNewIpLabel] = useState('');
  const [addingIp, setAddingIp] = useState(false);

  const loadServer = useCallback(async () => {
    if (!id) return;
    try {
      const res = (await api.get(`/servers/${id}`)) as { data?: ServerType };
      setServer(res.data ?? null);
    } catch {
      toast.error('Server not found');
      navigate('/servers');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const loadExtraIps = useCallback(async () => {
    if (!id) return;
    setLoadingIps(true);
    try {
      const res = (await api.get(`/ips/server/${id}`)) as { data?: ExtraIp[] };
      setExtraIps(Array.isArray(res.data) ? res.data : []);
    } catch {
      setExtraIps([]);
    } finally {
      setLoadingIps(false);
    }
  }, [id]);

  useEffect(() => { void loadServer(); }, [loadServer]);
  useEffect(() => { void loadExtraIps(); }, [loadExtraIps]);

  const startEdit = () => {
    if (!server) return;
    setForm({
      name: server.name || '',
      hostname: server.hostname || '',
      ip_address: server.ip_address || '',
      private_ip: server.private_ip || '',
      ipv6_address: server.ipv6_address || '',
      private_ipv6: server.private_ipv6 || '',
      os: server.os || '',
      cpu_cores: server.cpu_cores?.toString() || '',
      ram_gb: server.ram_gb?.toString() || '',
      status: server.status || 'active',
      notes: server.notes || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!server) return;
    setSaving(true);
    try {
      await api.put(`/servers/${server.id}`, {
        name: form.name || form.hostname,
        hostname: form.hostname,
        ip_address: form.ip_address || null,
        private_ip: form.private_ip || null,
        ipv6_address: form.ipv6_address || null,
        private_ipv6: form.private_ipv6 || null,
        os: form.os || null,
        cpu_cores: form.cpu_cores ? parseInt(form.cpu_cores) : null,
        ram_gb: form.ram_gb ? parseInt(form.ram_gb) : null,
        status: form.status,
        notes: form.notes || null,
      });
      toast.success('Server updated');
      setEditing(false);
      void loadServer();
    } catch (err: any) {
      toast.error(err?.error || 'Failed to update server');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!server || !confirm('Delete this server?')) return;
    try {
      await api.delete(`/servers/${server.id}`);
      toast.success('Server deleted');
      navigate('/servers');
    } catch (err: any) {
      toast.error(err?.error || 'Failed to delete server');
    }
  };

  const handleSync = async () => {
    if (!server?.cloud_provider_id) return;
    setSyncing(true);
    try {
      await api.post(`/cloud-providers/${server.cloud_provider_id}/sync`);
      toast.success('Synced from cloud');
      void loadServer();
      void loadExtraIps();
    } catch (err: any) {
      toast.error(err?.error || 'Failed to sync');
    } finally {
      setSyncing(false);
    }
  };

  const handleAddExtraIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!server?.id || !newIpAddr.trim()) return;
    setAddingIp(true);
    try {
      await api.post('/ips', {
        server_id: server.id,
        ip_address: newIpAddr.trim(),
        ip_type: newIpType,
        label: newIpLabel.trim() || undefined,
      });
      toast.success('IP added');
      setNewIpAddr('');
      setNewIpLabel('');
      void loadExtraIps();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not add IP'));
    } finally {
      setAddingIp(false);
    }
  };

  const handleDeleteExtraIp = async (row: ExtraIp) => {
    if (row.source === 'server' || row.id < 0) {
      toast.error('This address is on the server record. Edit the server to change it.');
      return;
    }
    if (!confirm('Remove this IP from the catalog?')) return;
    try {
      await api.delete(`/ips/${row.id}`);
      toast.success('IP removed');
      void loadExtraIps();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not remove IP'));
    }
  };

  if (loading) {
    return (
      <div className="page animate-in">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 0' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 40, borderRadius: 8 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!server) return null;

  const statusColor = server.status === 'online' || server.status === 'active'
    ? 'hsl(var(--success))' : 'hsl(var(--danger))';

  return (
    <div className="page animate-in">
      {/* Header */}
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate('/servers')}
            className="sv-btn-ghost"
            style={{ padding: '6px 10px', gap: 6 }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server style={{ width: 18, height: 18, color: 'hsl(var(--primary))' }} />
            <div>
              <h1 style={{ margin: 0 }}>{editing ? 'Edit Server' : (server.name || server.hostname)}</h1>
              {server.name && !editing && (
                <p style={{ margin: 0, fontSize: 12, color: 'hsl(var(--fg-3))' }}>{server.hostname}</p>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {editing ? (
            <>
              <button type="button" onClick={() => setEditing(false)} className="sv-btn-ghost" style={{ padding: '6px 14px' }}>
                Cancel
              </button>
              <button type="button" onClick={handleSave} disabled={saving || !form.hostname} className="sv-btn-primary" style={{ padding: '6px 14px', gap: 6 }}>
                <Save style={{ width: 14, height: 14 }} />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={handleDelete} className="sv-btn-ghost" style={{ padding: '6px 10px', color: 'hsl(var(--danger))' }}>
                <Trash2 style={{ width: 14, height: 14 }} />
                Delete
              </button>
              {server.cloud_provider_id ? (
                <button type="button" onClick={handleSync} disabled={syncing} className="sv-btn-primary" style={{ padding: '6px 14px', gap: 6 }}>
                  <RefreshCw style={{ width: 14, height: 14, animation: syncing ? 'spin 1s linear infinite' : undefined }} />
                  {syncing ? 'Syncing...' : 'Sync'}
                </button>
              ) : (
                <button type="button" onClick={startEdit} className="sv-btn-primary" style={{ padding: '6px 14px', gap: 6 }}>
                  <Pencil style={{ width: 14, height: 14 }} />
                  Edit
                </button>
              )}
            </>
          )}
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginTop: 8 }}>
        {/* Main details */}
        <div className="sv-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: 'hsl(var(--fg-2))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Details
          </h3>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Hostname" value={form.hostname} onChange={(v) => setForm({ ...form, hostname: v })} required />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Public IPv4" value={form.ip_address} onChange={(v) => setForm({ ...form, ip_address: v })} />
                <Field label="Private IPv4" value={form.private_ip} onChange={(v) => setForm({ ...form, private_ip: v })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Public IPv6" value={form.ipv6_address} onChange={(v) => setForm({ ...form, ipv6_address: v })} />
                <Field label="Private IPv6" value={form.private_ipv6} onChange={(v) => setForm({ ...form, private_ipv6: v })} />
              </div>
              <Field label="OS" value={form.os} onChange={(v) => setForm({ ...form, os: v })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="CPU Cores" value={form.cpu_cores} onChange={(v) => setForm({ ...form, cpu_cores: v })} type="number" />
                <Field label="RAM (GB)" value={form.ram_gb} onChange={(v) => setForm({ ...form, ram_gb: v })} type="number" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'hsl(var(--fg-2))', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="sv-input" style={{ width: '100%' }}>
                  <option value="active">Active</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'hsl(var(--fg-2))', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="sv-input" style={{ width: '100%', minHeight: 80, resize: 'vertical' }} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Row label="Name" value={server.name || server.hostname} />
              <Row label="Hostname" value={server.hostname} mono />
              {nonEmptyTrim(server.ip_address) && <Row label="Public IPv4" value={nonEmptyTrim(server.ip_address)!} mono />}
              {nonEmptyTrim(server.private_ip) && <Row label="Private IPv4" value={nonEmptyTrim(server.private_ip)!} mono />}
              {nonEmptyTrim(server.ipv6_address) && <Row label="Public IPv6" value={nonEmptyTrim(server.ipv6_address)!} mono />}
              {nonEmptyTrim(server.private_ipv6) && <Row label="Private IPv6" value={nonEmptyTrim(server.private_ipv6)!} mono />}
              <Row label="OS" value={server.os || '—'} />
              {server.region && <Row label="Region" value={server.region} />}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Row label="CPU" value={server.cpu_cores ? `${server.cpu_cores} cores` : '—'} />
                <Row label="RAM" value={server.ram_gb ? `${server.ram_gb} GB` : '—'} />
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'hsl(var(--fg-3))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</span>
                <div style={{ marginTop: 4 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 4, background: server.status === 'online' || server.status === 'active' ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--danger) / 0.1)', color: statusColor, fontSize: 11, fontWeight: 500, textTransform: 'capitalize' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
                    {server.status || 'Unknown'}
                  </span>
                </div>
              </div>
              {server.group_name && <Row label="Group" value={server.group_name} />}
              {server.tags && server.tags.length > 0 && (
                <div>
                  <span style={{ fontSize: 11, color: 'hsl(var(--fg-3))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tags</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {server.tags.map((tag, i) => {
                      const name = typeof tag === 'string' ? tag : tag.name;
                      const color = typeof tag === 'string' ? null : tag.color;
                      return (
                        <span key={i} style={{ padding: '2px 6px', borderRadius: 3, background: color ? `${color}20` : 'hsl(var(--surface-3))', color: color || 'hsl(var(--fg-2))', fontSize: 10, fontWeight: 500 }}>
                          {name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {server.notes && <Row label="Notes" value={server.notes} />}
            </div>
          )}
        </div>

        {/* Network / IPs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Linode network extras */}
          {(() => {
            const ex = parseLinodeNetworkExtras(server.linode_network_extras);
            if (!ex) return null;
            const hasBlock = ex.additional_public_ipv4.length > 0 || ex.additional_public_ipv6.length > 0 || ex.vpc_ipv4.length > 0 || ex.vpc_ipv6.length > 0 || ex.nat_1_1_ipv4.length > 0 || ex.vpc_subnet_lines.length > 0;
            if (!hasBlock) return null;
            return (
              <div className="sv-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  {server.cloud_provider_id && <img src={LINODE_LOGO_URL} alt="Linode" style={{ height: 20, width: 'auto', objectFit: 'contain' }} referrerPolicy="no-referrer" />}
                  <span style={{ fontSize: 11, color: 'hsl(var(--fg-3))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Linode network</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ex.additional_public_ipv4.length > 0 && <Row label="Additional public IPv4" value={ex.additional_public_ipv4.join(', ')} mono />}
                  {ex.additional_public_ipv6.length > 0 && <Row label="Additional public IPv6" value={ex.additional_public_ipv6.join(', ')} mono />}
                  {ex.vpc_ipv4.length > 0 && <Row label="VPC IPv4 (private)" value={ex.vpc_ipv4.join(', ')} mono />}
                  {ex.vpc_ipv6.length > 0 && <Row label="VPC IPv6 (private)" value={ex.vpc_ipv6.join(', ')} mono />}
                  {ex.nat_1_1_ipv4.length > 0 && <Row label="NAT 1:1 (public)" value={ex.nat_1_1_ipv4.join(', ')} mono />}
                  {ex.vpc_subnet_lines.length > 0 && <Row label="VPC subnet" value={ex.vpc_subnet_lines.join('\n')} mono multiline />}
                </div>
              </div>
            );
          })()}

          {/* IP catalog */}
          <div className="sv-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Network style={{ width: 14, height: 14, color: 'hsl(var(--primary))' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--fg-2))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>All IPs</span>
            </div>
            <p style={{ fontSize: 11, color: 'hsl(var(--fg-3))', marginBottom: 10 }}>
              Server fields + catalog. Edit server to change public/private IPv4 and IPv6 on the record.
            </p>
            {loadingIps ? (
              <p style={{ fontSize: 12, color: 'hsl(var(--fg-3))' }}>Loading…</p>
            ) : extraIps.length === 0 ? (
              <p style={{ fontSize: 12, color: 'hsl(var(--fg-3))', marginBottom: 10 }}>No addresses yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: '0 0 12px', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {extraIps.map((ip) => (
                  <li key={`${ip.source ?? 'c'}-${ip.id}-${ip.ip_address}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12, padding: '6px 8px', borderRadius: 6, background: 'hsl(var(--surface-2))' }}>
                    <div style={{ minWidth: 0 }}>
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'hsl(var(--fg))' }}>{ip.ip_address}</code>
                      <span style={{ marginLeft: 8, fontSize: 10, color: 'hsl(var(--fg-2))' }}>{ip.ip_type}</span>
                      {ip.label && <span style={{ marginLeft: 6, fontSize: 10, color: 'hsl(var(--fg-3))' }}>({ip.label})</span>}
                      <span style={{ marginLeft: 8, fontSize: 9, color: 'hsl(var(--fg-3))' }}>{ip.source === 'server' || ip.id < 0 ? 'server' : 'catalog'}</span>
                    </div>
                    {ip.source === 'server' || ip.id < 0 ? (
                      <span style={{ fontSize: 10, color: 'hsl(var(--fg-3))' }}>—</span>
                    ) : (
                      <button type="button" onClick={() => handleDeleteExtraIp(ip)} style={{ border: 'none', background: 'none', color: 'hsl(var(--danger))', cursor: 'pointer', padding: 4 }} title="Remove from catalog">
                        <Trash2 style={{ width: 12, height: 12 }} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleAddExtraIp} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 10, color: 'hsl(var(--fg-2))', display: 'block', marginBottom: 4 }}>Address</label>
                  <input className="sv-input" style={{ width: '100%', fontSize: 12 }} placeholder="IP or IPv6" value={newIpAddr} onChange={(e) => setNewIpAddr(e.target.value)} autoComplete="off" />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: 'hsl(var(--fg-2))', display: 'block', marginBottom: 4 }}>Type</label>
                  <select className="sv-input" style={{ width: '100%', fontSize: 12 }} value={newIpType} onChange={(e) => setNewIpType(e.target.value as 'public' | 'private' | 'ipv6')}>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="ipv6">IPv6</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button type="submit" disabled={addingIp || !newIpAddr.trim()} className="sv-btn-primary" style={{ padding: '6px 12px', fontSize: 12, width: '100%' }}>
                    {addingIp ? '…' : 'Add IP'}
                  </button>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 10, color: 'hsl(var(--fg-2))', display: 'block', marginBottom: 4 }}>Label (optional)</label>
                  <input className="sv-input" style={{ width: '100%', fontSize: 12 }} placeholder="e.g. eth1" value={newIpLabel} onChange={(e) => setNewIpLabel(e.target.value)} />
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

function Row({ label, value, mono, multiline }: { label: string; value: string; mono?: boolean; multiline?: boolean }) {
  return (
    <div>
      <span style={{ fontSize: 11, color: 'hsl(var(--fg-3))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <p style={{ margin: '3px 0 0', fontSize: 13, color: 'hsl(var(--fg))', fontFamily: mono ? 'var(--font-mono)' : undefined, whiteSpace: multiline ? 'pre-line' : undefined }}>
        {value}
      </p>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'hsl(var(--fg-2))', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label} {required && <span style={{ color: 'hsl(var(--danger))' }}>*</span>}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="sv-input" style={{ width: '100%' }} required={required} />
    </div>
  );
}
