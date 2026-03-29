import { useState, useEffect } from "react";
import { motion } from 'framer-motion';
import { Key, Plus, Trash2, Search, Copy, Check } from 'lucide-react';
import api from '../lib/api';
import { SshKey } from '../types';
import { format } from 'date-fns';

export const SshKeys = () => {
  const [keys, setKeys] = useState<SshKey[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newPublicKey, setNewPublicKey] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const response = await api.get('/ssh-keys');
      setKeys(response.data);
    } catch (err) {
      console.error('Failed to fetch SSH keys', err);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/ssh-keys', { name: newKeyName, public_key: newPublicKey });
      setNewKeyName('');
      setNewPublicKey('');
      setIsAdding(false);
      fetchKeys();
    } catch (err) {
      alert('Failed to add SSH key');
    }
  };

  const handleDeleteKey = async (id: number) => {
    if (!confirm('Are you sure you want to delete this SSH key?')) return;
    try {
      await api.delete(`/ssh-keys/${id}`);
      fetchKeys();
    } catch (err) {
      alert('Failed to delete SSH key');
    }
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredKeys = keys.filter(k => 
    k.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">SSH Keys</h1>
            <p className="text-secondary">Manage public keys for server authentication</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="btn-primary gap-2"
          >
            <Plus className="w-4 h-4" /> Add Key
          </button>
        </header>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
          <input 
            type="text" 
            placeholder="Search keys..." 
            className="input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card bg-primary/5 border-primary/20"
          >
            <form onSubmit={handleAddKey} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Key Name</label>
                <input 
                  type="text" 
                  required 
                  className="input" 
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. My MacBook Pro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Public Key</label>
                <textarea 
                  required 
                  rows={4}
                  className="input font-mono text-xs" 
                  value={newPublicKey}
                  onChange={(e) => setNewPublicKey(e.target.value)}
                  placeholder="ssh-rsa AAAA..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-secondary">Cancel</button>
                <button type="submit" className="btn-primary px-6">Add Key</button>
              </div>
            </form>
          </motion.div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {filteredKeys.map((key) => (
            <motion.div 
              key={key.id}
              layout
              className="card group"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 overflow-hidden">
                  <div className="w-10 h-10 bg-surface rounded-lg flex items-center justify-center shrink-0">
                    <Key className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold truncate">{key.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-secondary font-mono truncate">
                      {key.fingerprint || 'No fingerprint available'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="hidden md:block text-right">
                    <div className="text-xs text-secondary uppercase font-bold tracking-wider">Created</div>
                    <div className="text-sm">{format(new Date(key.created_at), 'MMM d, yyyy')}</div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => copyToClipboard(key.public_key, key.id)}
                      className="p-2 hover:bg-surface rounded-lg text-secondary"
                      title="Copy Public Key"
                    >
                      {copiedId === key.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => handleDeleteKey(key.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-secondary hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {filteredKeys.length === 0 && (
            <div className="text-center py-12 text-secondary">
              No SSH keys found matching your search.
            </div>
          )}
        </div>
      </div>
  );
};

