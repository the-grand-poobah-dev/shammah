'use client';
import React, { useState, useEffect } from 'react';
import { Tv, Radio, ChevronRight, X } from 'lucide-react';
import { playSound } from '../lib/soundEffects';

export default function LivePinnedBanner({ activeStreams = [] }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !activeStreams || activeStreams.length === 0) {
    return null;
  }

  const activeStream = activeStreams[0];

  return (
    <aside className="live-pinned-banner" role="region" aria-label="Active Live Stream">
      <div className="live-pinned-content">
        <span className="live-pulse-dot" aria-hidden="true" />
        <div className="live-pinned-text">
          <strong className="live-pinned-title">
            LIVE: {activeStream.title || 'Sanctuary Worship & Teaching Broadcast'}
          </strong>
          <span className="live-pinned-subtitle">
            {activeStream.church_name || 'Church Service Live Now'} · Tap to watch
          </span>
        </div>
      </div>
      <div className="live-pinned-actions">
        <button
          type="button"
          className="live-watch-btn"
          onClick={() => {
            playSound('reaction');
            window.dispatchEvent(
              new CustomEvent('shammah:open-live', { detail: { streamId: activeStream.id } })
            );
          }}
          aria-label="Join live service broadcast"
        >
          <span>Join Live</span>
          <ChevronRight size={14} />
        </button>
        <button
          type="button"
          className="live-dismiss-btn"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
        >
          <X size={15} />
        </button>
      </div>
    </aside>
  );
}
