'use client';
import { Radio, Eye, ChevronRight } from 'lucide-react';
import AccentCard from '../layoutkit/AccentCard';
import Avatar from '../Avatar';
import { playSound } from '../../lib/soundEffects';
import { trackPromoEvent } from '../../lib/promos/promosApi';

export default function LiveNowCard({ stream, onWatch = null }) {
  if (!stream) return null;

  function handleClick() {
    playSound('reaction');
    trackPromoEvent('live_now', 'click', { stream_id: stream.id });
    if (onWatch) {
      onWatch(stream.id);
    } else {
      window.dispatchEvent(new CustomEvent('shammah:open-live', { detail: { streamId: stream.id } }));
    }
  }

  return (
    <AccentCard
      accent="#ef4444"
      variant="wash"
      className="p-3.5 sm:p-4 my-2.5 transition-all hover:scale-[1.005]"
      onClick={handleClick}
      role="button"
      aria-label={`Watch live sanctuary broadcast: ${stream.title}`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Host Avatar & Live Details */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar
            name={stream.host?.display_name || 'Host'}
            src={stream.host?.avatar_url}
            isLive={true}
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE NOW
              </span>
              <span className="text-xs text-[var(--ink-muted)] truncate">
                by {stream.host?.display_name || 'Sanctuary Host'}
              </span>
            </div>
            <h4 className="text-sm font-bold text-[var(--ink)] truncate">
              {stream.title || 'Live Sanctuary Broadcast'}
            </h4>
            <div className="flex items-center gap-1 text-[11px] text-red-400 font-semibold mt-0.5">
              <Eye size={12} /> {stream.viewer_count || 1} watching now
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
          className="shrink-0 px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-red-600/20 flex items-center gap-1.5 transition-all"
        >
          <Radio size={14} className="animate-pulse" />
          <span>Join</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </AccentCard>
  );
}
