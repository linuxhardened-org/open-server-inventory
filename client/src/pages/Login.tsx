import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, LogIn } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Dummy login
    setAuth({
      id: 1,
      username: email.split('@')[0],
      role: 'admin',
      totp_enabled: false,
      created_at: new Date().toISOString(),
    }, 'dummy-token');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-blue-600 rounded-2xl items-center justify-center shadow-2xl shadow-blue-600/40 mb-6">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Access Vault</h1>
          <p className="text-secondary">Secure server management system</p>
        </div>

        <form onSubmit={handleLogin} className="card space-y-5 backdrop-blur-xl bg-surface/80">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-10 h-11 w-full" 
                placeholder="admin@servervault.com" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-10 h-11 w-full" 
                placeholder="••••••••••••" 
              />
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              Login <LogIn className="w-4 h-4" />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
