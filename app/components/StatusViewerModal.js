'use client';
import { useEffect, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Send, Sparkles, Volume2, ArrowLeft } from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import { reactToStatus, commentOnStatus } from '../lib/statusManager';

const QUICK_EMOJIS = ['🙏', '❤️', '🙌', '🔥', '✨', '👏'];

export default function StatusViewerModal({ statuses = [], initialIndex = 0, currentUser, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [commentText, setCommentText] = useState('');
  const [sentFeedback, setSentFeedback] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const progressTimerRef = useRef(null);
  const [progress, setProgress] = useState(0);

  const currentStatus = statuses[currentIndex];

  useEffect(() => {
    setProgress(0);
    setSentFeedback(false);
    setCommentText('');
  }, [currentIndex]);

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
  }, [currentIndex, statuses.length]);

  // Auto-advance progress bar: status autoplays until all are viewed or user goes back
  useEffect(() => {
    if (!currentStatus || isPaused) return;

    const interval = 50; // ms
    const step = (interval / 5500) * 100;

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimerRef.current);
          if (currentIndex < statuses.length - 1) {
            // Autoplay next status story
            setCurrentIndex((i) => i + 1);
          } else {
            // All statuses viewed
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

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }

  function handleNext() {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onClose();
    }
  }

  function handleTapScreen(e) {
    // If clicking footer, buttons, or input, do not advance
    if (e.target.closest('button, input, form, .status-viewer-footer, .status-viewer-header')) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width * 0.35) {
      handlePrev();
    } else {
      handleNext();
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
      name: currentUser?.name || 'Member',
      avatar: currentUser?.avatar_url,
      badge: currentUser?.badge,
      verified: currentUser?.badge_verified,
    });

    setSentFeedback(true);
    setCommentText('');
    setTimeout(() => setSentFeedback(false), 3000);
  }

  const hoursAgo = Math.max(
    1,
    Math.round((Date.now() - new Date(currentStatus.createdAt).getTime()) / (1000 * 60 * 60))
  );

  return (
    <div
      className="status-viewer-fullscreen"
      onClick={handleTapScreen}
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      role="dialog"
      aria-modal="true"
      aria-label="24-Hour Fullscreen Status Story"
    >
      <div className={`status-viewer-stage status-bg-${currentStatus.bgStyle || 'emerald'}`}>
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
                <span className="status-author-name">{currentStatus.userName}</span>
                {currentStatus.userVerified && (
                  <VerifiedBadge
                    badge={currentStatus.userBadge}
                    role={currentStatus.userRole}
                    size={15}
                  />
                )}
              </div>
              <span className="status-viewer-time">{hoursAgo}h ago · 24h Status</span>
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

        {/* Story Body: Fills the screen with beautiful typography */}
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

        {/* Floating Emojis */}
        <div className="status-floating-emojis-container">
          {floatingEmojis.map((item) => (
            <span key={item.id} className="status-floating-emoji">
              {item.emoji}
            </span>
          ))}
        </div>

        {/* Tap zones visual hints */}
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
        <div className="status-viewer-footer">
          {sentFeedback && (
            <div className="status-sent-banner">
              ✓ Sent directly to {currentStatus.userName}&apos;s inbox!
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
          </div>

          {/* Comment input -> Delivered to Poster's Inbox */}
          <form className="status-comment-form" onSubmit={handleSendComment}>
            <input
              type="text"
              placeholder={`Reply to ${currentStatus.userName}'s inbox...`}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
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
