import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Database, Server, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
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
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: 'hsl(var(--bg))' }}
      >
        <div className="text-center" style={{ maxWidth: 360, padding: '0 24px' }}>
          <Loader2
            style={{ width: 40, height: 40, color: 'hsl(var(--primary))', margin: '0 auto 16px' }}
            className="animate-spin"
          />
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'hsl(var(--fg))', marginBottom: 8 }}>
            Connecting to your database…
          </h2>
          <p style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}>
            The server is restarting with your new database configuration. This takes a few seconds.
          </p>
        </div>
      </div>
    );
  }

  const dbOptionStyle = (selected: boolean): React.CSSProperties => ({
    width: '100%',
    borderRadius: 12,
    border: selected ? '2px solid hsl(var(--primary))' : '2px solid hsl(var(--border))',
    background: selected ? 'hsl(var(--primary) / 0.06)' : 'transparent',
    padding: 16,
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'border-color 120ms, background 120ms',
  });

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{ background: 'hsl(var(--bg))' }}
    >
      {/* Background blobs */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '45%',
          height: '45%',
          borderRadius: '50%',
          background: 'hsl(var(--primary) / 0.08)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-10%',
          width: '40%',
          height: '40%',
          borderRadius: '50%',
          background: 'hsl(var(--info) / 0.06)',
          filter: 'blur(100px)',
          pointerEvents: 'none',
        }}
      />
      {/* Dot grid overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(hsl(var(--border-2)) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-[1] w-full"
        style={{ maxWidth: 420 }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          {/* Terminal icon */}
          <div className="flex justify-center mb-4">
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ filter: 'drop-shadow(0 0 12px hsl(var(--primary) / 0.5))' }}
              aria-hidden
            >
              <rect width="40" height="40" rx="10" fill="hsl(var(--primary) / 0.12)" />
              <text
                x="6"
                y="27"
                fontFamily="'Geist Mono', ui-monospace, monospace"
                fontSize="17"
                fontWeight="600"
                fill="hsl(var(--primary))"
              >
                {'> _'}
              </text>
            </svg>
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'hsl(var(--fg))', marginBottom: 4 }}>
            {step === 'db' ? 'Choose database' : 'Almost done'}
          </h1>
          <p style={{ fontSize: 13, color: 'hsl(var(--fg-2))' }}>
            {step === 'db' ? 'Step 1 of 2 — where should data be stored?' : 'Step 2 of 2 — name your organization'}
          </p>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div
              style={{
                height: 4,
                width: 32,
                borderRadius: 9999,
                background: step === 'db' ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.4)',
                transition: 'background 200ms',
              }}
            />
            <div
              style={{
                height: 4,
                width: 32,
                borderRadius: 9999,
                background: step === 'account' ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                transition: 'background 200ms',
              }}
            />
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'hsl(var(--surface))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {/* Top accent bar */}
          <div
            style={{
              height: 3,
              background: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary) / 0.5), transparent)',
            }}
          />

          <AnimatePresence mode="wait">
            {step === 'db' ? (
              <motion.div
                key="db"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                {/* Local option */}
                <button
                  type="button"
                  onClick={() => setDbProvider('local')}
                  style={dbOptionStyle(dbProvider === 'local')}
                >
                  <div className="flex items-center gap-3">
                    <Server
                      style={{ width: 18, height: 18, flexShrink: 0, color: dbProvider === 'local' ? 'hsl(var(--primary))' : 'hsl(var(--fg-2))' }}
                    />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--fg))', marginBottom: 2 }}>Local PostgreSQL</p>
                      <p style={{ fontSize: 12, color: 'hsl(var(--fg-2))' }}>Docker-managed database on this machine</p>
                    </div>
                    {dbProvider === 'local' && (
                      <CheckCircle2 style={{ marginLeft: 'auto', width: 15, height: 15, color: 'hsl(var(--primary))', flexShrink: 0 }} />
                    )}
                  </div>
                </button>

                {/* Supabase option */}
                <button
                  type="button"
                  onClick={() => setDbProvider('supabase')}
                  style={dbOptionStyle(dbProvider === 'supabase')}
                >
                  <div className="flex items-center gap-3">
                    <Database
                      style={{ width: 18, height: 18, flexShrink: 0, color: dbProvider === 'supabase' ? 'hsl(var(--primary))' : 'hsl(var(--fg-2))' }}
                    />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--fg))', marginBottom: 2 }}>Supabase</p>
                      <p style={{ fontSize: 12, color: 'hsl(var(--fg-2))' }}>Managed cloud PostgreSQL by Supabase</p>
                    </div>
                    {dbProvider === 'supabase' && (
                      <CheckCircle2 style={{ marginLeft: 'auto', width: 15, height: 15, color: 'hsl(var(--primary))', flexShrink: 0 }} />
                    )}
                  </div>
                </button>

                {/* Custom PostgreSQL option */}
                <button
                  type="button"
                  onClick={() => setDbProvider('custom')}
                  style={dbOptionStyle(dbProvider === 'custom')}
                >
                  <div className="flex items-center gap-3">
                    <Database
                      style={{ width: 18, height: 18, flexShrink: 0, color: dbProvider === 'custom' ? 'hsl(var(--primary))' : 'hsl(var(--fg-2))' }}
                    />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--fg))', marginBottom: 2 }}>External PostgreSQL</p>
                      <p style={{ fontSize: 12, color: 'hsl(var(--fg-2))' }}>Any remote PostgreSQL via connection string</p>
                    </div>
                    {dbProvider === 'custom' && (
                      <CheckCircle2 style={{ marginLeft: 'auto', width: 15, height: 15, color: 'hsl(var(--primary))', flexShrink: 0 }} />
                    )}
                  </div>
                </button>

                {/* Connection string input for non-local */}
                <AnimatePresence>
                  {dbProvider !== 'local' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
                        <label
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            textTransform: 'uppercase' as const,
                            letterSpacing: '0.06em',
                            color: 'hsl(var(--fg-2))',
                          }}
                        >
                          {dbProvider === 'supabase' ? 'Supabase connection string' : 'PostgreSQL connection string'}
                        </label>
                        {dbProvider === 'supabase' && (
                          <p
                            style={{
                              fontSize: 12,
                              color: 'hsl(var(--fg-2))',
                              background: 'hsl(var(--surface-2))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: 6,
                              padding: '8px 12px',
                            }}
                          >
                            Get this from:{' '}
                            <span style={{ fontWeight: 600, color: 'hsl(var(--fg))' }}>
                              Supabase Dashboard → Project Settings → Database → Session mode (port 5432)
                            </span>
                          </p>
                        )}
                        <input
                          type="text"
                          value={databaseUrl}
                          onChange={(e) => setDatabaseUrl(e.target.value)}
                          className="sv-input font-mono"
                          style={{ fontSize: 12 }}
                          placeholder="postgresql://user:password@host:5432/database"
                          autoComplete="off"
                          spellCheck={false}
                        />
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleTestDb}
                            disabled={!databaseUrl.trim() || testing}
                            className="sv-btn-outline"
                          >
                            {testing ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : null}
                            {testing ? 'Testing…' : 'Test connection'}
                          </button>
                          {dbTest && (
                            <span
                              className="flex items-center gap-1.5"
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: dbTest.connected ? '#3ecf8e' : '#ef4444',
                              }}
                            >
                              {dbTest.connected ? (
                                <>
                                  <CheckCircle2 style={{ width: 14, height: 14 }} />
                                  Connected{dbTest.version ? ` · ${dbTest.version}` : ''}
                                </>
                              ) : (
                                <>
                                  <XCircle style={{ width: 14, height: 14 }} />
                                  {dbTest.error ?? 'Failed'}
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  disabled={!canProceedDb}
                  onClick={() => setStep('account')}
                  className="sv-btn-primary"
                  style={{ width: '100%', height: 38, marginTop: 4, fontSize: 14 }}
                >
                  Continue <ArrowRight style={{ width: 15, height: 15 }} />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="account"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <form
                  onSubmit={handleComplete}
                  style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 11,
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'hsl(var(--fg-2))',
                        marginBottom: 6,
                      }}
                    >
                      Organization / App Name{' '}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 400,
                          textTransform: 'none',
                          letterSpacing: 0,
                          color: 'hsl(var(--fg-3))',
                        }}
                      >
                        (optional)
                      </span>
                    </label>
                    <div className="relative">
                      <Building2
                        style={{
                          position: 'absolute',
                          left: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 14,
                          height: 14,
                          color: 'hsl(var(--fg-3))',
                          pointerEvents: 'none',
                        }}
                        aria-hidden
                      />
                      <input
                        type="text"
                        value={appName}
                        onChange={(e) => setAppName(e.target.value)}
                        className="sv-input"
                        style={{ paddingLeft: 32 }}
                        placeholder="ServerVault"
                        maxLength={80}
                      />
                    </div>
                  </div>

                  {/* Credentials info box */}
                  <div
                    style={{
                      background: 'hsl(var(--surface-2))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--fg))', marginBottom: 2 }}>
                      Default admin credentials
                    </p>
                    <p style={{ fontSize: 12, color: 'hsl(var(--fg-2))' }}>
                      Username:{' '}
                      <span className="font-mono" style={{ fontWeight: 600, color: 'hsl(var(--fg))' }}>
                        Admin
                      </span>
                    </p>
                    <p style={{ fontSize: 12, color: 'hsl(var(--fg-2))' }}>
                      Password:{' '}
                      <span className="font-mono" style={{ fontWeight: 600, color: 'hsl(var(--fg))' }}>
                        Admin@123
                      </span>
                    </p>
                    <p style={{ fontSize: 11, color: 'hsl(var(--fg-3))', marginTop: 4 }}>
                      You will be required to change your password on first login.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep('db')}
                      className="sv-btn-ghost"
                      style={{ border: '1px solid hsl(var(--border-2))', padding: '0 16px' }}
                      disabled={submitting}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="sv-btn-primary"
                      style={{ flex: 1, height: 38, fontSize: 14 }}
                    >
                      {submitting ? 'Setting up…' : 'Finish Setup'}
                      {!submitting && <ArrowRight style={{ width: 15, height: 15 }} />}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center mt-6" style={{ fontSize: 12, color: 'hsl(var(--fg-3))' }}>
          By proceeding, you agree to the default security policies.
        </p>
      </motion.div>
    </div>
  );
};
