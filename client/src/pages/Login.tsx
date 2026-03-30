import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Lock, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import api from '../lib/api';

type LoginResponse = {
  success: boolean;
  data: {
    id: number;
    username: string;
    role: string;
    totpEnabled: boolean;
    passwordChangeRequired?: boolean;
  };
};

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      })) as LoginResponse;
      const u = res.data;
      setAuth(
        {
          id: u.id,
          username: u.username,
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="absolute left-[-15%] top-[-15%] h-[45%] w-[45%] rounded-full bg-primary/15 blur-[100px]" />
      <div className="absolute bottom-[-15%] right-[-15%] h-[40%] w-[40%] rounded-full bg-primary/10 blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-[1] w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(251_83%_45%)] shadow-xl shadow-primary/35">
            <ShieldCheck className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-foreground">ServerVault</h1>
          <p className="text-[15px] text-secondary">Sign in to your inventory workspace</p>
        </div>

        <form onSubmit={handleLogin} className="sv-card space-y-5 border-t-4 border-t-primary pt-8">
          <div>
            <label className="mb-2 block text-sm font-medium text-secondary">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-secondary" />
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="sv-input h-11 w-full pl-10"
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-secondary">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-secondary" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="sv-input h-11 w-full pl-10"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="sv-btn-primary flex w-full items-center justify-center gap-2 py-3"
            >
              {submitting ? 'Signing in…' : 'Login'} <LogIn className="h-4 w-4" />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
