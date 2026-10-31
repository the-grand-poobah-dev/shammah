'use client';
import { useRouter } from 'next/navigation';
import { Flame, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';
import AccentCard from '../layoutkit/AccentCard';
import { playSound } from '../../lib/soundEffects';
import { trackPromoEvent } from '../../lib/promos/promosApi';

export default function ChallengeOfTheDayCard({ challenge, onCheckIn = null }) {
  const router = useRouter();
  if (!challenge) return null;

  function handleClick() {
    playSound('reaction');
    trackPromoEvent('challenge_of_the_day', 'click', { challenge_id: challenge.id });
    if (onCheckIn) {
      onCheckIn(challenge);
    } else {
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
      window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'challenges' }));
      router.push('/challenges');
    }
  }

  return (
    <AccentCard
      accent="#f59e0b"
      variant="edge"
      className="p-3.5 sm:p-4 my-2.5 transition-all hover:scale-[1.005]"
      onClick={handleClick}
      role="button"
      aria-label={`Faith devotion challenge: ${challenge.title}`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Flame Icon & Details */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Flame size={18} className="animate-pulse" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={10} />
                {challenge.streak_label || 'Daily Faith Challenge'}
              </span>
              {challenge.current_day && challenge.total_days && (
                <span className="text-xs text-[var(--ink-muted)] font-semibold">
                  Day {challenge.current_day} of {challenge.total_days}
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold text-[var(--ink)] truncate">
              {challenge.title}
            </h4>

            {challenge.participants_count && (
              <div className="text-[11px] text-[var(--ink-muted)] mt-0.5">
                {challenge.participants_count} disciples in prayer streak today
              </div>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className="shrink-0 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
        >
          <CheckCircle2 size={14} />
          <span>Check In</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </AccentCard>
  );
}
