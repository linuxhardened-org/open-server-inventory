import { Terminal, Activity, Settings, Server as ServerIcon } from 'lucide-react';
import type { CustomColumn, Server, ServerTag } from '../types';
import { formatBytes } from '../lib/utils';
import { motion } from 'framer-motion';

function tagLabel(tag: ServerTag | string): string {
  return typeof tag === 'string' ? tag : tag.name;
}

interface ServerTableProps {
  servers: Server[];
  customColumns: CustomColumn[];
  onRowClick: (server: Server) => void;
}

export const ServerTable = ({ servers, customColumns, onRowClick }: ServerTableProps) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border bg-surface-lighter text-secondary text-xs font-semibold uppercase tracking-wide">
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Hostname</th>
            <th className="py-3 px-4">Primary IP</th>
            <th className="py-3 px-4">OS</th>
            <th className="py-3 px-4">Resources</th>
            <th className="py-3 px-4">Tags</th>
            {customColumns.map((col) => (
              <th key={col.id} className="py-3 px-4 max-w-[14rem] truncate" title={col.name}>
                {col.name}
              </th>
            ))}
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {servers.length === 0 && (
            <tr>
              <td colSpan={6 + customColumns.length + 1} className="py-16 text-center">
                <div className="flex flex-col items-center gap-3 text-secondary">
                  <ServerIcon className="h-10 w-10 opacity-30" />
                  <p className="text-sm">No servers found. Add one to get started.</p>
                </div>
              </td>
            </tr>
          )}
          {servers.map((server, index) => (
            <motion.tr
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={server.id}
              onClick={() => onRowClick(server)}
              className="border-b border-border/50 hover:bg-foreground/[0.04] dark:hover:bg-foreground/[0.06] cursor-pointer transition-colors group"
            >
              <td className="py-3 px-4">
                {(() => {
                  const s = server.status?.toLowerCase() ?? '';
                  const cls =
                    s === 'online' || s === 'active'
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                      : s === 'maintenance'
                      ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
                  return (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
                      {server.status ?? 'unknown'}
                    </span>
                  );
                })()}
              </td>
              <td className="py-3 px-4 font-mono text-sm">{server.hostname}</td>
              <td className="py-3 px-4 font-mono text-sm text-secondary">{server.ip_address ?? '—'}</td>
              <td className="py-3 px-4 text-sm">{server.os ?? '—'}</td>
              <td className="py-3 px-4">
                <div className="space-y-1 text-[10px] text-secondary font-mono">
                  <div>CPU: {server.cpu_cores || 0} Cores</div>
                  <div>RAM: {formatBytes((server.ram_gb || 0) * 1024 * 1024 * 1024)}</div>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap gap-1">
                  {server.tags?.map((tag) => (
                    <span
                      key={typeof tag === 'string' ? tag : tag.id}
                      className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded border border-blue-500/20"
                    >
                      {tagLabel(tag)}
                    </span>
                  ))}
                </div>
              </td>
              {customColumns.map((col) => (
                <td key={col.id} className="py-3 px-4 text-sm text-secondary max-w-[14rem] truncate" title={server.custom_values?.[String(col.id)]}>
                  {server.custom_values?.[String(col.id)]?.trim() ? server.custom_values[String(col.id)] : '—'}
                </td>
              ))}
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    className="p-2 hover:bg-foreground/[0.06] rounded-lg text-secondary transition-colors"
                    title="Terminal"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Terminal className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="p-2 hover:bg-white/5 rounded-lg text-secondary transition-colors"
                    title="Monitoring"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Activity className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="p-2 hover:bg-foreground/[0.06] rounded-lg text-secondary transition-colors"
                    title="Settings"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
