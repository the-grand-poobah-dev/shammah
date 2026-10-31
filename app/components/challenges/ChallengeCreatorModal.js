'use client';
import React, { useState } from 'react';
import PopupSheet from '../PopupSheet';
import { Sparkles, Calendar, Plus, Trophy } from 'lucide-react';
import { playSound } from '../../lib/soundEffects';
import { createChallenge } from '../../lib/data/challengesApi';

export default function ChallengeCreatorModal({
  isOpen,
  onClose,
  currentUser,
  onCreated,
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('scripture');
  const [durationDays, setDurationDays] = useState(7);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !currentUser?.id) return;
    setBusy(true);
    try {
      playSound('button');
      await createChallenge({
        title: title.trim(),
        description: description.trim(),
        category,
        durationDays: Number(durationDays) || 7,
        creatorId: currentUser.id,
      });
      if (onCreated) onCreated();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <PopupSheet
      open={isOpen}
      onClose={onClose}
      title="Create Faith Challenge"
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--ink-muted)] mb-1">
            Challenge Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 7-Day Proverbs Wisdom Streak"
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink-muted)] mb-1">
            Description &amp; Daily Instructions
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should participants do each day?"
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)] resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-muted)] mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
            >
              <option value="scripture">Scripture Memory</option>
              <option value="prayer">Prayer Altar</option>
              <option value="fasting">Fasting &amp; Consecration</option>
              <option value="evangelism">Acts of Kindness &amp; Outreach</option>
              <option value="gratitude">Daily Thanksgiving</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink-muted)] mb-1">
              Duration
            </label>
            <select
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
            >
              <option value={7}>7 Days</option>
              <option value={14}>14 Days</option>
              <option value={21}>21 Days (Daniel Fast)</option>
              <option value={30}>30 Days (Full Month)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-[var(--border)] text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="px-5 py-2 rounded-full bg-[var(--teal)] text-white font-semibold text-sm hover:opacity-90 transition-opacity min-h-[44px]"
          >
            {busy ? 'Creating...' : 'Launch Challenge'}
          </button>
        </div>
      </form>
    </PopupSheet>
  );
}
