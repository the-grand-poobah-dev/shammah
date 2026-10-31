'use client';
import React, { useState, useEffect } from 'react';
import PopupSheet from './PopupSheet';
import { Play, Music, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { playAudio, useAudioState } from '../lib/audioPlayer';
import { playSound } from '../lib/soundEffects';

export default function PlaylistDetailModal({ playlist, isOpen, onClose, currentUserId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const audioState = useAudioState();

  useEffect(() => {
    if (!playlist?.id || !isOpen) return;
    let mounted = true;
    async function loadPlaylistItems() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('playlist_items')
          .select('id, media:media_items(*)')
          .eq('playlist_id', playlist.id)
          .order('position', { ascending: true });

        if (mounted && data && data.length > 0) {
          setItems(data.map((d) => d.media).filter(Boolean));
        } else if (mounted) {
          setItems([
            {
              id: 'pl-item-1',
              title: 'Morning Prayer & Devotion Intercession',
              speaker_name: 'Prophetic Prayer Altar',
              duration: 1200,
              url: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
            },
            {
              id: 'pl-item-2',
              title: 'Quiet Waters Instrumental Praise',
              speaker_name: 'Shammah Worship Collective',
              duration: 980,
              url: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
            },
          ]);
        }
      } catch {
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadPlaylistItems();
    return () => {
      mounted = false;
    };
  }, [playlist?.id, isOpen]);

  const handlePlayTrack = (track) => {
    playSound('button');
    playAudio({
      id: track.id,
      title: track.title,
      artist: track.speaker_name || playlist.title,
      src: track.url,
      artwork: track.thumbnail_url || playlist.cover_url,
    });
  };

  return (
    <PopupSheet
      open={isOpen}
      onClose={onClose}
      title={playlist?.title || 'Playlist'}
      size="md"
    >
      <div className="p-4 space-y-4">
        {items.length === 0 && !loading && (
          <div className="text-center py-8 text-xs text-[var(--ink-muted)]">
            No audio tracks in this playlist yet.
          </div>
        )}

        <div className="space-y-2">
          {items.map((track, idx) => {
            const isPlayingThis = audioState?.currentTrack?.id === track.id && audioState?.isPlaying;
            return (
              <div
                key={track.id}
                className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] hover:border-[var(--sec-color)] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="w-6 text-center text-xs font-bold text-[var(--ink-muted)]">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--ink)] truncate">
                      {track.title}
                    </p>
                    <p className="text-xs text-[var(--ink-muted)] truncate">
                      {track.speaker_name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handlePlayTrack(track)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 min-h-[44px] min-w-[44px] ${
                    isPlayingThis
                      ? 'bg-[var(--teal)] text-white shadow-md'
                      : 'bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--teal)] hover:text-white'
                  }`}
                  aria-label={isPlayingThis ? 'Playing track' : 'Play track'}
                >
                  <Play size={16} fill="currentColor" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </PopupSheet>
  );
}
