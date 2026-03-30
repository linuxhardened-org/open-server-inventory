import { create } from 'zustand';
import { Server, Group, Tag, SshKey } from '../types';
import api from '../lib/api';

interface ServerState {
  servers: Server[];
  groups: Group[];
  tags: Tag[];
  sshKeys: SshKey[];
  isLoading: boolean;
  error: string | null;
  
  fetchServers: (filters?: any) => Promise<void>;
  fetchGroups: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchSshKeys: () => Promise<void>;
  
  addServer: (server: Partial<Server>) => Promise<void>;
  updateServer: (id: number, server: Partial<Server>) => Promise<void>;
  deleteServer: (id: number) => Promise<void>;
}

export const useServerStore = create<ServerState>((set, get) => ({
  servers: [],
  groups: [],
  tags: [],
  sshKeys: [],
  isLoading: false,
  error: null,

  fetchServers: async (filters) => {
    set({ isLoading: true });
    try {
      const response = await api.get('/servers', { params: filters });
      set({ servers: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchGroups: async () => {
    try {
      const response = await api.get('/groups');
      set({ groups: response.data });
    } catch (err: any) {
      console.error(err);
    }
  },

  fetchTags: async () => {
    try {
      const response = await api.get('/tags');
      set({ tags: response.data });
    } catch (err: any) {
      console.error(err);
    }
  },

  fetchSshKeys: async () => {
    try {
      const response = await api.get('/ssh-keys');
      set({ sshKeys: response.data });
    } catch (err: any) {
      console.error(err);
    }
  },

  addServer: async (server) => {
    try {
      const response = await api.post('/servers', server);
      set({ servers: [...get().servers, response.data] });
    } catch (err: any) {
      throw err;
    }
  },

  updateServer: async (id, server) => {
    try {
      const response = await api.patch(`/servers/${id}`, server);
      set({
        servers: get().servers.map((s) => (s.id === id ? { ...s, ...response.data } : s)),
      });
    } catch (err: any) {
      throw err;
    }
  },

  deleteServer: async (id) => {
    try {
      await api.delete(`/servers/${id}`);
      set({
        servers: get().servers.filter((s) => s.id !== id),
      });
    } catch (err: any) {
      throw err;
    }
  },
}));
