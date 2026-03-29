import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import { UserPlus, Shield, User, Trash2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface UserData {
  id: number;
  username: string;
  role: 'admin' | 'operator';
  lastLogin?: string;
}

type UsersListResponse = { success: boolean; data: UserData[] };

export const Users = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState<{
    username: string;
    password: string;
    role: 'admin' | 'operator';
  }>({ username: '', password: '', role: 'operator' });

  const fetchUsers = useCallback(async () => {
    try {
      const res = (await api.get('/users')) as UsersListResponse;
      const rows = res?.data;
      setUsers(Array.isArray(rows) ? rows : []);
    } catch (err: unknown) {
      const e = err as { error?: string };
      const msg = e?.error || '';
      if (msg.includes('Unauthorized') || msg.includes('Session')) return;
      if (msg.includes('Forbidden') || msg.includes('Admin')) {
        toast.error('Admin access required to list users.', { id: 'users-forbidden' });
        return;
      }
      toast.error(msg || 'Could not load users', { id: 'users-fetch' });
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    void fetchUsers();
  }, [currentUser?.role, currentUser?.id, fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', newUser);
      toast.success('User created successfully');
      setIsAdding(false);
      setNewUser({ username: '', password: '', role: 'operator' as const });
      await fetchUsers();
    } catch (err: unknown) {
      const e = err as { error?: string };
      toast.error(e?.error || 'Failed to create user');
    }
  };

  const handleDelete = async (id: number) => {
    if (id === currentUser?.id) {
      toast.error('You cannot delete your own account');
      return;
    }
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted');
      await fetchUsers();
    } catch (err: unknown) {
      const e = err as { error?: string };
      toast.error(e?.error || 'Failed to delete user');
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto mb-4 h-16 w-16 text-danger" />
          <h2 className="text-2xl font-bold text-foreground">Access denied</h2>
          <p className="mt-2 text-secondary">Administrative privileges are required for this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-foreground">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-secondary">Manage system administrators and operators.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="sv-btn-primary flex items-center gap-2 px-4 py-2"
        >
          <UserPlus className="h-4 w-4" />
          Add User
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-foreground">
          <thead className="border-b border-border bg-surface-lighter">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-secondary">User</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-secondary">Role</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-secondary">Last Login</th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <motion.tr
                key={u.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="transition-colors hover:bg-foreground/[0.04]"
              >
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{u.username}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      u.role === 'admin'
                        ? 'bg-primary/15 text-primary'
                        : 'bg-foreground/[0.06] text-secondary'
                    }`}
                  >
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-secondary">
                  {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(u.id)}
                    className="p-2 text-danger transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                    disabled={u.id === currentUser.id}
                    title="Delete user"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-foreground shadow-2xl"
          >
            <h2 className="mb-6 text-xl font-bold text-foreground">Create New User</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Username</label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="sv-input"
                  placeholder="e.g. jdoe"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="sv-input"
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'operator' | 'admin' })}
                  className="sv-input cursor-pointer appearance-none bg-surface-lighter text-foreground"
                >
                  <option value="operator">Operator (Read/Write Inventory)</option>
                  <option value="admin">Admin (System Management)</option>
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="sv-btn-ghost flex-1 border border-border px-4 py-2"
                >
                  Cancel
                </button>
                <button type="submit" className="sv-btn-primary flex-1 px-4 py-2">
                  Create User
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
