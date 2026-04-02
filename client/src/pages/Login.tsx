import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import api from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AnimatedAuthShell } from '@/components/ui/animated-characters-login-page';

type LoginResponse = {
  success: boolean;
  data: {
    id: number;
    username: string;
    realName?: string;
    profilePictureUrl?: string;
    role: string;
    totpEnabled: boolean;
    passwordChangeRequired?: boolean;
  };
};

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setAuth = useAuthStore((state) => state.setAuth);
  const setSetupCompleted = useAuthStore((state) => state.setSetupCompleted);
  const navigate = useNavigate();
  const appName = useSettingsStore((s) => s.appName.trim() || 'ServerVault');

  const onFieldFocus = useCallback(() => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setIsTyping(true);
  }, []);

  const onFieldBlur = useCallback(() => {
    blurTimer.current = setTimeout(() => setIsTyping(false), 120);
  }, []);

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
          profile_picture_url: u.profilePictureUrl || null,
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
        navigate('/servers');
      }
    } catch (err: unknown) {
      const e = err as { error?: string };
      toast.error(e?.error || 'Invalid username or password');
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = (
    <div className="w-full max-w-[420px]">
      <div className="mb-10 flex items-center justify-center gap-2 text-lg font-semibold lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <span>{appName}</span>
      </div>

      <div className="mb-10 text-center">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your inventory workspace</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="login-username" className="text-sm font-medium">
            Username
          </Label>
          <Input
            id="login-username"
            type="text"
            placeholder="admin"
            value={username}
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value)}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
            required
            className="h-12 border-border/60 bg-background focus-visible:border-primary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password" className="text-sm font-medium">
            Password
          </Label>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              required
              autoComplete="current-password"
              className="h-12 bg-background pr-10 border-border/60 focus-visible:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(v) => setRememberMe(v === true)}
            />
            <Label htmlFor="remember" className="cursor-pointer text-sm font-normal text-muted-foreground">
              Remember for 30 days
            </Label>
          </div>
        </div>

        <Button type="submit" className="h-12 w-full text-base font-medium" size="lg" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
          {!submitting && <LogIn className="ml-2 h-4 w-4" />}
        </Button>
      </form>
    </div>
  );

  return (
    <AnimatedAuthShell
      appName={appName}
      password={password}
      showPassword={showPassword}
      isTyping={isTyping}
    >
      {formContent}
    </AnimatedAuthShell>
  );
};
