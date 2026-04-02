import { Edit2, Server as ServerIcon } from 'lucide-react';
import type { CustomColumn, Server, ServerTag } from '../types';
import { formatBytes } from '../lib/utils';
import { ServerAddressPopoverCell } from './ServerAddressPopoverCell';

function tagLabel(tag: ServerTag | string): string {
  return typeof tag === 'string' ? tag : tag.name;
}

interface ServerTableProps {
  servers: Server[];
  customColumns: CustomColumn[];
  onRowClick: (server: Server) => void;
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
  allSelected?: boolean;
  onToggleSelectAll?: () => void;
}

const neo = {
  th: {
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    fontWeight: 600,
    color: 'hsl(var(--fg))',
    background: 'hsl(var(--surface-2))',
    borderBottom: '2px solid hsl(var(--border))',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
  },
  tr: {
    height: 44,
    borderBottom: '1px solid hsl(var(--border))',
    cursor: 'pointer' as const,
    background: 'hsl(var(--surface))',
  },
  badge: (border: string, bg: string, fg: string) => ({
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: 6,
    padding: '2px 8px',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'capitalize' as const,
    borderRadius: 4,
    border: `1.5px solid ${border}`,
    background: bg,
    color: fg,
  }),
  tagChip: (border: string, bg: string, fg: string) => ({
    padding: '2px 6px',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 4,
    border: `1.5px solid ${border}`,
    background: bg,
    color: fg,
  }),
  iconBtn: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 6,
    borderRadius: 5,
    border: '2px solid hsl(var(--border))',
    background: 'hsl(var(--surface-2))',
    boxShadow: '2px 2px 0px 0px hsl(var(--border))',
    color: 'hsl(var(--fg))',
    cursor: 'pointer' as const,
  },
};

