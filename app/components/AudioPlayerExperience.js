'use client';

import React, { useEffect, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Heart, Bookmark, Download, Share2,
  ListMusic, X, ChevronDown, Repeat, Shuffle, Timer, Gauge, Volume2, FileText,
  VolumeX, Trash2, ArrowUp, ArrowDown, Music2, ExternalLink, ListPlus,
} from 'lucide-react';
import { AudioPlayerProvider, useAudioPlayer } from '../lib/audioPlayer';
import { addPlaylistItem, listPlaylists } from '../lib/data/mediaApi';
import { supabase } from '../../lib/supabaseClient';

function clock(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

function coverFor(track) {
  return track?.thumb_url || track?.cover_image || track?.cover_url || '';
}

function PlayerInterface() {
  const player = useAudioPlayer();
  const {
    currentTrack, isPlaying, currentTime, duration, playbackSpeed, volume, isMuted,
    queue, isShuffle, repeatMode, isExpanded, isOfflineTrack, isLiked,
    isSaved, sleepTimerMinutes, sleepTimerSecondsLeft, offlineActionMessage, togglePlay, seekTo, skip,
    nextTrack, prevTrack, setSpeed, setVolume, toggleMute, toggleShuffle, cycleRepeat,
    setSleepTimer, removeFromQueue, reorderQueue, clearQueue,
    expandPlayer, collapsePlayer, toggleLikeTrack, toggleSaveTrack, toggleOfflineTrack,
    closePlayer,
  } = player;
  const [showQueue, setShowQueue] = useState(false);
  const [draggingQueueIndex, setDraggingQueueIndex] = useState(null);
  const [showTimer, setShowTimer] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [ownedPlaylists, setOwnedPlaylists] = useState([]);
  const [playlistFeedback, setPlaylistFeedback] = useState('');

  const accent = currentTrack?.accent || '#0d9488';
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const artist = currentTrack?.author?.display_name || currentTrack?.speaker || currentTrack?.profiles?.display_name || 'Shammah Audio';
  const cover = coverFor(currentTrack);

  useEffect(() => {
    if (!isExpanded) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName) || event.target?.isContentEditable) return;
      if (event.key === 'Escape') collapsePlayer();
      if (event.code === 'Space') { event.preventDefault(); togglePlay(); }
      if (event.key === 'ArrowLeft') skip(-10);
      if (event.key === 'ArrowRight') skip(10);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [isExpanded, collapsePlayer, togglePlay, skip]);

  useEffect(() => {
    if (!isExpanded || !showPlaylistPicker) return undefined;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      const userId = data?.session?.user?.id;
      if (!userId) return { data: [] };
      return listPlaylists({ kind: 'audio', ownerId: userId });
    }).then((result) => {
      if (active) setOwnedPlaylists(result?.data || []);
    }).catch(() => { if (active) setOwnedPlaylists([]); });
    return () => { active = false; };
  }, [isExpanded, showPlaylistPicker]);

  useEffect(() => {
    if (!playlistFeedback) return undefined;
    const id = window.setTimeout(() => setPlaylistFeedback(''), 2200);
    return () => window.clearTimeout(id);
  }, [playlistFeedback]);

  useEffect(() => {
    if (!copied) return undefined;
    const id = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(id);
  }, [copied]);

  useEffect(() => {
    let cancelled = false;
    if (!showTranscript || !currentTrack?.transcript_url) {
      setTranscriptText('');
      setTranscriptError('');
      return () => { cancelled = true; };
    }
    setTranscriptLoading(true);
    setTranscriptError('');
    window.fetch(currentTrack.transcript_url)
      .then((response) => {
        if (!response.ok) throw new Error('Transcript could not be loaded.');
        return response.text();
      })
      .then((raw) => {
        if (cancelled) return;
        const clean = raw.split('\n')
          .filter((line) => !line.startsWith('WEBVTT') && !line.includes('-->') && !/^\d+$/.test(line.trim()))
          .map((line) => line.replace(/<[^>]*>/g, '').trim())
          .filter(Boolean)
          .join('\n\n');
        setTranscriptText(clean || raw.trim());
      })
      .catch((error) => { if (!cancelled) setTranscriptError(error.message || 'Transcript could not be loaded.'); })
      .finally(() => { if (!cancelled) setTranscriptLoading(false); });
    return () => { cancelled = true; };
  }, [showTranscript, currentTrack?.id, currentTrack?.transcript_url]);

  const shareTrack = async () => {
    if (!currentTrack) return;
    const url = `${window.location.origin}/watch/${currentTrack.id}`;
    try {
      if (navigator.share) await navigator.share({ title: currentTrack.title, text: artist, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        try { await navigator.clipboard.writeText(url); setCopied(true); } catch {}
      }
    }
  };

  const moveQueueItem = (from, to) => {
    if (to < 0 || to >= queue.length || from === to) return;
    reorderQueue(from, to);
  };

  if (!currentTrack) return null;

  return (
    <>
      <aside className="shammah-audio-mini" style={{ '--audio-accent': accent }} aria-label="Audio player">
        <button type="button" className="shammah-audio-mini-cover" onClick={expandPlayer} aria-label="Open now playing">
          {cover ? <img src={cover} alt="" /> : <span><Music2 size={20} /></span>}
        </button>
        <button type="button" className="shammah-audio-mini-meta" onClick={expandPlayer}>
          <strong title={currentTrack.title}>{currentTrack.title || 'Untitled audio'}</strong>
          <span>{artist}</span>
        </button>
        <div className="shammah-audio-mini-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
        <button type="button" className="shammah-audio-player-icon" onClick={prevTrack} aria-label="Previous track"><SkipBack size={18} /></button>
        <button type="button" className="shammah-audio-player-main" onClick={togglePlay} aria-label={isPlaying ? 'Pause audio' : 'Play audio'}>
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
        <button type="button" className="shammah-audio-player-icon" onClick={nextTrack} aria-label="Next track"><SkipForward size={18} /></button>
        <button type="button" className="shammah-audio-player-icon shammah-audio-queue-toggle" onClick={() => { expandPlayer(); setShowQueue(true); }} aria-label="Open queue"><ListMusic size={19} /></button>
      </aside>

      {isExpanded && (
        <div className="shammah-audio-sheet-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) collapsePlayer(); }}>
          <section className="shammah-audio-sheet" role="dialog" aria-modal="true" aria-label="Now playing" style={{ '--audio-accent': accent }}>
            <header className="shammah-audio-sheet-header">
              <button type="button" className="shammah-audio-player-icon" onClick={collapsePlayer} aria-label="Minimize player"><ChevronDown /></button>
              <div><span>NOW PLAYING</span><strong>{currentTrack.series?.title || currentTrack.category || 'SHAMMAH AUDIO'}</strong></div>
              <button type="button" className="shammah-audio-player-icon" onClick={closePlayer} aria-label="Close player"><X /></button>
            </header>

            <div className="shammah-audio-sheet-body">
              <div className="shammah-audio-artwork">
                {cover ? <img src={cover} alt={`Cover for ${currentTrack.title}`} /> : <div className="shammah-audio-artwork-placeholder"><Music2 size={72} /></div>}
                <div className={`shammah-audio-wave ${isPlaying ? 'is-playing' : ''}`} aria-hidden="true">
                  {Array.from({ length: 32 }, (_, i) => <i key={i} style={{ '--bar-index': i, height: `${12 + ((i * 17) % 42)}%` }} />)}
                </div>
              </div>

              <div className="shammah-audio-track-info">
                <div><h2>{currentTrack.title || 'Untitled audio'}</h2><p>{artist}{currentTrack.church?.name ? ` · ${currentTrack.church.name}` : ''}</p></div>
                <button type="button" className={`shammah-audio-player-icon ${isLiked ? 'is-active' : ''}`} onClick={toggleLikeTrack} aria-label={isLiked ? 'Unlike track' : 'Like track'}><Heart fill={isLiked ? 'currentColor' : 'none'} /></button>
              </div>

              <div className="shammah-audio-seek">
                <input aria-label="Playback position" type="range" min="0" max={Math.max(duration || currentTrack.duration_seconds || 0, 1)} step="1" value={Math.min(currentTime, duration || currentTime)} onChange={(e) => seekTo(Number(e.target.value))} style={{ '--audio-progress': `${progress}%` }} />
                <div><span>{clock(currentTime)}</span><span>{clock(duration || currentTrack.duration_seconds)}</span></div>
              </div>

              <div className="shammah-audio-transport">
                <button type="button" className={`shammah-audio-player-icon ${isShuffle ? 'is-active' : ''}`} onClick={toggleShuffle} aria-label="Toggle shuffle"><Shuffle size={19} /></button>
                <button type="button" className="shammah-audio-player-icon" onClick={() => skip(-15)} aria-label="Skip back 15 seconds"><SkipBack size={22} /><small>15</small></button>
                <button type="button" className="shammah-audio-player-main is-large" onClick={togglePlay} aria-label={isPlaying ? 'Pause audio' : 'Play audio'}>{isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}</button>
                <button type="button" className="shammah-audio-player-icon" onClick={() => skip(30)} aria-label="Skip forward 30 seconds"><SkipForward size={22} /><small>30</small></button>
                <button type="button" className={`shammah-audio-player-icon ${repeatMode !== 'off' ? 'is-active' : ''}`} onClick={cycleRepeat} aria-label={`Repeat ${repeatMode}`}><Repeat size={19} /><small>{repeatMode === 'one' ? '1' : ''}</small></button>
              </div>

              <div className="shammah-audio-tools">
                <button type="button" onClick={toggleSaveTrack} className={isSaved ? 'is-active' : ''}><Bookmark size={18} />{isSaved ? 'Saved' : 'Save'}</button>
                <button type="button" onClick={() => setShowPlaylistPicker((v) => !v)} className={showPlaylistPicker ? 'is-active' : ''}><ListPlus size={18} />Playlist</button>
                <button type="button" onClick={toggleOfflineTrack} className={isOfflineTrack ? 'is-active' : ''}><Download size={18} />{isOfflineTrack ? 'Offline ready' : 'Download'}</button>
                {currentTrack.transcript_url && <button type="button" onClick={() => setShowTranscript((v) => !v)} className={showTranscript ? 'is-active' : ''} aria-expanded={showTranscript}><FileText size={18} />Transcript</button>}
                <button type="button" onClick={shareTrack}><Share2 size={18} />{copied ? 'Link copied' : 'Share'}</button>
                <button type="button" onClick={() => setShowTimer((v) => !v)} className={sleepTimerMinutes ? 'is-active' : ''}><Timer size={18} />{sleepTimerSecondsLeft ? `${Math.ceil(sleepTimerSecondsLeft / 60)} min` : sleepTimerMinutes === 'end' ? 'End of track' : 'Sleep timer'}</button>
                <label><Gauge size={18} /><span>Speed</span><select aria-label="Playback speed" value={playbackSpeed} onChange={(e) => setSpeed(Number(e.target.value))}>{[0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => <option key={speed} value={speed}>{speed}×</option>)}</select></label>
              </div>

              {offlineActionMessage && <p role="status" style={{ margin: '8px 0', fontSize: '12px', color: 'var(--ink-muted)' }}>{offlineActionMessage}</p>}

              {showPlaylistPicker && <div className="shammah-audio-timer-options" aria-label="Add current audio to playlist">
                {ownedPlaylists.length === 0 ? <span className="shammah-audio-muted">No audio playlists are available yet. Create one in Audio Sanctuary.</span> : ownedPlaylists.map((playlist) => <button key={playlist.id} type="button" onClick={async () => { const result = await addPlaylistItem(playlist.id, currentTrack.id, playlist.items?.length || 0); setPlaylistFeedback(result.error ? 'Could not add to playlist' : `Added to ${playlist.title}`); if (!result.error) setShowPlaylistPicker(false); }}>{playlist.title}</button>)}
                {playlistFeedback && <span role="status" className="shammah-audio-muted">{playlistFeedback}</span>}
              </div>}

              {showTimer && <div className="shammah-audio-timer-options" aria-label="Sleep timer options">
                {[15, 30, 60].map((minutes) => <button key={minutes} type="button" onClick={() => { setSleepTimer(minutes); setShowTimer(false); }}>{minutes} min</button>)}
                <button type="button" onClick={() => { setSleepTimer('end'); setShowTimer(false); }}>End of track</button>
                <button type="button" onClick={() => { setSleepTimer(null); setShowTimer(false); }}>Off</button>
              </div>}

              {showTranscript && currentTrack.transcript_url && (
                <section aria-label="Audio transcript" style={{ padding: '14px', border: '1px solid var(--border)', borderRadius: '14px', background: 'var(--surface-muted, rgba(255,255,255,.03))' }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: '14px' }}>Transcript</h3>
                  {transcriptLoading ? <p role="status">Loading transcript…</p>
                    : transcriptError ? <p role="alert">{transcriptError}</p>
                    : <div style={{ maxHeight: '260px', overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.65, fontSize: '13px', color: 'var(--ink)' }}>{transcriptText || 'This transcript is empty.'}</div>}
                  <a href={currentTrack.transcript_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '10px', fontSize: '12px', color: 'var(--teal)' }}>Open transcript file</a>
                </section>
              )}

              <div className="shammah-audio-queue">
                <button type="button" className="shammah-audio-queue-heading" onClick={() => setShowQueue((v) => !v)} aria-expanded={showQueue}>
                  <span><ListMusic size={18} /> Up next <small>{queue.length} tracks</small></span><ChevronDown className={showQueue ? 'is-rotated' : ''} size={18} />
                </button>
                {showQueue && <div className="shammah-audio-queue-list">
                  {queue.length === 0 ? <p className="shammah-audio-muted">Your queue is empty.</p> : queue.map((track, index) => (
                    <div
                      key={track.id || index}
                      className={`shammah-audio-queue-item ${track.id === currentTrack.id ? 'is-current' : ''} ${draggingQueueIndex === index ? 'is-dragging' : ''}`}
                      draggable={queue.length > 1 && track.id !== currentTrack.id}
                      onDragStart={(event) => { setDraggingQueueIndex(index); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(index)); }}
                      onDragOver={(event) => { if (draggingQueueIndex !== null) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } }}
                      onDrop={(event) => { event.preventDefault(); const from = Number(event.dataTransfer.getData('text/plain')); if (Number.isInteger(from)) moveQueueItem(from, index); setDraggingQueueIndex(null); }}
                      onDragEnd={() => setDraggingQueueIndex(null)}
                    >
                      <span className="shammah-audio-queue-number">{index + 1}</span>
                      <div><strong>{track.title || 'Untitled audio'}</strong><small>{track.author?.display_name || track.speaker || 'Shammah Audio'}</small></div>
                      <button type="button" onClick={() => moveQueueItem(index, index - 1)} disabled={index === 0} aria-label={`Move ${track.title} up`}><ArrowUp size={15} /></button>
                      <button type="button" onClick={() => moveQueueItem(index, index + 1)} disabled={index === queue.length - 1} aria-label={`Move ${track.title} down`}><ArrowDown size={15} /></button>
                      <button type="button" onClick={() => removeFromQueue(index)} aria-label={`Remove ${track.title} from queue`}><X size={15} /></button>
                    </div>
                  ))}
                  {queue.length > 0 && <button type="button" className="shammah-audio-clear-queue" onClick={clearQueue}><Trash2 size={15} /> Clear queue (keep current track)</button>}
                </div>}
              </div>

              <div className="shammah-audio-volume">
                <button type="button" className="shammah-audio-player-icon" onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>{isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
                <input type="range" min="0" max="1" step="0.05" aria-label="Volume" value={isMuted ? 0 : volume} onChange={(e) => setVolume(Number(e.target.value))} />
                <span>{Math.round((isMuted ? 0 : volume) * 100)}%</span>
                {currentTrack.id && <a href={`/watch/${currentTrack.id}`} title="Open media details"><ExternalLink size={17} /></a>}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default function AudioPlayerExperience({ children }) {
  return <AudioPlayerProvider><>{children}<PlayerInterface /></></AudioPlayerProvider>;
}
