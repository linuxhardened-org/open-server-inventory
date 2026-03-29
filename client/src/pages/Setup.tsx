import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';

export const Setup = () => {
  const setSetupCompleted = useAuthStore((state) => state.setSetupCompleted);
  const navigate = useNavigate();

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    setSetupCompleted(true);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-primary rounded-2xl items-center justify-center shadow-2xl shadow-primary/40 mb-6">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Initialize ServerVault</h1>
          <p className="text-secondary">Create the master administrator account</p>
        </div>

        <form onSubmit={handleComplete} className="card space-y-5 backdrop-blur-xl bg-surface/80">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Administrator Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input 
                type="text" 
                required 
                className="input pl-10" 
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
                className="input pl-10" 
                placeholder="admin@servervault.com" 
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
                className="input pl-10" 
                placeholder="••••••••••••" 
              />
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" className="btn-primary w-full py-3 gap-2">
              Finish Setup <ArrowRight className="w-4 h-4" />
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
