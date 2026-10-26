'use client';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  Sparkles,
  Plus,
  Music,
  Volume2,
  VolumeX,
  Video,
  MoreVertical,
  Flag,
  Eye,
  EyeOff,
  Repeat,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Loader2,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';
import PopupSheet from './PopupSheet';
import {
  reactToStatus,
  commentOnStatus,
  inferMediaType,
  markStatusViewed,
  reportStatus,
  hideStatus,
  unhideStatus,
  deleteStatus,
  isStatusHidden,
  isStatusUserMuted,
  muteStatusUser,
  reshareStatusAsPost,
} from '../lib/statusManager';
import { cleanDisplayName } from '../lib/postDisplay';
import FaithReactionPicker from './FaithReactionPicker';

const QUICK_EMOJIS = ['🙏', '❤️', '🙌', '🔥', '✨', '👏'];

const REPORT_REASONS = [
  {
    id: 'hate',
    label: 'Hate speech or hostility',
    desc: 'Attacking individuals, ethnic groups, or promoting malice',
    color: '#ef4444',
  },
  {
    id: 'abuse',
    label: 'Abuse, harassment, or bullying',
    desc: 'Targeted disrespect, personal defamation, or intimidation',
    color: '#f43f5e',
  },
  {
    id: 'false_doctrine',
    label: 'Spiritual manipulation or false doctrine',
    desc: 'Exploitative claims, fraudulent prophecies, or deception',
    color: '#f59e0b',
  },
  {
    id: 'inappropriate',
    label: 'Inappropriate or explicit content',
    desc: 'Media or wording violating Christian community standards',
    color: '#ec4899',
  },
  {
    id: 'spam',
    label: 'Spam, scams, or commercial fraud',
    desc: 'Unsolicited adverts, suspicious links, or phishing',
    color: '#8b5cf6',
  },
  {
    id: 'other',
    label: 'Other Community Guideline breach',
    desc: 'Any behavior contrary to peaceful Christian fellowship',
    color: '#0d9488',
  },
];

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
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [commentText, setCommentText] = useState('');
  const [sentFeedback, setSentFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [replyError, setReplyError] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showEmojiSheet, setShowEmojiSheet] = useState(false);
  const [slideAnim, setSlideAnim] = useState(''); // 'slide-from-left' | 'slide-from-right' | ''
  const [isMuted, setIsMuted] = useState(true);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);

  // Story Options Sheets state
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('inappropriate');
  const [reportNotes, setReportNotes] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reshareOpen, setReshareOpen] = useState(false);
  const [reshareComment, setReshareComment] = useState('');
  const [resharing, setResharing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const progressTimerRef = useRef(null);
  const pointerStartRef = useRef(null);
  const isLongPressRef = useRef(false);
  const longPressTimerRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const currentStatus = statuses[currentIndex];
  const resolvedMediaType = currentStatus ? inferMediaType(currentStatus.mediaUrl, currentStatus.mediaType) : null;

  // Mark current status as viewed client-side
  useEffect(() => {
    if (currentStatus?.id) {
      markStatusViewed(currentStatus.id, currentUser?.id);
    }
  }, [currentStatus?.id, currentUser?.id]);

  // Compute the current user's subset of stories for top progress segmented tracks
  const currentUserStatuses = useMemo(() => {
    if (!currentStatus) return [];
    return statuses.filter(
      (s) =>
        (currentStatus.userId && s.userId === currentStatus.userId) ||
        (currentStatus.userName && s.userName?.toLowerCase() === currentStatus.userName?.toLowerCase())
    );
  }, [statuses, currentStatus]);

  const currentUserIndex = useMemo(() => {
    if (!currentStatus || currentUserStatuses.length === 0) return 0;
    const idx = currentUserStatuses.findIndex((s) => s.id === currentStatus.id);
    return idx !== -1 ? idx : 0;
  }, [currentUserStatuses, currentStatus]);

  const isMyStatus = Boolean(
    currentUser &&
      currentStatus &&
      ((currentUser.id && currentStatus.userId === currentUser.id) ||
        (currentUser.name &&
          currentStatus.userName &&
          currentStatus.userName.toLowerCase() === currentUser.name.toLowerCase()) ||
        (currentUser.display_name &&
          currentStatus.userName &&
          currentStatus.userName.toLowerCase() === currentUser.display_name.toLowerCase()))
  );

  const isStatusHiddenNow = Boolean(
    currentStatus &&
      (isStatusHidden(currentStatus.id) ||
        isStatusUserMuted(currentStatus.userId, currentStatus.userName))
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
    setMenuOpen(false);
    setReportOpen(false);
    setReshareOpen(false);
    setReportSubmitted(false);
    setDeleteConfirmOpen(false);
    setIsDeleting(false);
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
      // Clean exit at the end of all statuses, never infinite-loop
      onClose();
    }
  }, [currentIndex, statuses.length, onClose]);

  // Jump to NEXT USER's story on swipe left
  const handleNextUser = useCallback(() => {
    if (!currentStatus) return;
    const nextIdx = statuses.findIndex(
      (s, idx) =>
        idx > currentIndex &&
        ((currentStatus.userId && s.userId !== currentStatus.userId) ||
          (currentStatus.userName && s.userName?.toLowerCase() !== currentStatus.userName?.toLowerCase()))
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
      const s = statuses[i];
      if (
        (currentStatus.userId && s.userId !== currentStatus.userId) ||
        (currentStatus.userName && s.userName?.toLowerCase() !== currentStatus.userName?.toLowerCase())
      ) {
        prevUserIdx = i;
        break;
      }
    }
    if (prevUserIdx !== -1) {
      const targetUser = statuses[prevUserIdx];
      const firstIdxOfUser = statuses.findIndex(
        (s) =>
          (targetUser.userId && s.userId === targetUser.userId) ||
          (targetUser.userName && s.userName?.toLowerCase() === targetUser.userName?.toLowerCase())
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
      if (menuOpen || reportOpen || reshareOpen) return;
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
  }, [handleNext, handlePrev, onClose, menuOpen, reportOpen, reshareOpen]);

  // Autoplay pause check: paused if user holds screen, or if modal sheets are open
  const isInteracting = isPaused || menuOpen || reportOpen || reshareOpen || showEmojiSheet;

  // Progress Bar timer:
  // For text and images: 5 seconds fixed duration.
  // For video and audio: progress is updated dynamically via media onTimeUpdate.
  useEffect(() => {
    if (!currentStatus || isInteracting) return;

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
  }, [currentIndex, currentStatus, isInteracting, resolvedMediaType, handleNext]);

  // Synchronize pause state with video and audio elements
  useEffect(() => {
    if (resolvedMediaType === 'video' && videoRef.current) {
      if (isInteracting) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    } else if (resolvedMediaType === 'audio' && audioRef.current) {
      if (isInteracting) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [isInteracting, resolvedMediaType]);

  if (!currentStatus) return null;

  // Touch and pointer gestures: long press pauses, swipe navigates, edge tap skips
  function onPointerDown(e) {
    if (
      e.target.closest(
        'button, input, textarea, form, .status-viewer-footer, .status-viewer-header, .faith-reaction-picker-bubble, .status-viewer-sound-toggle-btn, .popup-sheet-dialog'
      )
    ) {
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
      setFeedbackMessage(`✓ Sent directly to ${cleanAuthorName}'s inbox!`);
      setSentFeedback(true);
      setCommentText('');
      setTimeout(() => setSentFeedback(false), 3500);
    } else {
      setReplyError(res?.error || 'Could not send reply to inbox.');
      setTimeout(() => setReplyError(''), 4000);
    }
  }

  // Handle Hiding Status
  function handleHideStatus() {
    hideStatus(currentStatus.id, currentStatus.userId, currentStatus.userName);
    setMenuOpen(false);
    setFeedbackMessage('✓ Status hidden. You can unhide it from Hidden Stories.');
    setSentFeedback(true);
    setTimeout(() => setSentFeedback(false), 3500);
    handleNext();
  }

  // Handle Unhiding Status
  function handleUnhideStatus() {
    unhideStatus(currentStatus.id, currentStatus.userId, currentStatus.userName);
    setMenuOpen(false);
    setFeedbackMessage('✓ Status unhidden and restored to your stories tray.');
    setSentFeedback(true);
    setTimeout(() => setSentFeedback(false), 3500);
  }

  // Handle Deleting Status before 24h timer expires (owner only)
  async function handleConfirmDeleteStatus() {
    if (!currentStatus?.id) return;
    setIsDeleting(true);
    try {
      await deleteStatus(currentStatus.id);
      setDeleteConfirmOpen(false);
      setFeedbackMessage('✓ Story deleted successfully.');
      setSentFeedback(true);
      setTimeout(() => setSentFeedback(false), 2500);

      // If user had more than 1 status, advance to next; otherwise exit viewer
      if (currentUserStatuses.length > 1) {
        handleNext();
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Failed to delete status:', err);
    } finally {
      setIsDeleting(false);
    }
  }

  // Handle Submitting Story Report
  async function handleReportSubmit(e) {
    if (e) e.preventDefault();
    await reportStatus({
      statusId: currentStatus.id,
      reason: reportReason,
      authorId: currentStatus.userId,
      notes: reportNotes,
      reporterId: currentUser?.id,
    });
    setReportSubmitted(true);
    setTimeout(() => {
      setReportOpen(false);
      setReportSubmitted(false);
      handleNext();
    }, 1800);
  }

  // Handle Resharing Story
  async function handleReshareSubmit() {
    setResharing(true);
    const res = await reshareStatusAsPost({
      status: currentStatus,
      currentUser,
      comment: reshareComment,
    });
    setResharing(false);
    if (res?.success) {
      setReshareOpen(false);
      setReshareComment('');
      setFeedbackMessage('✓ Story reshared to your community feed!');
      setSentFeedback(true);
      setTimeout(() => setSentFeedback(false), 3500);
    } else {
      setReplyError(res?.error || 'Could not reshare story');
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

        {/* Story Progress Indicators across the top (scoped to current user's stories) */}
        <div className="status-progress-bars">
          {currentUserStatuses.map((_, idx) => (
            <div key={idx} className="status-progress-track">
              <div
                className="status-progress-fill"
                style={{
                  width:
                    idx < currentUserIndex
                      ? '100%'
                      : idx === currentUserIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Top Navigation Bar: Author Info on Left, Action Cluster on Top-Right */}
        <div className="status-viewer-header">
          {/* Top-Left: Author profile info (takes available space and truncates so it never overlaps buttons) */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {currentStatus.userBadge && (
                  <MemberBadge badgeId={currentStatus.userBadge} size="sm" />
                )}
                {isStatusHiddenNow && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 999,
                      background: 'rgba(239, 68, 68, 0.25)',
                      border: '1px solid rgba(239, 68, 68, 0.45)',
                      color: '#fca5a5',
                    }}
                  >
                    Hidden
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Top-Right: Add Status icon, Menu icon, and Close 'X' icon (side-by-side or responsive vertical) */}
          <div className="status-viewer-actions-cluster">
            {onAddStatus && (
              <button
                type="button"
                className="status-viewer-close-btn status-viewer-add-status-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  onAddStatus();
                }}
                aria-label="Add status"
                title="Add 24-hour status"
              >
                <Plus size={19} strokeWidth={2.4} />
              </button>
            )}

            <button
              type="button"
              className="status-viewer-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(true);
              }}
              aria-label="Story options menu"
              title="Story options"
            >
              <MoreVertical size={18} />
            </button>

            <button
              type="button"
              className="status-viewer-close-btn"
              onClick={onClose}
              aria-label="Close status"
              title="Close status"
            >
              <X size={20} />
            </button>
          </div>
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
                <div className={`status-viewer-audio-disc ${!isInteracting ? 'is-spinning' : ''}`}>
                  <Music size={26} className="text-white" />
                </div>
                <div className="status-viewer-audio-wave-bars">
                  <span className={`bar ${!isInteracting ? 'animating' : ''}`} />
                  <span className={`bar ${!isInteracting ? 'animating' : ''}`} />
                  <span className={`bar ${!isInteracting ? 'animating' : ''}`} />
                  <span className={`bar ${!isInteracting ? 'animating' : ''}`} />
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
              {feedbackMessage || `✓ Sent directly to ${cleanAuthorName}'s inbox!`}
            </div>
          )}
          {replyError && (
            <div
              className="status-sent-banner"
              style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.45)', color: '#fecaca' }}
            >
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

      {/* =========================================
          PopupSheet 1: Story Options Menu Sheet
         ========================================= */}
      <PopupSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        size="sm"
        title="Story Options"
      >
        <div className="post-options-list">
          {currentStatus.allowStatusReshare && (
            <button
              type="button"
              className="post-options-item-card"
              onClick={() => {
                setMenuOpen(false);
                setReshareOpen(true);
              }}
            >
              <Repeat size={18} className="text-teal-400 flex-shrink-0" style={{ marginTop: 2 }} />
              <div>
                <strong style={{ display: 'block', fontSize: 14, color: 'var(--ink)' }}>Reshare Story</strong>
                <small style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Share this story as a post on your community feed</small>
              </div>
            </button>
          )}

          {/* Hide/Unhide and Report options: NEVER shown for the user's own status */}
          {!isMyStatus && (
            <>
              {isStatusHiddenNow ? (
                <button
                  type="button"
                  className="post-options-item-card"
                  onClick={handleUnhideStatus}
                >
                  <Eye size={18} className="text-teal-400 flex-shrink-0" style={{ marginTop: 2 }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: 14, color: 'var(--ink)' }}>Unhide status</strong>
                    <small style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Unhide this story and restore to your status tray</small>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  className="post-options-item-card"
                  onClick={handleHideStatus}
                >
                  <EyeOff size={18} className="text-amber-400 flex-shrink-0" style={{ marginTop: 2 }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: 14, color: 'var(--ink)' }}>Hide status</strong>
                    <small style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Hide this story from your main status tray</small>
                  </div>
                </button>
              )}

              <button
                type="button"
                className="post-options-item-card"
                onClick={() => {
                  setMenuOpen(false);
                  setReportOpen(true);
                }}
              >
                <Flag size={18} className="text-rose-400 flex-shrink-0" style={{ marginTop: 2 }} />
                <div>
                  <strong style={{ display: 'block', fontSize: 14, color: 'var(--rose, #f43f5e)' }}>Report Story</strong>
                  <small style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Confidential report to church moderation elders</small>
                </div>
              </button>
            </>
          )}

          {isMyStatus && (
            <button
              type="button"
              className="post-options-item-card"
              onClick={() => {
                setMenuOpen(false);
                setDeleteConfirmOpen(true);
              }}
            >
              <Trash2 size={18} className="text-rose-400 flex-shrink-0" style={{ marginTop: 2 }} />
              <div>
                <strong style={{ display: 'block', fontSize: 14, color: 'var(--rose, #f43f5e)' }}>Delete Story</strong>
                <small style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Remove this status story immediately before 24 hours</small>
              </div>
            </button>
          )}
        </div>
      </PopupSheet>

      {/* =========================================
          PopupSheet 2: Report Story Dialog
         ========================================= */}
      <PopupSheet
        open={reportOpen}
        onClose={() => {
          setReportOpen(false);
          setReportSubmitted(false);
        }}
        size="md"
        title={
          <div className="report-title-row">
            <span className="report-icon-box">
              <Flag size={18} className="report-flag-icon" />
            </span>
            <div className="report-header-text">
              <h3>Report Story</h3>
              <p>Keeping Shammah safe, edifying, and Christ-centered</p>
            </div>
          </div>
        }
        footer={
          !reportSubmitted ? (
            <div className="report-modal-actions" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
              <button
                type="button"
                className="report-cancel-btn"
                onClick={() => setReportOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="report-submit-btn"
                onClick={handleReportSubmit}
              >
                Submit Confidential Report
              </button>
            </div>
          ) : null
        }
      >
        {reportSubmitted ? (
          <div className="report-success-state">
            <div className="report-success-icon-wrap">
              <ShieldCheck size={44} className="report-success-icon" />
            </div>
            <h4>Report Received Confidentially</h4>
            <p>
              Thank you for caring for the flock. Our pastoral moderation team has received this report. This story has been removed from your view.
            </p>
            <button
              type="button"
              className="signin-btn report-done-btn"
              onClick={() => {
                setReportOpen(false);
                setReportSubmitted(false);
                handleNext();
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form className="report-form" onSubmit={handleReportSubmit}>
            <div className="report-modal-scroll-area" style={{ overflowY: 'visible', paddingRight: 0 }}>
              <div className="report-banner-note">
                <ShieldAlert size={15} className="text-amber-500 flex-shrink-0" />
                <span>Reports are confidential and reviewed by ordained church elders.</span>
              </div>

              <div className="report-reasons-list no-scrollbar">
                {REPORT_REASONS.map((r) => {
                  const isSelected = reportReason === r.id;
                  return (
                    <label
                      key={r.id}
                      className={`report-reason-item${isSelected ? ' active is-highlighted' : ''}`}
                      style={{
                        '--reason-color': r.color,
                        '--item-accent': r.color,
                      }}
                    >
                      <input
                        type="radio"
                        name="storyReportReason"
                        value={r.id}
                        checked={isSelected}
                        onChange={() => setReportReason(r.id)}
                        className="report-radio-input"
                      />
                      <div className="report-reason-text">
                        <strong>{r.label}</strong>
                        <small>{r.desc}</small>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="report-notes-wrap" style={{ marginTop: 12 }}>
                <label className="report-notes-label" htmlFor="status-report-notes">
                  Additional confidential details (optional)
                </label>
                <textarea
                  id="status-report-notes"
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Share any context that will help pastoral review..."
                  className="report-textarea"
                  maxLength={500}
                  rows={3}
                />
              </div>
            </div>
          </form>
        )}
      </PopupSheet>

      {/* =========================================
          PopupSheet 3: Reshare Story Dialog
         ========================================= */}
      <PopupSheet
        open={reshareOpen}
        onClose={() => setReshareOpen(false)}
        size="md"
        title={
          <div className="report-title-row">
            <span className="report-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Repeat size={18} />
            </span>
            <div className="report-header-text">
              <h3>Reshare Story</h3>
              <p>Post {cleanAuthorName}&apos;s story to your community feed</p>
            </div>
          </div>
        }
        footer={
          <div className="report-modal-actions" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
            <button
              type="button"
              className="report-cancel-btn"
              onClick={() => setReshareOpen(false)}
              disabled={resharing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="report-submit-btn"
              style={{ background: 'var(--gold)', color: '#000', borderColor: 'var(--gold)', fontWeight: 700 }}
              onClick={handleReshareSubmit}
              disabled={resharing}
            >
              {resharing ? 'Posting...' : 'Reshare to Feed'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface-sunken)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Avatar name={cleanAuthorName} src={currentStatus.userAvatar} size={28} />
              <div>
                <strong style={{ fontSize: 13, color: 'var(--ink)' }}>{cleanAuthorName}</strong>
                <span style={{ fontSize: 11, color: 'var(--ink-muted)', display: 'block' }}>Original Story</span>
              </div>
            </div>
            {currentStatus.text && (
              <p style={{ fontSize: 13.5, fontStyle: 'italic', color: 'var(--ink)', margin: '4px 0 0' }}>
                &ldquo;{currentStatus.text}&rdquo;
              </p>
            )}
            {currentStatus.mediaUrl && (
              <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', maxHeight: 160, position: 'relative' }}>
                {resolvedMediaType === 'image' && (
                  <img src={currentStatus.mediaUrl} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} />
                )}
                {resolvedMediaType === 'video' && (
                  <video src={currentStatus.mediaUrl} style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} muted />
                )}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }} htmlFor="reshare-comment-input">
              Add your thoughts or reflection (optional)
            </label>
            <textarea
              id="reshare-comment-input"
              value={reshareComment}
              onChange={(e) => setReshareComment(e.target.value)}
              placeholder="Amen! Such an encouraging testimony..."
              className="report-textarea"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13.5 }}
              maxLength={400}
              rows={3}
            />
          </div>
        </div>
      </PopupSheet>

      {/* =========================================
          PopupSheet 4: Delete Status Confirmation
         ========================================= */}
      <PopupSheet
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        size="sm"
        title="Delete Status Update?"
      >
        <div style={{ padding: '8px 4px 16px' }}>
          <p style={{ margin: '0 0 18px', fontSize: 13.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
            Are you sure you want to delete this status? It will be removed immediately from your stories tray and will no longer be visible to believers.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="report-cancel-btn"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              style={{
                background: 'var(--rose, #f43f5e)',
                color: '#ffffff',
                padding: '8px 18px',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 13,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              onClick={handleConfirmDeleteStatus}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>Delete Story</span>
                </>
              )}
            </button>
          </div>
        </div>
      </PopupSheet>
    </div>
  );
}
