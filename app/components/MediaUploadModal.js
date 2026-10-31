'use client';
import React, { useState } from 'react';
import PopupSheet from './PopupSheet';
import { Upload, Film, Music, Check, X } from 'lucide-react';
import { playSound } from '../lib/soundEffects';

export default function MediaUploadModal({ isOpen, onClose, initialType = 'video', onPublished }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Sermons');
  const [mediaType, setMediaType] = useState(initialType);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setUploading(true);
    playSound('reaction');
    setTimeout(() => {
      setUploading(false);
      onPublished && onPublished({ id: `media-${Date.now()}`, title, category, media_type: mediaType });
      onClose();
    }, 600);
  };

  return (
    <PopupSheet open={isOpen} onClose={onClose} title="Upload Media to Community" size="md">
      <form onSubmit={handleSubmit} className="media-upload-form flex flex-col gap-4 p-2">
        <div className="flex gap-2">
          <button
            type="button"
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm border flex items-center justify-center gap-2 transition-all ${mediaType === 'video' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'border-zinc-700 text-zinc-400'}`}
            onClick={() => setMediaType('video')}
          >
            <Film size={16} /> Video Teaching
          </button>
          <button
            type="button"
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm border flex items-center justify-center gap-2 transition-all ${mediaType === 'audio' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'border-zinc-700 text-zinc-400'}`}
            onClick={() => setMediaType('audio')}
          >
            <Music size={16} /> Audio / Worship
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Title</label>
          <input
            type="text"
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-cyan-500"
            placeholder="e.g. Sunday Message: The Power of Prayer"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-zinc-700 text-zinc-300"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading || !title.trim()}
            className="px-5 py-2 rounded-xl text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-md disabled:opacity-50"
          >
            {uploading ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </form>
    </PopupSheet>
  );
}
