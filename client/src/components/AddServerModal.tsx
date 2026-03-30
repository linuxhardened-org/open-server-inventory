import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Server, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import type { CustomColumn } from '../types';
import api from '../lib/api';

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customColumns: CustomColumn[];
  onServerCreated?: () => void;
}

/**
 * Inventory-only: SSH / keys are optional metadata — ServerVault does not connect to hosts.
 */
export const AddServerModal = ({ isOpen, onClose, customColumns, onServerCreated }: AddServerModalProps) => {
  const [serverName, setServerName] = useState('');
  const [hostname, setHostname] = useState('');
  const [ip, setIp] = useState('');
  const [notes, setNotes] = useState('');
  const [sshKeyId, setSshKeyId] = useState('');
  const [customValues, setCustomValues] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setServerName('');
      setHostname('');
      setIp('');
      setNotes('');
      setSshKeyId('');
      setCustomValues({});
      setSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setCustomValues((prev) => {
      const next = { ...prev };
      for (const col of customColumns) {
        if (!(col.id in next)) next[col.id] = '';
      }
      for (const id of Object.keys(next).map(Number)) {
        if (!customColumns.some((c) => c.id === id)) delete next[id];
      }
      return next;
    });
  }, [isOpen, customColumns]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const custom_values: Record<string, string | null> = {};
    for (const col of customColumns) {
      const raw = (customValues[col.id] ?? '').trim();
      custom_values[String(col.id)] = raw === '' ? null : raw;
    }
    try {
      await api.post('/servers', {
        name: serverName.trim(),
        hostname: hostname.trim(),
        ip_address: ip.trim() || undefined,
        notes: notes.trim() || undefined,
        ssh_key_id: sshKeyId ? Number(sshKeyId) : null,
        status: 'active',
        custom_values: Object.keys(custom_values).length ? custom_values : undefined,
      });
      toast.success('Server added to inventory');
      onServerCreated?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err && 'message' in err ? String((err as { message: string }).message) : 'Could not save server';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'hsl(var(--fg-2))',
    marginBottom: 6,
  };

  return createPortal(
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
          zIndex: 60,
          background: 'hsl(0 0% 0% / 0.6)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
        }}
      />
      {/* Centering wrapper */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 61,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflowY: 'auto',
          padding: 16,
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 520,
            margin: 'auto',
            background: 'hsl(var(--surface))',
            border: '1px solid hsl(var(--border-2))',
            borderRadius: 16,
            boxShadow:
              '0 25px 60px hsl(224 21% 4% / 0.7), 0 0 0 1px hsl(var(--border))',
          }}
          role="dialog"
          aria-labelledby="add-server-title"
          aria-describedby="add-server-desc"
        >
          {/* Header */}
          <div
            style={{
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
              borderBottom: '1px solid hsl(var(--border))',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: 'hsl(var(--primary) / 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Server style={{ width: 16, height: 16, color: 'hsl(var(--primary))' }} />
              </div>
              <div>
                <p
                  id="add-server-title"
                  style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--fg))', lineHeight: 1.3 }}
                >
                  Add server
                </p>
                <p id="add-server-desc" style={{ fontSize: 12, color: 'hsl(var(--fg-3))', lineHeight: 1.3 }}>
                  Register a new node in the inventory
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 6,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: 'hsl(var(--fg-2))',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--surface-3))'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
              aria-label="Close"
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Display name */}
              <div>
                <label htmlFor="srv-name" style={labelStyle}>
                  Display name <span style={{ color: 'hsl(var(--danger))' }}>*</span>
                </label>
                <input
                  id="srv-name"
                  required
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  className="sv-input"
                  placeholder="e.g. prod-web-01"
                  autoComplete="off"
                />
              </div>

              {/* Hostname + IP side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="srv-hostname" style={labelStyle}>
                    Hostname <span style={{ color: 'hsl(var(--danger))' }}>*</span>
                  </label>
                  <input
                    id="srv-hostname"
                    required
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    className="sv-input"
                    placeholder="node01.example.com"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label htmlFor="srv-ip" style={labelStyle}>
                    IP address{' '}
                    <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'hsl(var(--fg-3))' }}>
                      (optional)
                    </span>
                  </label>
                  <input
                    id="srv-ip"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    className="sv-input"
                    placeholder="10.0.0.1"
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="srv-notes" style={labelStyle}>
                  Notes{' '}
                  <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'hsl(var(--fg-3))' }}>
                    (optional)
                  </span>
                </label>
                <textarea
                  id="srv-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="sv-input"
                  placeholder="Rack, owner, purpose…"
                  style={{ minHeight: 64, height: 'auto', resize: 'vertical', padding: '10px 12px', lineHeight: 1.6 }}
                />
              </div>

              {/* Custom fields */}
              {customColumns.length > 0 && (
                <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: 12 }}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'hsl(var(--fg-2))',
                      marginBottom: 10,
                    }}
                  >
                    Custom fields
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {customColumns.map((col) => (
                      <div key={col.id}>
                        <label htmlFor={`srv-custom-${col.id}`} style={labelStyle}>
                          {col.name}
                        </label>
                        <input
                          id={`srv-custom-${col.id}`}
                          value={customValues[col.id] ?? ''}
                          onChange={(e) => setCustomValues((prev) => ({ ...prev, [col.id]: e.target.value }))}
                          className="sv-input"
                          placeholder="—"
                          autoComplete="off"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SSH key */}
              <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: 12 }}>
                <div className="flex items-center gap-1.5" style={{ ...labelStyle, marginBottom: 6 }}>
                  <Key style={{ width: 12, height: 12, color: 'hsl(var(--primary))', flexShrink: 0 }} aria-hidden />
                  <span>SSH key reference</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 400,
                      textTransform: 'none',
                      letterSpacing: 0,
                      color: 'hsl(var(--fg-3))',
                    }}
                  >
                    (optional)
                  </span>
                </div>
                <select
                  id="srv-ssh"
                  value={sshKeyId}
                  onChange={(e) => setSshKeyId(e.target.value)}
                  className="sv-input"
                  style={{ appearance: 'none', cursor: 'pointer', background: 'hsl(var(--surface-2))' }}
                >
                  <option value="">None — inventory only</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 8,
                padding: '0 20px',
                borderTop: '1px solid hsl(var(--border))',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                className="sv-btn-ghost"
                style={{ padding: '0 14px' }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="sv-btn-primary"
                style={{ padding: '0 20px' }}
                disabled={submitting}
              >
                {submitting ? 'Saving…' : 'Save to inventory'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </>,
    document.body
  );
};
