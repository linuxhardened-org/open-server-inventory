import { useState, useEffect } from "react";
import { motion } from 'framer-motion';
import { Tag as TagIcon, Plus, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Tag } from '../types';

export const Tags = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3ecf8e');

  const colors = [
    '#3ecf8e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#f97316'
  ];

  useEffect(() => {
    fetchTags();
  }, []);

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
      await api.post('/tags', { name: newTagName, color: newTagColor });
      setNewTagName('');
      setIsAdding(false);
      fetchTags();
      toast.success('Tag created');
    } catch (err) {
      toast.error('Failed to add tag');
    }
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
        <button onClick={() => setIsAdding(true)} className="sv-btn-primary">
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

      {/* Add form */}
      {isAdding && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sv-card"
          style={{ background: 'hsl(var(--primary) / 0.04)', borderColor: 'hsl(var(--primary) / 0.2)' }}
        >
          <form onSubmit={handleAddTag} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
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
                      onClick={() => setNewTagColor(color)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 9999,
                        backgroundColor: color,
                        border: newTagColor === color ? '2px solid hsl(var(--fg))' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'transform 100ms',
                        transform: newTagColor === color ? 'scale(1.1)' : 'scale(1)',
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
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
                onClick={() => setIsAdding(false)}
                className="sv-btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" className="sv-btn-primary">
                Create Tag
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
            className="sv-card group"
            style={{
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              borderLeftWidth: 3,
              borderLeftColor: tag.color || '#3ecf8e',
              transition: 'border-color 150ms, background 150ms',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'hsl(var(--surface-2))';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = '';
            }}
          >
            <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
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
                }}
              >
                {tag.name}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleDeleteTag(tag.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                width: 26,
                height: 26,
                borderRadius: 5,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: 'hsl(var(--fg-3))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
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
          </motion.div>
        ))}
      </div>
    </div>
  );
};
