import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import api, { getApiErrorMessage } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AnimatedAuthShell } from '@/components/ui/animated-characters-login-page';
import { AuthFormSurface, AuthMobileBrand } from '@/components/ui/auth-form-surface';

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
  const [totpToken, setTotpToken] = useState('');
  const [showTotpField, setShowTotpField] = useState(false);
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
        ...(totpToken.trim() ? { totpToken: totpToken.trim() } : {}),
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
      const msg = getApiErrorMessage(err, 'Invalid username or password');
      if (/totp/i.test(msg)) {
        setShowTotpField(true);
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = (
    <AuthFormSurface>
      <AuthMobileBrand appName={appName} className="mb-0 sm:mb-2" />

      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Welcome back</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">Sign in to your inventory workspace</p>
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
            className="h-12 border border-border bg-surface-2 text-foreground placeholder:text-muted-foreground focus-visible:border-primary"
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
              className="h-12 border border-border bg-surface-2 pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-muted-foreground outline-none ring-offset-background transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {!showTotpField && totpToken.length === 0 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowTotpField(true)}
              className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Use authenticator code
            </button>
          </div>
        )}

        {(showTotpField || totpToken.length > 0) && (
          <div className="space-y-2 rounded-lg border border-border bg-surface-2/90 p-3 dark:bg-surface-3/50">
            <Label htmlFor="login-totp" className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              Authenticator code
            </Label>
            <Input
              id="login-totp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              value={totpToken}
              onChange={(e) => setTotpToken(e.target.value.replace(/\s/g, ''))}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              maxLength={12}
              className="h-11 border border-border bg-bg font-mono text-base tracking-widest text-foreground focus-visible:border-primary dark:bg-surface-2"
            />
            <p className="text-xs leading-snug text-muted-foreground">
              Two-factor authentication is enabled on your account.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 pt-0.5">
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
    </AuthFormSurface>
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
