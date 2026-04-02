import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from 'framer-motion';
import { Folder, Plus, Trash2, Edit2, Search, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Group } from '../types';
import { useRealtimeResource } from '../hooks/useRealtimeResource';

export const Groups = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);
  useRealtimeResource('groups', () => void fetchGroups());

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups');
      setGroups(response.data);
    } catch (err) {
      toast.error('Failed to load groups');
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/groups', { name: formName, description: formDesc });
      setFormName('');
      setFormDesc('');
      setIsAdding(false);
      fetchGroups();
      toast.success('Group created');
    } catch (err) {
      toast.error('Failed to add group');
    }
  };

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    try {
      await api.put(`/groups/${editingGroup.id}`, { name: formName, description: formDesc });
      setEditingGroup(null);
      setFormName('');
      setFormDesc('');
      fetchGroups();
      toast.success('Group updated');
    } catch (err) {
      toast.error('Failed to update group');
    }
  };

  const startEdit = (group: Group) => {
    setEditingGroup(group);
    setFormName(group.name);
    setFormDesc(group.description || '');
  };

  const handleDeleteGroup = async (id: number) => {
    if (!confirm('Delete this group? Servers will be unassigned.')) return;
    try {
      await api.delete(`/groups/${id}`);
      fetchGroups();
      toast.success('Group deleted');
    } catch (err) {
      toast.error('Failed to delete group');
    }
  };

  const viewServers = (groupId: number) => {
    navigate(`/servers?group=${groupId}`);
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header className="page-header">
        <div className="page-header-text">
          <div className="flex items-center gap-2">
            <h1>Server Groups</h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 24,
                height: 20,
                borderRadius: 9999,
                padding: '0 8px',
                fontSize: 11,
                fontWeight: 600,
                background: 'hsl(var(--surface-3))',
                color: 'hsl(var(--fg-2))',
                border: '1px solid hsl(var(--border-2))',
              }}
            >
              {groups.length}
            </span>
          </div>
          <p>Organize your infrastructure into logical units.</p>
        </div>
        <button onClick={() => { setIsAdding(true); setFormName(''); setFormDesc(''); }} className="sv-btn-primary">
          <Plus style={{ width: 15, height: 15 }} /> Add Group
        </button>
      </header>

      {/* Search */}
      <div className="relative">
        <Search
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 16,
            height: 16,
            color: 'hsl(var(--fg-3))',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder="Search groups..."
          className="sv-input"
          style={{ paddingLeft: 36, width: '100%', maxWidth: 320 }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Add/Edit form */}
      {(isAdding || editingGroup) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sv-card"
          style={{ background: 'hsl(var(--primary) / 0.04)', borderColor: 'hsl(var(--primary) / 0.2)' }}
        >
          <form onSubmit={editingGroup ? handleEditGroup : handleAddGroup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--fg))' }}>
              {editingGroup ? 'Edit Group' : 'New Group'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--fg-2))', marginBottom: 6 }}>
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  className="sv-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Production"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--fg-2))', marginBottom: 6 }}>
                  Description
                </label>
                <input
                  type="text"
                  className="sv-input"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setIsAdding(false); setEditingGroup(null); }}
                className="sv-btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" className="sv-btn-primary">
                {editingGroup ? 'Save Changes' : 'Create Group'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Empty state */}
      {filteredGroups.length === 0 && (
        <div className="flex flex-col items-center justify-center" style={{ padding: '48px 0', color: 'hsl(var(--fg-3))' }}>
          <Folder style={{ width: 40, height: 40, opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 13 }}>
            {searchTerm ? 'No groups match your search.' : 'No groups yet. Create one to organize your servers.'}
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGroups.map((group, index) => (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="sv-card"
            style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
            onClick={() => viewServers(group.id)}
          >
            <div className="flex items-start justify-between" style={{ marginBottom: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: 'hsl(var(--primary) / 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'hsl(var(--primary))',
                }}
              >
                <Folder style={{ width: 22, height: 22 }} />
              </div>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => startEdit(group)}
                  className="sv-btn-ghost"
                  style={{ padding: 6 }}
                  title="Edit group"
                >
                  <Edit2 style={{ width: 14, height: 14 }} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteGroup(group.id)}
                  className="sv-btn-ghost"
                  style={{ padding: 6, color: 'hsl(var(--danger))' }}
                  title="Delete group"
                >
                  <Trash2 style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--fg))', marginBottom: 4 }}>
              {group.name}
            </h3>
            <p style={{ fontSize: 12, color: 'hsl(var(--fg-2))', marginBottom: 12, lineHeight: 1.5 }}>
              {group.description || 'No description'}
            </p>
            <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'hsl(var(--primary))',
                  background: 'hsl(var(--primary) / 0.1)',
                  padding: '4px 10px',
                  borderRadius: 9999,
                }}
              >
                {group.serverCount || 0} Servers
              </span>
              <ExternalLink style={{ width: 14, height: 14, color: 'hsl(var(--fg-3))' }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
