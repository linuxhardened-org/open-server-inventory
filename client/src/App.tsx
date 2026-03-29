import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeSync } from './components/ThemeSync';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Servers } from './pages/Servers';
import { Groups } from './pages/Groups';
import { Tags } from './pages/Tags';
import { SshKeys } from './pages/SshKeys';
import { Profile } from './pages/Profile';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';
import { Setup } from './pages/Setup';
import { Layout } from './components/Layout';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <ThemeSync />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          className:
            '!bg-surface !text-foreground !border !border-border !shadow-lg',
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<Setup />} />

        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="servers" element={<Servers />} />
          <Route path="groups" element={<Groups />} />
          <Route path="tags" element={<Tags />} />
          <Route path="ssh-keys" element={<SshKeys />} />
          <Route path="profile" element={<Profile />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
