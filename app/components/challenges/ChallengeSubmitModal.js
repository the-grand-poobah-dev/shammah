'use client';
import React, { useState } from 'react';
import PopupSheet from '../PopupSheet';
import { Upload, Sparkles, Video, Check } from 'lucide-react';
import { playSound } from '../../lib/soundEffects';
import { submitChallengeVideo } from '../../lib/data/challengesApi';

export default function ChallengeSubmitModal({
  isOpen,
  onClose,
  challenge,
  currentUser,
  onSubmitted,
}) {
  const [verseRef, setVerseRef] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!challenge?.id || !currentUser?.id) return;
    setBusy(true);
    try {
      playSound('reaction');
      await submitChallengeVideo({
        challengeId: challenge.id,
        userId: currentUser.id,
        verseRef: verseRef.trim(),
        videoUrl: videoUrl.trim() || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        caption: caption.trim(),
      });
      if (onSubmitted) onSubmitted();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <PopupSheet
      open={isOpen}
      onClose={onClose}
      title={`Submit Entry: ${challenge?.title || 'Faith Challenge'}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--ink-muted)] mb-1">
            Scripture Reference (Optional)
          </label>
          <input
            type="text"
            value={verseRef}
            onChange={(e) => setVerseRef(e.target.value)}
            placeholder="e.g. Psalm 23:1-3 or Romans 8:28"
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink-muted)] mb-1">
            Video Link or Testimony
          </label>
          <textarea
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Share your testimony, recited verse, or faith declaration..."
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)] resize-none"
          />
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
            disabled={busy}
            className="px-5 py-2 rounded-full bg-[var(--teal)] text-white font-semibold text-sm hover:opacity-90 transition-opacity min-h-[44px] flex items-center gap-2"
          >
            <Check size={16} />
            <span>{busy ? 'Submitting...' : 'Submit Entry'}</span>
          </button>
        </div>
      </form>
    </PopupSheet>
  );
}
