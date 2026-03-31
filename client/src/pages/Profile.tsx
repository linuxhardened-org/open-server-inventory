import { useEffect, useRef, useState } from "react";
import { motion } from 'framer-motion';
import { User, Shield, LogOut, AlertCircle, Edit2, Check, X, Camera, Trash2 } from 'lucide-react';
import QrSetup from '../components/QrSetup';
import api, { getApiErrorMessage } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

export const Profile = () => {
  const { user, logout, setAuth } = useAuthStore();
  const [showQrSetup, setShowQrSetup] = useState(false);
  const [qrData, setQrData] = useState<{ qrCode: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [realName, setRealName] = useState(user?.real_name || '');
  const [profilePictureUrl, setProfilePictureUrl] = useState(user?.profile_picture_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRealName(user?.real_name || '');
    setProfilePictureUrl(user?.profile_picture_url || '');
  }, [user?.real_name, user?.profile_picture_url]);

  const setup2FA = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/2fa/setup');
      setQrData(response.data);
      setShowQrSetup(true);
    } catch (err: unknown) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Failed to initialize 2FA') });
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
    } catch (err: unknown) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Invalid token') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }
    setUploadingAvatar(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await api.patch('/auth/profile', {
        real_name: realName.trim() || null,
        profile_picture_url: dataUrl,
      }) as { data: { real_name?: string; profile_picture_url?: string | null } };
      if (user) {
        setAuth({ ...user, real_name: res.data.real_name, profile_picture_url: res.data.profile_picture_url || null }, 'session');
      }
      setProfilePictureUrl(dataUrl);
      toast.success('Avatar updated');
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const res = await api.patch('/auth/profile', {
        real_name: realName.trim() || null,
        profile_picture_url: null,
      }) as { data: { real_name?: string; profile_picture_url?: string | null } };
      if (user) {
        setAuth({ ...user, real_name: res.data.real_name, profile_picture_url: null }, 'session');
      }
      setProfilePictureUrl('');
      toast.success('Avatar removed');
    } catch {
      toast.error('Failed to remove avatar');
    }
  };

  const handleSaveProfile = async () => {
    try {
      const res = await api.patch('/auth/profile', {
        real_name: realName.trim() || null,
        profile_picture_url: profilePictureUrl.trim() || null,
      }) as { data: { real_name?: string; profile_picture_url?: string | null } };
      if (user) {
        setAuth({
          ...user,
          real_name: res.data.real_name,
          profile_picture_url: res.data.profile_picture_url || null,
        }, 'session');
      }
      toast.success('Profile updated');
      setEditingName(false);
    } catch (err: any) {
      toast.error(err?.error || 'Failed to update profile');
    }
  };

  return (
    <div className="page animate-in">
      <header className="page-header">
        <div className="page-header-text">
          <h1>Profile</h1>
          <p>Manage your account and security settings.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="sv-card text-center p-8">
          <div className="relative w-24 h-24 mx-auto mb-4 group">
            {profilePictureUrl.trim() ? (
              <img
                src={profilePictureUrl.trim()}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-primary/20"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20">
                <User className="w-12 h-12 text-primary" />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Upload avatar"
            >
              {uploadingAvatar ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
          </div>
          {profilePictureUrl.trim() && (
            <button
              onClick={handleRemoveAvatar}
              className="mb-3 text-xs text-secondary hover:text-danger flex items-center gap-1 mx-auto transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Remove avatar
            </button>
          )}
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
                onClick={handleSaveProfile}
                className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Save"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setRealName(user?.real_name || '');
                  setProfilePictureUrl(user?.profile_picture_url || '');
                }}
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
          <div className="mt-4">
            <p className="text-xs text-secondary">Click the avatar to upload a new photo</p>
            <p className="text-xs text-secondary/60 mt-0.5">JPG, PNG, GIF · max 2MB</p>
          </div>
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-secondary uppercase font-bold tracking-wider mb-2">Member Since</p>
            <p className="text-sm text-foreground">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="sv-card space-y-4">
            <div className="flex items-center gap-3 text-lg font-bold">
              <Shield className="w-5 h-5 text-primary" />
              Security
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border">
                <div className="text-sm">
                  <div className="font-medium text-foreground">Two-Factor Authentication</div>
                  <div className="text-secondary text-xs">{user?.totp_enabled ? 'Enabled' : 'Disabled'}</div>
                </div>
                {!user?.totp_enabled && (
                  <button
                    onClick={setup2FA}
                    disabled={isLoading}
                    className="sv-btn-primary py-1.5 px-3 text-xs"
                  >
                    Enable 2FA
                  </button>
                )}
              </div>
            </div>
          </div>

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
