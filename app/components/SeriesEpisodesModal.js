'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Play,
  Pause,
  Headphones,
  Clock,
  Sparkles,
  Share2,
  CheckCircle2,
} from 'lucide-react';
import { useAudioPlayer } from '../lib/audioPlayer';
import { listMedia } from '../lib/data/mediaApi';

function formatDuration(sec) {
  if (!sec) return '0 min';
  const mins = Math.floor(sec / 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hrs}h ${rem}m`;
  }
  return `${mins} min`;
}

export default function SeriesEpisodesModal({ series, isOpen, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!series?.id || !isOpen) return;

    setLoading(true);
    listMedia({ kind: 'audio', seriesId: series.id, limit: 50 }).then((res) => {
      // Sort episodes by episode_no ascending
      const sorted = (res.data || []).sort((a, b) => (a.episode_no || 0) - (b.episode_no || 0));
      setEpisodes(sorted);
      setLoading(false);
    });
  }, [series?.id, isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (!mounted || !isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mounted, isOpen]);

  if (!mounted || !isOpen || !series) return null;

  const seriesAccent = series.accent || '#8b5cf6';
  const coverUrl =
    series.cover_url ||
    'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800';

  function handlePlayAll() {
    if (episodes.length > 0) {
      playTrack(episodes[0], episodes);
    }
  }

  const modalContent = (
    <div
      className="series-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="series-modal-card"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '88dvh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface, #121814)',
          borderRadius: '24px',
          border: `1.5px solid ${seriesAccent}44`,
          boxShadow: `0 24px 64px rgba(0,0,0,0.7), 0 0 32px ${seriesAccent}22`,
          overflow: 'hidden',
          color: 'var(--ink, #ffffff)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Hero Area */}
        <div
          style={{
            position: 'relative',
            padding: '24px 20px 20px',
            background: `radial-gradient(ellipse at top, ${seriesAccent}33, transparent 80%)`,
            borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(0,0,0,0.4)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
            }}
            title="Close"
          >
            <X size={18} />
          </button>

          {/* Series Cover */}
          <div
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '16px',
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: `0 8px 24px rgba(0,0,0,0.5)`,
              border: `1.5px solid ${seriesAccent}66`,
              backgroundImage: `url(${coverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/* Series Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: seriesAccent,
              }}
            >
              Podcast Series · {episodes.length} Episodes
            </span>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 700,
                lineHeight: 1.3,
                margin: '4px 0 6px',
                color: 'var(--ink, #ffffff)',
              }}
            >
              {series.title}
            </h3>
            <p
              style={{
                fontSize: '12px',
                color: 'var(--ink-muted, #94a3b8)',
                margin: 0,
                lineHeight: 1.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {series.description}
            </p>
          </div>
        </div>

        {/* Play All Action Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))',
            background: 'var(--surface-muted, rgba(255,255,255,0.02))',
          }}
        >
          <button
            type="button"
            onClick={handlePlayAll}
            disabled={episodes.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              borderRadius: '999px',
              background: seriesAccent,
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: `0 4px 14px ${seriesAccent}55`,
            }}
          >
            <Play size={16} fill="#ffffff" />
            <span>Play Series ({episodes.length})</span>
          </button>

          <span style={{ fontSize: '12px', color: 'var(--ink-muted, #94a3b8)' }}>
            {series.owner?.display_name || 'Shammah Community'}
          </span>
        </div>

        {/* Episodes List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink-muted)' }}>
              Loading series episodes...
            </div>
          ) : episodes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink-muted)' }}>
              No episodes published yet in this series.
            </div>
          ) : (
            episodes.map((ep, idx) => {
              const isCurrent = currentTrack?.id === ep.id;
              const isCurrentPlaying = isCurrent && isPlaying;
              return (
                <div
                  key={ep.id}
                  onClick={() => playTrack(ep, episodes)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: isCurrent ? `${seriesAccent}18` : 'var(--surface-muted, rgba(255,255,255,0.03))',
                    border: isCurrent ? `1.5px solid ${seriesAccent}` : '1px solid var(--border, rgba(255,255,255,0.06))',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isCurrent ? seriesAccent : 'rgba(255,255,255,0.1)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {isCurrentPlaying ? (
                      <Pause size={12} fill="#ffffff" />
                    ) : (
                      ep.episode_no || idx + 1
                    )}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        fontWeight: 600,
                        color: isCurrent ? seriesAccent : 'var(--ink, #ffffff)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {ep.title}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--ink-muted, #94a3b8)' }}>
                      {formatDuration(ep.duration_seconds)}
                      {ep.category ? ` · ${ep.category}` : ''}
                    </span>
                  </div>

                  <button
                    type="button"
                    style={{
                      background: isCurrent ? seriesAccent : 'rgba(255,255,255,0.1)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                    title={isCurrentPlaying ? 'Pause' : 'Play episode'}
                  >
                    {isCurrentPlaying ? (
                      <Pause size={14} fill="#ffffff" />
                    ) : (
                      <Play size={14} fill="#ffffff" style={{ marginLeft: '2px' }} />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
