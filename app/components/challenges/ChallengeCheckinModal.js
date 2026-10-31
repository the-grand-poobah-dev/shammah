'use client';
import React, { useState } from 'react';
import PopupSheet from '../PopupSheet';
import { Calendar, CheckCircle2, Sparkles, Flame } from 'lucide-react';
import { playSound } from '../../lib/soundEffects';
import { checkinChallenge } from '../../lib/data/challengesApi';

export default function ChallengeCheckinModal({
  isOpen,
  onClose,
  challenge,
  currentUser,
  onCheckinSuccess,
}) {
  const [reflection, setReflection] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!challenge?.id || !currentUser?.id) return;
    setBusy(true);
    try {
      playSound('reaction');
      await checkinChallenge(challenge.id, currentUser.id, reflection.trim());
      if (onCheckinSuccess) onCheckinSuccess();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <PopupSheet
      open={isOpen}
      onClose={onClose}
      title={`Daily Check-in: ${challenge?.title || 'Faith Challenge'}`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 text-orange-500 text-xs font-semibold">
          <Flame size={18} />
          <span>Keep your spiritual streak burning! Record today&apos;s victory.</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink-muted)] mb-1">
            Today&apos;s Reflection or Scripture Revelation
          </label>
          <textarea
            rows={3}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="What spoke to your spirit during today's reading or prayer?"
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
            <CheckCircle2 size={16} />
            <span>{busy ? 'Saving...' : 'Record Check-in'}</span>
          </button>
        </div>
      </form>
    </PopupSheet>
  );
}
