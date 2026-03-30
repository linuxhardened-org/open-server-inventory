import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Search, ExternalLink, Trash2, Globe, Lock, Server } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface ServerIp {
  id: number;
  ip_address: string;
  ip_type: 'public' | 'private' | 'ipv6';
  label: string | null;
  server_id: number;
  server_name: string;
  server_hostname: string;
  created_at: string;
}

const ipTypeConfig = {
  public: { label: 'Public', icon: Globe, color: '#3b82f6' },
  private: { label: 'Private', icon: Lock, color: '#8b5cf6' },
  ipv6: { label: 'IPv6', icon: Network, color: '#06b6d4' },
};

export const IpInventory = () => {
  const navigate = useNavigate();
  const [ips, setIps] = useState<ServerIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private' | 'ipv6'>('all');

  const fetchIps = useCallback(async () => {
    try {
      const res = await api.get('/ips');
      setIps(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load IPs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIps();
  }, [fetchIps]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this IP address?')) return;
    try {
      await api.delete(`/ips/${id}`);
      toast.success('IP deleted');
      fetchIps();
    } catch {
      toast.error('Failed to delete IP');
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

  // Group by type for stats
  const publicCount = ips.filter((ip) => ip.ip_type === 'public').length;
  const privateCount = ips.filter((ip) => ip.ip_type === 'private').length;
  const ipv6Count = ips.filter((ip) => ip.ip_type === 'ipv6').length;

  return (
    <div className="page animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header className="page-header">
        <div className="page-header-text">
          <div className="flex items-center gap-2">
            <h1>IP Inventory</h1>
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
          </div>
          <p>All IP addresses across your infrastructure.</p>
        </div>
      </header>

      {/* Stats */}
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
              <span style={{ fontWeight: 600, color: '#06b6d4' }}>{ipv6Count}</span> IPv6
            </span>
          </button>
        </div>
      )}

      {/* Search */}
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
          placeholder="Search by IP, server, or label..."
          className="sv-input"
          style={{ paddingLeft: 36, width: '100%', maxWidth: 400 }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: 48, textAlign: 'center', color: 'hsl(var(--fg-3))' }}>
          <span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid hsl(var(--border))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredIps.length === 0 && (
        <div className="flex flex-col items-center justify-center" style={{ padding: '48px 0', color: 'hsl(var(--fg-3))' }}>
          <Network style={{ width: 40, height: 40, opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 13 }}>
            {searchTerm || filterType !== 'all' ? 'No IPs match your search.' : 'No IP addresses yet. Add IPs to servers from the server details.'}
          </p>
        </div>
      )}

      {/* IP Table */}
      {!loading && filteredIps.length > 0 && (
        <div className="sv-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--fg-2))' }}>IP Address</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--fg-2))' }}>Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--fg-2))' }}>Server</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--fg-2))' }}>Label</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--fg-2))' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIps.map((ip, index) => {
                const typeConfig = ipTypeConfig[ip.ip_type];
                const TypeIcon = typeConfig.icon;
                return (
                  <motion.tr
                    key={ip.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    style={{ borderBottom: '1px solid hsl(var(--border))' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'hsl(var(--surface-2))'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
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
                          background: `${typeConfig.color}15`,
                          color: typeConfig.color,
                        }}
                      >
                        <TypeIcon style={{ width: 12, height: 12 }} />
                        {typeConfig.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/servers?server=${ip.server_id}`)}
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
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'hsl(var(--fg-2))' }}>
                      {ip.label || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(ip.id)}
                        className="sv-btn-ghost"
                        style={{ padding: 6, color: 'hsl(var(--danger))' }}
                        title="Delete IP"
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
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
