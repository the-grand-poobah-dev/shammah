'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Send, Sparkles, ArrowLeft, Plus } from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';
import { reactToStatus, commentOnStatus } from '../lib/statusManager';
import FaithReactionPicker from './FaithReactionPicker';

const QUICK_EMOJIS = ['🙏', '❤️', '🙌', '🔥', '✨', '👏'];

export default function StatusViewerModal({ statuses = [], initialIndex = 0, currentUser, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [commentText, setCommentText] = useState('');
  const [sentFeedback, setSentFeedback] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showEmojiSheet, setShowEmojiSheet] = useState(false);
  const [slideAnim, setSlideAnim] = useState(''); // 'slide-left' | 'slide-right' | ''

  const progressTimerRef = useRef(null);
  const pointerStartRef = useRef(null);
  const isLongPressRef = useRef(false);
  const longPressTimerRef = useRef(null);

  const currentStatus = statuses[currentIndex];

  useEffect(() => {
    setProgress(0);
    setSentFeedback(false);
    setCommentText('');
    setShowEmojiSheet(false);
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

  // Jump to NEXT USER's status on swipe left
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
      // Reached the end of all users' statuses
      onClose();
    }
  }, [currentStatus, currentIndex, statuses, onClose]);

  // Jump to PREVIOUS USER's status on swipe right
  const handlePrevUser = useCallback(() => {
    if (!currentStatus) return;
    // Find last status from a different user behind current
    let prevUserIdx = -1;
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (statuses[i].userId !== currentStatus.userId || statuses[i].userName !== currentStatus.userName) {
        prevUserIdx = i;
        break;
      }
    }
    if (prevUserIdx !== -1) {
      // Find the first status belonging to that previous user
      const targetUser = statuses[prevUserIdx];
      const firstIdxOfUser = statuses.findIndex(
        (s) => s.userId === targetUser.userId || s.userName === targetUser.userName
      );
      setSlideAnim('slide-from-left');
      setCurrentIndex(firstIdxOfUser !== -1 ? firstIdxOfUser : prevUserIdx);
      setTimeout(() => setSlideAnim(''), 300);
    } else {
      // Reached the start of the first user
      setCurrentIndex(0);
    }
  }, [currentStatus, currentIndex, statuses]);

  // Keyboard navigation & escape to go back
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

  // Continuous autoplay: status autoplays until all are viewed or user goes back
  useEffect(() => {
    if (!currentStatus || isPaused) return;

    const interval = 40; // ms
    const step = (interval / 5000) * 100; // 5 seconds per status story

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimerRef.current);
          if (currentIndex < statuses.length - 1) {
            setCurrentIndex((i) => i + 1);
          } else {
            onClose();
          }
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(progressTimerRef.current);
  }, [currentIndex, currentStatus, isPaused, statuses.length, onClose]);

  if (!currentStatus) return null;

  // Touch and pointer gestures: long press pauses, swiping navigates users, edge tap navigates stories
  function onPointerDown(e) {
    if (e.target.closest('button, input, form, .status-viewer-footer, .status-viewer-header, .faith-reaction-picker-bubble')) {
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
    }, 250);
  }

  function onPointerMove(e) {
    if (!pointerStartRef.current) return;
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    if (dx > 12 || dy > 12) {
      // User is dragging/swiping: pause autoplay
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

    // 1. Long pressing and swiping horizontally loads next/previous user's status!
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        // Swiped Left -> Load Next User's Status
        handleNextUser();
      } else {
        // Swiped Right -> Load Previous User's Status
        handlePrevUser();
      }
      return;
    }

    // 2. Vertical swipe down to close
    if (dy > 80 && Math.abs(dy) > Math.abs(dx)) {
      onClose();
      return;
    }

    // 3. Screen Edge Tapping (Right edge -> next story, Left edge -> previous story)
    if (duration < 350 && Math.abs(dx) < 15 && Math.abs(dy) < 15) {
      const rect = start.target.getBoundingClientRect();
      const clickRatio = (e.clientX - rect.left) / rect.width;
      if (clickRatio < 0.35) {
        handlePrev();
      } else if (clickRatio > 0.65) {
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

  function handleSendComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;

    commentOnStatus(currentStatus, commentText.trim(), {
      id: currentUser?.id,
      name: currentUser?.name || currentUser?.display_name || 'Member',
      avatar: currentUser?.avatar_url,
      badge: currentUser?.badge,
      verified: currentUser?.badge_verified,
    });

    setSentFeedback(true);
    setCommentText('');
    setTimeout(() => setSentFeedback(false), 3500);
  }

  const hoursAgo = Math.max(
    1,
    Math.round((Date.now() - new Date(currentStatus.createdAt).getTime()) / (1000 * 60 * 60))
  );

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

        {/* Story Top Navigation Bar */}
        <div className="status-viewer-header">
          <button
            type="button"
            className="status-viewer-back-btn"
            onClick={onClose}
            aria-label="Go back"
            title="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="status-viewer-author-info">
            <Avatar
              name={currentStatus.userName}
              src={currentStatus.userAvatar}
              hasStatus={true}
              className="avatar-sm status-author-avatar"
            />
            <div className="status-viewer-author-meta">
              <div className="status-author-name-row">
                {/* Names users input are the ones shown */}
                <span className="status-author-name">{currentStatus.userName}</span>
                {/* Titles are shown by the member badges */}
                {currentStatus.userBadge && (
                  <MemberBadge badgeId={currentStatus.userBadge} size="sm" />
                )}
                {currentStatus.userVerified && (
                  <VerifiedBadge
                    badge={currentStatus.userBadge}
                    role={currentStatus.userRole}
                    size={15}
                  />
                )}
              </div>
              <span className="status-viewer-time">{hoursAgo}h ago · 24h Status Story</span>
            </div>
          </div>

          <button
            type="button"
            className="status-viewer-close-btn"
            onClick={onClose}
            aria-label="Close status"
            title="Close"
          >
            <X size={22} />
          </button>
        </div>

        {/* Screen Edge Tap zones visual guide hints */}
        <div className="status-edge-tap-zone left" onClick={handlePrev} title="Tap left edge for previous story" />
        <div className="status-edge-tap-zone right" onClick={handleNext} title="Tap right edge for next story" />

        {/* Story Body: Fills the screen with scripture and text */}
        <div className="status-viewer-body">
          {currentStatus.scriptureTag && (
            <span className="status-scripture-tag">
              <Sparkles size={14} />
              <span>{currentStatus.scriptureTag}</span>
            </span>
          )}

          <p className="status-viewer-text">{currentStatus.text}</p>

          {currentStatus.mediaUrl && (
            <div className="status-viewer-media-wrap">
              <img src={currentStatus.mediaUrl} alt="" className="status-viewer-media" />
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
              ✓ Sent directly to {currentStatus.userName}&apos;s inbox!
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
              placeholder={`Reply to ${currentStatus.userName}'s inbox...`}
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
