'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Share2, Check, Sparkles, ChevronRight } from 'lucide-react';
import AccentCard from '../layoutkit/AccentCard';
import { playSound } from '../../lib/soundEffects';
import { trackPromoEvent } from '../../lib/promos/promosApi';

export default function DailyVerseCard({ verse }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  if (!verse) return null;

  function handleReadChapter() {
    playSound('reaction');
    trackPromoEvent('daily_verse', 'click', { reference: verse.reference });
    window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
    window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'bible' }));
    router.push('/?tab=home&section=bible');
  }

  async function handleShare(e) {
    e.stopPropagation();
    playSound('reaction');
    trackPromoEvent('daily_verse', 'click', { action: 'share', reference: verse.reference });

    const shareText = `"${verse.text}" — ${verse.reference} via Shammah`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Verse of the Day · ${verse.reference}`,
          text: shareText,
          url: window.location.origin,
        });
        return;
      } catch {}
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  }

  return (
    <AccentCard
      accent="#06b6d4"
      variant="minimal"
      className="p-3.5 sm:p-4 my-2.5 transition-all hover:scale-[1.005]"
      onClick={handleReadChapter}
      role="button"
      aria-label={`Daily Scripture Verse: ${verse.reference}`}
    >
      <div className="flex flex-col gap-2">
        {/* Header with Reference & Share */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <BookOpen size={13} />
            </span>
            <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1">
              <Sparkles size={10} /> Verse of the Day
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 rounded-full hover:bg-[var(--surface-muted,#262626)] text-[var(--ink-muted)] hover:text-cyan-400 transition-colors"
              title="Share verse"
              aria-label="Share verse"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
            </button>
            <span className="text-xs font-bold text-[var(--ink)]">
              {verse.reference}
            </span>
          </div>
        </div>

        {/* Verse Text with Serif Typography */}
        <blockquote className="font-serif italic text-xs sm:text-sm text-[var(--ink)] leading-relaxed pl-3 border-l-2 border-cyan-500/50 m-0">
          “{verse.text}”
        </blockquote>

        {/* Action link */}
        <div className="flex items-center justify-between pt-1 text-[11px] text-cyan-400 font-semibold">
          <span>{verse.theme || 'Scripture Meditation'}</span>
          <span className="flex items-center gap-0.5 hover:underline">
            <span>Read in Holy Bible</span>
            <ChevronRight size={13} />
          </span>
        </div>
      </div>
    </AccentCard>
  );
}
