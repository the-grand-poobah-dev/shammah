'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Play,
  Pause,
  Headphones,
  Music,
  Trash2,
  Lock,
  Globe,
} from 'lucide-react';
import { useAudioPlayer } from '../lib/audioPlayer';
import { getPlaylist, removePlaylistItem } from '../lib/data/mediaApi';

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

export default function PlaylistDetailModal({ playlist, isOpen, onClose, currentUserId }) {
  const [mounted, setMounted] = useState(false);
  const [playlistData, setPlaylistData] = useState(playlist);
  const [loading, setLoading] = useState(true);

  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!playlist?.id || !isOpen) return;

    setLoading(true);
    getPlaylist(playlist.id).then((res) => {
      if (res.data) {
        setPlaylistData(res.data);
      }
      setLoading(false);
    });
  }, [playlist?.id, isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (!mounted || !isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mounted, isOpen]);

  if (!mounted || !isOpen || !playlist) return null;

  const tracks = playlistData?.items || [];
  const isOwner = currentUserId && playlistData?.owner_id === currentUserId;
  const coverUrl =
    playlistData?.cover_url ||
    playlist?.cover ||
    'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=500';

  function handlePlayAll() {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  }

  async function handleRemoveTrack(trackId, e) {
    e.stopPropagation();
    await removePlaylistItem(playlist.id, trackId);
    setPlaylistData((prev) => ({
      ...prev,
      items: prev.items.filter((t) => t.id !== trackId),
    }));
  }

  const modalContent = (
    <div
      className="playlist-modal-backdrop"
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
        className="playlist-modal-card"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '88dvh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface, #121814)',
          borderRadius: '24px',
          border: '1.5px solid rgba(13, 118, 110, 0.35)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 32px rgba(13, 118, 110, 0.2)',
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
            background: 'radial-gradient(ellipse at top, rgba(13, 118, 110, 0.3), transparent 80%)',
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

          {/* Playlist Cover */}
          <div
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '16px',
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              border: '1.5px solid rgba(94, 234, 212, 0.4)',
              backgroundImage: `url(${coverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/* Playlist Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--teal, #0d766e)',
                }}
              >
                Audio Playlist · {tracks.length} Tracks
              </span>
              {playlistData?.is_public ? (
                <Globe size={12} color="var(--ink-muted)" title="Public playlist" />
              ) : (
                <Lock size={12} color="var(--ink-muted)" title="Private playlist" />
              )}
            </div>

            <h3
              style={{
                fontSize: '18px',
                fontWeight: 700,
                lineHeight: 1.3,
                margin: '4px 0 6px',
                color: 'var(--ink, #ffffff)',
              }}
            >
              {playlistData?.title}
            </h3>
            <p
              style={{
                fontSize: '12px',
                color: 'var(--ink-muted, #94a3b8)',
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {playlistData?.description || 'Curated community listening collection.'}
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
            disabled={tracks.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              borderRadius: '999px',
              background: 'var(--teal, #0d766e)',
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(13, 118, 110, 0.4)',
            }}
          >
            <Play size={16} fill="#ffffff" />
            <span>Play Playlist ({tracks.length})</span>
          </button>

          <span style={{ fontSize: '12px', color: 'var(--ink-muted, #94a3b8)' }}>
            Curator: {playlistData?.owner?.display_name || playlistData?.curator || 'Community'}
          </span>
        </div>

        {/* Tracks List */}
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
              Loading playlist tracks...
            </div>
          ) : tracks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink-muted)' }}>
              No tracks in this playlist yet.
            </div>
          ) : (
            tracks.map((t, idx) => {
              const isCurrent = currentTrack?.id === t.id;
              const isCurrentPlaying = isCurrent && isPlaying;
              return (
                <div
                  key={t.id || idx}
                  onClick={() => playTrack(t, tracks)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: isCurrent ? 'rgba(13, 118, 110, 0.16)' : 'var(--surface-muted, rgba(255,255,255,0.03))',
                    border: isCurrent ? '1.5px solid var(--teal, #0d766e)' : '1px solid var(--border, rgba(255,255,255,0.06))',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isCurrent ? 'var(--teal, #0d766e)' : 'rgba(255,255,255,0.1)',
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
                      idx + 1
                    )}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        fontWeight: 600,
                        color: isCurrent ? 'var(--teal, #0d766e)' : 'var(--ink, #ffffff)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.title}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--ink-muted, #94a3b8)' }}>
                      {formatDuration(t.duration_seconds)}
                      {t.author?.display_name ? ` · ${t.author.display_name}` : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      style={{
                        background: isCurrent ? 'var(--teal, #0d766e)' : 'rgba(255,255,255,0.1)',
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
                      title={isCurrentPlaying ? 'Pause' : 'Play track'}
                    >
                      {isCurrentPlaying ? (
                        <Pause size={14} fill="#ffffff" />
                      ) : (
                        <Play size={14} fill="#ffffff" style={{ marginLeft: '2px' }} />
                      )}
                    </button>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveTrack(t.id, e)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          padding: '6px',
                          cursor: 'pointer',
                        }}
                        title="Remove from playlist"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
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
