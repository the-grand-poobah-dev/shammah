'use client';
import { useRouter } from 'next/navigation';
import { HeartHandshake, Heart, ChevronRight, Users } from 'lucide-react';
import AccentCard from '../layoutkit/AccentCard';
import { playSound } from '../../lib/soundEffects';
import { trackPromoEvent } from '../../lib/promos/promosApi';

export default function ActiveFundraiserCard({ fundraiser, onDonate = null }) {
  const router = useRouter();
  if (!fundraiser) return null;

  const raised = fundraiser.raised_kes || 0;
  const goal = fundraiser.goal_kes || 1;
  const percent = Math.min(100, Math.round((raised / goal) * 100));

  function handleClick() {
    playSound('reaction');
    trackPromoEvent('active_fundraiser', 'click', { fundraiser_id: fundraiser.id });
    if (onDonate) {
      onDonate(fundraiser);
    } else {
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
      window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'fundraisers' }));
      router.push(`/fundraisers`);
    }
  }

  return (
    <AccentCard
      accent="#10b981"
      variant="wash"
      className="p-3.5 sm:p-4 my-2.5 transition-all hover:scale-[1.005]"
      onClick={handleClick}
      role="button"
      aria-label={`Kingdom cause fundraiser: ${fundraiser.title}`}
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <HeartHandshake size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Kingdom Giving · M-Pesa
                </span>
                {fundraiser.church_name && (
                  <span className="text-xs text-[var(--ink-muted)] truncate">
                    • {fundraiser.church_name}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-[var(--ink)] truncate">
                {fundraiser.title}
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            className="shrink-0 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
          >
            <Heart size={13} fill="#ffffff" />
            <span>Donate</span>
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Progress Bar & Amount Row */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="text-[var(--ink)]">
              KES {raised.toLocaleString()} <span className="text-[var(--ink-muted)] font-normal">raised of KES {goal.toLocaleString()}</span>
            </span>
            <span className="text-emerald-400 font-bold">{percent}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-[var(--surface-muted,#262626)] overflow-hidden border border-[var(--border)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>

          {fundraiser.donors_count && (
            <div className="flex items-center gap-1 text-[11px] text-[var(--ink-muted)] mt-1.5">
              <Users size={11} /> {fundraiser.donors_count} believers have sowed
            </div>
          )}
        </div>
      </div>
    </AccentCard>
  );
}
