'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  X,
  ChevronDown,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Bookmark,
  Share2,
  ListMusic,
  Moon,
  Clock,
  Download,
  Check,
  Plus,
  Sparkles,
  FileText,
  Sliders,
  SkipBack,
  SkipForward,
  Headphones,
  Music,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useAudioPlayer } from '../lib/audioPlayer';
import { listPlaylists, createPlaylist, addPlaylistItem } from '../lib/data/mediaApi';
import { useSession } from '../lib/useSession';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function GlobalAudioPlayer({ session: propSession, currentUser: propCurrentUser, openAuth: propOpenAuth }) {
  const { session: hookSession, profile: hookProfile } = useSession();
  const session = propSession || hookSession;
  const currentUser = propCurrentUser || hookProfile;
  const openAuth = propOpenAuth || ((mode) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shammah:open-auth', { detail: mode || 'signin' }));
    }
  });
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playbackSpeed,
    isShuffle,
    repeatMode,
    isExpanded,
    isOfflineTrack,
    isLiked,
    likeCount,
    isSaved,
    sleepTimerMinutes,
    sleepTimerSecondsLeft,
    queue,
    queueIndex,
    isLoading,
    togglePlay,
    seekTo,
    skip,
    nextTrack,
    prevTrack,
    setSpeed,
    toggleShuffle,
    cycleRepeat,
    setSleepTimer,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    expandPlayer,
    collapsePlayer,
    toggleLikeTrack,
    toggleSaveTrack,
    toggleOfflineTrack,
    closePlayer,
    playTrack,
  } = useAudioPlayer();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('player'); // 'player' | 'queue' | 'notes' | 'timer' | 'playlist'
  const [showToast, setShowToast] = useState('');
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when expanded
  useEffect(() => {
    if (!mounted) return;
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isExpanded, mounted]);

  // Load playlists when user opens the playlist tab
  useEffect(() => {
    if (activeTab === 'playlist' && session?.user?.id) {
      listPlaylists({ kind: 'audio', ownerId: session.user.id }).then((res) => {
        setUserPlaylists(res.data || []);
      });
    }
  }, [activeTab, session?.user?.id]);

  function triggerToast(msg) {
    setShowToast(msg);
    setTimeout(() => setShowToast(''), 2500);
  }

  async function handleShare() {
    if (typeof window === 'undefined') return;
    const url = window.location.origin + `/?section=audio&track=${currentTrack?.id || ''}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentTrack?.title || 'Faith Audio on Shammah',
          text: currentTrack?.description || 'Listen to this message on Shammah',
          url,
        });
        return;
      } catch {}
    }
    navigator.clipboard?.writeText(url);
    triggerToast('Audio link copied to clipboard!');
  }

  async function handleAddToPlaylist(plId) {
    if (!currentTrack?.id) return;
    const res = await addPlaylistItem(plId, currentTrack.id);
    if (res.error) {
      triggerToast('Could not add to playlist');
    } else {
      triggerToast('Added to playlist!');
      setActiveTab('player');
    }
  }

  async function handleCreatePlaylist() {
    if (!newPlaylistTitle.trim() || !session?.user?.id) return;
    setIsCreatingPlaylist(true);
    const res = await createPlaylist({
      title: newPlaylistTitle.trim(),
      kind: 'audio',
      isPublic: true,
      coverUrl: currentTrack?.thumb_url || currentTrack?.cover_image || null,
    });
    setIsCreatingPlaylist(false);
    if (res.data?.id) {
      await addPlaylistItem(res.data.id, currentTrack.id);
      triggerToast('Playlist created & track added!');
      setNewPlaylistTitle('');
      setActiveTab('player');
    }
  }

  if (!mounted || !currentTrack) return null;

  const trackAccent = currentTrack.accent || '#8b5cf6';
  const authorName =
    currentTrack.author?.display_name ||
    currentTrack.speaker ||
    currentTrack.profiles?.display_name ||
    currentTrack.profiles?.name ||
    'Shammah Audio';

  const churchName = currentTrack.church?.name || currentTrack.series?.title || 'Community Fellowship';
  const coverUrl =
    currentTrack.thumb_url ||
    currentTrack.cover_image ||
    currentTrack.cover_url ||
    'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=500';

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  // Mini Player Bar
  const miniPlayer = (
    <aside
      className="persistent-audio-player-bar"
      role="region"
      aria-label="Persistent Audio Player"
      style={{
        '--player-accent': trackAccent,
        boxShadow: `0 12px 32px rgba(0, 0, 0, 0.5), 0 0 16px 2px ${trackAccent}33`,
      }}
    >
      {/* Mini Progress scrubber line on top edge */}
      <div
        className="mini-player-progress-bar"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '3px',
          width: `${progressPercent}%`,
          background: trackAccent,
          transition: 'width 0.2s linear',
          borderTopLeftRadius: '16px',
        }}
      />

      <div className="mini-player-content">
        {/* Thumbnail & Title (clickable to expand) */}
        <div
          className="mini-track-info-clickable"
          onClick={expandPlayer}
          title="Click to open Now Playing"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && expandPlayer()}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, cursor: 'pointer' }}
        >
          <div
            className="mini-thumb-wrap"
            style={{
              position: 'relative',
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              overflow: 'hidden',
              flexShrink: 0,
              border: `1.5px solid ${trackAccent}66`,
              backgroundImage: `url(${coverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {isPlaying && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                }}
              >
                <span className="mini-wave-bar bar-1" />
                <span className="mini-wave-bar bar-2" />
                <span className="mini-wave-bar bar-3" />
              </div>
            )}
          </div>

          <div className="mini-track-info">
            <span className="mini-track-title">{currentTrack.title}</span>
            <span className="mini-speaker-name">
              {authorName} · {churchName}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="mini-player-controls">
          <button
            type="button"
            className="mini-ctrl-btn"
            onClick={() => skip(-15)}
            title="Rewind 15s"
            aria-label="Rewind 15 seconds"
          >
            <RotateCcw size={15} />
          </button>

          <button
            type="button"
            className="mini-ctrl-btn play-pause-main"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            style={{
              background: trackAccent,
              borderColor: `${trackAccent}cc`,
              boxShadow: `0 0 10px ${trackAccent}88`,
            }}
          >
            {isPlaying ? <Pause size={18} fill="#ffffff" /> : <Play size={18} fill="#ffffff" />}
          </button>

          <button
            type="button"
            className="mini-ctrl-btn"
            onClick={() => skip(15)}
            title="Forward 15s"
            aria-label="Forward 15 seconds"
          >
            <RotateCw size={15} />
          </button>

          <button
            type="button"
            className="mini-ctrl-btn speed-toggle"
            onClick={() => {
              const speeds = [1, 1.25, 1.5, 1.75, 2];
              const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
              setSpeed(speeds[nextIdx]);
            }}
            title="Cycle Playback Speed"
          >
            {playbackSpeed}x
          </button>

          <button
            type="button"
            className="mini-ctrl-btn"
            onClick={expandPlayer}
            title="Expand Full Player"
            aria-label="Expand player"
          >
            <ChevronDown size={18} style={{ transform: 'rotate(180deg)' }} />
          </button>

          <button
            type="button"
            className="mini-ctrl-btn close-player"
            onClick={closePlayer}
            title="Close audio"
            aria-label="Close audio player"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </aside>
  );

  // Full Expanded Player Sheet (rendered in document.body portal)
  const expandedSheet = isExpanded && (
    <div
      className="now-playing-portal-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animation: 'fadeInNowPlaying 0.2s ease-out forwards',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) collapsePlayer();
      }}
    >
      <div
        className="now-playing-modal-card"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '92dvh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface, #121814)',
          borderRadius: '24px',
          border: `1.5px solid ${trackAccent}44`,
          boxShadow: `0 24px 64px rgba(0,0,0,0.7), 0 0 32px ${trackAccent}22`,
          overflow: 'hidden',
          color: 'var(--ink, #ffffff)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Accent Glow Header Strip */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '140px',
            background: `radial-gradient(ellipse at top, ${trackAccent}2e, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Modal Top Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px 10px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <button
            type="button"
            className="np-icon-btn"
            onClick={collapsePlayer}
            aria-label="Collapse player"
            title="Minimize"
          >
            <ChevronDown size={22} />
          </button>

          <div style={{ textAlign: 'center', minWidth: 0, flex: 1, padding: '0 8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: trackAccent,
              }}
            >
              {currentTrack.series?.title
                ? `Series · ${currentTrack.series.title}`
                : currentTrack.category
                  ? `${currentTrack.category} Sanctuary`
                  : 'Now Playing'}
            </span>
          </div>

          <button
            type="button"
            className="np-icon-btn"
            onClick={closePlayer}
            aria-label="Close audio"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* View Tabs Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '0 18px 10px',
            borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <button
            type="button"
            className={`np-tab-pill${activeTab === 'player' ? ' active' : ''}`}
            onClick={() => setActiveTab('player')}
            style={{
              padding: '5px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 600,
              border: activeTab === 'player' ? `1px solid ${trackAccent}` : '1px solid transparent',
              background: activeTab === 'player' ? `${trackAccent}22` : 'transparent',
              color: activeTab === 'player' ? trackAccent : 'var(--ink-muted, #94a3b8)',
              cursor: 'pointer',
            }}
          >
            Player
          </button>

          <button
            type="button"
            className={`np-tab-pill${activeTab === 'queue' ? ' active' : ''}`}
            onClick={() => setActiveTab('queue')}
            style={{
              padding: '5px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 600,
              border: activeTab === 'queue' ? `1px solid ${trackAccent}` : '1px solid transparent',
              background: activeTab === 'queue' ? `${trackAccent}22` : 'transparent',
              color: activeTab === 'queue' ? trackAccent : 'var(--ink-muted, #94a3b8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ListMusic size={13} />
            Queue ({queue.length})
          </button>

          <button
            type="button"
            className={`np-tab-pill${activeTab === 'notes' ? ' active' : ''}`}
            onClick={() => setActiveTab('notes')}
            style={{
              padding: '5px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 600,
              border: activeTab === 'notes' ? `1px solid ${trackAccent}` : '1px solid transparent',
              background: activeTab === 'notes' ? `${trackAccent}22` : 'transparent',
              color: activeTab === 'notes' ? trackAccent : 'var(--ink-muted, #94a3b8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <FileText size={13} />
            Notes
          </button>

          <button
            type="button"
            className={`np-tab-pill${activeTab === 'timer' ? ' active' : ''}`}
            onClick={() => setActiveTab('timer')}
            style={{
              padding: '5px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 600,
              border: activeTab === 'timer' ? `1px solid ${trackAccent}` : '1px solid transparent',
              background: activeTab === 'timer' ? `${trackAccent}22` : 'transparent',
              color: activeTab === 'timer' ? trackAccent : 'var(--ink-muted, #94a3b8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Moon size={13} />
            {sleepTimerSecondsLeft !== null
              ? `${Math.ceil(sleepTimerSecondsLeft / 60)}m`
              : sleepTimerMinutes === 'end'
                ? 'End'
                : 'Timer'}
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 22px 24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {showToast && (
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                alignSelf: 'center',
                padding: '6px 16px',
                borderRadius: '999px',
                background: trackAccent,
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                marginBottom: '10px',
              }}
            >
              {showToast}
            </div>
          )}

          {/* TAB 1: MAIN PLAYER */}
          {activeTab === 'player' && (
            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center' }}>
              {/* Large Cover Art with Ambient Shadow */}
              <div
                style={{
                  position: 'relative',
                  width: '240px',
                  height: '240px',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  margin: '10px auto 20px',
                  boxShadow: `0 16px 40px rgba(0,0,0,0.6), 0 0 24px ${trackAccent}44`,
                  border: `2px solid ${trackAccent}55`,
                }}
              >
                <img
                  src={coverUrl}
                  alt={currentTrack.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />

                {/* Live Waveform graphic overlay at bottom */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '8px 12px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    gap: '3px',
                    height: '40px',
                  }}
                >
                  {[40, 75, 100, 60, 85, 45, 90, 70, 50, 80, 95, 65, 40].map((h, i) => (
                    <span
                      key={i}
                      className={`np-waveform-stick${isPlaying ? ' pulsing' : ''}`}
                      style={{
                        width: '3px',
                        height: isPlaying ? `${h}%` : '20%',
                        borderRadius: '2px',
                        backgroundColor: trackAccent,
                        animationDelay: `${(i % 5) * 0.1}s`,
                        transition: 'height 0.2s ease',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Title & Author Info */}
              <div style={{ width: '100%', textAlign: 'left', marginBottom: '16px' }}>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    lineHeight: 1.3,
                    margin: '0 0 6px',
                    color: 'var(--ink, #ffffff)',
                  }}
                >
                  {currentTrack.title}
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Avatar name={authorName} src={currentTrack.author?.avatar_url || currentTrack.profiles?.avatar_url} className="avatar-xs" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink, #ffffff)' }}>
                    {authorName}
                  </span>
                  {currentTrack.author?.badge && <MemberBadge badgeId={currentTrack.author.badge} size="sm" />}
                  {currentTrack.author?.badge_verified && <VerifiedBadge badge={currentTrack.author.badge} size={13} />}
                  <span style={{ fontSize: '12px', color: 'var(--ink-muted, #94a3b8)' }}>
                    · {churchName}
                  </span>
                </div>
              </div>

              {/* Scrubber Seek Bar */}
              <div style={{ width: '100%', marginBottom: '18px' }}>
                <div style={{ position: 'relative', width: '100%', height: '24px', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.5"
                    value={currentTime}
                    onChange={(e) => seekTo(parseFloat(e.target.value))}
                    aria-label="Audio scrubber"
                    style={{
                      width: '100%',
                      accentColor: trackAccent,
                      cursor: 'pointer',
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--ink-muted, #94a3b8)',
                  }}
                >
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Main Playback Control Cluster */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  maxWidth: '380px',
                  marginBottom: '20px',
                }}
              >
                {/* Shuffle */}
                <button
                  type="button"
                  className={`np-ctrl-btn${isShuffle ? ' active' : ''}`}
                  onClick={toggleShuffle}
                  title={isShuffle ? 'Shuffle On' : 'Shuffle Off'}
                  style={{ color: isShuffle ? trackAccent : 'var(--ink-muted, #94a3b8)' }}
                >
                  <Shuffle size={18} />
                </button>

                {/* Rewind 15s */}
                <button
                  type="button"
                  className="np-ctrl-btn"
                  onClick={() => skip(-15)}
                  title="Rewind 15s"
                >
                  <RotateCcw size={20} />
                </button>

                {/* Previous */}
                <button
                  type="button"
                  className="np-ctrl-btn"
                  onClick={prevTrack}
                  title="Previous track"
                >
                  <SkipBack size={22} />
                </button>

                {/* Play / Pause Giant FAB */}
                <button
                  type="button"
                  className="np-play-fab"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: trackAccent,
                    border: 'none',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: `0 8px 24px ${trackAccent}66`,
                    transition: 'transform 0.15s ease',
                  }}
                >
                  {isPlaying ? <Pause size={28} fill="#ffffff" /> : <Play size={28} fill="#ffffff" style={{ marginLeft: '4px' }} />}
                </button>

                {/* Next */}
                <button
                  type="button"
                  className="np-ctrl-btn"
                  onClick={nextTrack}
                  title="Next track"
                >
                  <SkipForward size={22} />
                </button>

                {/* Forward 30s */}
                <button
                  type="button"
                  className="np-ctrl-btn"
                  onClick={() => skip(30)}
                  title="Forward 30s"
                >
                  <RotateCw size={20} />
                </button>

                {/* Repeat */}
                <button
                  type="button"
                  className={`np-ctrl-btn${repeatMode !== 'off' ? ' active' : ''}`}
                  onClick={cycleRepeat}
                  title={`Repeat: ${repeatMode}`}
                  style={{ color: repeatMode !== 'off' ? trackAccent : 'var(--ink-muted, #94a3b8)' }}
                >
                  {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                </button>
              </div>

              {/* Utility Tools Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  width: '100%',
                  padding: '12px 6px 0',
                  borderTop: '1px solid var(--border, rgba(255,255,255,0.08))',
                }}
              >
                {/* Speed Selector */}
                <button
                  type="button"
                  className="np-tool-btn"
                  onClick={() => {
                    const speeds = [0.75, 1, 1.25, 1.5, 2];
                    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
                    setSpeed(speeds[nextIdx]);
                    triggerToast(`Playback speed: ${speeds[nextIdx]}x`);
                  }}
                  title="Playback Speed"
                >
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>{playbackSpeed}x</span>
                  <span style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>Speed</span>
                </button>

                {/* Like */}
                <button
                  type="button"
                  className="np-tool-btn"
                  onClick={() => {
                    if (!session) return openAuth('signin');
                    toggleLikeTrack();
                  }}
                  title="Like message"
                >
                  <Heart
                    size={20}
                    fill={isLiked ? '#ef4444' : 'none'}
                    color={isLiked ? '#ef4444' : 'var(--ink)'}
                  />
                  <span style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>{likeCount}</span>
                </button>

                {/* Bookmark / Save */}
                <button
                  type="button"
                  className="np-tool-btn"
                  onClick={() => {
                    if (!session) return openAuth('signin');
                    toggleSaveTrack();
                    triggerToast(isSaved ? 'Removed from saved' : 'Saved to library');
                  }}
                  title="Save track"
                >
                  <Bookmark
                    size={20}
                    fill={isSaved ? trackAccent : 'none'}
                    color={isSaved ? trackAccent : 'var(--ink)'}
                  />
                  <span style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>Save</span>
                </button>

                {/* Add to Playlist */}
                <button
                  type="button"
                  className="np-tool-btn"
                  onClick={() => {
                    if (!session) return openAuth('signin');
                    setActiveTab('playlist');
                  }}
                  title="Add to Playlist"
                >
                  <Plus size={20} />
                  <span style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>Playlist</span>
                </button>

                {/* Offline Download */}
                <button
                  type="button"
                  className="np-tool-btn"
                  onClick={() => {
                    toggleOfflineTrack();
                    triggerToast(isOfflineTrack ? 'Removed from offline' : 'Downloaded for offline listening');
                  }}
                  title="Download offline"
                >
                  {isOfflineTrack ? (
                    <Check size={20} color="#10b981" />
                  ) : (
                    <Download size={20} />
                  )}
                  <span style={{ fontSize: '10px', color: isOfflineTrack ? '#10b981' : 'var(--ink-muted)' }}>
                    {isOfflineTrack ? 'Downloaded' : 'Offline'}
                  </span>
                </button>

                {/* Share */}
                <button
                  type="button"
                  className="np-tool-btn"
                  onClick={handleShare}
                  title="Share audio"
                >
                  <Share2 size={20} />
                  <span style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>Share</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: QUEUE */}
          {activeTab === 'queue' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                  Playing next · {queue.length} tracks
                </span>
                <button
                  type="button"
                  onClick={clearQueue}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Clear Queue
                </button>
              </div>

              {queue.map((track, idx) => {
                const isCurrent = idx === queueIndex;
                return (
                  <div
                    key={track.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      background: isCurrent ? `${trackAccent}22` : 'var(--surface-muted, rgba(255,255,255,0.04))',
                      border: isCurrent ? `1px solid ${trackAccent}66` : '1px solid transparent',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: 'var(--ink-muted)', width: '18px' }}>
                      {idx + 1}
                    </span>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        backgroundImage: `url(${track.thumb_url || track.cover_image || coverUrl})`,
                        backgroundSize: 'cover',
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                      onClick={() => playTrack(track, queue)}
                    >
                      <h4
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          margin: 0,
                          color: isCurrent ? trackAccent : 'var(--ink)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {track.title}
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                        {track.author?.display_name || track.speaker || 'Member'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {idx > 0 && (
                        <button
                          type="button"
                          className="np-icon-btn"
                          onClick={() => reorderQueue(idx, idx - 1)}
                          title="Move up"
                        >
                          <ArrowUp size={14} />
                        </button>
                      )}
                      {idx < queue.length - 1 && (
                        <button
                          type="button"
                          className="np-icon-btn"
                          onClick={() => reorderQueue(idx, idx + 1)}
                          title="Move down"
                        >
                          <ArrowDown size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="np-icon-btn"
                        onClick={() => removeFromQueue(idx)}
                        title="Remove from queue"
                      >
                        <Trash2 size={14} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: NOTES & TRANSCRIPT */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', lineHeight: 1.6 }}>
              <div style={{ padding: '12px', borderRadius: '12px', background: `${trackAccent}15`, border: `1px solid ${trackAccent}33` }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: trackAccent }}>
                  {currentTrack.title}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-muted)' }}>
                  Speaker: {authorName} · Church: {churchName}
                </p>
              </div>

              <div>
                <h5 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-muted)', margin: '0 0 8px' }}>
                  Teaching Overview &amp; Scripture Notes
                </h5>
                <p style={{ fontSize: '14px', color: 'var(--ink)', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {currentTrack.description ||
                    'Listen closely to this teaching message. Anchor your spirit upon the Word of God and meditate on truth throughout the day.'}
                </p>
              </div>

              {currentTrack.tags && currentTrack.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {currentTrack.tags.map((tg, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: 'rgba(255,255,255,0.08)',
                        fontSize: '11px',
                        color: 'var(--ink-muted)',
                      }}
                    >
                      #{tg}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SLEEP TIMER PICKER */}
          {activeTab === 'timer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700 }}>
                Bedtime &amp; Devotional Sleep Timer
              </h4>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--ink-muted)' }}>
                Audio will gently stop after the selected period so you can rest peacefully in God&apos;s presence.
              </p>

              {[
                { label: '15 Minutes', val: 15 },
                { label: '30 Minutes', val: 30 },
                { label: '45 Minutes', val: 45 },
                { label: '60 Minutes (1 Hour)', val: 60 },
                { label: 'End of Track / Episode', val: 'end' },
                { label: 'Turn Off Sleep Timer', val: null },
              ].map((opt) => {
                const isSelected =
                  opt.val === null
                    ? sleepTimerMinutes === null && sleepTimerSecondsLeft === null
                    : sleepTimerMinutes === opt.val;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      setSleepTimer(opt.val);
                      triggerToast(opt.val ? `Sleep timer set for ${opt.label}` : 'Sleep timer turned off');
                      setActiveTab('player');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: isSelected ? `${trackAccent}25` : 'var(--surface-muted, rgba(255,255,255,0.04))',
                      border: isSelected ? `1.5px solid ${trackAccent}` : '1px solid var(--border, rgba(255,255,255,0.08))',
                      color: isSelected ? trackAccent : 'var(--ink)',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={18} color={trackAccent} />}
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 5: ADD TO PLAYLIST */}
          {activeTab === 'playlist' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Add to Audio Playlist</h4>

              {/* Create new playlist box */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="New playlist name..."
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border, rgba(255,255,255,0.15))',
                    background: 'var(--surface-muted, rgba(255,255,255,0.05))',
                    color: 'var(--ink, #ffffff)',
                    fontSize: '13px',
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistTitle.trim() || isCreatingPlaylist}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: trackAccent,
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    opacity: !newPlaylistTitle.trim() || isCreatingPlaylist ? 0.5 : 1,
                  }}
                >
                  Create
                </button>
              </div>

              {/* Existing playlists list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                {userPlaylists.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--ink-muted)', margin: '12px 0' }}>
                    No playlists yet. Create your first playlist above!
                  </p>
                ) : (
                  userPlaylists.map((pl) => (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => handleAddToPlaylist(pl.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'var(--surface-muted, rgba(255,255,255,0.04))',
                        border: '1px solid var(--border, rgba(255,255,255,0.08))',
                        color: 'var(--ink, #ffffff)',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{pl.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                          {pl.items?.[0]?.count || 0} tracks
                        </div>
                      </div>
                      <Plus size={16} color={trackAccent} />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {miniPlayer}
      {expandedSheet && createPortal(expandedSheet, document.body)}
    </>
  );
}
