import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Building2, Database, Server, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';

type SetupResponse = {
  success: boolean;
  data: {
    requiresRestart?: boolean;
  };
};

type DbTestResult = { connected: boolean; version?: string; error?: string } | null;

type DbProvider = 'local' | 'supabase' | 'custom';

export const Setup = () => {
  const setSetupCompleted = useAuthStore((state) => state.setSetupCompleted);
  const navigate = useNavigate();

  // Step 1: DB selection
  const [step, setStep] = useState<'db' | 'account'>('db');
  const [dbProvider, setDbProvider] = useState<DbProvider>('local');
  const [databaseUrl, setDatabaseUrl] = useState('');
  const [dbTest, setDbTest] = useState<DbTestResult>(null);
  const [testing, setTesting] = useState(false);

  // Step 2: Org name
  const [appName, setAppName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [restarting, setRestarting] = useState(false);

  // Reset test when URL changes
  useEffect(() => { setDbTest(null); }, [databaseUrl]);

  const handleTestDb = async () => {
    if (!databaseUrl.trim()) return;
    setTesting(true);
    setDbTest(null);
    try {
      const res = (await api.post('/auth/test-db', { database_url: databaseUrl.trim() })) as { success: boolean; data: DbTestResult };
      setDbTest(res.data);
    } catch {
      setDbTest({ connected: false, error: 'Could not reach server' });
    } finally {
      setTesting(false);
    }
  };

  const canProceedDb =
    dbProvider === 'local' || dbTest?.connected === true;

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, string | undefined> = {
        app_name: appName.trim() || undefined,
      };

      if ((dbProvider === 'supabase' || dbProvider === 'custom') && databaseUrl.trim()) {
        payload.database_url = databaseUrl.trim();
      }

      const res = (await api.post('/auth/setup', payload)) as SetupResponse;
      const u = res.data;

      if (u.requiresRestart) {
        setRestarting(true);
        // Poll setup-status until server comes back up
        const poll = async () => {
          try {
            const statusRes = (await api.get('/auth/setup-status')) as { success: boolean; data: { isSetupCompleted: boolean } };
            if (statusRes.data?.isSetupCompleted) {
              setSetupCompleted(true);
              toast.success('Setup complete! Log in with Admin / Admin@123');
              navigate('/login');
              return;
            }
          } catch { /* server still restarting */ }
          setTimeout(poll, 2000);
        };
        setTimeout(poll, 3000);
        return;
      }

      setSetupCompleted(true);
      toast.success('Setup complete! Log in with Admin / Admin@123 and change your password.');
      navigate('/login');
    } catch (err: unknown) {
      const e = err as { error?: string };
      toast.error(e?.error || 'Setup failed');
    } finally {
      if (!restarting) setSubmitting(false);
    }
  };

  if (restarting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm px-4">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Connecting to your database…</h2>
          <p className="text-sm text-secondary">The server is restarting with your new database configuration. This takes a few seconds.</p>
        </div>
      </div>
    );
  }

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
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-foreground">
            {step === 'db' ? 'Choose database' : 'Almost done'}
          </h1>
          <p className="text-[15px] text-secondary">
            {step === 'db' ? 'Step 1 of 2 — where should data be stored?' : 'Step 2 of 2 — name your organization'}
          </p>

          {/* Step indicator */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className={`h-1.5 w-8 rounded-full transition-colors ${step === 'db' ? 'bg-primary' : 'bg-primary/40'}`} />
            <div className={`h-1.5 w-8 rounded-full transition-colors ${step === 'account' ? 'bg-primary' : 'bg-border'}`} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'db' ? (
            <motion.div
              key="db"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="sv-card space-y-4 border-t-4 border-t-primary pt-6"
            >
              {/* Local option */}
              <button
                type="button"
                onClick={() => setDbProvider('local')}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  dbProvider === 'local'
                    ? 'border-primary bg-primary/[0.06]'
                    : 'border-border hover:border-border-strong'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Server className={`h-5 w-5 shrink-0 ${dbProvider === 'local' ? 'text-primary' : 'text-secondary'}`} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Local PostgreSQL</p>
                    <p className="text-xs text-secondary">Docker-managed database on this machine</p>
                  </div>
                  {dbProvider === 'local' && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
                </div>
              </button>

              {/* Supabase option */}
              <button
                type="button"
                onClick={() => setDbProvider('supabase')}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  dbProvider === 'supabase'
                    ? 'border-primary bg-primary/[0.06]'
                    : 'border-border hover:border-border-strong'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Database className={`h-5 w-5 shrink-0 ${dbProvider === 'supabase' ? 'text-primary' : 'text-secondary'}`} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Supabase</p>
                    <p className="text-xs text-secondary">Managed cloud PostgreSQL by Supabase</p>
                  </div>
                  {dbProvider === 'supabase' && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
                </div>
              </button>

              {/* Custom PostgreSQL option */}
              <button
                type="button"
                onClick={() => setDbProvider('custom')}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  dbProvider === 'custom'
                    ? 'border-primary bg-primary/[0.06]'
                    : 'border-border hover:border-border-strong'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Database className={`h-5 w-5 shrink-0 ${dbProvider === 'custom' ? 'text-primary' : 'text-secondary'}`} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">External PostgreSQL</p>
                    <p className="text-xs text-secondary">Any remote PostgreSQL via connection string</p>
                  </div>
                  {dbProvider === 'custom' && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
                </div>
              </button>

              {/* Connection string input for non-local */}
              <AnimatePresence>
                {dbProvider !== 'local' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2 space-y-3">
                      <label className="block text-sm font-medium text-secondary">
                        {dbProvider === 'supabase' ? 'Supabase connection string' : 'PostgreSQL connection string'}
                      </label>
                      {dbProvider === 'supabase' && (
                        <p className="text-xs text-secondary rounded-lg bg-muted/60 px-3 py-2">
                          Get this from: <span className="font-medium text-foreground">Supabase Dashboard → Project Settings → Database → Session mode (port 5432)</span>
                        </p>
                      )}
                      <input
                        type="text"
                        value={databaseUrl}
                        onChange={(e) => setDatabaseUrl(e.target.value)}
                        className="sv-input font-mono text-xs"
                        placeholder="postgresql://user:password@host:5432/database"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleTestDb}
                          disabled={!databaseUrl.trim() || testing}
                          className="sv-btn-outline h-9 px-4 text-sm"
                        >
                          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          {testing ? 'Testing…' : 'Test connection'}
                        </button>
                        {dbTest && (
                          <span className={`flex items-center gap-1.5 text-sm font-medium ${dbTest.connected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {dbTest.connected
                              ? <><CheckCircle2 className="h-4 w-4" /> Connected{dbTest.version ? ` · ${dbTest.version}` : ''}</>
                              : <><XCircle className="h-4 w-4" /> {dbTest.error ?? 'Failed'}</>
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={!canProceedDb}
                  onClick={() => setStep('account')}
                  className="sv-btn-primary w-full py-3 gap-2"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="account"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <form onSubmit={handleComplete} className="sv-card space-y-5 border-t-4 border-t-primary pt-8">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">Organization / App Name <span className="text-xs font-normal text-secondary/70">(optional)</span></label>
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

                <div className="rounded-lg bg-muted/60 px-4 py-3 text-sm text-secondary space-y-1">
                  <p className="font-medium text-foreground">Default admin credentials</p>
                  <p>Username: <span className="font-mono font-semibold text-foreground">Admin</span></p>
                  <p>Password: <span className="font-mono font-semibold text-foreground">Admin@123</span></p>
                  <p className="text-xs mt-1">You will be required to change your password on first login.</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('db')}
                    className="sv-btn-ghost border border-border px-4"
                    disabled={submitting}
                  >
                    Back
                  </button>
                  <button type="submit" disabled={submitting} className="sv-btn-primary flex-1 py-3 gap-2">
                    {submitting ? 'Setting up…' : 'Finish Setup'} {!submitting && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-secondary mt-8">
          By proceeding, you agree to the default security policies.
        </p>
      </motion.div>
    </div>
  );
};
