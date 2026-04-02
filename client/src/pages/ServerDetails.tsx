import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Server as ServerIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getApiErrorMessage } from '../lib/api';
import type { Server } from '../types';
import { nonEmptyTrim } from '../lib/utils';
import { parseLinodeNetworkExtras } from '../lib/linodeNetworkExtras';
import { LINODE_LOGO_URL } from '../lib/cloudAssets';

type ApiSingleResponse<T> = { success: boolean; data: T };

const Row = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 12, alignItems: 'start' }}>
    <div
      style={{
        fontSize: 11,
        color: 'hsl(var(--fg-3))',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        paddingTop: 2,
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: 14, color: 'hsl(var(--fg))', wordBreak: 'break-word' }}>{value}</div>
  </div>
);

export const ServerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [server, setServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get<ApiSingleResponse<Server>>(`/servers/${id}`);
        const payload = (res as unknown as ApiSingleResponse<Server>).data;
        setServer(payload ?? null);
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Failed to load server details'));
        setServer(null);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [id]);

  const statusColor = useMemo(() => {
    const status = (server?.status || '').toLowerCase();
    if (status === 'active' || status === 'online') return 'hsl(var(--success))';
    if (status === 'maintenance') return 'hsl(var(--warning))';
    if (status === 'offline') return 'hsl(var(--danger))';
    return 'hsl(var(--fg-2))';
  }, [server?.status]);

  if (loading) {
    return <div style={{ padding: 24, color: 'hsl(var(--fg-2))' }}>Loading server details...</div>;
  }

  if (!server) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: 'hsl(var(--danger))', marginBottom: 12 }}>Server not found.</div>
        <button type="button" className="sv-btn-secondary" onClick={() => navigate('/servers')}>
          Back to Servers
        </button>
      </div>
    );
  }

  const ex = parseLinodeNetworkExtras(server.linode_network_extras);

  return (
    <div style={{ padding: 20 }}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/servers" className="sv-btn-ghost flex items-center gap-2" style={{ padding: '8px 10px' }}>
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Back
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <ServerIcon style={{ width: 18, height: 18 }} />
              {server.name || server.hostname}
            </h1>
            <p style={{ color: 'hsl(var(--fg-3))', fontSize: 12 }}>Server ID: {server.id}</p>
          </div>
        </div>
      </div>

      <div className="sv-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Row label="Hostname" value={server.hostname || '—'} />
        {nonEmptyTrim(server.ip_address) && <Row label="Public IPv4" value={nonEmptyTrim(server.ip_address)!} />}
        {nonEmptyTrim(server.private_ip) && <Row label="Private IPv4" value={nonEmptyTrim(server.private_ip)!} />}
        {nonEmptyTrim(server.ipv6_address) && <Row label="Public IPv6" value={nonEmptyTrim(server.ipv6_address)!} />}
        {nonEmptyTrim(server.private_ipv6) && <Row label="Private IPv6" value={nonEmptyTrim(server.private_ipv6)!} />}
        {server.os && <Row label="OS" value={server.os} />}
        {server.region && <Row label="Region" value={server.region} />}
        <Row label="CPU" value={server.cpu_cores ? `${server.cpu_cores} cores` : '—'} />
        <Row label="RAM" value={server.ram_gb ? `${server.ram_gb} GB` : '—'} />
        {server.group_name && <Row label="Group" value={server.group_name} />}
        <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: 'hsl(var(--fg-3))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</div>
          <div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 6,
                background: `${statusColor}1A`,
                color: statusColor,
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
              {server.status || 'unknown'}
            </span>
          </div>
        </div>

        {server.tags && server.tags.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 12 }}>
            <div style={{ fontSize: 11, color: 'hsl(var(--fg-3))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {server.tags.map((tag, i) => {
                const name = typeof tag === 'string' ? tag : tag.name;
                const color = typeof tag === 'string' ? null : tag.color;
                return (
                  <span
                    key={`${name}-${i}`}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 500,
                      background: color ? `${color}20` : 'hsl(var(--surface-3))',
                      color: color || 'hsl(var(--fg-2))',
                    }}
                  >
                    {name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {ex &&
          (ex.additional_public_ipv4.length > 0 ||
            ex.additional_public_ipv6.length > 0 ||
            ex.vpc_ipv4.length > 0 ||
            ex.vpc_ipv6.length > 0 ||
            ex.nat_1_1_ipv4.length > 0 ||
            ex.vpc_subnet_lines.length > 0) && (
            <div style={{ marginTop: 6, paddingTop: 12, borderTop: '1px solid hsl(var(--border))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <img
                  src={LINODE_LOGO_URL}
                  alt="Linode"
                  style={{ height: 22, width: 'auto', maxWidth: 120, objectFit: 'contain' }}
                  referrerPolicy="no-referrer"
                />
                <span
                  style={{
                    fontSize: 11,
                    color: 'hsl(var(--fg-3))',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Linode network
                </span>
              </div>
              {ex.additional_public_ipv4.length > 0 && <Row label="Additional public IPv4" value={ex.additional_public_ipv4.join(', ')} />}
              {ex.additional_public_ipv6.length > 0 && <Row label="Additional public IPv6" value={ex.additional_public_ipv6.join(', ')} />}
              {ex.vpc_ipv4.length > 0 && <Row label="VPC IPv4 (private)" value={ex.vpc_ipv4.join(', ')} />}
              {ex.vpc_ipv6.length > 0 && <Row label="VPC IPv6 (private)" value={ex.vpc_ipv6.join(', ')} />}
              {ex.nat_1_1_ipv4.length > 0 && <Row label="NAT 1:1 (public)" value={ex.nat_1_1_ipv4.join(', ')} />}
              {ex.vpc_subnet_lines.length > 0 && <Row label="VPC subnet" value={ex.vpc_subnet_lines.join(' | ')} />}
            </div>
          )}

        {server.notes && <Row label="Notes" value={server.notes} />}
      </div>
    </div>
  );
};
