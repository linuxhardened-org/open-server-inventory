import { motion, AnimatePresence } from 'framer-motion';
import { X, Server, Terminal, Activity, Shield, Key, Settings, Globe } from 'lucide-react';
import { Server as ServerType } from '../types';

interface ServerDrawerProps {
  server: ServerType | null;
  isOpen: boolean;
  onClose: () => void;
}

const Tab = ({ icon: Icon, label, active = false }: any) => (
  <button className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
    active ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-white'
  }`}>
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

export const ServerDrawer = ({ server, isOpen, onClose }: ServerDrawerProps) => {
  if (!server) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-screen w-[600px] bg-[#0a0a0f] border-l border-[#1a1a2e] z-50 flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-[#1a1a2e] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center">
                  <Server className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{server.hostname}</h2>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${server.status === 'online' || server.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-gray-400 font-mono">{server.ip_address} • {server.os}</span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex px-2 border-b border-[#1a1a2e] bg-white/[0.02]">
              <Tab icon={Activity} label="Monitoring" active />
              <Tab icon={Shield} label="Security" />
              <Tab icon={Key} label="SSH Keys" />
              <Tab icon={Globe} label="Networking" />
              <Tab icon={Settings} label="Configs" />
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-8">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Resource Usage</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#111118] p-4 rounded-xl border border-[#1a1a2e]">
                    <p className="text-xs text-gray-400 mb-1">CPU Cores</p>
                    <p className="text-xl font-bold">{server.cpu_cores || 0}</p>
                    <div className="w-full bg-white/10 h-1 rounded-full mt-3 overflow-hidden">
                      <div className="bg-blue-600 h-full w-[12%]" />
                    </div>
                  </div>
                  <div className="bg-[#111118] p-4 rounded-xl border border-[#1a1a2e]">
                    <p className="text-xs text-gray-400 mb-1">Memory (RAM)</p>
                    <p className="text-xl font-bold">{server.ram_gb || 0} GB</p>
                    <div className="w-full bg-white/10 h-1 rounded-full mt-3 overflow-hidden">
                      <div className="bg-green-500 h-full w-[52%]" />
                    </div>
                  </div>
                  <div className="bg-[#111118] p-4 rounded-xl border border-[#1a1a2e]">
                    <p className="text-xs text-gray-400 mb-1">Last Seen</p>
                    <p className="text-sm font-bold truncate">{server.last_seen ? new Date(server.last_seen).toLocaleString() : 'Never'}</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Terminal Sessions</h3>
                <div className="bg-black border border-[#1a1a2e] p-4 rounded-lg font-mono text-sm space-y-2">
                  <p className="text-green-500">$ uptime</p>
                  <p className="text-gray-400">up 45 days, 12:45, 2 users, load average: 0.12, 0.08, 0.05</p>
                  <p className="text-green-500">$ df -h</p>
                  <p className="text-gray-400">Filesystem      Size  Used Avail Use% Mounted on</p>
                  <p className="text-gray-400">/dev/sda1        156G   88G   68G  82% /</p>
                  <div className="flex items-center gap-1">
                    <span className="text-green-500">$</span>
                    <span className="w-2 h-4 bg-white/50 animate-pulse" />
                  </div>
                </div>
              </section>

              <section>
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Environment</h3>
                   <span className="bg-blue-600/10 text-blue-500 border border-blue-600/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                     {server.group_name || 'Production'}
                   </span>
                 </div>
                 <div className="space-y-3">
                   <div className="flex items-center justify-between p-3 bg-[#111118] rounded-lg border border-[#1a1a2e]">
                     <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-green-500" />
                       <span className="text-sm font-medium">Secondary IP</span>
                     </div>
                     <span className="text-xs text-gray-400 font-mono">None</span>
                   </div>
                 </div>
              </section>
            </div>

            <div className="p-6 border-t border-[#1a1a2e] bg-white/[0.01] flex items-center justify-between">
              <button className="text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors">Delete Server</button>
              <div className="flex gap-3">
                <button className="border border-[#1a1a2e] hover:bg-white/5 px-4 py-2 rounded-lg transition-colors">Edit Config</button>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> Connect via SSH
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
