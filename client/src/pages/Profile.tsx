import { useState, useEffect } from "react";
import { motion } from 'framer-motion';
import { User, Shield, Key, Plus, LogOut, AlertCircle } from 'lucide-react';
import QrSetup from '../components/QrSetup';
import TokenTable from '../components/TokenTable';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { ApiToken } from '../types';

export const Profile = () => {
  const { user, logout } = useAuthStore();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [showQrSetup, setShowQrSetup] = useState(false);
  const [qrData, setQrData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await api.get('/tokens');
      setTokens(response.data);
    } catch (err) {
      console.error('Failed to fetch tokens', err);
    }
  };

  const handleCreateToken = async () => {
    const name = prompt('Enter a name for the new token:');
    if (!name) return;

    try {
      const response = await api.post('/tokens', { name });
      setNewToken(response.data.token);
      fetchTokens();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create token' });
    }
  };

  const handleDeleteToken = async (id: number) => {
    if (!confirm('Are you sure you want to delete this token?')) return;
    try {
      await api.delete(`/tokens/${id}`);
      fetchTokens();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete token' });
    }
  };

  const setup2FA = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/2fa/setup');
      setQrData(response.data);
      setShowQrSetup(true);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to initialize 2FA' });
    } finally {
      setIsLoading(false);
    }
  };

  const verify2FA = async (token: string) => {
    setIsLoading(true);
    try {
      await api.post('/auth/2fa/verify', { token });
      setMessage({ type: 'success', text: '2FA has been successfully enabled' });
      setShowQrSetup(false);
      // Ideally refresh user state here
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Invalid token' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            <p className="text-secondary">Manage your account security and access</p>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </header>

        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}>
            <AlertCircle className="w-5 h-5" />
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <div className="card text-center p-8">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary/20">
                <User className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-xl font-bold">{user?.username}</h2>
              <p className="text-secondary text-sm capitalize">{user?.role}</p>
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs text-secondary uppercase font-bold tracking-wider mb-2">Member Since</p>
                <p className="text-sm">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>

            <div className="card space-y-4">
              <div className="flex items-center gap-3 text-lg font-bold">
                <Shield className="w-5 h-5 text-primary" />
                Security
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border">
                  <div className="text-sm">
                    <div className="font-medium">2FA Status</div>
                    <div className="text-secondary text-xs">{user?.totp_enabled ? 'Enabled' : 'Disabled'}</div>
                  </div>
                  {!user?.totp_enabled && (
                    <button 
                      onClick={setup2FA}
                      disabled={isLoading}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Enable
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-8">
            <motion.div 
              layout
              className="card"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-xl font-bold">
                  <Key className="w-6 h-6 text-primary" />
                  API Tokens
                </div>
                <button 
                  onClick={handleCreateToken}
                  className="btn-primary py-2 px-4 text-sm gap-2"
                >
                  <Plus className="w-4 h-4" /> New Token
                </button>
              </div>
              
              <TokenTable 
                tokens={tokens} 
                onRevoke={handleDeleteToken} 
              />            
              
              {newToken && (
                <div className="mt-6 p-4 bg-blue-600/10 border border-blue-600/20 rounded-xl animate-in">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-blue-500 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Save this token now!
                    </p>
                    <button onClick={() => setNewToken(null)} className="text-xs text-secondary transition-colors hover:text-foreground">Dismiss</button>
                  </div>
                  <div className="rounded border border-blue-600/10 bg-surface-lighter p-3 font-mono text-sm break-all text-foreground">
                    {newToken}
                  </div>
                  <p className="mt-2 text-[10px] text-secondary">This token will never be shown again.</p>
                </div>
              )}
            </motion.div>

            {showQrSetup && qrData && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card border-2 border-primary/30"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Setup Two-Factor Authentication</h3>
                  <button 
                    onClick={() => setShowQrSetup(false)}
                    className="text-secondary hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
                <QrSetup 
                  qrCodeUrl={qrData.qrCode} 
                  secret={qrData.secret} 
                  onVerify={verify2FA}
                  isLoading={isLoading}
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>
  );
};
