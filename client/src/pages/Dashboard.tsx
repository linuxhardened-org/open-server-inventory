import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Server, FolderOpen, Tags, KeyRound, History } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import api, { getApiErrorMessage } from '../lib/api';

// Fixed hex values for Recharts (CSS vars don't work inside Recharts)
const CHART_PRIMARY = '#3ecf8e';
const BAR_COLORS = ['#3ecf8e', '#22c55e', '#10b981', '#34d399', '#6ee7b7', '#06b6d4', '#64748b'];

// Chart theme-aware constants — use inline fixed values since Recharts doesn't read CSS vars
const TOOLTIP_BG_LIGHT = '#ffffff';
const TOOLTIP_BG_DARK = '#161b27';
const TOOLTIP_BORDER_LIGHT = '#dde3ee';
const TOOLTIP_BORDER_DARK = '#242c3d';
const TOOLTIP_TEXT_LIGHT = '#151f38';
const TOOLTIP_TEXT_DARK = '#ecf0f8';
const GRID_STROKE_LIGHT = '#dde3ee';
const GRID_STROKE_DARK = '#1f2840';
const AXIS_STROKE_LIGHT = '#6e7f9e';
const AXIS_STROKE_DARK = '#5a6a84';

type StatsPayload = {
  servers: number;
  groups: number;
  tags: number;
  sshKeys: number;
  serversByStatus: { status: string; count: number }[];
  serversByGroup: { name: string; count: number }[];
  capacity: { avgCpuCores: number; avgRamGb: number; totalRamGb: number };
  recentActivity: {
    id: number;
    serverId: number;
    serverName: string;
    action: string;
    username: string | null;
    createdAt: string;
  }[];
};

type ApiStatsResponse = { success: boolean; data: StatsPayload };

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function truncateLabel(name: string, max = 14): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

const StatCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Server;
  label: string;
  value: string | number;
}) => (
  <div className="sv-card stat-card">
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: 'hsl(var(--primary) / 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'hsl(var(--primary))',
        flexShrink: 0,
        marginBottom: 8,
      }}
    >
      <Icon size={17} strokeWidth={1.75} />
    </div>
    <p className="stat-card-label">{label}</p>
    <p className="stat-card-value">{value}</p>
  </div>
);

export const Dashboard = () => {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [, forceUpdate] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await api.get('/stats')) as ApiStatsResponse;
      if (res?.data) setStats(res.data);
      else setStats(null);
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Failed to load dashboard'));
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-render when theme changes so chart colors update
  useEffect(() => {
    const observer = new MutationObserver(() => forceUpdate((n) => n + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const groupChartData =
    stats?.serversByGroup.map((g) => ({
      name: truncateLabel(g.name),
      fullName: g.name,
      count: g.count,
    })) ?? [];

  const statusChartData = stats?.serversByStatus ?? [];

  const dark = isDarkMode();
  const gridStroke = dark ? GRID_STROKE_DARK : GRID_STROKE_LIGHT;
  const axisStroke = dark ? AXIS_STROKE_DARK : AXIS_STROKE_LIGHT;
  const tooltipBg = dark ? TOOLTIP_BG_DARK : TOOLTIP_BG_LIGHT;
  const tooltipBorder = dark ? TOOLTIP_BORDER_DARK : TOOLTIP_BORDER_LIGHT;
  const tooltipColor = dark ? TOOLTIP_TEXT_DARK : TOOLTIP_TEXT_LIGHT;

  return (
    <div className="page animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header className="page-header">
        <div className="page-header-text">
          <h1>Infrastructure overview</h1>
          <p>Health and capacity at a glance.</p>
        </div>
      </header>

      {loading && !stats ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="sv-card skeleton" style={{ height: 96 }} />
          ))}
        </div>
      ) : null}

      {!loading && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Server} label="Total servers" value={stats?.servers ?? '—'} />
          <StatCard icon={FolderOpen} label="Groups" value={stats?.groups ?? '—'} />
          <StatCard icon={Tags} label="Tags" value={stats?.tags ?? '—'} />
          <StatCard icon={KeyRound} label="SSH keys" value={stats?.sshKeys ?? '—'} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="sv-card">
          <p className="card-section-title">Servers by group</p>
          <div style={{ height: 280 }}>
            {groupChartData.length === 0 ? (
              <div
                className="flex items-center justify-center h-full"
                style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}
              >
                No servers yet. Add servers to see distribution by group.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke={axisStroke}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke={axisStroke} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    itemStyle={{ color: tooltipColor }}
                    formatter={(value: number) => [value, 'Servers']}
                    labelFormatter={(label, payload) => {
                      const full = payload?.[0]?.payload?.fullName;
                      return full != null ? String(full) : String(label ?? '');
                    }}
                  />
                  <Bar dataKey="count" fill={CHART_PRIMARY} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="sv-card">
          <p className="card-section-title">Servers by status</p>
          <div style={{ height: 280 }}>
            {statusChartData.length === 0 ? (
              <div
                className="flex items-center justify-center h-full"
                style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}
              >
                No status data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="status"
                    stroke={axisStroke}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke={axisStroke} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    itemStyle={{ color: tooltipColor }}
                    formatter={(value: number) => [value, 'Servers']}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {statusChartData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="sv-card">
        <p className="card-section-title">Recent activity</p>
        {!stats || stats.recentActivity.length === 0 ? (
          <p style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}>
            No history yet. Changes to servers appear here after updates.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {stats.recentActivity.map((row, i) => (
              <div
                key={row.id}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                style={{
                  padding: '12px 0',
                  borderBottom: i < stats.recentActivity.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'hsl(var(--primary) / 0.08)',
                      border: '1px solid hsl(var(--primary) / 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <History style={{ width: 16, height: 16, color: 'hsl(var(--fg-2))' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, color: 'hsl(var(--fg))', fontWeight: 500 }}>
                      <span style={{ color: 'hsl(var(--fg-2))' }}>{row.serverName}</span>
                      {' · '}
                      {row.action}
                    </p>
                    <p style={{ fontSize: 12, color: 'hsl(var(--fg-3))', marginTop: 2 }}>
                      {formatWhen(row.createdAt)}
                      {row.username ? ` · ${row.username}` : ''}
                    </p>
                  </div>
                </div>
                <Link
                  to="/servers"
                  style={{ fontSize: 13, color: 'hsl(var(--primary))', textDecoration: 'none', flexShrink: 0 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'; }}
                >
                  View servers
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
