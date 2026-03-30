import { Edit2, Server as ServerIcon } from 'lucide-react';
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
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid hsl(var(--border))' }}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr
            style={{
              height: 36,
              background: 'hsl(var(--surface-3))',
              borderBottom: '1px solid hsl(var(--border))',
            }}
          >
            <th
              className="px-4"
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'hsl(var(--fg-3))',
                fontWeight: 500,
              }}
            >
              Status
            </th>
            <th
              className="px-4"
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'hsl(var(--fg-3))',
                fontWeight: 500,
              }}
            >
              Hostname
            </th>
            <th
              className="px-4"
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'hsl(var(--fg-3))',
                fontWeight: 500,
              }}
            >
              Primary IP
            </th>
            <th
              className="px-4"
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'hsl(var(--fg-3))',
                fontWeight: 500,
              }}
            >
              OS
            </th>
            <th
              className="px-4"
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'hsl(var(--fg-3))',
                fontWeight: 500,
              }}
            >
              Resources
            </th>
            <th
              className="px-4"
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'hsl(var(--fg-3))',
                fontWeight: 500,
              }}
            >
              Tags
            </th>
            {customColumns.map((col) => (
              <th
                key={col.id}
                className="px-4 max-w-[14rem] truncate"
                title={col.name}
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'hsl(var(--fg-3))',
                  fontWeight: 500,
                }}
              >
                {col.name}
              </th>
            ))}
            <th
              className="px-4 text-right"
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'hsl(var(--fg-3))',
                fontWeight: 500,
              }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {servers.length === 0 && (
            <tr>
              <td
                colSpan={6 + customColumns.length + 1}
                style={{ padding: '64px 0', textAlign: 'center' }}
              >
                <div className="flex flex-col items-center gap-3" style={{ color: 'hsl(var(--fg-3))' }}>
                  <ServerIcon style={{ width: 40, height: 40, opacity: 0.3 }} />
                  <p style={{ fontSize: 13 }}>No servers found. Add one to get started.</p>
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
              className="group cursor-pointer"
              style={{
                height: 48,
                borderBottom: '1px solid hsl(var(--border))',
                transition: 'background 75ms',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.background = 'hsl(var(--surface-2))';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.background = '';
              }}
            >
              {/* Status */}
              <td className="px-4">
                {(() => {
                  const s = server.status?.toLowerCase() ?? '';
                  let dotColor = '#ef4444';
                  let bgColor = 'hsl(0 84% 60% / 0.1)';
                  let textColor = '#ef4444';
                  let borderColor = 'hsl(0 84% 60% / 0.2)';

                  if (s === 'online' || s === 'active') {
                    dotColor = '#3ecf8e';
                    bgColor = 'hsl(152 69% 50% / 0.1)';
                    textColor = '#3ecf8e';
                    borderColor = 'hsl(152 69% 50% / 0.25)';
                  } else if (s === 'maintenance') {
                    dotColor = '#f59e0b';
                    bgColor = 'hsl(38 95% 55% / 0.1)';
                    textColor = '#f59e0b';
                    borderColor = 'hsl(38 95% 55% / 0.25)';
                  }

                  return (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full capitalize"
                      style={{
                        padding: '2px 10px',
                        fontSize: 12,
                        fontWeight: 500,
                        background: bgColor,
                        color: textColor,
                        border: `1px solid ${borderColor}`,
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: dotColor,
                          flexShrink: 0,
                        }}
                      />
                      {server.status ?? 'unknown'}
                    </span>
                  );
                })()}
              </td>

              {/* Hostname */}
              <td className="px-4">
                <span
                  className="font-mono font-medium"
                  style={{ fontSize: 12.5, color: 'hsl(var(--fg))' }}
                >
                  {server.hostname}
                </span>
              </td>

              {/* IP */}
              <td className="px-4">
                <span
                  className="font-mono"
                  style={{ fontSize: 12, color: 'hsl(var(--fg-2))' }}
                >
                  {server.ip_address ?? '—'}
                </span>
              </td>

              {/* OS */}
              <td className="px-4" style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}>
                {server.os ?? '—'}
              </td>

              {/* Resources */}
              <td className="px-4">
                <div className="font-mono" style={{ fontSize: 11, color: 'hsl(var(--fg-2))', lineHeight: 1.6 }}>
                  <div>CPU: {server.cpu_cores || 0} Cores</div>
                  <div>RAM: {formatBytes((server.ram_gb || 0) * 1024 * 1024 * 1024)}</div>
                </div>
              </td>

              {/* Tags */}
              <td className="px-4">
                <div className="flex flex-wrap gap-1">
                  {(() => {
                    const tags = server.tags ?? [];
                    const visible = tags.slice(0, 3);
                    const overflow = tags.length - 3;
                    return (
                      <>
                        {visible.map((tag) => (
                          <span
                            key={typeof tag === 'string' ? tag : tag.id}
                            className="rounded-full"
                            style={{
                              padding: '2px 8px',
                              fontSize: 11,
                              fontWeight: 500,
                              background: 'hsl(210 90% 60% / 0.1)',
                              color: 'hsl(210 90% 60%)',
                              border: '1px solid hsl(210 90% 60% / 0.2)',
                            }}
                          >
                            {tagLabel(tag)}
                          </span>
                        ))}
                        {overflow > 0 && (
                          <span
                            className="rounded-full"
                            style={{
                              padding: '2px 8px',
                              fontSize: 11,
                              fontWeight: 500,
                              background: 'hsl(var(--surface-3))',
                              color: 'hsl(var(--fg-2))',
                              border: '1px solid hsl(var(--border-2))',
                            }}
                          >
                            +{overflow}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </td>

              {/* Custom column values */}
              {customColumns.map((col) => (
                <td
                  key={col.id}
                  className="px-4 max-w-[14rem] truncate"
                  style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}
                  title={server.custom_values?.[String(col.id)]}
                >
                  {server.custom_values?.[String(col.id)]?.trim() ? server.custom_values[String(col.id)] : '—'}
                </td>
              ))}

              {/* Actions */}
              <td className="px-4 text-right">
                <button
                  type="button"
                  className="rounded-lg p-1.5 transition-colors"
                  title="Edit server"
                  style={{ color: 'hsl(var(--fg-2))', background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--surface-3))'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                  onClick={(e) => { e.stopPropagation(); onRowClick(server); }}
                >
                  <Edit2 style={{ width: 15, height: 15 }} />
                </button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
