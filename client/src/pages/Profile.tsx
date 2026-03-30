import { useState, useEffect } from "react";
import { motion } from 'framer-motion';
import { User, Shield, Key, Plus, LogOut, AlertCircle, Edit2, Check, X } from 'lucide-react';
import QrSetup from '../components/QrSetup';
import TokenTable from '../components/TokenTable';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { ApiToken } from '../types';
import toast from 'react-hot-toast';

export const Profile = () => {
  const { user, logout, setAuth } = useAuthStore();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [showQrSetup, setShowQrSetup] = useState(false);
  const [qrData, setQrData] = useState<{ qrCode: string } | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [realName, setRealName] = useState(user?.real_name || '');

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

  const handleSaveRealName = async () => {
    try {
      const res = await api.patch('/auth/profile', { real_name: realName.trim() || null }) as { data: { real_name?: string } };
      if (user) {
        setAuth({ ...user, real_name: res.data.real_name }, 'session');
      }
      toast.success('Display name updated');
      setEditingName(false);
    } catch (err: any) {
      toast.error(err?.error || 'Failed to update display name');
    }
  };

  return (
      <div className="page">
        <header className="page-header">
          <div className="page-header-text">
            <h1>Profile Settings</h1>
            <p>Manage your account security and access.</p>
          </div>
          <button
            onClick={logout}
            className="sv-btn-danger border border-danger/20"
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
            <div className="sv-card text-center p-8">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary/20">
                <User className="w-12 h-12 text-primary" />
              </div>
              {editingName ? (
                <div className="flex items-center justify-center gap-2 mb-1">
                  <input
                    type="text"
                    value={realName}
                    onChange={(e) => setRealName(e.target.value)}
                    className="sv-input text-center py-1 px-2"
                    style={{ maxWidth: 180 }}
                    placeholder="Display name"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveRealName}
                    className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setRealName(user?.real_name || ''); }}
                    className="p-1.5 rounded-md bg-foreground/5 text-secondary hover:bg-foreground/10 transition-colors"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 mb-1">
                  <h2 className="text-xl font-bold">{user?.real_name || user?.username}</h2>
                  <button
                    onClick={() => setEditingName(true)}
                    className="p-1.5 rounded-md text-secondary hover:bg-foreground/5 transition-colors"
                    title="Edit display name"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {user?.real_name && !editingName && (
                <p className="text-secondary text-sm">@{user.username}</p>
              )}
              {!user?.real_name && !editingName && (
                <p className="text-secondary text-sm">@{user?.username}</p>
              )}
              <p className="text-secondary text-xs capitalize mt-1">{user?.role}</p>
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs text-secondary uppercase font-bold tracking-wider mb-2">Member Since</p>
                <p className="text-sm text-foreground">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            <div className="sv-card space-y-4">
              <div className="flex items-center gap-3 text-lg font-bold">
                <Shield className="w-5 h-5 text-primary" />
                Security
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border">
                  <div className="text-sm">
                    <div className="font-medium text-foreground">2FA Status</div>
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

          <div className="md:col-span-2 space-y-6">
            <motion.div 
              layout
              className="sv-card"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-xl font-bold text-foreground">
                  <Key className="h-6 w-6 text-primary" />
                  API Tokens
                </div>
                <button 
                  onClick={handleCreateToken}
                  className="sv-btn-primary py-2 px-4 text-sm gap-2"
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
                className="sv-card border-2 border-primary/30"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-foreground">Setup Two-Factor Authentication</h3>
                  <button 
                    onClick={() => setShowQrSetup(false)}
                    className="text-secondary hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
                <QrSetup
                  qrCodeUrl={qrData.qrCode}
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
