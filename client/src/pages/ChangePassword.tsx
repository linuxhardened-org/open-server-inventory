import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

export const ChangePassword = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('New password must be different from the current password');
      return;
    }
    setSubmitting(true);
    try {
      await api.put('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      // Clear the flag in local store
      if (user) {
        setAuth({ ...user, password_change_required: false }, token ?? 'session');
      }
      toast.success('Password changed successfully');
      navigate('/dashboard');
    } catch (err: unknown) {
      const e = err as { error?: string };
      toast.error(e?.error || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="absolute left-[-15%] top-[-15%] h-[45%] w-[45%] rounded-full bg-primary/15 blur-[100px]" />
      <div className="absolute bottom-[-15%] right-[-15%] h-[40%] w-[40%] rounded-full bg-primary/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-[1] w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/15 shadow-xl">
            <ShieldAlert className="h-9 w-9 text-warning" />
          </div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
            Change your password
          </h1>
          <p className="text-sm text-secondary">
            You must set a new password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="sv-card space-y-5 border-t-4 border-t-warning pt-8">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-secondary">Current password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="sv-input pl-10 pr-10"
                placeholder="••••••••"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-secondary">New password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="sv-input pl-10 pr-10"
                placeholder="Min. 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-foreground"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-secondary">Confirm new password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`sv-input pl-10 ${confirmPassword && confirmPassword !== newPassword ? 'border-danger' : ''}`}
                placeholder="Repeat new password"
              />
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-xs text-danger">Passwords do not match</p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || (!!confirmPassword && confirmPassword !== newPassword)}
              className="sv-btn-primary w-full py-3 gap-2"
            >
              {submitting ? 'Saving…' : 'Set new password'}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-secondary">
          Logged in as <span className="font-medium text-foreground">{user?.username}</span>
        </p>
      </motion.div>
    </div>
  );
};
