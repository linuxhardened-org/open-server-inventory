import { useState, useEffect } from "react";
import { motion } from 'framer-motion';
import { Tag as TagIcon, Plus, Trash2, Search } from 'lucide-react';
import api from '../lib/api';
import { Tag } from '../types';

export const Tags = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
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
      console.error('Failed to fetch tags', err);
    }
  };

  const handleAddTag = async (e: any) => {
    e.preventDefault();
    try {
      await api.post('/tags', { name: newTagName, color: newTagColor });
      setNewTagName('');
      setIsAdding(false);
      fetchTags();
    } catch (err) {
      alert('Failed to add tag');
    }
  };

  const handleDeleteTag = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    try {
      await api.delete(`/tags/${id}`);
      fetchTags();
    } catch (err) {
      alert('Failed to delete tag');
    }
  };

  const filteredTags = tags.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Labels & Tags</h1>
            <p className="text-secondary">Categorize and filter your servers</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Tag
          </button>
        </header>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
          <input 
            type="text" 
            placeholder="Search tags..." 
            className="input pl-10 h-11 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card bg-primary/5 border-primary/20"
          >
            <form onSubmit={handleAddTag} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tag Name</label>
                  <input 
                    type="text" 
                    required 
                    className="input h-10 w-full" 
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g. Production"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewTagColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${newTagColor === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input 
                      type="color" 
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-8 h-8 rounded-full border-none bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-secondary hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="btn-primary px-6 h-10">Create Tag</button>
              </div>
            </form>
          </motion.div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredTags.map((tag) => (
            <motion.div 
              key={tag.id}
              layout
              className="card p-4 group flex items-center justify-between border-l-4"
              style={{ borderLeftColor: tag.color }}
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-surface" style={{ color: tag.color }}>
                  <TagIcon className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm">{tag.name}</span>
              </div>
              <button 
                onClick={() => handleDeleteTag(tag.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-secondary hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
  );
};
