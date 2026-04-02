import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnimatedAuthShell } from '@/components/ui/animated-characters-login-page';

export const ChangePassword = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);
  const appName = useSettingsStore((s) => s.appName.trim() || 'ServerVault');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onFieldFocus = useCallback(() => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setIsTyping(true);
  }, []);

  const onFieldBlur = useCallback(() => {
    blurTimer.current = setTimeout(() => setIsTyping(false), 120);
  }, []);

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

  const mismatch = !!confirmPassword && confirmPassword !== newPassword;

  const formContent = (
    <div className="w-full max-w-[420px]">
      <div className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <span>{appName}</span>
      </div>

      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">Change your password</h1>
        <p className="text-sm text-muted-foreground">You must set a new password before continuing.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="cp-current" className="text-sm font-medium">
            Current password
          </Label>
          <div className="relative">
            <Input
              id="cp-current"
              type={showCurrent ? 'text' : 'password'}
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              className="h-12 bg-background pr-10 border-border/60 focus-visible:border-primary"
              placeholder="••••••••"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showCurrent ? 'Hide password' : 'Show password'}
            >
              {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cp-new" className="text-sm font-medium">
            New password
          </Label>
          <div className="relative">
            <Input
              id="cp-new"
              type={showNew ? 'text' : 'password'}
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              className="h-12 bg-background pr-10 border-border/60 focus-visible:border-primary"
              placeholder="Min. 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showNew ? 'Hide password' : 'Show password'}
            >
              {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cp-confirm" className="text-sm font-medium">
            Confirm new password
          </Label>
          <Input
            id="cp-confirm"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
            className={`h-12 bg-background border-border/60 focus-visible:border-primary ${mismatch ? 'border-destructive' : ''}`}
            placeholder="Repeat new password"
          />
          {mismatch && <p className="text-sm text-destructive">Passwords do not match</p>}
        </div>

        <Button
          type="submit"
          className="h-12 w-full text-base font-medium"
          size="lg"
          disabled={submitting || mismatch}
        >
          {submitting ? 'Saving…' : 'Set new password'}
          {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </form>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Logged in as <span className="font-semibold text-foreground">{user?.username}</span>
      </p>
    </div>
  );

  return (
    <AnimatedAuthShell
      appName={appName}
      password={newPassword}
      showPassword={showNew}
      isTyping={isTyping}
    >
      {formContent}
    </AnimatedAuthShell>
  );
};
