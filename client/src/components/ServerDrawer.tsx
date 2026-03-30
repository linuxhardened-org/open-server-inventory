import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Server, Cpu, MemoryStick, HardDrive, Network } from 'lucide-react';
import { Server as ServerType } from '../types';

interface ServerDrawerProps {
  server: ServerType | null;
  isOpen: boolean;
  onClose: () => void;
}

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
  }, [isOpen, onClose, server]);

  if (!server) return null;

  const statusColor = server.status === 'online' || server.status === 'active'
    ? 'hsl(var(--success))'
    : 'hsl(var(--danger))';

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99,
              background: 'hsl(var(--bg) / 0.8)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Drawer */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxWidth: 480,
              zIndex: 100,
              background: 'hsl(var(--surface))',
              borderLeft: '1px solid hsl(var(--border))',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-8px 0 32px hsl(var(--bg) / 0.3)',
            }}
          >
            {/* Header */}
            <header
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '20px 24px',
                borderBottom: '1px solid hsl(var(--border))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: 'hsl(var(--primary) / 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Server style={{ width: 22, height: 22, color: 'hsl(var(--primary))' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: 'hsl(var(--fg))',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {server.name || server.hostname}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: statusColor,
                      }}
                    />
                    <span style={{ fontSize: 13, color: 'hsl(var(--fg-2))', fontFamily: 'var(--font-mono)' }}>
                      {server.ip_address || 'No IP'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: 'none',
                  background: 'none',
                  color: 'hsl(var(--fg-2))',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(var(--surface-3))'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </header>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <InfoCard icon={Network} label="Hostname" value={server.hostname} />
                <InfoCard icon={HardDrive} label="OS" value={server.os || '—'} />
                <InfoCard icon={Cpu} label="CPU Cores" value={server.cpu_cores ? `${server.cpu_cores} cores` : '—'} />
                <InfoCard icon={MemoryStick} label="RAM" value={server.ram_gb ? `${server.ram_gb} GB` : '—'} />
              </div>

              {/* Status */}
              <Section title="Status">
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: server.status === 'online' || server.status === 'active'
                      ? 'hsl(var(--success) / 0.1)'
                      : 'hsl(var(--danger) / 0.1)',
                    color: statusColor,
                    fontSize: 13,
                    fontWeight: 500,
                    textTransform: 'capitalize',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                  {server.status || 'Unknown'}
                </div>
              </Section>

              {/* Group */}
              {server.group_name && (
                <Section title="Group">
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 5,
                      background: 'hsl(var(--primary) / 0.1)',
                      color: 'hsl(var(--primary))',
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    {server.group_name}
                  </span>
                </Section>
              )}

              {/* Tags */}
              {server.tags && server.tags.length > 0 && (
                <Section title="Tags">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {server.tags.map((tag, i) => {
                      const name = typeof tag === 'string' ? tag : tag.name;
                      const color = typeof tag === 'string' ? null : tag.color;
                      return (
                        <span
                          key={i}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 5,
                            background: color ? `${color}20` : 'hsl(var(--surface-3))',
                            color: color || 'hsl(var(--fg-2))',
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {name}
                        </span>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Notes */}
              {server.notes && (
                <Section title="Notes">
                  <p style={{ fontSize: 13, color: 'hsl(var(--fg-2))', lineHeight: 1.6, margin: 0 }}>
                    {server.notes}
                  </p>
                </Section>
              )}

              {/* Last Updated */}
              {server.updated_at && (
                <Section title="Last Updated">
                  <span style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}>
                    {new Date(server.updated_at).toLocaleString()}
                  </span>
                </Section>
              )}
            </div>

            {/* Footer */}
            <footer
              style={{
                padding: '16px 24px',
                borderTop: '1px solid hsl(var(--border))',
                background: 'hsl(var(--surface-2))',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                className="sv-btn-ghost"
                style={{ width: '100%', justifyContent: 'center', border: '1px solid hsl(var(--border-2))' }}
              >
                Close
              </button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3
        style={{
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'hsl(var(--fg-3))',
          marginBottom: 10,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: typeof Server; label: string; value: string }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        background: 'hsl(var(--surface-2))',
        border: '1px solid hsl(var(--border))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon style={{ width: 14, height: 14, color: 'hsl(var(--fg-3))' }} />
        <span style={{ fontSize: 11, color: 'hsl(var(--fg-3))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
      </div>
      <p
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'hsl(var(--fg))',
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </p>
    </div>
  );
}
