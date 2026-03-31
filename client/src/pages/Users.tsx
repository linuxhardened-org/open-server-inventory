import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import { UserPlus, Shield, User, Trash2 } from 'lucide-react';
import { SvSelect } from '../components/SvSelect';

const ROLE_OPTS = [
  { value: 'operator', label: 'Operator' },
  { value: 'admin', label: 'Admin' },
];
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useRealtimeResource } from '../hooks/useRealtimeResource';

interface UserData {
  id: number;
  username: string;
  real_name?: string;
  role: 'admin' | 'operator';
  lastLogin?: string;
}

type UsersListResponse = { success: boolean; data: UserData[] };

export const Users = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    real_name: '',
    role: 'operator' as 'admin' | 'operator',
  });

  const fetchUsers = useCallback(async () => {
    try {
      const res = (await api.get('/users')) as UsersListResponse;
      const rows = Array.isArray(res?.data) ? res.data : [];
      setUsers(rows);
      setSelectedUserIds((prev) => prev.filter((id) => rows.some((u) => u.id === id)));
    } catch (err: unknown) {
      const e = err as { error?: string };
      const msg = e?.error || '';
      if (msg.includes('Unauthorized') || msg.includes('Session')) return;
      if (msg.includes('Forbidden') || msg.includes('Admin')) {
        toast.error('Admin access required', { id: 'users-forbidden' });
        return;
      }
      toast.error(msg || 'Could not load users', { id: 'users-fetch' });
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'admin') void fetchUsers();
  }, [currentUser?.role, fetchUsers]);
  useRealtimeResource('users', () => {
    if (currentUser?.role === 'admin') void fetchUsers();
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', newUser);
      toast.success('User created');
      setIsAdding(false);
      setNewUser({ username: '', password: '', real_name: '', role: 'operator' });
      await fetchUsers();
    } catch (err: unknown) {
      toast.error((err as { error?: string })?.error || 'Failed to create user');
    }
  };

  const handleDelete = async (id: number) => {
    if (id === currentUser?.id) {
      toast.error('Cannot delete yourself');
      return;
    }
    if (!confirm('Delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted');
      await fetchUsers();
    } catch (err: unknown) {
      toast.error((err as { error?: string })?.error || 'Failed to delete user');
    }
  };

  const allSelected = users.length > 0 && users.filter((u) => u.id !== currentUser?.id).every((u) => selectedUserIds.includes(u.id));

  const toggleSelected = (id: number) => {
    if (id === currentUser?.id) return;
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    const selectable = users.filter((u) => u.id !== currentUser?.id).map((u) => u.id);
    setSelectedUserIds((prev) => (allSelected ? prev.filter((id) => !selectable.includes(id)) : [...new Set([...prev, ...selectable])]));
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    if (!confirm(`Delete ${selectedUserIds.length} selected user(s)?`)) return;
    setBulkDeleting(true);
    try {
      const settled = await Promise.allSettled(selectedUserIds.map((id) => api.delete(`/users/${id}`)));
      const ok = settled.filter((r) => r.status === 'fulfilled').length;
      const fail = settled.length - ok;
      if (ok > 0) toast.success(`Deleted ${ok} user${ok !== 1 ? 's' : ''}`);
      if (fail > 0) toast.error(`${fail} delete operation${fail !== 1 ? 's' : ''} failed`);
      setSelectedUserIds([]);
      await fetchUsers();
    } finally {
      setBulkDeleting(false);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Shield style={{ width: 48, height: 48, color: 'hsl(var(--danger))', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'hsl(var(--fg))', marginBottom: 8 }}>Access Denied</h2>
          <p style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}>Admin privileges required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header className="page-header">
        <div className="page-header-text">
          <h1>Users</h1>
          <p>Manage administrators and operators.</p>
        </div>
        <button type="button" onClick={() => setIsAdding(true)} className="sv-btn-primary" style={{ gap: 6 }}>
          <UserPlus style={{ width: 15, height: 15 }} />
          Add User
        </button>
      </header>

      <div className="flex items-center gap-3">
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'hsl(var(--fg-2))' }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            style={{ width: 14, height: 14, accentColor: 'hsl(var(--primary))' }}
          />
          Select all
        </label>
        <span style={{ fontSize: 12, color: 'hsl(var(--fg-3))' }}>{selectedUserIds.length} selected</span>
        <button
          type="button"
          className="sv-btn-ghost"
          style={{ border: '1px solid hsl(var(--border-2))', color: 'hsl(var(--danger))', marginLeft: 'auto' }}
          disabled={selectedUserIds.length === 0 || bulkDeleting}
          onClick={handleBulkDelete}
        >
          {bulkDeleting ? 'Deleting...' : 'Delete selected'}
        </button>
      </div>

      <div style={{ borderRadius: 10, border: '1px solid hsl(var(--border))', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'hsl(var(--surface-3))', borderBottom: '1px solid hsl(var(--border))' }}>
              <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'hsl(var(--fg-3))', textTransform: 'uppercase', letterSpacing: '0.04em', width: 36 }} />
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'hsl(var(--fg-3))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>User</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'hsl(var(--fg-3))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, fontWeight: 500, color: 'hsl(var(--fg-3))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                style={{ borderBottom: '1px solid hsl(var(--border))', transition: 'background 75ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(var(--surface-2))'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
              >
                <td style={{ padding: '12px 10px' }}>
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(u.id)}
                    onChange={() => toggleSelected(u.id)}
                    disabled={u.id === currentUser?.id}
                    style={{ width: 14, height: 14, accentColor: 'hsl(var(--primary))' }}
                    aria-label={`Select ${u.username}`}
                  />
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User style={{ width: 16, height: 16, color: 'hsl(var(--primary))' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--fg))' }}>{u.real_name || u.username}</div>
                      {u.real_name && <div style={{ fontSize: 11, color: 'hsl(var(--fg-2))' }}>@{u.username}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 5,
                      fontSize: 11,
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      background: u.role === 'admin' ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--surface-3))',
                      color: u.role === 'admin' ? 'hsl(var(--primary))' : 'hsl(var(--fg-2))',
                    }}
                  >
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => handleDelete(u.id)}
                    disabled={u.id === currentUser?.id}
                    style={{
                      padding: 6,
                      borderRadius: 6,
                      border: 'none',
                      background: 'none',
                      color: 'hsl(var(--danger))',
                      cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer',
                      opacity: u.id === currentUser?.id ? 0.4 : 1,
                    }}
                    title="Delete user"
                  >
                    <Trash2 style={{ width: 15, height: 15 }} />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: 'hsl(var(--fg-3))', fontSize: 13 }}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isAdding && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'hsl(var(--bg) / 0.7)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setIsAdding(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: 380,
              background: 'hsl(var(--surface))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 16px 48px hsl(var(--bg) / 0.4)',
            }}
          >
            <div style={{ padding: '14px 16px', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--surface-2))' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--fg))', margin: 0 }}>Create User</h2>
            </div>
            <form onSubmit={handleCreate} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Username" value={newUser.username} onChange={(v) => setNewUser({ ...newUser, username: v })} required />
              <Field label="Display Name" value={newUser.real_name} onChange={(v) => setNewUser({ ...newUser, real_name: v })} placeholder="Optional" />
              <Field label="Password" value={newUser.password} onChange={(v) => setNewUser({ ...newUser, password: v })} type="password" required />
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'hsl(var(--fg-2))', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role</label>
                <SvSelect
                  value={newUser.role}
                  onChange={(v) => setNewUser({ ...newUser, role: v as 'admin' | 'operator' })}
                  options={ROLE_OPTS}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => setIsAdding(false)} className="sv-btn-ghost" style={{ flex: 1, border: '1px solid hsl(var(--border-2))' }}>
                  Cancel
                </button>
                <button type="submit" className="sv-btn-primary" style={{ flex: 1 }}>
                  Create
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};

function Field({ label, value, onChange, type = 'text', required, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
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
        placeholder={placeholder}
      />
    </div>
  );
}
