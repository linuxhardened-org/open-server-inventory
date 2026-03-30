import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Server, Pencil, Trash2, Save } from 'lucide-react';
import { Server as ServerType } from '../types';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface ServerDrawerProps {
  server: ServerType | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export const ServerDrawer = ({ server, isOpen, onClose, onUpdate }: ServerDrawerProps) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    hostname: '',
    ip_address: '',
    os: '',
    cpu_cores: '',
    ram_gb: '',
    status: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    if (!server) return;
    setForm({
      name: server.name || '',
      hostname: server.hostname || '',
      ip_address: server.ip_address || '',
      os: server.os || '',
      cpu_cores: server.cpu_cores?.toString() || '',
      ram_gb: server.ram_gb?.toString() || '',
      status: server.status || 'active',
      notes: server.notes || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!server) return;
    setSaving(true);
    try {
      await api.put(`/servers/${server.id}`, {
        name: form.name || form.hostname,
        hostname: form.hostname,
        ip_address: form.ip_address || null,
        os: form.os || null,
        cpu_cores: form.cpu_cores ? parseInt(form.cpu_cores) : null,
        ram_gb: form.ram_gb ? parseInt(form.ram_gb) : null,
        status: form.status,
        notes: form.notes || null,
      });
      toast.success('Server updated');
      setEditing(false);
      onUpdate?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.error || 'Failed to update server');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!server || !confirm('Delete this server?')) return;
    try {
      await api.delete(`/servers/${server.id}`);
      toast.success('Server deleted');
      onUpdate?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.error || 'Failed to delete server');
    }
  };

  const handleClose = () => {
    setEditing(false);
    onClose();
  };

  if (!server || !isOpen) return null;

  const statusColor = server.status === 'online' || server.status === 'active'
    ? 'hsl(var(--success))'
    : 'hsl(var(--danger))';

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0, 0, 0, 0.6)',
      }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 400,
          maxHeight: 'calc(100vh - 32px)',
          background: 'hsl(var(--surface))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid hsl(var(--border))',
            background: 'hsl(var(--surface-2))',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server style={{ width: 16, height: 16, color: 'hsl(var(--primary))' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--fg))' }}>
              {editing ? 'Edit Server' : 'Server Details'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              background: 'none',
              color: 'hsl(var(--fg-2))',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Hostname" value={form.hostname} onChange={(v) => setForm({ ...form, hostname: v })} required />
              <Field label="IP Address" value={form.ip_address} onChange={(v) => setForm({ ...form, ip_address: v })} />
              <Field label="OS" value={form.os} onChange={(v) => setForm({ ...form, os: v })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="CPU Cores" value={form.cpu_cores} onChange={(v) => setForm({ ...form, cpu_cores: v })} type="number" />
                <Field label="RAM (GB)" value={form.ram_gb} onChange={(v) => setForm({ ...form, ram_gb: v })} type="number" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'hsl(var(--fg-2))', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="sv-input"
                  style={{ width: '100%' }}
                >
                  <option value="active">Active</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'hsl(var(--fg-2))', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="sv-input"
                  style={{ width: '100%', minHeight: 50, resize: 'vertical' }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Row label="Name" value={server.name || server.hostname} />
              <Row label="Hostname" value={server.hostname} mono />
              <Row label="IP Address" value={server.ip_address || '—'} mono />
              <Row label="OS" value={server.os || '—'} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Row label="CPU" value={server.cpu_cores ? `${server.cpu_cores} cores` : '—'} />
                <Row label="RAM" value={server.ram_gb ? `${server.ram_gb} GB` : '—'} />
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'hsl(var(--fg-3))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</span>
                <div style={{ marginTop: 4 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: server.status === 'online' || server.status === 'active' ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--danger) / 0.1)',
                      color: statusColor,
                      fontSize: 11,
                      fontWeight: 500,
                      textTransform: 'capitalize',
                    }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
                    {server.status || 'Unknown'}
                  </span>
                </div>
              </div>
              {server.group_name && <Row label="Group" value={server.group_name} />}
              {server.tags && server.tags.length > 0 && (
                <div>
                  <span style={{ fontSize: 11, color: 'hsl(var(--fg-3))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tags</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {server.tags.map((tag, i) => {
                      const name = typeof tag === 'string' ? tag : tag.name;
                      const color = typeof tag === 'string' ? null : tag.color;
                      return (
                        <span
                          key={i}
                          style={{
                            padding: '2px 6px',
                            borderRadius: 3,
                            background: color ? `${color}20` : 'hsl(var(--surface-3))',
                            color: color || 'hsl(var(--fg-2))',
                            fontSize: 10,
                            fontWeight: 500,
                          }}
                        >
                          {name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {server.notes && <Row label="Notes" value={server.notes} />}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: editing ? 'flex-end' : 'space-between',
            gap: 8,
            padding: '12px 16px',
            borderTop: '1px solid hsl(var(--border))',
            background: 'hsl(var(--surface-2))',
            flexShrink: 0,
          }}
        >
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="sv-btn-ghost"
                style={{ padding: '6px 12px', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.hostname}
                className="sv-btn-primary"
                style={{ padding: '6px 12px', fontSize: 13, gap: 6 }}
              >
                <Save style={{ width: 14, height: 14 }} />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDelete}
                className="sv-btn-ghost"
                style={{ padding: '6px 10px', fontSize: 13, color: 'hsl(var(--danger))' }}
              >
                <Trash2 style={{ width: 14, height: 14 }} />
                Delete
              </button>
              <button
                type="button"
                onClick={startEdit}
                className="sv-btn-primary"
                style={{ padding: '6px 12px', fontSize: 13, gap: 6 }}
              >
                <Pencil style={{ width: 14, height: 14 }} />
                Edit
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span style={{ fontSize: 11, color: 'hsl(var(--fg-3))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <p style={{ margin: '3px 0 0', fontSize: 13, color: 'hsl(var(--fg))', fontFamily: mono ? 'var(--font-mono)' : undefined }}>{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'hsl(var(--fg-2))', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label} {required && <span style={{ color: 'hsl(var(--danger))' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sv-input"
        style={{ width: '100%' }}
        required={required}
      />
    </div>
  );
}
