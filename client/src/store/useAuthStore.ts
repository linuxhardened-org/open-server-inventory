import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import api from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isSetupCompleted: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setSetupCompleted: (completed: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isSetupCompleted: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => {
        void api.post('/auth/logout').catch(() => {});
        set({ user: null, token: null, isAuthenticated: false });
      },
      setSetupCompleted: (completed) => set({ isSetupCompleted: completed }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
