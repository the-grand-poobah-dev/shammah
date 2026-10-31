'use client';
import { useRouter } from 'next/navigation';
import { Headphones, Play, ChevronRight, Volume2 } from 'lucide-react';
import AccentCard from '../layoutkit/AccentCard';
import { playSound } from '../../lib/soundEffects';
import { trackPromoEvent } from '../../lib/promos/promosApi';

export default function ContinueListeningCard({ audio, onResume = null }) {
  const router = useRouter();
  if (!audio) return null;

  function handleClick() {
    playSound('reaction');
    trackPromoEvent('continue_listening', 'click', { audio_id: audio.id });
    if (onResume) {
      onResume(audio);
    } else {
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
      window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'podcasts' }));
      router.push('/?tab=home&section=podcasts');
    }
  }

  const percent = audio.played_percent || 30;

  return (
    <AccentCard
      accent="#d97706"
      variant="edge"
      className="p-3.5 sm:p-4 my-2.5 transition-all hover:scale-[1.005]"
      onClick={handleClick}
      role="button"
      aria-label={`Resume audio sermon or podcast: ${audio.title}`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Headphones Icon & Details */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Headphones size={17} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                <Volume2 size={10} /> Continue Listening
              </span>
              {audio.duration_label && (
                <span className="text-xs text-[var(--ink-muted)]">
                  • {audio.duration_label}
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold text-[var(--ink)] truncate">
              {audio.title}
            </h4>

            {/* Playback progress bar */}
            <div className="flex items-center gap-2 mt-1">
              <div className="w-24 h-1.5 rounded-full bg-[var(--surface-muted,#262626)] overflow-hidden border border-[var(--border)]">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-[10px] text-[var(--ink-muted)] font-medium">
                {audio.speaker || 'Gospel Audio'}
              </span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className="shrink-0 px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
        >
          <Play size={13} fill="#000000" />
          <span>Resume</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </AccentCard>
  );
}
