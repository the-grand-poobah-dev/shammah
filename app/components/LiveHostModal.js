'use client';
import React, { useState } from 'react';
import PopupSheet from './PopupSheet';
import { Radio, Video, Mic, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import { playSound } from '../lib/soundEffects';

export default function LiveHostModal({ isOpen, onClose, session, profile, onStreamCreated }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('sermon');
  const [busy, setBusy] = useState(false);

  async function handleStartStream(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      playSound('button');
      const stream = {
        id: `stream_${Date.now()}`,
        title: title.trim(),
        category,
        church_name: profile?.church_name || profile?.full_name || 'Sanctuary Broadcast',
        is_live: true,
      };
      if (onStreamCreated) onStreamCreated(stream);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <PopupSheet open={isOpen} onClose={onClose} title="Go Live to Faith Community" size="md">
      <form onSubmit={handleStartStream} className="p-4 space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)] text-xs text-[var(--ink-muted)]">
          <Radio size={16} className="text-red-500 animate-pulse flex-shrink-0" />
          <span>Broadcast live service, prayer meeting, or praise session directly to members.</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink-muted)] mb-1">
            Broadcast Title
          </label>
          <input
            type="text"
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
            placeholder="e.g. Midweek Prayer & Prophetic Word"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink-muted)] mb-1">
            Broadcast Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
          >
            <option value="sermon">Sunday Sermon / Preaching</option>
            <option value="worship">Worship & Praise</option>
            <option value="prayer">Intercession & Prayer</option>
            <option value="bible_study">Bible Study / Discipleship</option>
            <option value="youth">Youth & Fellowship</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            className="px-4 py-2 text-sm rounded-full border border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors min-h-[44px]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="px-5 py-2 text-sm font-semibold rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 min-h-[44px] flex items-center gap-2"
          >
            <Radio size={15} />
            <span>{busy ? 'Starting...' : 'Start Broadcast'}</span>
          </button>
        </div>
      </form>
    </PopupSheet>
  );
}
