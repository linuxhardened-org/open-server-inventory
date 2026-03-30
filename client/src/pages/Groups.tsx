import { useState, useEffect } from "react";
import { motion } from 'framer-motion';
import { Folder, Plus, Trash2, Edit2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Group } from '../types';

export const Groups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups');
      setGroups(response.data);
    } catch (err) {
      toast.error('Failed to load groups');
    }
  };

  const handleAddGroup = async (e: any) => {
    e.preventDefault();
    try {
      await api.post('/groups', { name: newGroupName, description: newGroupDesc });
      setNewGroupName('');
      setNewGroupDesc('');
      setIsAdding(false);
      fetchGroups();
    } catch (err) {
      toast.error('Failed to add group');
    }
  };

  const handleDeleteGroup = async (id: number) => {
    if (!confirm('Are you sure you want to delete this group? Servers in this group will be unassigned.')) return;
    try {
      await api.delete(`/groups/${id}`);
      fetchGroups();
    } catch (err) {
      toast.error('Failed to delete group');
    }
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
      <div className="page">
        <header className="page-header">
          <div className="page-header-text">
            <h1>Server Groups</h1>
            <p>Organize your infrastructure into logical units.</p>
          </div>
          <button onClick={() => setIsAdding(true)} className="sv-btn-primary">
            <Plus className="w-4 h-4" /> Add Group
          </button>
        </header>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
          <input 
            type="text" 
            placeholder="Search groups..." 
            className="sv-input pl-10 h-11 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sv-card bg-primary/5 border-primary/20"
          >
            <form onSubmit={handleAddGroup} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Group Name</label>
                  <input 
                    type="text" 
                    required 
                    className="sv-input h-10 w-full" 
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Production"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input 
                    type="text" 
                    className="sv-input h-10 w-full" 
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-secondary transition-colors hover:text-foreground">Cancel</button>
                <button type="submit" className="sv-btn-primary px-6 h-10">Create Group</button>
              </div>
            </form>
          </motion.div>
        )}

        {filteredGroups.length === 0 && (
          <p className="py-12 text-center text-sm text-secondary">
            {searchTerm ? 'No groups match your search.' : 'No groups yet. Create one to organize your servers.'}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <motion.div 
              key={group.id}
              layout
              className="sv-card group hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Folder className="w-6 h-6 text-primary" />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 hover:bg-surface rounded-lg text-secondary">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-secondary hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="mb-1 text-xl font-bold text-foreground">{group.name}</h3>
              <p className="text-secondary text-sm mb-4 line-clamp-2">{group.description || 'No description provided.'}</p>
              <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                  {group.serverCount || 0} Servers
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
  );
};
