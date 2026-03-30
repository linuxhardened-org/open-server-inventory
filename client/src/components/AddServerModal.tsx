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

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
      />
      {/* Centering wrapper — separate from backdrop so no ghost flex items */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center overflow-y-auto p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative my-auto w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl"
        role="dialog"
        aria-labelledby="add-server-title"
        aria-describedby="add-server-desc"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Server className="h-4 w-4" />
            </div>
            <h2 id="add-server-title" className="text-sm font-semibold text-foreground">
              Add server
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-secondary transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {/* Row 1: Display name (full width) */}
          <div className="space-y-1.5">
            <label htmlFor="srv-name" className="text-xs font-medium text-secondary">
              Display name <span className="text-danger">*</span>
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

          {/* Row 2: Hostname + IP side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="srv-hostname" className="text-xs font-medium text-secondary">
                Hostname <span className="text-danger">*</span>
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
            <div className="space-y-1.5">
              <label htmlFor="srv-ip" className="text-xs font-medium text-secondary">
                IP address <span className="text-xs font-normal text-secondary/70">(optional)</span>
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

          {/* Row 3: Notes */}
          <div className="space-y-1.5">
            <label htmlFor="srv-notes" className="text-xs font-medium text-secondary">
              Notes <span className="text-xs font-normal text-secondary/70">(optional)</span>
            </label>
            <textarea
              id="srv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="sv-input min-h-[64px] resize-y"
              placeholder="Rack, owner, purpose…"
            />
          </div>

          {/* Custom fields */}
          {customColumns.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide">Custom fields</p>
              <div className="grid grid-cols-2 gap-3">
                {customColumns.map((col) => (
                  <div key={col.id} className="space-y-1.5">
                    <label htmlFor={`srv-custom-${col.id}`} className="text-xs font-medium text-secondary">
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
          <div className="space-y-1.5 border-t border-border pt-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-secondary">
              <Key className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span>SSH key reference</span>
              <span className="font-normal text-secondary/70">(optional)</span>
            </div>
            <select
              id="srv-ssh"
              value={sshKeyId}
              onChange={(e) => setSshKeyId(e.target.value)}
              className="sv-input appearance-none bg-surface-lighter"
            >
              <option value="">None — inventory only</option>
            </select>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-border pt-3">
            <button type="button" onClick={onClose} className="sv-btn-ghost px-4" disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="sv-btn-primary px-6" disabled={submitting}>
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
