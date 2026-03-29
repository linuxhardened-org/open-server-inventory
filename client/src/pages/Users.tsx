import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import { UserPlus, Shield, User, Trash2 } from 'lucide-react';
import axios from '../lib/api';
import toast from 'react-hot-toast';

interface UserData {
  id: number;
  username: string;
  role: 'admin' | 'operator';
  lastLogin?: string;
}

export const Users = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'operator' as const });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/users');
      setUsers(res.data);
    } catch (err: any) {
      toast.error('Failed to fetch users');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/users', newUser);
      toast.success('User created successfully');
      setIsAdding(false);
      setNewUser({ username: '', password: '', role: 'operator' });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleDelete = async (id: number) => {
    if (id === currentUser?.id) {
      toast.error('You cannot delete your own account');
      return;
    }
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`/users/${id}`);
      toast.success('User deleted');
      fetchUsers();
    } catch (err: any) {
      toast.error('Failed to delete user');
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
      <div className="space-y-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-secondary">Manage system administrators and operators.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full">
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="font-medium text-foreground">{u.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.role === 'admin' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-secondary">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-red-500 hover:text-red-400 p-2 transition-colors"
                      disabled={u.id === currentUser.id}
                    >
                      <Trash2 className="w-4 h-4" />
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
              className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl"
            >
              <h2 className="mb-6 text-xl font-bold text-foreground">Create New User</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-secondary">Username</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="input"
                    placeholder="e.g. jdoe"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-secondary">Password</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="input"
                    placeholder="Minimum 8 characters"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-secondary">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                    className="input appearance-none bg-surface-lighter"
                  >
                    <option value="operator">Operator (Read/Write Inventory)</option>
                    <option value="admin">Admin (System Management)</option>
                  </select>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="btn-ghost flex-1 border border-border px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary flex-1 px-4 py-2">
                    Create User
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
  );
}
