'use client';
import React from 'react';
import { Play, Sparkles, ChevronRight } from 'lucide-react';
import { playSound } from '../lib/soundEffects';

export function ReelsRail({ reels = [], onSelectReel, onSelectSection }) {
  if (!reels || reels.length === 0) return null;

  return (
    <div className="reels-rail-container">
      <div className="reels-rail-header">
        <div className="reels-rail-title-wrap">
          <Sparkles size={16} className="text-pink-400" />
          <span className="reels-rail-title">Trending Reels</span>
        </div>
        <button
          type="button"
          className="reels-rail-view-all"
          onClick={() => {
            playSound('reaction');
            onSelectSection ? onSelectSection('reels') : window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'reels' }));
          }}
        >
          <span>Watch all</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="reels-rail-scroll no-scrollbar" data-draggable-scroll="true">
        {reels.map((reel) => (
          <div
            key={reel.id}
            className="reels-rail-card aspect-9-16"
            onClick={() => {
              playSound('reaction');
              if (onSelectReel) {
                onSelectReel(reel);
              } else {
                window.dispatchEvent(
                  new CustomEvent('shammah:open-reel', { detail: { reelId: reel.id } })
                );
              }
            }}
          >
            {reel.thumb_url || reel.cover_url ? (
              <img
                src={reel.thumb_url || reel.cover_url}
                alt={reel.title || 'Reel thumbnail'}
                className="reels-rail-thumb object-cover w-full h-full"
                loading="lazy"
              />
            ) : (
              <div className="reels-rail-placeholder w-full h-full bg-gradient-to-br from-pink-950 via-purple-900 to-black" />
            )}
            <div className="reels-rail-overlay">
              <span className="reels-rail-caption truncate-2">{reel.title || reel.text_content}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PromoSlot({ title, subtitle, cta, onAction, accent = '#06b6d4' }) {
  return (
    <div className="shammah-promo-slot" style={{ '--sec-color': accent }}>
      <div className="promo-slot-text">
        <strong className="promo-slot-title">{title}</strong>
        {subtitle && <p className="promo-slot-subtitle">{subtitle}</p>}
      </div>
      {cta && (
        <button
          type="button"
          className="promo-slot-cta"
          onClick={() => {
            playSound('reaction');
            onAction && onAction();
          }}
          style={{ background: accent }}
        >
          {cta}
        </button>
      )}
    </div>
  );
}
