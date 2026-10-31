'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Trophy,
  Flame,
  Calendar,
  Layers,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Loader2,
  BookOpen,
  Heart,
  Music,
  Users,
} from 'lucide-react';
import { playSound } from '../../lib/soundEffects';
import { createChallenge } from '../../lib/data/challengesApi';

const CATEGORIES = [
  { id: 'Prayer', label: 'Prayer', icon: '🙏' },
  { id: 'Fasting', label: 'Fasting', icon: '🕊️' },
  { id: 'Scripture memory', label: 'Scripture Memory', icon: '📖' },
  { id: 'Service', label: 'Acts of Service', icon: '🤝' },
  { id: 'Worship', label: 'Worship & Music', icon: '🎶' },
  { id: 'Generosity', label: 'Generosity & Giving', icon: '🎁' },
];

const PRESET_COVERS = [
  {
    url: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800',
    label: 'Open Bible at Dawn',
  },
  {
    url: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=800',
    label: 'Youth Praising Together',
  },
  {
    url: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800',
    label: 'Solitary Devotion in Nature',
  },
  {
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
    label: 'Acoustic Guitar Devotion',
  },
];

const ACCENT_COLORS = [
  '#f59e0b', // amber / flame
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#0ea5e9', // sky blue
  '#ec4899', // pink
  '#ef4444', // red
];

