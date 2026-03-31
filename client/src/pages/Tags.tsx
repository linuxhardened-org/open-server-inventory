import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from 'framer-motion';
import { Tag as TagIcon, Plus, Trash2, Edit2, Search, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Tag } from '../types';
import { useRealtimeResource } from '../hooks/useRealtimeResource';

export const Tags = () => {
  const navigate = useNavigate();
  const [tags, setTags] = useState<Tag[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#3ecf8e');

  const colors = [
    '#3ecf8e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#f97316'
  ];

  useEffect(() => {
    fetchTags();
  }, []);
  useRealtimeResource('tags', () => void fetchTags());

  const fetchTags = async () => {
    try {
      const response = await api.get('/tags');
      setTags(response.data);
    } catch (err) {
      toast.error('Failed to load tags');
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/tags', { name: formName, color: formColor });
      setFormName('');
      setFormColor('#3ecf8e');
      setIsAdding(false);
      fetchTags();
      toast.success('Tag created');
    } catch (err) {
      toast.error('Failed to add tag');
    }
  };

  const handleEditTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag) return;
    try {
      await api.put(`/tags/${editingTag.id}`, { name: formName, color: formColor });
      setEditingTag(null);
      setFormName('');
      setFormColor('#3ecf8e');
      fetchTags();
      toast.success('Tag updated');
    } catch (err) {
      toast.error('Failed to update tag');
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormName(tag.name);
    setFormColor(tag.color || '#3ecf8e');
  };

  const viewServers = (tagId: number) => {
    navigate(`/servers?tag=${tagId}`);
  };

  const handleDeleteTag = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    try {
      await api.delete(`/tags/${id}`);
      fetchTags();
      toast.success('Tag deleted');
    } catch (err) {
      toast.error('Failed to delete tag');
    }
  };

  const filteredTags = tags.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header className="page-header">
        <div className="page-header-text">
          <div className="flex items-center gap-2">
            <h1>Labels & Tags</h1>
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
              {tags.length}
            </span>
          </div>
          <p>Categorize and filter your servers.</p>
        </div>
        <button onClick={() => { setIsAdding(true); setFormName(''); setFormColor('#3ecf8e'); }} className="sv-btn-primary">
          <Plus style={{ width: 15, height: 15 }} /> Add Tag
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
          placeholder="Search tags..."
          className="sv-input"
          style={{ paddingLeft: 36, width: '100%', maxWidth: 320 }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Add/Edit form */}
      {(isAdding || editingTag) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sv-card"
          style={{ background: 'hsl(var(--primary) / 0.04)', borderColor: 'hsl(var(--primary) / 0.2)' }}
        >
          <form onSubmit={editingTag ? handleEditTag : handleAddTag} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--fg))' }}>
              {editingTag ? 'Edit Tag' : 'New Tag'}
            </h3>
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
                  Tag Name
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
                  Color
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormColor(color)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 9999,
                        backgroundColor: color,
                        border: formColor === color ? '2px solid hsl(var(--fg))' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'transform 100ms',
                        transform: formColor === color ? 'scale(1.1)' : 'scale(1)',
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 9999,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setIsAdding(false); setEditingTag(null); }}
                className="sv-btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" className="sv-btn-primary">
                {editingTag ? 'Save Changes' : 'Create Tag'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Empty state */}
      {filteredTags.length === 0 && (
        <div
          className="flex flex-col items-center justify-center"
          style={{ padding: '48px 0', color: 'hsl(var(--fg-3))' }}
        >
          <TagIcon style={{ width: 40, height: 40, opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 13 }}>
            {searchTerm ? 'No tags match your search.' : 'No tags yet. Create one to label your servers.'}
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredTags.map((tag, index) => (
          <motion.div
            key={tag.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="sv-card"
            style={{
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              borderLeftWidth: 3,
              borderLeftColor: tag.color || '#3ecf8e',
              transition: 'border-color 150ms, background 150ms',
              cursor: 'pointer',
            }}
            onClick={() => viewServers(tag.id)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'hsl(var(--surface-2))';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = '';
            }}
          >
            <div className="flex items-center gap-3" style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: 'hsl(var(--surface-3))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: tag.color || '#3ecf8e',
                  flexShrink: 0,
                }}
              >
                <TagIcon style={{ width: 14, height: 14 }} />
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'hsl(var(--fg))',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {tag.name}
              </span>
              <ExternalLink style={{ width: 12, height: 12, color: 'hsl(var(--fg-3))', flexShrink: 0 }} />
            </div>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => startEdit(tag)}
                className="sv-btn-ghost"
                style={{ padding: 6 }}
                title="Edit tag"
              >
                <Edit2 style={{ width: 14, height: 14 }} />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTag(tag.id)}
                className="sv-btn-ghost"
                style={{ padding: 6, color: 'hsl(var(--danger))' }}
                title="Delete tag"
              >
                <Trash2 style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