export const ServerTable = ({
  servers,
  customColumns,
  onRowClick,
  selectedIds = [],
  onToggleSelect,
  allSelected = false,
  onToggleSelectAll,
}: ServerTableProps) => {
  return (
    <div className="sv-neo-table-wrap overflow-x-auto overflow-y-auto" style={{ maxHeight: 520 }}>
      <table
        className="sv-neo-table w-full text-left"
        style={{ borderCollapse: 'separate', borderSpacing: 0 }}
      >
        <thead>
          <tr style={{ height: 36 }}>
            <th className="px-2" style={{ ...neo.th, width: 40 }}>
              <input
                type="checkbox"
                checked={allSelected && servers.length > 0}
                onChange={() => onToggleSelectAll?.()}
                style={{
                  width: 14,
                  height: 14,
                  accentColor: 'hsl(var(--primary))',
                  cursor: 'pointer',
                  borderRadius: 5,
                }}
                aria-label="Select all servers"
              />
            </th>
            {[
              'Status',
              'Hostname',
              'Addresses',
              'OS',
              'Region',
              'Resources',
              'Tags',
            ].map((label) => (
              <th key={label} className="px-3" style={neo.th}>
                {label}
              </th>
            ))}
            {customColumns.map((col) => (
              <th
                key={col.id}
                className="px-3 max-w-[14rem] truncate"
                title={col.name}
                style={neo.th}
              >
                {col.name}
              </th>
            ))}
            <th className="px-3 text-right" style={neo.th}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {servers.length === 0 && (
            <tr>
              <td
                colSpan={8 + customColumns.length + 1}
                style={{ padding: '40px 12px', textAlign: 'center' }}
              >
                <div className="flex flex-col items-center gap-2" style={{ color: 'hsl(var(--fg-2))' }}>
                  <ServerIcon style={{ width: 36, height: 36, opacity: 0.45 }} />
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--fg))' }}>No servers found. Add one to get started.</p>
                </div>
              </td>
            </tr>
          )}
          {servers.map((server) => (
            <tr
              key={server.id}
              onClick={() => onRowClick(server)}
              className="sv-neo-table-row"
              style={neo.tr}
            >
              <td className="px-2" onClick={(e) => e.stopPropagation()} style={{ verticalAlign: 'middle' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(server.id)}
                  onChange={() => onToggleSelect?.(server.id)}
                  style={{
                    width: 14,
                    height: 14,
                    accentColor: 'hsl(var(--primary))',
                    cursor: 'pointer',
                    borderRadius: 5,
                  }}
                  aria-label={`Select ${server.hostname}`}
                />
              </td>

              <td className="px-3" style={{ verticalAlign: 'middle' }}>
                {(() => {
                  const s = server.status?.toLowerCase() ?? '';
                  let border = 'hsl(var(--border))';
                  let bg = 'hsl(var(--surface-2))';
                  let fg = 'hsl(var(--fg-2))';
                  let dot = 'hsl(var(--fg-3))';

                  if (s === 'online' || s === 'active') {
                    border = 'hsl(152 50% 36%)';
                    bg = 'hsl(var(--surface-2))';
                    fg = 'hsl(152 62% 32%)';
                    dot = 'hsl(152 69% 42%)';
                  } else if (s === 'maintenance') {
                    border = 'hsl(38 90% 42%)';
                    fg = 'hsl(38 90% 36%)';
                    dot = 'hsl(38 95% 45%)';
                  } else if (s === 'offline' || s === 'error' || !s) {
                    border = 'hsl(0 70% 45%)';
                    fg = 'hsl(var(--danger))';
                    dot = 'hsl(var(--danger))';
                  }

                  return (
                    <span style={neo.badge(border, bg, fg)}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 2,
                          background: dot,
                          flexShrink: 0,
                        }}
                      />
                      {server.status ?? 'unknown'}
                    </span>
                  );
                })()}
              </td>

              <td className="px-3" style={{ verticalAlign: 'middle' }}>
                <span className="font-mono font-semibold" style={{ fontSize: 12.5, color: 'hsl(var(--fg))' }}>
                  {server.hostname}
                </span>
              </td>

              <td className="px-3" style={{ verticalAlign: 'middle' }}>
                <ServerAddressPopoverCell server={server} />
              </td>

              <td className="px-3" style={{ fontSize: 13, color: 'hsl(var(--fg))', verticalAlign: 'middle' }}>
                {server.os ?? '—'}
              </td>

              <td className="px-3" style={{ fontSize: 13, color: 'hsl(var(--fg))', verticalAlign: 'middle' }}>
                {server.region ?? '—'}
              </td>

              <td className="px-3" style={{ verticalAlign: 'middle' }}>
                <div className="font-mono" style={{ fontSize: 11, color: 'hsl(var(--fg-2))', lineHeight: 1.5 }}>
                  <div>CPU: {server.cpu_cores || 0} Cores</div>
                  <div>RAM: {formatBytes((server.ram_gb || 0) * 1024 * 1024 * 1024)}</div>
                </div>
              </td>

              <td className="px-3" style={{ verticalAlign: 'middle' }}>
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
                            style={neo.tagChip(
                              'hsl(var(--border))',
                              'hsl(var(--surface-2))',
                              'hsl(var(--fg))'
                            )}
                          >
                            {tagLabel(tag)}
                          </span>
                        ))}
                        {overflow > 0 && (
                          <span
                            style={neo.tagChip(
                              'hsl(var(--border))',
                              'hsl(var(--surface-3))',
                              'hsl(var(--fg-2))'
                            )}
                          >
                            +{overflow}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </td>

              {customColumns.map((col) => (
                <td
                  key={col.id}
                  className="px-3 max-w-[14rem] truncate"
                  style={{ fontSize: 13, color: 'hsl(var(--fg))', verticalAlign: 'middle' }}
                  title={server.custom_values?.[String(col.id)]}
                >
                  {server.custom_values?.[String(col.id)]?.trim() ? server.custom_values[String(col.id)] : '—'}
                </td>
              ))}

              <td className="px-3 text-right" style={{ verticalAlign: 'middle' }}>
                <button
                  type="button"
                  className="sv-neo-icon-btn"
                  title="Edit server"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowClick(server);
                  }}
                >
                  <Edit2 style={{ width: 14, height: 14 }} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
