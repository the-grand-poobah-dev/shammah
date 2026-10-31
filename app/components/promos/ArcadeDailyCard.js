'use client';
import { useRouter } from 'next/navigation';
import { Gamepad2, Trophy, Play, ChevronRight } from 'lucide-react';
import AccentCard from '../layoutkit/AccentCard';
import { playSound } from '../../lib/soundEffects';
import { trackPromoEvent } from '../../lib/promos/promosApi';

export default function ArcadeDailyCard({ arcade, onPlay = null }) {
  const router = useRouter();
  if (!arcade) return null;

  function handleClick() {
    playSound('reaction');
    trackPromoEvent('arcade_daily', 'click', { game_slug: arcade.game_slug });
    if (onPlay) {
      onPlay(arcade);
    } else {
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
      window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'games' }));
      router.push('/arcade');
    }
  }

  return (
    <AccentCard
      accent="#0d9488"
      variant="edge"
      className="p-3.5 sm:p-4 my-2.5 transition-all hover:scale-[1.005]"
      onClick={handleClick}
      role="button"
      aria-label={`Faith Champions Arcade game: ${arcade.title}`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Arcade Icon & Details */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="w-9 h-9 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Gamepad2 size={17} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2 py-0.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-400 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                <Trophy size={10} />
                Daily Challenge
              </span>
              {arcade.best_score && (
                <span className="text-xs text-[var(--ink-muted)]">
                  Top Score: {arcade.best_score} pts
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold text-[var(--ink)] truncate">
              {arcade.title}
            </h4>

            <div className="text-[11px] text-[var(--ink-muted)] truncate mt-0.5">
              {arcade.daily_title || 'Bible trivia, slingshot & scripture puzzles'}
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
          className="shrink-0 px-3.5 py-1.5 rounded-full bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition-all"
        >
          <Play size={13} fill="#ffffff" />
          <span>Play</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </AccentCard>
  );
}
