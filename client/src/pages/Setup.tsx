import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, User, ArrowRight, Building2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';

type SetupResponse = {
  success: boolean;
  data: {
    id: number;
    username: string;
    role: string;
    totpEnabled: boolean;
  };
};

export const Setup = () => {
  const setSetupCompleted = useAuthStore((state) => state.setSetupCompleted);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();
  const [appName, setAppName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const derivedUsername =
        username.trim() ||
        email.split('@')[0]?.trim() ||
        name.trim().toLowerCase().replace(/\s+/g, '.') ||
        'admin';
      const res = (await api.post('/auth/setup', {
        username: derivedUsername,
        password,
        app_name: appName.trim() || undefined,
      })) as SetupResponse;
      const u = res.data;
      setAuth(
        {
          id: u.id,
          username: u.username,
          role: u.role as 'admin' | 'operator',
          totp_enabled: u.totpEnabled,
          created_at: new Date().toISOString(),
        },
        'session'
      );
      setSetupCompleted(true);
      toast.success('Setup completed');
      navigate('/dashboard');
    } catch (err: unknown) {
      const e = err as { error?: string };
      toast.error(e?.error || 'Setup failed');
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
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-foreground">Initialize ServerVault</h1>
          <p className="text-[15px] text-secondary">Create the master administrator account</p>
        </div>

        <form onSubmit={handleComplete} className="sv-card space-y-5 border-t-4 border-t-primary pt-8">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Organization / App Name</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="sv-input pl-10"
                placeholder="ServerVault"
                maxLength={80}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Administrator Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input 
                type="text" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="sv-input pl-10" 
                placeholder="John Doe" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => {
                  const val = e.target.value;
                  setEmail(val);
                  if (!username.trim()) setUsername(val.split('@')[0] || '');
                }}
                className="sv-input pl-10" 
                placeholder="admin@servervault.com" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input
                type="text"
                required
                minLength={3}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="sv-input pl-10"
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Master Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input 
                type="password" 
                required 
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="sv-input pl-10" 
                placeholder="••••••••••••" 
              />
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={submitting} className="sv-btn-primary w-full py-3 gap-2">
              {submitting ? 'Creating admin…' : 'Finish Setup'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
        
        <p className="text-center text-xs text-secondary mt-8">
          By proceeding, you agree to the default security policies.
        </p>
      </motion.div>
    </div>
  );
};
