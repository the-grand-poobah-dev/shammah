'use client';
import { useState, useEffect } from 'react';
import { Radio, Eye, ChevronRight, Sparkles, Volume2 } from 'lucide-react';
import Avatar from './Avatar';
import MemberName from './MemberName';
import { fetchActiveLiveStreams } from '../lib/live/liveApi';
import { playSound } from '../lib/soundEffects';

export default function LivePinnedBanner() {
  const [liveStreams, setLiveStreams] = useState([]);

  useEffect(() => {
    function loadLive() {
      fetchActiveLiveStreams(3).then((data) => {
        if (Array.isArray(data)) setLiveStreams(data);
      });
    }
    loadLive();
    window.addEventListener('shammah:live-updated', loadLive);
    const interval = setInterval(loadLive, 25000);
    return () => {
      window.removeEventListener('shammah:live-updated', loadLive);
      clearInterval(interval);
    };
  }, []);

  if (!liveStreams || liveStreams.length === 0) return null;

  const primaryLive = liveStreams[0];

  function handleWatchClick(streamId) {
    playSound('reaction');
    window.dispatchEvent(
      new CustomEvent('shammah:open-live', {
        detail: { streamId },
      })
    );
  }

  return (
    <div className="w-full my-3 overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/80 via-neutral-900 to-red-950/80 border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.25)] p-3 sm:p-4 text-white">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Left: Red Pulsing LIVE Indicator & Host Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            <Avatar
              name={primaryLive.host?.display_name || 'Host'}
              src={primaryLive.host?.avatar_url}
              size={42}
              isLive={true}
              onClick={() => handleWatchClick(primaryLive.id)}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[9px] uppercase tracking-wider shadow-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE SANCTUARY
              </span>
              <span className="text-xs text-white/70 font-semibold truncate">
                by {primaryLive.host?.display_name || 'Host'}
              </span>
            </div>

            <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5 max-w-full">
              {primaryLive.title}
            </h4>

            <div className="flex items-center gap-2 text-[11px] text-red-300 mt-0.5">
              <span className="flex items-center gap-1 font-semibold">
                <Eye size={12} /> {primaryLive.viewer_count || 1} disciples watching
              </span>
              {primaryLive.church?.name && (
                <span className="text-white/50 truncate">• {primaryLive.church.name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Join Live Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="px-4 py-2 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 flex items-center gap-1.5 active:scale-95 transition-all"
            onClick={() => handleWatchClick(primaryLive.id)}
          >
            <Radio size={14} className="animate-pulse" />
            <span>Watch Live</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
