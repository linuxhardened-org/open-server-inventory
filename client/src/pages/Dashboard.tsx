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

const CHART_PRIMARY = '#6366f1';
const BAR_COLORS = ['#6366f1', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#64748b'];

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

const gridStroke = '#e2e8f0';
const axisStroke = '#64748b';
const tooltipBg = '#ffffff';
const tooltipBorder = '#e2e8f0';
const tooltipColor = '#0f172a';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function truncateLabel(name: string, max = 14): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
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
  <div className="sv-card">
    <div className="mb-4 flex items-start justify-between">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
        <Icon className="h-6 w-6 text-primary" />
      </div>
    </div>
    <p className="text-sm font-medium text-secondary">{label}</p>
    <h3 className="mt-1 text-2xl font-bold text-foreground">{value}</h3>
  </div>
);

export const Dashboard = () => {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);

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

  const groupChartData =
    stats?.serversByGroup.map((g) => ({
      name: truncateLabel(g.name),
      fullName: g.name,
      count: g.count,
    })) ?? [];

  const statusChartData = stats?.serversByStatus ?? [];

  return (
    <div className="mx-auto max-w-7xl animate-in space-y-8">
      <header className="page-header">
        <h1>Infrastructure overview</h1>
        <p>Health and capacity at a glance. Use the sidebar to manage servers, groups, and keys.</p>
      </header>

      {loading && !stats ? (
        <p className="text-sm text-secondary">Loading organization stats…</p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Server} label="Total servers" value={stats?.servers ?? '—'} />
        <StatCard icon={FolderOpen} label="Groups" value={stats?.groups ?? '—'} />
        <StatCard icon={Tags} label="Tags" value={stats?.tags ?? '—'} />
        <StatCard icon={KeyRound} label="SSH keys" value={stats?.sshKeys ?? '—'} />
      </div>

      {stats && stats.servers > 0 && (stats.capacity.avgCpuCores > 0 || stats.capacity.totalRamGb > 0) ? (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-secondary">
          <span className="font-medium text-foreground">Inventory capacity: </span>
          {stats.capacity.avgCpuCores > 0 ? (
            <span>Avg {stats.capacity.avgCpuCores.toFixed(1)} CPU cores per server</span>
          ) : null}
          {stats.capacity.avgCpuCores > 0 && stats.capacity.totalRamGb > 0 ? <span> · </span> : null}
          {stats.capacity.totalRamGb > 0 ? (
            <span>{stats.capacity.totalRamGb} GB RAM total across servers</span>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="sv-card">
          <h3 className="mb-6 text-base font-semibold text-foreground">Servers by group</h3>
          <div className="h-[300px]">
            {groupChartData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-secondary">
                No servers yet. Add servers to see distribution by group.
              </p>
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
                      borderRadius: '8px',
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
          <h3 className="mb-6 text-base font-semibold text-foreground">Servers by status</h3>
          <div className="h-[300px]">
            {statusChartData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-secondary">
                No status data yet.
              </p>
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
                      borderRadius: '8px',
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

      <div className="sv-card">
        <h3 className="mb-6 text-lg font-bold text-foreground">Recent activity</h3>
        {!stats || stats.recentActivity.length === 0 ? (
          <p className="text-sm text-secondary">
            No history yet. Changes to servers appear here after updates.
          </p>
        ) : (
          <div className="space-y-4">
            {stats.recentActivity.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-2 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/10">
                    <History className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      <span className="text-secondary">{row.serverName}</span>
                      {' · '}
                      {row.action}
                    </p>
                    <p className="text-xs text-secondary">
                      {formatWhen(row.createdAt)}
                      {row.username ? ` · ${row.username}` : ''}
                    </p>
                  </div>
                </div>
                <Link
                  to="/servers"
                  className="shrink-0 text-sm text-primary hover:underline sm:text-right"
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
