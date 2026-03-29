import { 
  Server, 
  Activity, 
  Shield, 
  Cpu, 
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { useThemeStore } from '../store/useThemeStore';

const data = [
  { name: '00:00', cpu: 40, mem: 24 },
  { name: '04:00', cpu: 30, mem: 13 },
  { name: '08:00', cpu: 20, mem: 98 },
  { name: '12:00', cpu: 27, mem: 39 },
  { name: '16:00', cpu: 18, mem: 48 },
  { name: '20:00', cpu: 23, mem: 38 },
  { name: '23:59', cpu: 34, mem: 43 },
];

const StatCard = ({ icon: Icon, label, value, trend, trendValue }: any) => (
  <div className="card">
    <div className="flex items-start justify-between mb-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/[0.05] dark:bg-white/5">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div className={trend === 'up' ? 'text-success' : 'text-danger'}>
        <div className="flex items-center gap-1 text-sm font-medium">
          {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {trendValue}
        </div>
      </div>
    </div>
    <p className="text-secondary text-sm font-medium">{label}</p>
    <h3 className="mt-1 text-2xl font-bold text-foreground">{value}</h3>
  </div>
);

export const Dashboard = () => {
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const gridStroke = isDark ? '#2a2a2e' : '#e2e8f0';
  const axisStroke = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg = isDark ? '#121214' : '#ffffff';
  const tooltipBorder = isDark ? '#2a2a2e' : '#e2e8f0';
  const tooltipColor = isDark ? '#f8fafc' : '#0f172a';

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-in">
      <header className="border-b border-border/80 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Infrastructure overview</h1>
        <p className="mt-2 max-w-2xl text-base text-secondary">
          Health and capacity at a glance. Use the sidebar to manage servers, groups, and keys.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Server} label="Total Servers" value="24" trend="up" trendValue="12%" />
        <StatCard icon={Activity} label="Active Sessions" value="156" trend="up" trendValue="5%" />
        <StatCard icon={Shield} label="Security Alerts" value="0" trend="down" trendValue="100%" />
        <StatCard icon={Cpu} label="Avg CPU Usage" value="42.5%" trend="up" trendValue="2.4%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="mb-6 text-lg font-bold text-foreground">Resource Consumption</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" stroke={axisStroke} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={axisStroke} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px' }}
                  itemStyle={{ color: tooltipColor }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#6366f1" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-6 text-lg font-bold text-foreground">Storage Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" stroke={axisStroke} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={axisStroke} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                   contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px' }}
                   itemStyle={{ color: tooltipColor }}
                />
                <Bar dataKey="mem" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-6 text-lg font-bold text-foreground">Recent Activity</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/[0.05] dark:bg-white/5">
                  <Shield className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Admin updated SSH keys for srv-production-0{i}</p>
                  <p className="text-xs text-secondary">2 hours ago • 192.168.1.{100 + i}</p>
                </div>
              </div>
              <button className="text-sm text-primary hover:underline">View Details</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
