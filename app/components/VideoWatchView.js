'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Settings,
  Subtitles,
  PictureInPicture,
  Tv,
  Heart,
  Bookmark,
  Share2,
  Download,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  ArrowLeft,
  Sparkles,
  Clock,
  Eye,
  CheckCircle2,
  UserPlus,
  UserCheck,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';
import CommentThread from './CommentThread';
import { getMedia, toggleLike, toggleSave, recordView, saveProgress, getProgress, relatedMedia } from '../lib/data/mediaApi';
import { toggleFollowAuthor, checkIsFollowing } from '../lib/data/reelsApi';
import { saveForOffline, isItemSavedOffline, removeOfflineItem } from '../lib/offlineSyncManager';
import { formatPostDate, useRelativeTimeTick } from '../lib/postDisplay';
import { playSound } from '../lib/soundEffects';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function VideoWatchView({
  videoId,
  initialVideo = null,
  currentUser = null,
  session = null,
  isOverlay = false,
  onClose,
  openAuth,
  onSelectVideo,
}) {
  const now = useRelativeTimeTick();
  const [video, setVideo] = useState(initialVideo);
  const [loading, setLoading] = useState(!initialVideo);
  const [upNextList, setUpNextList] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [theatreMode, setTheatreMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [liked, setLiked] = useState(Boolean(initialVideo?.user_liked));
  const [likeCount, setLikeCount] = useState(initialVideo?.like_count || 0);
  const [saved, setSaved] = useState(Boolean(initialVideo?.user_saved));
  const [saveCount, setSaveCount] = useState(initialVideo?.save_count || 0);
  const [following, setFollowing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [autoplayNext, setAutoplayNext] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('shammah_watch_autoplay') !== 'false';
    }
    return true;
  });
  const [nextCountdown, setNextCountdown] = useState(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showPlayFlash, setShowPlayFlash] = useState(false);

  const playerContainerRef = useRef(null);
  const videoElemRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const hasRecordedViewRef = useRef(false);
  const lastProgressSaveRef = useRef(0);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  }, []);

  // Fetch video details and related items
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!videoId) return;
      setLoading(true);

      const [mediaRes, relatedRes] = await Promise.all([
        getMedia(videoId),
        relatedMedia(videoId, { limit: 10 }),
      ]);

      if (cancelled) return;

      if (mediaRes.data) {
        setVideo(mediaRes.data);
        setLiked(Boolean(mediaRes.data.user_liked));
        setLikeCount(mediaRes.data.like_count || 0);
        setSaved(Boolean(mediaRes.data.user_saved));
        setSaveCount(mediaRes.data.save_count || 0);
        setIsOffline(isItemSavedOffline(videoId));

        if (mediaRes.data.author_id && session?.user?.id) {
          checkIsFollowing(mediaRes.data.author_id).then((isFol) => {
            if (!cancelled) setFollowing(isFol);
          });
        }
      }

      if (relatedRes.data) {
        setUpNextList(relatedRes.data);
      }

      setLoading(false);
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [videoId, session?.user?.id]);

  // Resume playback position from watch_progress
  useEffect(() => {
    if (!videoId) return;
    hasRecordedViewRef.current = false;

    getProgress(videoId).then((res) => {
      if (res.position > 5 && videoElemRef.current && !res.completed) {
        videoElemRef.current.currentTime = res.position;
        setCurrentTime(res.position);
        const mins = Math.floor(res.position / 60);
        const secs = Math.round(res.position % 60).toString().padStart(2, '0');
        showToast(`Resumed playback at ${mins}:${secs}`);
      }
    });
  }, [videoId, showToast]);

  // Periodic watch progress recording & view count
  const handleTimeUpdate = useCallback(() => {
    const videoElem = videoElemRef.current;
    if (!videoElem) return;

    const cur = videoElem.currentTime;
    const dur = videoElem.duration || 1;
    setCurrentTime(cur);

    // Update buffered progress
    if (videoElem.buffered.length > 0) {
      const bufferedEnd = videoElem.buffered.end(videoElem.buffered.length - 1);
      setBufferedPercent(Math.min(100, (bufferedEnd / dur) * 100));
    }

    // Record view after 10 seconds or 30% watched
    if (!hasRecordedViewRef.current && (cur >= 10 || cur / dur >= 0.3)) {
      hasRecordedViewRef.current = true;
      recordView(videoId, cur);
    }

    // Save playback progress every 10 seconds
    const nowTs = Date.now();
    if (nowTs - lastProgressSaveRef.current > 10000) {
      lastProgressSaveRef.current = nowTs;
      saveProgress(videoId, cur, dur);
    }
  }, [videoId]);

  // Save final progress on unmount
  useEffect(() => {
    return () => {
      if (videoElemRef.current && videoId) {
        const cur = videoElemRef.current.currentTime;
        const dur = videoElemRef.current.duration || 1;
        if (cur > 3) {
          saveProgress(videoId, cur, dur);
        }
      }
    };
  }, [videoId]);

  // Handle Autoplay-Next countdown when video ends
  function handleVideoEnded() {
    setIsPlaying(false);
    if (autoplayNext && upNextList.length > 0) {
      setNextCountdown(5);
    }
  }

  useEffect(() => {
    if (nextCountdown === null) return;
    if (nextCountdown <= 0) {
      setNextCountdown(null);
      if (upNextList[0]) {
        playSelectedVideo(upNextList[0]);
      }
      return;
    }

    const timer = setTimeout(() => {
      setNextCountdown((c) => (c ? c - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [nextCountdown, upNextList]);

  function playSelectedVideo(nextItem) {
    setNextCountdown(null);
    if (onSelectVideo) {
      onSelectVideo(nextItem);
    } else if (typeof window !== 'undefined') {
      window.location.href = `/watch/${nextItem.id}`;
    }
  }

  // Keyboard shortcuts (Space, k, j, l, Left, Right, Up, Down, m, f, t)
  useEffect(() => {
    function handleKeyDown(e) {
      // Ignore if user is typing in comments, search, or inputs
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) {
        return;
      }

      const videoElem = videoElemRef.current;
      if (!videoElem) return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'j':
        case 'J':
          e.preventDefault();
          seekDelta(-10);
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          seekDelta(10);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekDelta(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekDelta(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(-0.1);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 't':
        case 'T':
          e.preventDefault();
          setTheatreMode((t) => !t);
          break;
        case 'Escape':
          if (showSpeedMenu) setShowSpeedMenu(false);
          else if (isOverlay && onClose) onClose();
          break;
        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSpeedMenu, isOverlay, onClose]);

  // Controls auto-hide on inactivity
  function handleMouseMove() {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setControlsVisible(false);
    }, 2800);
  }

  function togglePlay() {
    const videoElem = videoElemRef.current;
    if (!videoElem) return;

    if (videoElem.paused) {
      videoElem.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoElem.pause();
      setIsPlaying(false);
    }
    setShowPlayFlash(true);
    setTimeout(() => setShowPlayFlash(false), 450);
  }

  function seekDelta(seconds) {
    const videoElem = videoElemRef.current;
    if (!videoElem) return;
    videoElem.currentTime = Math.max(0, Math.min(videoElem.duration || 1, videoElem.currentTime + seconds));
  }

  function handleSeek(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const videoElem = videoElemRef.current;
    if (videoElem && duration > 0) {
      videoElem.currentTime = percent * duration;
      setCurrentTime(percent * duration);
    }
  }

  function changeVolume(delta) {
    const videoElem = videoElemRef.current;
    if (!videoElem) return;
    const newVol = Math.max(0, Math.min(1, volume + delta));
    videoElem.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
  }

  function toggleMute() {
    const videoElem = videoElemRef.current;
    if (!videoElem) return;
    videoElem.muted = !isMuted;
    setIsMuted(!isMuted);
  }

  function setSpeed(speed) {
    const videoElem = videoElemRef.current;
    if (videoElem) {
      videoElem.playbackRate = speed;
      setPlaybackSpeed(speed);
      setShowSpeedMenu(false);
      showToast(`${speed}x Speed`);
    }
  }

  function togglePiP() {
    const videoElem = videoElemRef.current;
    if (!videoElem) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else if (document.pictureInPictureEnabled) {
      videoElem.requestPictureInPicture().catch(() => {});
    }
  }

  function toggleFullscreen() {
    const container = playerContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }

  // Like action
  async function handleLike() {
    if (!session?.user?.id) {
      if (openAuth) openAuth('signin');
      return;
    }
    setLiked((prev) => {
      const next = !prev;
      setLikeCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
      return next;
    });
    playSound('reaction');
    await toggleLike(videoId);
  }

  // Save / Bookmark action
  async function handleSave() {
    if (!session?.user?.id) {
      if (openAuth) openAuth('signin');
      return;
    }
    setSaved((prev) => {
      const next = !prev;
      setSaveCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
      return next;
    });
    playSound('reaction');
    await toggleSave(videoId);
    showToast(!saved ? 'Saved to Bookmarks' : 'Removed from Bookmarks');
  }

  // Download Offline action
  function handleDownloadOffline() {
    if (isOffline) {
      removeOfflineItem(videoId);
      setIsOffline(false);
      showToast('Removed from offline downloads');
    } else {
      const res = saveForOffline(
        {
          id: videoId,
          title: video?.title || 'Video Sermon',
          media_url: video?.media_url,
          media_type: 'video',
          category_id: video?.category,
          instructor: video?.author?.display_name,
          avatar: video?.author?.avatar_url,
        },
        'video',
        video?.author_id
      );

      if (res.success) {
        setIsOffline(true);
        playSound('reaction');
        showToast('Saved for offline viewing (30 days)');
      } else {
        showToast(res.reason || 'Offline download unavailable');
      }
    }
  }

  // Share action
  async function handleShare() {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/watch/${videoId}` : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: video?.title || 'Watch on Shammah',
          url,
        });
      } catch {}
      return;
    }
    navigator.clipboard?.writeText(url);
    showToast('Video link copied to clipboard!');
  }

  // Follow author action
  async function handleFollowAuthor() {
    if (!session?.user?.id) {
      if (openAuth) openAuth('signin');
      return;
    }
    const res = await toggleFollowAuthor(video?.author_id);
    setFollowing(res.following);
    playSound('reaction');
    showToast(res.following ? 'Subscribed to channel' : 'Unsubscribed from channel');
  }

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <div className="watch-loading-screen">
        <div className="watch-spinner" />
        <p>Loading video and messages...</p>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="watch-error-screen">
        <h3>Video not found or unavailable</h3>
        <p>This video may have been made private by its church creator.</p>
        <button
          type="button"
          className="watch-back-btn"
          onClick={() => {
            if (isOverlay && onClose) onClose();
            else window.location.href = '/';
          }}
        >
          Return to Videos
        </button>
      </div>
    );
  }

  const chapters = Array.isArray(video.chapters) ? video.chapters : [];

  return (
    <div className={`watch-view-wrapper${theatreMode ? ' theatre-active' : ''}${isOverlay ? ' is-overlay' : ''}`}>
      {/* Top Navbar Header */}
      <header className="watch-top-bar">
        <button
          type="button"
          className="watch-nav-btn"
          onClick={() => {
            if (isOverlay && onClose) onClose();
            else if (window.history.length > 1) window.history.back();
            else window.location.href = '/';
          }}
          aria-label="Back to videos"
        >
          {isOverlay ? <X size={20} /> : <ArrowLeft size={20} />}
          <span className="watch-nav-label">{isOverlay ? 'Close Player' : 'Back to Videos'}</span>
        </button>

        <span className="watch-top-title truncate">{video.title}</span>

        {isOverlay && (
          <button
            type="button"
            className="watch-close-corner-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        )}
      </header>

      {/* Main 2-Column Responsive Layout */}
      <div className="watch-main-grid">
        {/* Left Column: Player, Video Info, Creator, Chapters, Comments */}
        <div className="watch-primary-column">
          {/* Custom Video Player Container */}
          <div
            ref={playerContainerRef}
            className={`watch-player-container${theatreMode ? ' theatre' : ''}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setControlsVisible(false)}
          >
            <video
              ref={videoElemRef}
              src={video.media_url}
              poster={video.thumb_url}
              className="watch-video-element"
              playsInline
              onClick={togglePlay}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
              onEnded={handleVideoEnded}
            />

            {/* Play/Pause Splash Flash */}
            {showPlayFlash && (
              <div className="watch-play-flash">
                {isPlaying ? <Play size={54} fill="#ffffff" /> : <Pause size={54} fill="#ffffff" />}
              </div>
            )}

            {/* Custom Controls Bar */}
            <div className={`watch-controls-bar${controlsVisible ? ' visible' : ''}`}>
              {/* Progress Scrubber Bar */}
              <div
                className="watch-seek-bar-track"
                onClick={handleSeek}
                title="Seek (Click or Drag)"
              >
                {/* Buffered Range Fill */}
                <div
                  className="watch-seek-buffered-fill"
                  style={{ width: `${bufferedPercent}%` }}
                />

                {/* Played Progress Fill */}
                <div
                  className="watch-seek-played-fill"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                >
                  <div className="watch-seek-scrubber-handle" />
                </div>

                {/* Chapter Markers */}
                {chapters.map((ch, idx) => {
                  const pct = (ch.time_seconds / (duration || 1)) * 100;
                  return (
                    <div
                      key={idx}
                      className="watch-chapter-marker-tick"
                      style={{ left: `${pct}%` }}
                      title={`${ch.title} (${formatTime(ch.time_seconds)})`}
                    />
                  );
                })}
              </div>

              {/* Controls Buttons Row */}
              <div className="watch-controls-buttons-row">
                <div className="watch-controls-left-group">
                  {/* Play / Pause */}
                  <button
                    type="button"
                    className="watch-control-icon-btn"
                    onClick={togglePlay}
                    aria-label={isPlaying ? 'Pause (Space, k)' : 'Play (Space, k)'}
                    title="Play/Pause (Space, k)"
                  >
                    {isPlaying ? <Pause size={20} fill="#ffffff" /> : <Play size={20} fill="#ffffff" />}
                  </button>

                  {/* 10s Rewind */}
                  <button
                    type="button"
                    className="watch-control-icon-btn"
                    onClick={() => seekDelta(-10)}
                    aria-label="Rewind 10 seconds (j)"
                    title="Rewind 10s (j)"
                  >
                    <RotateCcw size={18} />
                  </button>

                  {/* 10s Fast-Forward */}
                  <button
                    type="button"
                    className="watch-control-icon-btn"
                    onClick={() => seekDelta(10)}
                    aria-label="Fast forward 10 seconds (l)"
                    title="Forward 10s (l)"
                  >
                    <RotateCw size={18} />
                  </button>

                  {/* Volume / Mute */}
                  <div className="watch-volume-slider-group">
                    <button
                      type="button"
                      className="watch-control-icon-btn"
                      onClick={toggleMute}
                      aria-label={isMuted ? 'Unmute (m)' : 'Mute (m)'}
                    >
                      {isMuted || volume === 0 ? <VolumeX size={19} /> : <Volume2 size={19} />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setVolume(val);
                        setIsMuted(val === 0);
                        if (videoElemRef.current) videoElemRef.current.volume = val;
                      }}
                      className="watch-volume-range"
                      aria-label="Volume slider"
                    />
                  </div>

                  {/* Current / Duration Time */}
                  <span className="watch-time-readout">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="watch-controls-right-group">
                  {/* Playback Speed Menu */}
                  <div className="watch-speed-anchor">
                    <button
                      type="button"
                      className="watch-speed-toggle-btn"
                      onClick={() => setShowSpeedMenu((s) => !s)}
                      aria-label="Playback speed"
                    >
                      <span>{playbackSpeed}x</span>
                    </button>
                    {showSpeedMenu && (
                      <div className="watch-speed-dropdown">
                        <div className="watch-dropdown-title">Playback speed</div>
                        {SPEED_OPTIONS.map((speed) => (
                          <button
                            key={speed}
                            type="button"
                            className={`watch-speed-option-btn${playbackSpeed === speed ? ' active' : ''}`}
                            onClick={() => setSpeed(speed)}
                          >
                            <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
                            {playbackSpeed === speed && <Check size={14} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Picture-in-Picture */}
                  <button
                    type="button"
                    className="watch-control-icon-btn"
                    onClick={togglePiP}
                    aria-label="Picture in Picture"
                    title="Picture-in-Picture"
                  >
                    <PictureInPicture size={18} />
                  </button>

                  {/* Theatre Mode (desktop only) */}
                  <button
                    type="button"
                    className="watch-control-icon-btn hidden sm:inline-flex"
                    onClick={() => setTheatreMode((t) => !t)}
                    aria-label={theatreMode ? 'Default view (t)' : 'Theatre mode (t)'}
                    title="Theatre mode (t)"
                  >
                    <Tv size={18} />
                  </button>

                  {/* Fullscreen */}
                  <button
                    type="button"
                    className="watch-control-icon-btn"
                    onClick={toggleFullscreen}
                    aria-label={isFullscreen ? 'Exit full screen (f)' : 'Full screen (f)'}
                    title="Full screen (f)"
                  >
                    {isFullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Next Video Countdown Banner */}
            {nextCountdown !== null && (
              <div className="watch-next-countdown-overlay">
                <div className="watch-countdown-box">
                  <p>Up next in {nextCountdown}s</p>
                  <h4>{upNextList[0]?.title}</h4>
                  <div className="watch-countdown-actions">
                    <button
                      type="button"
                      className="watch-cancel-next-btn"
                      onClick={() => setNextCountdown(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="watch-play-now-next-btn"
                      onClick={() => playSelectedVideo(upNextList[0])}
                    >
                      Play Now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Video Metadata Header */}
          <div className="watch-metadata-card">
            <h1 className="watch-title-heading">{video.title}</h1>

            <div className="watch-meta-strip">
              <div className="watch-meta-counts">
                <span className="watch-count-chip">
                  <Eye size={14} /> {video.view_count || 0} views
                </span>
                <span className="watch-dot-sep">·</span>
                <span>{video.published_at ? formatPostDate(video.published_at, now) : 'Recently'}</span>
                {video.category && (
                  <span
                    className="watch-category-badge"
                    style={{
                      borderColor: video.accent || 'var(--teal)',
                      color: video.accent || 'var(--teal)',
                    }}
                  >
                    {video.category}
                  </span>
                )}
              </div>

              {/* Action Buttons: Like, Save, Share, Offline */}
              <div className="watch-actions-cluster">
                <button
                  type="button"
                  className={`watch-action-pill${liked ? ' active' : ''}`}
                  onClick={handleLike}
                  aria-label="Like video"
                >
                  <Heart size={16} fill={liked ? '#ef4444' : 'none'} color={liked ? '#ef4444' : 'currentColor'} />
                  <span>{likeCount}</span>
                </button>

                <button
                  type="button"
                  className={`watch-action-pill${saved ? ' is-saved' : ''}`}
                  onClick={handleSave}
                  aria-label="Save to watch later"
                >
                  <Bookmark size={16} fill={saved ? '#f59e0b' : 'none'} color={saved ? '#f59e0b' : 'currentColor'} />
                  <span>{saveCount > 0 ? saveCount : 'Save'}</span>
                </button>

                <button
                  type="button"
                  className={`watch-action-pill${isOffline ? ' is-offline' : ''}`}
                  onClick={handleDownloadOffline}
                  aria-label="Save offline"
                  title="Offline download (30 days)"
                >
                  {isOffline ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Download size={16} />}
                  <span>{isOffline ? 'Downloaded' : 'Download'}</span>
                </button>

                <button
                  type="button"
                  className="watch-action-pill"
                  onClick={handleShare}
                  aria-label="Share video"
                >
                  <Share2 size={16} />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Channel / Author Row */}
            <div className="watch-channel-row">
              <div className="watch-channel-identity">
                <Avatar
                  name={video.author?.display_name || 'Channel'}
                  src={video.author?.avatar_url}
                  className="avatar-md"
                />
                <div className="watch-channel-names">
                  <div className="flex items-center gap-1.5">
                    <span className="watch-channel-name">{video.author?.display_name || 'Shammah Community'}</span>
                    {video.author?.badge && <MemberBadge badgeId={video.author.badge} size="sm" />}
                    {video.author?.badge_verified && <VerifiedBadge badge={video.author.badge} size={14} />}
                  </div>
                  {video.church?.name && (
                    <span className="watch-channel-sub">{video.church.name}</span>
                  )}
                </div>
              </div>

              {session?.user?.id !== video.author_id && (
                <button
                  type="button"
                  className={`watch-subscribe-btn${following ? ' is-following' : ''}`}
                  onClick={handleFollowAuthor}
                >
                  {following ? (
                    <>
                      <UserCheck size={15} /> Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={15} /> Follow
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Description & Interactive Chapters */}
            <div className="watch-description-box">
              <p className={`watch-desc-text${descExpanded ? ' expanded' : ''}`}>
                {video.description || 'Join in worship and spiritual teaching with the Shammah fellowship.'}
              </p>

              {/* Clickable Chapter Markers */}
              {chapters.length > 0 && (
                <div className="watch-chapters-panel">
                  <h4 className="watch-chapters-title">Chapters ({chapters.length})</h4>
                  <div className="watch-chapters-grid">
                    {chapters.map((ch, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="watch-chapter-pill"
                        onClick={() => {
                          if (videoElemRef.current) {
                            videoElemRef.current.currentTime = ch.time_seconds;
                            setCurrentTime(ch.time_seconds);
                            if (videoElemRef.current.paused) videoElemRef.current.play();
                            showToast(`Jumped to: ${ch.title}`);
                          }
                        }}
                      >
                        <Clock size={12} className="text-[var(--teal)]" />
                        <span className="font-mono text-xs">{formatTime(ch.time_seconds)}</span>
                        <span className="truncate">{ch.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {video.description && video.description.length > 140 && (
                <button
                  type="button"
                  className="watch-desc-toggle-btn"
                  onClick={() => setDescExpanded((e) => !e)}
                >
                  {descExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <section className="watch-comments-section" aria-label="Video Discussion">
            <h3 className="watch-comments-title">Community Discussion</h3>
            <CommentThread
              mediaId={videoId}
              postId={videoId}
              session={session}
              profile={currentUser}
              onRequireSignIn={() => openAuth && openAuth('signin')}
            />
          </section>
        </div>

        {/* Right Column: Up Next List */}
        <aside className="watch-sidebar-column" aria-label="Up Next">
          <div className="watch-up-next-header">
            <h4>Up Next</h4>
            <label className="watch-autoplay-toggle-wrap">
              <span className="text-xs text-[var(--ink-muted)]">Autoplay</span>
              <input
                type="checkbox"
                checked={autoplayNext}
                onChange={(e) => {
                  setAutoplayNext(e.target.checked);
                  localStorage.setItem('shammah_watch_autoplay', String(e.target.checked));
                }}
                className="watch-autoplay-checkbox"
              />
            </label>
          </div>

          <div className="watch-up-next-list">
            {upNextList.length === 0 ? (
              <p className="text-xs text-[var(--ink-muted)] p-3">No related videos found.</p>
            ) : (
              upNextList.map((item) => (
                <div
                  key={item.id}
                  className="watch-up-next-card"
                  onClick={() => playSelectedVideo(item)}
                >
                  <div className="watch-up-next-thumb-wrap">
                    <img
                      src={item.thumb_url || '/assets/aistudio/pic_4e5732f2.png'}
                      alt={item.title}
                      className="watch-up-next-img"
                      loading="lazy"
                    />
                    {item.duration_seconds > 0 && (
                      <span className="watch-up-next-duration">
                        {formatTime(item.duration_seconds)}
                      </span>
                    )}
                  </div>
                  <div className="watch-up-next-info">
                    <h5 className="watch-up-next-title">{item.title}</h5>
                    <span className="watch-up-next-channel">
                      {item.author?.display_name || 'Shammah Member'}
                    </span>
                    <span className="watch-up-next-meta">
                      {item.view_count || 0} views · {item.published_at ? formatPostDate(item.published_at, now) : 'Recently'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="watch-toast-banner" role="status">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
