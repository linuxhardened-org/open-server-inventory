import { useState } from 'react';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { ServerTable } from '../components/ServerTable';
import { ServerDrawer } from '../components/ServerDrawer';
import { AddServerModal } from '../components/AddServerModal';
import { Server } from '../types';

const mockServers: Server[] = [
  {
    id: 1,
    name: 'prod-api-01',
    hostname: 'prod-api-01.local',
    ip_address: '192.168.1.10',
    status: 'online',
    group_name: 'Production',
    tags: ['API', 'Critical'],
    os: 'Ubuntu 22.04',
    cpu_cores: 4,
    ram_gb: 8,
    last_seen: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'staging-db-01',
    hostname: 'staging-db-01.local',
    ip_address: '192.168.1.20',
    status: 'offline',
    group_name: 'Staging',
    tags: ['Database'],
    os: 'Debian 11',
    cpu_cores: 8,
    ram_gb: 16,
    last_seen: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const Servers = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Servers</h1>
          <p className="text-secondary mt-1">Manage and monitor your infrastructure nodes.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Server
        </button>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
            <input 
              type="text" 
              placeholder="Search by hostname, IP, or tag..." 
              className="input pl-10 h-11 w-full"
            />
          </div>
          <button className="btn-ghost flex items-center gap-2 border border-border h-11 px-4">
            <Filter className="w-4 h-4" /> Filters
          </button>
          <button className="btn-ghost flex items-center gap-2 border border-border h-11 px-4">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>

        <ServerTable 
          servers={mockServers} 
          onRowClick={(server) => setSelectedServer(server)} 
        />
      </div>

      {selectedServer && (
        <ServerDrawer 
          server={selectedServer} 
          isOpen={!!selectedServer} 
          onClose={() => setSelectedServer(null)} 
        />
      )}

      <AddServerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};
