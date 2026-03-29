import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { X, Server, Activity, Shield, Key, Settings, Globe } from 'lucide-react';
import { Server as ServerType } from '../types';

interface ServerDrawerProps {
  server: ServerType | null;
  isOpen: boolean;
  onClose: () => void;
}

const Tab = ({ icon: Icon, label, active = false }: { icon: LucideIcon; label: string; active?: boolean }) => (
  <button
    type="button"
    className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors md:px-4 ${
      active ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-foreground'
    }`}
  >
    <Icon className="h-4 w-4 shrink-0" />
    {label}
  </button>
);

export const ServerDrawer = ({ server, isOpen, onClose }: ServerDrawerProps) => {
  useEffect(() => {
    if (!isOpen || !server) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, server]);

  if (!server) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="server-detail-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col bg-background"
        >
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-4 md:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Server className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 id="server-detail-title" className="truncate text-xl font-bold text-foreground">
                  {server.hostname}
                </h2>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      server.status === 'online' || server.status === 'active' ? 'bg-success' : 'bg-danger'
                    }`}
                  />
                  <span className="font-mono text-sm text-secondary">
                    {server.ip_address} • {server.os}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-2 text-secondary transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
              aria-label="Close server details"
            >
              <X className="h-6 w-6" />
            </button>
          </header>

          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-surface/50 px-2 md:px-6">
            <Tab icon={Activity} label="Monitoring" active />
            <Tab icon={Shield} label="Security" />
            <Tab icon={Key} label="SSH Keys" />
            <Tab icon={Globe} label="Networking" />
            <Tab icon={Settings} label="Configs" />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-8 md:py-8">
              <section>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-secondary">Resource usage</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <p className="mb-1 text-xs text-secondary">CPU cores</p>
                    <p className="text-xl font-bold text-foreground">{server.cpu_cores || 0}</p>
                    <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-foreground/10">
                      <div className="h-full w-[12%] bg-primary" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <p className="mb-1 text-xs text-secondary">Memory (RAM)</p>
                    <p className="text-xl font-bold text-foreground">{server.ram_gb || 0} GB</p>
                    <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-foreground/10">
                      <div className="h-full w-[52%] bg-success" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <p className="mb-1 text-xs text-secondary">Last seen</p>
                    <p className="text-sm font-bold text-foreground">
                      {server.last_seen ? new Date(server.last_seen).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-secondary">Sample terminal</h3>
                <div className="space-y-2 rounded-lg border border-border bg-surface p-4 font-mono text-sm">
                  <p className="text-success">$ uptime</p>
                  <p className="text-secondary">up 45 days, 12:45, 2 users, load average: 0.12, 0.08, 0.05</p>
                  <p className="text-success">$ df -h</p>
                  <p className="text-secondary">Filesystem      Size  Used Avail Use% Mounted on</p>
                  <p className="text-secondary">/dev/sda1        156G   88G   68G  82% /</p>
                  <div className="flex items-center gap-1">
                    <span className="text-success">$</span>
                    <span className="h-4 w-2 animate-pulse bg-foreground/50" />
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-secondary">Environment</h3>
                  <span className="rounded border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                    {server.group_name || 'Production'}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-success" />
                      <span className="text-sm font-medium text-foreground">Secondary IP</span>
                    </div>
                    <span className="font-mono text-xs text-secondary">None</span>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <footer className="shrink-0 space-y-3 border-t border-border bg-surface/80 px-4 py-4 backdrop-blur-md md:px-8">
            <p className="text-xs text-secondary">
              ServerVault is inventory-only — it does not open SSH sessions or connect to this host. Use your own
              terminal or tooling if you need remote access.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-danger transition-colors hover:bg-danger/10"
              >
                Delete server
              </button>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-border px-4 py-2 text-sm text-secondary transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  Edit server
                </button>
              </div>
            </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
