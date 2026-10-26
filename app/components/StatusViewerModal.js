'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Send, Sparkles, Plus, Music, Volume2, VolumeX, Video } from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';
import { reactToStatus, commentOnStatus, inferMediaType } from '../lib/statusManager';
import { formatPostDate, getPostDateTitle, useRelativeTimeTick, cleanDisplayName } from '../lib/postDisplay';
import FaithReactionPicker from './FaithReactionPicker';

const QUICK_EMOJIS = ['🙏', '❤️', '🙌', '🔥', '✨', '👏'];

function formatMediaTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function StatusViewerModal({
  statuses = [],
  initialIndex = 0,
  currentUser,
  onClose,
  onAddStatus,
}) {
  const now = useRelativeTimeTick();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [commentText, setCommentText] = useState('');
  const [sentFeedback, setSentFeedback] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showEmojiSheet, setShowEmojiSheet] = useState(false);
  const [slideAnim, setSlideAnim] = useState(''); // 'slide-left' | 'slide-right' | ''
  const [isMuted, setIsMuted] = useState(true);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);

  const progressTimerRef = useRef(null);
  const pointerStartRef = useRef(null);
  const isLongPressRef = useRef(false);
  const longPressTimerRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  const currentStatus = statuses[currentIndex];
  const resolvedMediaType = currentStatus ? inferMediaType(currentStatus.mediaUrl, currentStatus.mediaType) : null;

  const isMyStatus = Boolean(
    currentUser &&
      currentStatus &&
      ((currentUser.id && currentStatus.userId === currentUser.id) ||
        (currentUser.name &&
          currentStatus.userName &&
          currentStatus.userName.toLowerCase() === currentUser.name.toLowerCase()))
  );

  // Push history state so mobile hardware or browser Back button closes viewer
  useEffect(() => {
    let isPopped = false;
    try {
      window.history.pushState({ shammahStatusViewer: true }, '');
    } catch (e) {
      // Ignored in constrained environments
    }

    function handlePopState() {
      isPopped = true;
      onClose();
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (!isPopped && window.history?.state?.shammahStatusViewer) {
        try {
          window.history.back();
        } catch (e) {}
      }
    };
  }, [onClose]);

  // Reset state on story index change
  useEffect(() => {
    setProgress(0);
    setSentFeedback(false);
    setReplyError('');
    setCommentText('');
    setShowEmojiSheet(false);
    setAudioDuration(0);
    setAudioCurrentTime(0);
  }, [currentIndex]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setSlideAnim('slide-from-left');
      setCurrentIndex((i) => i - 1);
      setTimeout(() => setSlideAnim(''), 300);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < statuses.length - 1) {
      setSlideAnim('slide-from-right');
      setCurrentIndex((i) => i + 1);
      setTimeout(() => setSlideAnim(''), 300);
    } else {
      onClose();
    }
  }, [currentIndex, statuses.length, onClose]);

  // Jump to NEXT USER's story on swipe left
  const handleNextUser = useCallback(() => {
    if (!currentStatus) return;
    const nextIdx = statuses.findIndex(
      (s, idx) => idx > currentIndex && (s.userId !== currentStatus.userId || s.userName !== currentStatus.userName)
    );
    if (nextIdx !== -1) {
      setSlideAnim('slide-from-right');
      setCurrentIndex(nextIdx);
      setTimeout(() => setSlideAnim(''), 300);
    } else {
      onClose();
    }
  }, [currentStatus, currentIndex, statuses, onClose]);

  // Jump to PREVIOUS USER's story on swipe right
  const handlePrevUser = useCallback(() => {
    if (!currentStatus) return;
    let prevUserIdx = -1;
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (statuses[i].userId !== currentStatus.userId || statuses[i].userName !== currentStatus.userName) {
        prevUserIdx = i;
        break;
      }
    }
    if (prevUserIdx !== -1) {
      const targetUser = statuses[prevUserIdx];
      const firstIdxOfUser = statuses.findIndex(
        (s) => s.userId === targetUser.userId || s.userName === targetUser.userName
      );
      setSlideAnim('slide-from-left');
      setCurrentIndex(firstIdxOfUser !== -1 ? firstIdxOfUser : prevUserIdx);
      setTimeout(() => setSlideAnim(''), 300);
    } else {
      setCurrentIndex(0);
    }
  }, [currentStatus, currentIndex, statuses]);

  // Keyboard navigation & escape to close
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  // Progress Bar timer:
  // For text and images: 5 seconds fixed duration.
  // For video and audio: progress is updated dynamically via media onTimeUpdate.
  useEffect(() => {
    if (!currentStatus || isPaused) return;

    if (resolvedMediaType === 'video' || resolvedMediaType === 'audio') {
      // Driven by element onTimeUpdate
      return;
    }

    const interval = 40; // ms
    const step = (interval / 5000) * 100; // 5000ms fixed duration

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimerRef.current);
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(progressTimerRef.current);
  }, [currentIndex, currentStatus, isPaused, resolvedMediaType, handleNext]);

  // Synchronize pause state with video and audio elements
  useEffect(() => {
    if (resolvedMediaType === 'video' && videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    } else if (resolvedMediaType === 'audio' && audioRef.current) {
      if (isPaused) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, resolvedMediaType]);

  if (!currentStatus) return null;

  // Touch and pointer gestures: long press pauses, swipe navigates, edge tap skips
  function onPointerDown(e) {
    if (e.target.closest('button, input, form, .status-viewer-footer, .status-viewer-header, .faith-reaction-picker-bubble, .status-viewer-sound-toggle-btn')) {
      return;
    }
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      target: e.currentTarget,
    };
    isLongPressRef.current = false;

    // Detect long press to pause
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsPaused(true);
    }, 220);
  }

  function onPointerMove(e) {
    if (!pointerStartRef.current) return;
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    if (dx > 12 || dy > 12) {
      setIsPaused(true);
    }
  }

  function onPointerUp(e) {
    clearTimeout(longPressTimerRef.current);
    setIsPaused(false);

    if (!pointerStartRef.current) return;
    const start = pointerStartRef.current;
    pointerStartRef.current = null;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const duration = Date.now() - start.time;

    // 1. Horizontal swipe across users
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        handleNextUser();
      } else {
        handlePrevUser();
      }
      return;
    }

    // 2. Vertical swipe down to close
    if (dy > 80 && Math.abs(dy) > Math.abs(dx)) {
      onClose();
      return;
    }

    // 3. Screen Edge Tapping
    if (duration < 350 && Math.abs(dx) < 15 && Math.abs(dy) < 15) {
      const rect = start.target.getBoundingClientRect();
      const clickRatio = (e.clientX - rect.left) / rect.width;
      if (clickRatio < 0.32) {
        handlePrev();
      } else if (clickRatio > 0.68) {
        handleNext();
      }
    }
  }

  function handleEmojiReaction(emoji) {
    reactToStatus(currentStatus.id, emoji, currentUser);

    const id = Date.now() + Math.random();
    setFloatingEmojis((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 1800);
  }

  async function handleSendComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;

    setReplyError('');
    setSentFeedback(false);

    const res = await commentOnStatus(currentStatus, commentText.trim(), {
      id: currentUser?.id,
      name: currentUser?.name || currentUser?.display_name || 'Member',
      avatar: currentUser?.avatar_url,
      badge: currentUser?.badge,
      verified: currentUser?.badge_verified,
    });

    if (res?.sent) {
      setSentFeedback(true);
      setCommentText('');
      setTimeout(() => setSentFeedback(false), 3500);
    } else {
      setReplyError(res?.error || 'Could not send reply to inbox.');
      setTimeout(() => setReplyError(''), 4000);
    }
  }

  const cleanAuthorName = cleanDisplayName(currentStatus.userName, 'Member');

  return (
    <div
      className="status-viewer-fullscreen"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="dialog"
      aria-modal="true"
      aria-label="24-Hour Fullscreen Status Story"
    >
      <div className={`status-viewer-stage status-bg-${currentStatus.bgStyle || 'emerald'} ${slideAnim}`}>
        {/* Full-frame image background with readable overlay scrim */}
        {resolvedMediaType === 'image' && currentStatus.mediaUrl && (
          <div className="status-viewer-image-wrap">
            <img
              src={currentStatus.mediaUrl}
              alt=""
              className="status-viewer-fill-image"
            />
            <div className="status-viewer-image-scrim" />
          </div>
        )}

        {/* Story Progress Indicators across the top */}
        <div className="status-progress-bars">
          {statuses.map((_, idx) => (
            <div key={idx} className="status-progress-track">
              <div
                className="status-progress-fill"
                style={{
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Top Navigation Bar: ONE Exit button at top-left, Author Info, and optional Add button at top-right */}
        <div className="status-viewer-header">
          {/* Top-Left: Circular glass button (40-44px), aria-label="Close status" */}
          <button
            type="button"
            className="status-viewer-close-btn"
            onClick={onClose}
            aria-label="Close status"
            title="Close status"
          >
            <X size={20} />
          </button>

          {/* Center-Left: Author profile info */}
          <div
            className="status-viewer-author-info cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(
                new CustomEvent('shammah:open-profile', {
                  detail: {
                    author: {
                      id: currentStatus.userId,
                      display_name: cleanAuthorName,
                      avatar_url: currentStatus.userAvatar,
                      badge: currentStatus.userBadge,
                      badge_verified: currentStatus.userVerified,
                      role: currentStatus.userRole,
                    },
                    authorId: currentStatus.userId,
                  },
                })
              );
            }}
            role="button"
            tabIndex={0}
            title={`View profile for ${cleanAuthorName}`}
          >
            <Avatar
              name={cleanAuthorName}
              src={currentStatus.userAvatar}
              hasStatus={true}
              className="avatar-sm status-author-avatar"
            />
            <div className="status-viewer-author-meta">
              <div className="status-author-name-row">
                <span className="status-author-name">{cleanAuthorName}</span>
                {currentStatus.userVerified && (
                  <VerifiedBadge
                    badge={currentStatus.userBadge}
                    role={currentStatus.userRole}
                    size={15}
                  />
                )}
              </div>
              {currentStatus.userBadge && (
                <MemberBadge badgeId={currentStatus.userBadge} size="sm" />
              )}
            </div>
          </div>

          {/* Top-Right: Add action (+) for signed-in user's own stories, or symmetrical spacer */}
          {isMyStatus ? (
            <button
              type="button"
              className="status-viewer-add-status-btn"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onAddStatus?.();
              }}
              aria-label="Add status"
              title="Add another status"
            >
              <Plus size={20} strokeWidth={2.5} />
            </button>
          ) : (
            <div className="status-viewer-header-spacer" aria-hidden="true" />
          )}
        </div>

        {/* Screen Edge Tap zones hints */}
        <div className="status-edge-tap-zone left" onClick={handlePrev} title="Tap left edge for previous story" />
        <div className="status-edge-tap-zone right" onClick={handleNext} title="Tap right edge for next story" />

        {/* Story Body: Scripture tag, text, and media */}
        <div className={`status-viewer-body ${resolvedMediaType ? `has-media has-media-${resolvedMediaType}` : ''}`}>
          {currentStatus.scriptureTag && (
            <span className="status-scripture-tag">
              <Sparkles size={14} />
              <span>{currentStatus.scriptureTag}</span>
            </span>
          )}

          {currentStatus.text && (
            <p className="status-viewer-text">{currentStatus.text}</p>
          )}

          {/* Video Status: Autoplays muted with tap-to-unmute and pauses when story is paused */}
          {resolvedMediaType === 'video' && currentStatus.mediaUrl && (
            <div className="status-viewer-video-container" onClick={(e) => e.stopPropagation()}>
              <video
                ref={videoRef}
                src={currentStatus.mediaUrl}
                autoPlay
                muted={isMuted}
                playsInline
                className="status-viewer-video"
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (v.duration && v.duration > 0) {
                    setProgress((v.currentTime / v.duration) * 100);
                  }
                }}
                onEnded={handleNext}
                onClick={() => setIsMuted((m) => !m)}
              />
              <button
                type="button"
                className="status-viewer-sound-toggle-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted((m) => !m);
                }}
                aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                <span>{isMuted ? 'Tap for sound' : 'Sound on'}</span>
              </button>
            </div>
          )}

          {/* Audio Status: Styled player over themed background with waveform visualizer */}
          {resolvedMediaType === 'audio' && currentStatus.mediaUrl && (
            <div className="status-viewer-audio-player-card" onClick={(e) => e.stopPropagation()}>
              <div className="status-viewer-audio-visual">
                <div className={`status-viewer-audio-disc ${!isPaused ? 'is-spinning' : ''}`}>
                  <Music size={26} className="text-white" />
                </div>
                <div className="status-viewer-audio-wave-bars">
                  <span className={`bar ${!isPaused ? 'animating' : ''}`} />
                  <span className={`bar ${!isPaused ? 'animating' : ''}`} />
                  <span className={`bar ${!isPaused ? 'animating' : ''}`} />
                  <span className={`bar ${!isPaused ? 'animating' : ''}`} />
                </div>
              </div>

              <div className="status-viewer-audio-details">
                <span className="status-viewer-audio-title">Audio Testimony</span>
                <span className="status-viewer-audio-time">
                  {formatMediaTime(audioCurrentTime)} / {formatMediaTime(audioDuration || 0)}
                </span>
              </div>

              <audio
                ref={audioRef}
                src={currentStatus.mediaUrl}
                autoPlay
                playsInline
                onTimeUpdate={(e) => {
                  const a = e.currentTarget;
                  setAudioCurrentTime(a.currentTime);
                  if (a.duration && a.duration > 0) {
                    setProgress((a.currentTime / a.duration) * 100);
                  }
                }}
                onLoadedMetadata={(e) => {
                  if (e.currentTarget.duration) {
                    setAudioDuration(e.currentTarget.duration);
                  }
                }}
                onEnded={handleNext}
              />
            </div>
          )}
        </div>

        {/* Floating Emojis particle burst */}
        <div className="status-floating-emojis-container">
          {floatingEmojis.map((item) => (
            <span key={item.id} className="status-floating-emoji">
              {item.emoji}
            </span>
          ))}
        </div>

        {/* Desktop Chevron Navigation Buttons */}
        {currentIndex > 0 && (
          <button
            type="button"
            className="status-nav-btn prev"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Previous story"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {currentIndex < statuses.length - 1 && (
          <button
            type="button"
            className="status-nav-btn next"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Next story"
          >
            <ChevronRight size={24} />
          </button>
        )}

        {/* Story Footer: Quick Reactions + Direct Inbox Comment Input */}
        <div className="status-viewer-footer" onClick={(e) => e.stopPropagation()}>
          {sentFeedback && (
            <div className="status-sent-banner">
              ✓ Sent directly to {cleanAuthorName}&apos;s inbox!
            </div>
          )}
          {replyError && (
            <div className="status-sent-banner" style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.45)', color: '#fecaca' }}>
              {replyError}
            </div>
          )}

          {/* Expanded Emoji Sheet if opened */}
          {showEmojiSheet && (
            <div className="status-expanded-reactions-popover">
              <FaithReactionPicker
                currentEmoji={null}
                onSelect={(emoji) => {
                  handleEmojiReaction(emoji);
                  setShowEmojiSheet(false);
                }}
                onClose={() => setShowEmojiSheet(false)}
              />
            </div>
          )}

          {/* Quick Reaction Bar */}
          <div className="status-quick-reactions">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="status-quick-emoji-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEmojiReaction(emoji);
                }}
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            <button
              type="button"
              className="status-quick-emoji-btn status-more-emojis-btn"
              onClick={() => setShowEmojiSheet((v) => !v)}
              title="More faith reactions"
              aria-label="More faith reactions"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Comment input -> Delivered directly to Poster's Inbox */}
          <form className="status-comment-form" onSubmit={handleSendComment}>
            <input
              type="text"
              placeholder={`Reply to ${cleanAuthorName}'s inbox...`}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              className="status-comment-input"
              maxLength={240}
            />
            <button
              type="submit"
              className="status-comment-send-btn"
              disabled={!commentText.trim()}
              aria-label="Send reply to inbox"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
