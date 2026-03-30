import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import api from '../lib/api';

type LoginResponse = {
  success: boolean;
  data: {
    id: number;
    username: string;
    realName?: string;
    role: string;
    totpEnabled: boolean;
    passwordChangeRequired?: boolean;
  };
};

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setSetupCompleted = useAuthStore((state) => state.setSetupCompleted);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = (await api.post('/auth/login', {
        username: username.trim(),
        password,
        rememberMe,
      })) as LoginResponse;
      const u = res.data;
      setAuth(
        {
          id: u.id,
          username: u.username,
          real_name: u.realName,
          role: u.role as 'admin' | 'operator',
          totp_enabled: u.totpEnabled,
          password_change_required: !!u.passwordChangeRequired,
          created_at: new Date().toISOString(),
        },
        'session'
      );
      setSetupCompleted(true);
      if (u.passwordChangeRequired) {
        navigate('/change-password');
      } else {
        toast.success('Signed in');
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const e = err as { error?: string };
      toast.error(e?.error || 'Invalid username or password');
    } finally {
      setSubmitting(false);
    }
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
          background: 'hsl(var(--primary) / 0.08)',
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
          background: 'hsl(var(--info) / 0.06)',
          filter: 'blur(100px)',
          pointerEvents: 'none',
        }}
      />
      {/* Dot grid overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(hsl(var(--border-2)) 1px, transparent 1px)',
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
        <div
          style={{
            background: 'hsl(var(--surface))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {/* Top accent bar */}
          <div
            style={{
              height: 3,
              background: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary) / 0.5), transparent)',
            }}
          />

          {/* Card body */}
          <div style={{ padding: 32 }}>
            {/* Logo */}
            <div className="flex flex-col items-center mb-6" style={{ gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{
                    filter: 'drop-shadow(0 0 12px hsl(var(--primary) / 0.5))',
                  }}
                  aria-hidden
                >
                  <rect width="40" height="40" rx="10" fill="hsl(var(--primary) / 0.12)" />
                  <text
                    x="6"
                    y="27"
                    fontFamily="'Geist Mono', ui-monospace, monospace"
                    fontSize="17"
                    fontWeight="600"
                    fill="hsl(var(--primary))"
                  >
                    {'> _'}
                  </text>
                </svg>
              </div>
              <div className="text-center">
                <h1
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'hsl(var(--fg))',
                    lineHeight: 1.3,
                    marginBottom: 4,
                  }}
                >
                  ServerVault
                </h1>
                <p style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}>
                  Sign in to your inventory workspace
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Username */}
              <div>
                <label
                  htmlFor="login-username"
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'hsl(var(--fg-2))',
                    marginBottom: 6,
                  }}
                >
                  Username
                </label>
                <div className="relative">
                  <User
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
                    id="login-username"
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="sv-input"
                    style={{ paddingLeft: 32 }}
                    placeholder="admin"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="login-password"
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'hsl(var(--fg-2))',
                    marginBottom: 6,
                  }}
                >
                  Password
                </label>
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
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="sv-input"
                    style={{ paddingLeft: 32 }}
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              {/* Remember Me */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'hsl(var(--fg-2))',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: 'hsl(var(--primary))',
                    cursor: 'pointer',
                  }}
                />
                Remember me for 30 days
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="sv-btn-primary"
                style={{ width: '100%', height: 38, marginTop: 4, fontSize: 14 }}
              >
                {submitting ? 'Signing in…' : 'Sign in'}
                {!submitting && <LogIn style={{ width: 14, height: 14 }} aria-hidden />}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
