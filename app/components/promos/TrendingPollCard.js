'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, CheckCircle, ChevronRight } from 'lucide-react';
import AccentCard from '../layoutkit/AccentCard';
import { playSound } from '../../lib/soundEffects';
import { trackPromoEvent } from '../../lib/promos/promosApi';

export default function TrendingPollCard({ poll, onVote = null }) {
  const router = useRouter();
  const [votedOptionId, setVotedOptionId] = useState(null);
  const [votesCount, setVotesCount] = useState(poll?.total_votes || 120);

  if (!poll) return null;

  function handleCardClick() {
    playSound('reaction');
    trackPromoEvent('trending_poll', 'click', { poll_id: poll.id });
    window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
    window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'polls' }));
    router.push('/?tab=home&section=polls');
  }

  function handleOptionVote(e, optId) {
    e.stopPropagation();
    if (votedOptionId) return;
    playSound('badge');
    setVotedOptionId(optId);
    setVotesCount((prev) => prev + 1);
    trackPromoEvent('trending_poll', 'click', { poll_id: poll.id, option_id: optId, action: 'vote' });
    if (onVote) onVote(poll.id, optId);
  }

  return (
    <AccentCard
      accent="#ec4899"
      variant="wash"
      className="p-3.5 sm:p-4 my-2.5 transition-all hover:scale-[1.005]"
      onClick={handleCardClick}
      role="button"
      aria-label={`Trending church poll: ${poll.question}`}
    >
      <div className="flex flex-col gap-2.5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
              <BarChart3 size={13} />
            </span>
            <span className="text-[10px] uppercase font-bold text-pink-400 tracking-wider">
              Community Poll
            </span>
          </div>

          <span className="text-[11px] text-[var(--ink-muted)] font-semibold">
            {votesCount} votes
          </span>
        </div>

        {/* Question */}
        <h4 className="text-sm font-bold text-[var(--ink)] leading-snug">
          {poll.question}
        </h4>

        {/* Inline Option Buttons */}
        <div className="flex flex-col gap-1.5 pt-0.5">
          {poll.options?.slice(0, 2).map((opt) => {
            const isSelected = votedOptionId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={(e) => handleOptionVote(e, opt.id)}
                className={`w-full py-2 px-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                    : 'bg-[var(--surface-muted,#262626)] border-[var(--border)] text-[var(--ink)] hover:border-pink-500/40 hover:bg-pink-500/10'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected ? (
                  <CheckCircle size={14} className="text-pink-400 shrink-0" />
                ) : (
                  <span className="text-[10px] text-[var(--ink-muted)]">Vote</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Link */}
        <div className="flex items-center justify-between text-[11px] text-pink-400 font-semibold pt-1">
          <span>{votedOptionId ? '✓ Vote recorded' : 'Tap option to cast instant vote'}</span>
          <span className="flex items-center gap-0.5 hover:underline">
            <span>View All Polls</span>
            <ChevronRight size={13} />
          </span>
        </div>
      </div>
    </AccentCard>
  );
}
