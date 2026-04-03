import { useState, useRef, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getApiErrorMessage } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnimatedAuthShell } from '@/components/ui/animated-characters-login-page';
import { AuthFormSurface, AuthMobileBrand } from '@/components/ui/auth-form-surface';

export const ChangePassword = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);
  const appName = useSettingsStore((s) => s.appName.trim() || 'ServerVault');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const forced = !!user?.password_change_required;

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
      toast.success('Password updated');
      navigate('/servers');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to change password'));
    } finally {
      setSubmitting(false);
    }
  };

  const mismatch = !!confirmPassword && confirmPassword !== newPassword;
  const newOk = newPassword.length >= 8;
  const canSubmit = newOk && !mismatch && currentPassword.length > 0;

  const formContent = (
    <AuthFormSurface>
      <AuthMobileBrand appName={appName} />

      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 ring-1 ring-primary/20">
          <KeyRound className="h-6 w-6 text-primary" aria-hidden />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {forced ? 'Set a new password' : 'Change your password'}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {forced
            ? 'Your administrator requires a new password before you can use the app.'
            : 'Use a strong password you have not used elsewhere.'}
        </p>
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
              className="h-12 border border-border bg-surface-2 pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-primary"
              placeholder="••••••••"
              autoComplete="current-password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-muted-foreground outline-none ring-offset-background transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={showCurrent ? 'Hide password' : 'Show password'}
            >
              {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="cp-new" className="text-sm font-medium">
              New password
            </Label>
            <span className={`text-xs tabular-nums ${newOk ? 'text-primary' : 'text-muted-foreground'}`}>
              {newPassword.length}/8+ chars
            </span>
          </div>
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
              className="h-12 border border-border bg-surface-2 pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-primary"
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-muted-foreground outline-none ring-offset-background transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
          <div className="relative">
            <Input
              id="cp-confirm"
              type={showConfirm ? 'text' : 'password'}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              className={`h-12 border border-border bg-surface-2 pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-primary ${mismatch ? 'border-destructive' : ''}`}
              placeholder="Repeat new password"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-muted-foreground outline-none ring-offset-background transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {mismatch && <p className="text-sm text-destructive">Passwords do not match</p>}
        </div>

        <Button
          type="submit"
          className="h-12 w-full text-base font-medium"
          size="lg"
          disabled={submitting || !canSubmit}
        >
          {submitting ? 'Saving…' : forced ? 'Continue to app' : 'Save new password'}
          {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </form>

      <p className="mt-8 border-t border-border/50 pt-6 text-center text-xs text-muted-foreground">
        Signed in as{' '}
        <span className="font-medium text-foreground">{user?.username}</span>
      </p>
    </AuthFormSurface>
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