export default function ChallengeCreatorModal({
  isOpen,
  onClose,
  currentUser,
  onCreated,
}) {
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [rulesMd, setRulesMd] = useState('');
  const [category, setCategory] = useState('Prayer');
  const [kind, setKind] = useState('streak');
  const [durationDays, setDurationDays] = useState(21);
  const [points, setPoints] = useState(100);
  const [coverUrl, setCoverUrl] = useState(PRESET_COVERS[0].url);
  const [customCover, setCustomCover] = useState('');
  const [accent, setAccent] = useState('#f59e0b');
  const [visibility, setVisibility] = useState('public');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a challenge title.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please provide a short description or tagline.');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);
    playSound('postPublished');

    const formattedTag = tag.trim()
      ? (tag.startsWith('#') ? tag.trim() : `#${tag.trim().replace(/\s+/g, '')}`)
      : `#${title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`;

    try {
      const payload = {
        title: title.trim(),
        tag: formattedTag,
        description: description.trim(),
        rulesMd: rulesMd.trim() || 'Check in daily, reflect in prayer, and cheer on fellow believers!',
        category,
        kind,
        durationDays: parseInt(durationDays, 10) || 21,
        points: parseInt(points, 10) || 100,
        coverUrl: customCover.trim() || coverUrl,
        accent,
        visibility,
      };

      const newChallenge = await createChallenge(payload);
      if (onCreated) onCreated(newChallenge);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create challenge.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-creator-title"
    >
      <div
        className="w-full max-w-2xl max-h-[92dvh] flex flex-col rounded-2xl overflow-hidden shadow-2xl border"
        style={{
          background: 'var(--surface, #1e293b)',
          borderColor: 'var(--border, rgba(255,255,255,0.12))',
          color: 'var(--ink, #f8fafc)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border, rgba(255,255,255,0.1))' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md"
              style={{
                background: `linear-gradient(135deg, ${accent}33, ${accent}88)`,
                color: '#fff',
              }}
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 id="challenge-creator-title" className="text-lg font-bold">
                Launch a Faith Challenge
              </h2>
              <p className="text-xs" style={{ color: 'var(--ink-muted, #94a3b8)' }}>
                Mobilize believers to pray, memorize scripture, or serve together
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close creation wizard"
            className="w-9 h-9 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
            style={{ background: 'var(--surface-hover, rgba(255,255,255,0.06))' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 text-sm">
          {errorMsg && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title & Tag */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: 'var(--ink-muted)' }}>
                Challenge Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 21 Days of Morning Watch"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border bg-black/20 focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: 'var(--border, rgba(255,255,255,0.15))',
                  focusRingColor: accent,
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: 'var(--ink-muted)' }}>
                Hashtag
              </label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="#MorningWatch21"
                className="w-full px-3.5 py-2.5 rounded-xl border bg-black/20 focus:outline-none focus:ring-2 transition-all font-mono text-xs"
                style={{
                  borderColor: 'var(--border, rgba(255,255,255,0.15))',
                }}
              />
            </div>
          </div>

          {/* Category selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: 'var(--ink-muted)' }}>
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all"
                    style={{
                      borderColor: isSelected ? accent : 'var(--border, rgba(255,255,255,0.1))',
                      background: isSelected ? `${accent}18` : 'var(--surface-hover, rgba(255,255,255,0.03))',
                      color: isSelected ? accent : 'inherit',
                      boxShadow: isSelected ? `0 0 12px ${accent}25` : 'none',
                    }}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-xs font-medium truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tagline / Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: 'var(--ink-muted)' }}>
              Short Tagline / Purpose *
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dedicate the first 30 minutes of every morning to prayer, scripture meditation, and quiet listening."
              required
              className="w-full px-3.5 py-2 rounded-xl border bg-black/20 focus:outline-none focus:ring-2 transition-all text-xs"
              style={{
                borderColor: 'var(--border, rgba(255,255,255,0.15))',
              }}
            />
          </div>

          {/* Kind, Duration & Points */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: 'var(--ink-muted)' }}>
                Challenge Type
              </label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border bg-black/30 text-xs focus:outline-none"
                style={{ borderColor: 'var(--border, rgba(255,255,255,0.15))' }}
              >
                <option value="streak">Daily Streak (Consecutive)</option>
                <option value="daily">Daily Habit</option>
                <option value="weekly">Weekly Check-in</option>
                <option value="one_off">One-Off Event</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: 'var(--ink-muted)' }}>
                Duration (Days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-black/20 text-xs focus:outline-none"
                style={{ borderColor: 'var(--border, rgba(255,255,255,0.15))' }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: 'var(--ink-muted)' }}>
                Points per Check-in
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                step="10"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-black/20 text-xs focus:outline-none"
                style={{ borderColor: 'var(--border, rgba(255,255,255,0.15))' }}
              />
            </div>
          </div>

          {/* Rules / Daily Tasks */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: 'var(--ink-muted)' }}>
              Rules & Daily Instructions (Markdown supported)
            </label>
            <textarea
              rows={3}
              value={rulesMd}
              onChange={(e) => setRulesMd(e.target.value)}
              placeholder="1. Wake up at 5:30 AM&#10;2. Read 1 chapter from the Psalms&#10;3. Pray for 15 minutes before opening phone notifications"
              className="w-full px-3.5 py-2 rounded-xl border bg-black/20 focus:outline-none focus:ring-2 transition-all font-mono text-xs"
              style={{
                borderColor: 'var(--border, rgba(255,255,255,0.15))',
              }}
            />
          </div>

          {/* Cover image selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: 'var(--ink-muted)' }}>
              Cover Image
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_COVERS.map((preset, idx) => {
                const isSelected = coverUrl === preset.url && !customCover;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCoverUrl(preset.url);
                      setCustomCover('');
                    }}
                    className="relative aspect-video rounded-xl overflow-hidden border transition-all group text-left"
                    style={{
                      borderColor: isSelected ? accent : 'var(--border, rgba(255,255,255,0.1))',
                      boxShadow: isSelected ? `0 0 10px ${accent}40` : 'none',
                    }}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-end p-1.5">
                      <span className="text-[10px] text-white/90 line-clamp-1">{preset.label}</span>
                    </div>
                    {isSelected && (
                      <div
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white"
                        style={{ background: accent }}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <input
              type="url"
              value={customCover}
              onChange={(e) => setCustomCover(e.target.value)}
              placeholder="Or paste a custom image URL (https://...)"
              className="w-full px-3 py-2 rounded-xl border bg-black/20 text-xs focus:outline-none"
              style={{ borderColor: 'var(--border, rgba(255,255,255,0.15))' }}
            />
          </div>

          {/* Accent Color & Visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: 'var(--ink-muted)' }}>
                Theme Accent
              </label>
              <div className="flex items-center gap-2">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAccent(c)}
                    className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                    style={{
                      backgroundColor: c,
                      borderColor: accent === c ? '#fff' : 'transparent',
                    }}
                  >
                    {accent === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: 'var(--ink-muted)' }}>
                Visibility
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                    visibility === 'public' ? 'border-amber-400 bg-amber-400/10 text-amber-300' : 'border-white/10 opacity-70'
                  }`}
                >
                  Public (All Believers)
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('church_only')}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                    visibility === 'church_only' ? 'border-amber-400 bg-amber-400/10 text-amber-300' : 'border-white/10 opacity-70'
                  }`}
                >
                  My Church Only
                </button>
              </div>
            </div>
          </div>

          {/* Submit action */}
          <div className="pt-3 border-t flex items-center justify-end gap-3" style={{ borderColor: 'var(--border, rgba(255,255,255,0.1))' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border font-medium text-xs hover:opacity-80 transition-opacity"
              style={{ borderColor: 'var(--border, rgba(255,255,255,0.2))' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${accent}, #ec4899)`,
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing Challenge...
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 text-amber-200 fill-amber-200" />
                  Launch Challenge
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
