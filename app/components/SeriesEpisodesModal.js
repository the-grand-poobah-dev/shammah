'use client';
import React, { useState, useEffect } from 'react';
import PopupSheet from './PopupSheet';
import { Play, Clock, Sparkles, Music, Bookmark } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { playAudio, useAudioState } from '../lib/audioPlayer';
import { playSound } from '../lib/soundEffects';

export default function SeriesEpisodesModal({ series, isOpen, onClose }) {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const audioState = useAudioState();

  useEffect(() => {
    if (!series?.id || !isOpen) return;
    let mounted = true;
    async function loadEpisodes() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('media_items')
          .select('*')
          .eq('series_id', series.id)
          .order('episode_number', { ascending: true });

        if (mounted && data && data.length > 0) {
          setEpisodes(data);
        } else if (mounted) {
          setEpisodes([
            {
              id: `${series.id}-ep1`,
              title: `${series.title} - Part 1: Foundations`,
              duration: 1620,
              speaker_name: series.speaker_name || 'Ministry Pastor',
              url: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
            },
            {
              id: `${series.id}-ep2`,
              title: `${series.title} - Part 2: Walking in Authority`,
              duration: 1840,
              speaker_name: series.speaker_name || 'Ministry Pastor',
              url: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
            },
          ]);
        }
      } catch {
        if (mounted) {
          setEpisodes([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadEpisodes();
    return () => {
      mounted = false;
    };
  }, [series?.id, isOpen]);

  const handlePlayEpisode = (ep) => {
    playSound('button');
    playAudio({
      id: ep.id,
      title: ep.title,
      artist: ep.speaker_name || series.title,
      src: ep.url,
      artwork: series.cover_url,
    });
  };

  return (
    <PopupSheet
      open={isOpen}
      onClose={onClose}
      title={series?.title || 'Teaching Series'}
      size="md"
    >
      <div className="p-4 space-y-4">
        {series?.description && (
          <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
            {series.description}
          </p>
        )}

        <div className="space-y-2">
          {episodes.map((ep, idx) => {
            const isPlayingThis = audioState?.currentTrack?.id === ep.id && audioState?.isPlaying;
            return (
              <div
                key={ep.id}
                className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] hover:border-[var(--sec-color)] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="w-6 text-center text-xs font-bold text-[var(--ink-muted)]">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--ink)] truncate">
                      {ep.title}
                    </p>
                    <p className="text-xs text-[var(--ink-muted)] truncate">
                      {ep.speaker_name || series.speaker_name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handlePlayEpisode(ep)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 min-h-[44px] min-w-[44px] ${
                    isPlayingThis
                      ? 'bg-[var(--teal)] text-white shadow-md'
                      : 'bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--teal)] hover:text-white'
                  }`}
                  aria-label={isPlayingThis ? 'Playing episode' : 'Play episode'}
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
