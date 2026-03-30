import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ThemeSync } from './components/ThemeSync';
import { Login } from './pages/Login';
import { Servers } from './pages/Servers';
import { Groups } from './pages/Groups';
import { Tags } from './pages/Tags';
import { SshKeys } from './pages/SshKeys';
import { Profile } from './pages/Profile';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';
import { Setup } from './pages/Setup';
import { ChangePassword } from './pages/ChangePassword';
import { Layout } from './components/Layout';
import { Toaster } from 'react-hot-toast';
import api from './lib/api';
import { useAuthStore } from './store/useAuthStore';
import { useSettingsStore } from './store/useSettingsStore';

type SetupStatusResponse = {
  success: boolean;
  data: {
    isSetupCompleted: boolean;
  };
};

function App() {
  const [setupChecked, setSetupChecked] = useState(false);
  const isSetupCompleted = useAuthStore((state) => state.isSetupCompleted);
  const setSetupCompletedInStore = useAuthStore((state) => state.setSetupCompleted);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = (await api.get('/auth/setup-status')) as SetupStatusResponse;
        if (!mounted) return;
        const completed = !!res.data?.isSetupCompleted;
        setSetupCompletedInStore(completed);
      } catch {
        if (!mounted) return;
        setSetupCompletedInStore(true);
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

  if (!setupChecked) return null;

  return (
    <Router>
      <ThemeSync />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          className: '!bg-surface !border !border-border !shadow-lg !text-foreground',
          style: {
            background: 'hsl(var(--surface))',
            color: 'hsl(var(--foreground))',
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
          <Route path="groups" element={<Groups />} />
          <Route path="tags" element={<Tags />} />
          <Route path="ssh-keys" element={<SshKeys />} />
          <Route path="profile" element={<Profile />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to={isSetupCompleted ? '/servers' : '/setup'} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
