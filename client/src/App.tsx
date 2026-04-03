import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ThemeSync } from './components/ThemeSync';
import { Login } from './pages/Login';
import { Servers } from './pages/Servers';
import { Groups } from './pages/Groups';
import { Tags } from './pages/Tags';
import { Profile } from './pages/Profile';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';
import { ApiSettings } from './pages/ApiSettings';
import { CloudIntegrations } from './pages/CloudIntegrations';
import { IpInventory } from './pages/IpInventory';
import { ServerDetail } from './pages/ServerDetail';
import { Setup } from './pages/Setup';
import { ChangePassword } from './pages/ChangePassword';
import { Layout } from './components/Layout';
import { Toaster } from 'react-hot-toast';
import api from './lib/api';
import { useAuthStore } from './store/useAuthStore';
import { useSettingsStore } from './store/useSettingsStore';
import { connectRealtime, disconnectRealtime } from './lib/realtime';

type SetupStatusResponse = {
  success: boolean;
  data: {
    isSetupCompleted: boolean;
    app_name?: string;
  };
};

function App() {
  const [setupChecked, setSetupChecked] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const isSetupCompleted = useAuthStore((state) => state.isSetupCompleted);
  const setSetupCompletedInStore = useAuthStore((state) => state.setSetupCompleted);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);
  const appName = useSettingsStore((state) => state.appName);

  useEffect(() => {
    const t = appName.trim() || 'ServerVault';
    document.title = t;
  }, [appName]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = (await api.get('/auth/setup-status')) as SetupStatusResponse;
        if (!mounted) return;
        const completed = !!res.data?.isSetupCompleted;
        setSetupCompletedInStore(completed);
        const name = res.data?.app_name?.trim();
        if (name) {
          useSettingsStore.getState().setAppName(name);
        }
      } catch {
        // Do not assume setup completed on network/API failure — avoids sending users to
        // login when the server is unreachable or misconfigured.
        if (!mounted) return;
      } finally {
        if (mounted) setSetupChecked(true);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [setSetupCompletedInStore]);

  // Fetch settings once authenticated
  useEffect(() => {
    if (isAuthenticated) void fetchSettings();
  }, [isAuthenticated, fetchSettings]);

  // Validate persisted auth at app bootstrap (prevents stale local auth when backend is down)
  useEffect(() => {
    let mounted = true;
    const validate = async () => {
      if (!isAuthenticated) {
        if (mounted) setAuthChecked(true);
        return;
      }
      try {
        await api.get('/auth/me');
      } catch {
        // Network/session failure => clear stale local auth and force login
        logout();
      } finally {
        if (mounted) setAuthChecked(true);
      }
    };
    void validate();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, logout]);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectRealtime();
      return;
    }
    connectRealtime();
    return () => {
      disconnectRealtime();
    };
  }, [isAuthenticated]);

  if (!setupChecked || !authChecked) return null;

  return (
    <Router>
      <ThemeSync />
      <Toaster
        position="top-right"
        containerClassName="!z-[10050]"
        toastOptions={{
          duration: 5000,
          className: '!font-sans',
          style: {
            background: 'hsl(var(--surface))',
            color: 'hsl(var(--fg))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '10px',
            boxShadow: '0 12px 40px -12px rgba(0, 0, 0, 0.45)',
            maxWidth: 'min(100vw - 24px, 380px)',
          },
          success: {
            iconTheme: {
              primary: 'hsl(var(--primary))',
              secondary: 'hsl(0 0% 100%)',
            },
          },
          error: {
            iconTheme: {
              primary: 'hsl(var(--danger))',
              secondary: 'hsl(0 0% 100%)',
            },
            style: {
              background: 'hsl(var(--surface))',
              color: 'hsl(var(--fg))',
              border: '1px solid hsl(var(--border))',
            },
          },
        }}
      />
      <Routes>
        <Route path="/login" element={isSetupCompleted ? <Login /> : <Navigate to="/setup" replace />} />
        <Route path="/setup" element={isSetupCompleted ? <Navigate to="/login" replace /> : <Setup />} />
        <Route path="/change-password" element={<ChangePassword />} />

        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/servers" replace />} />
          <Route path="servers" element={<Servers />} />
          <Route path="servers/:id" element={<ServerDetail />} />
          <Route path="groups" element={<Groups />} />
          <Route path="tags" element={<Tags />} />
          <Route path="cloud" element={<CloudIntegrations />} />
          <Route path="ips" element={<IpInventory />} />
          <Route path="profile" element={<Profile />} />
          <Route path="users" element={<Users />} />
          <Route path="api-settings" element={<ApiSettings />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to={isSetupCompleted ? '/servers' : '/setup'} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
