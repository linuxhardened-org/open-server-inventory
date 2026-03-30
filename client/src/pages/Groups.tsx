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

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/groups', { name: newGroupName, description: newGroupDesc });
      setNewGroupName('');
      setNewGroupDesc('');
      setIsAdding(false);
      fetchGroups();
      toast.success('Group created');
    } catch (err) {
      toast.error('Failed to add group');
    }
  };

  const handleDeleteGroup = async (id: number) => {
    if (!confirm('Are you sure you want to delete this group? Servers in this group will be unassigned.')) return;
    try {
      await api.delete(`/groups/${id}`);
      fetchGroups();
      toast.success('Group deleted');
    } catch (err) {
      toast.error('Failed to delete group');
    }
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
        <button onClick={() => setIsAdding(true)} className="sv-btn-primary">
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

      {/* Add form */}
      {isAdding && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sv-card"
          style={{ background: 'hsl(var(--primary) / 0.04)', borderColor: 'hsl(var(--primary) / 0.2)' }}
        >
          <form onSubmit={handleAddGroup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'hsl(var(--fg-2))',
                    marginBottom: 6,
                  }}
                >
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  className="sv-input"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Production"
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'hsl(var(--fg-2))',
                    marginBottom: 6,
                  }}
                >
                  Description
                </label>
                <input
                  type="text"
                  className="sv-input"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="sv-btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" className="sv-btn-primary">
                Create Group
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Empty state */}
      {filteredGroups.length === 0 && (
        <div
          className="flex flex-col items-center justify-center"
          style={{ padding: '48px 0', color: 'hsl(var(--fg-3))' }}
        >
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
            className="sv-card group"
            style={{
              display: 'flex',
              flexDirection: 'column',
              transition: 'border-color 150ms, transform 150ms',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'hsl(var(--primary) / 0.4)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '';
              (e.currentTarget as HTMLDivElement).style.transform = '';
            }}
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
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'hsl(var(--fg-3))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--surface-3))';
                    (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--fg))';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'none';
                    (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--fg-3))';
                  }}
                >
                  <Edit2 style={{ width: 14, height: 14 }} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteGroup(group.id)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'hsl(var(--fg-3))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--danger) / 0.1)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--danger))';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'none';
                    (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--fg-3))';
                  }}
                >
                  <Trash2 style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'hsl(var(--fg))',
                marginBottom: 4,
              }}
            >
              {group.name}
            </h3>
            <p
              style={{
                fontSize: 12,
                color: 'hsl(var(--fg-2))',
                marginBottom: 12,
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {group.description || 'No description provided.'}
            </p>
            <div
              style={{
                marginTop: 'auto',
                paddingTop: 12,
                borderTop: '1px solid hsl(var(--border))',
              }}
            >
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
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
