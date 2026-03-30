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
      navigate('/servers');
    } catch (err: unknown) {
      const e = err as { error?: string };
      toast.error(e?.error || 'Failed to change password');
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

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{ background: 'hsl(var(--bg))' }}
    >
      {/* Background blobs */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '45%',
          height: '45%',
          borderRadius: '50%',
          background: 'hsl(var(--warning) / 0.06)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-10%',
          width: '40%',
          height: '40%',
          borderRadius: '50%',
          background: 'hsl(var(--warning) / 0.04)',
          filter: 'blur(100px)',
          pointerEvents: 'none',
        }}
      />
      {/* Dot grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(hsl(var(--border-2)) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-[1] w-full"
        style={{ maxWidth: 380 }}
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'hsl(var(--warning) / 0.12)',
              border: '1px solid hsl(var(--warning) / 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert style={{ width: 28, height: 28, color: 'hsl(var(--warning))' }} />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'hsl(var(--fg))',
              marginBottom: 6,
            }}
          >
            Change your password
          </h1>
          <p style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}>
            You must set a new password before continuing.
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'hsl(var(--surface))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {/* Top accent bar — warning gradient */}
          <div
            style={{
              height: 3,
              background: 'linear-gradient(to right, hsl(var(--warning)), hsl(var(--warning) / 0.5), transparent)',
            }}
          />

          <form
            onSubmit={handleSubmit}
            style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {/* Current password */}
            <div>
              <label style={labelStyle}>Current password</label>
              <div className="relative">
                <Lock
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 14,
                    height: 14,
                    color: 'hsl(var(--fg-3))',
                    pointerEvents: 'none',
                  }}
                  aria-hidden
                />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="sv-input"
                  style={{ paddingLeft: 32, paddingRight: 36 }}
                  placeholder="••••••••"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'hsl(var(--fg-3))',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 2,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--fg-2))'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--fg-3))'; }}
                >
                  {showCurrent ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label style={labelStyle}>New password</label>
              <div className="relative">
                <Lock
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 14,
                    height: 14,
                    color: 'hsl(var(--fg-3))',
                    pointerEvents: 'none',
                  }}
                  aria-hidden
                />
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="sv-input"
                  style={{ paddingLeft: 32, paddingRight: 36 }}
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'hsl(var(--fg-3))',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 2,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--fg-2))'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--fg-3))'; }}
                >
                  {showNew ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                </button>
              </div>
            </div>

            {/* Confirm new password */}
            <div>
              <label style={labelStyle}>Confirm new password</label>
              <div className="relative">
                <Lock
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 14,
                    height: 14,
                    color: 'hsl(var(--fg-3))',
                    pointerEvents: 'none',
                  }}
                  aria-hidden
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="sv-input"
                  style={{
                    paddingLeft: 32,
                    borderColor:
                      confirmPassword && confirmPassword !== newPassword
                        ? 'hsl(var(--danger))'
                        : undefined,
                  }}
                  placeholder="Repeat new password"
                />
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p style={{ fontSize: 12, color: 'hsl(var(--danger))', marginTop: 4 }}>
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || (!!confirmPassword && confirmPassword !== newPassword)}
              className="sv-btn-primary"
              style={{ width: '100%', height: 38, marginTop: 4, fontSize: 14 }}
            >
              {submitting ? 'Saving…' : 'Set new password'}
              {!submitting && <ArrowRight style={{ width: 14, height: 14 }} />}
            </button>
          </form>
        </div>

        <p className="text-center mt-5" style={{ fontSize: 12, color: 'hsl(var(--fg-3))' }}>
          Logged in as{' '}
          <span style={{ fontWeight: 600, color: 'hsl(var(--fg-2))' }}>{user?.username}</span>
        </p>
      </motion.div>
    </div>
  );
};
