'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Heart,
  MessageCircle,
  Repeat,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Music,
  Send,
  AtSign,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';
import ReactionBar from './ReactionBar';
import CommentThread from './CommentThread';
import RepostModal from './RepostModal';
import { isPostReposted, getPostRepostCount, toggleRepost } from '../lib/postInteractions';

export default function ReelViewerModal({ reels = [], initialIndex = 0, currentUser, session, onClose, openAuth }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(24);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(5);
  const [commentCount, setCommentCount] = useState(7);
  const [shareToast, setShareToast] = useState('');

  const videoRef = useRef(null);
  const currentReel = reels[currentIndex] || reels[0];

  useEffect(() => {
    if (!currentReel) return;
    setLiked(false);
    setLikesCount(currentReel.likes_count || 32);
    setReposted(isPostReposted(currentReel.id, session?.user?.id));
    setRepostCount(getPostRepostCount(currentReel.id, currentReel.reposts_count || 6));
    setCommentCount(currentReel.comments_count || 8);
    setIsPlaying(true);
  }, [currentIndex, currentReel, session?.user?.id]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, reels.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  // Keyboard navigation (Arrow keys up/down, space for play/pause, escape to exit)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        handleNext();
      } else if (e.key === 'ArrowUp') {
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  if (!currentReel) return null;

  function togglePlayPause() {
    setIsPlaying((p) => !p);
  }

  function handleLikeToggle() {
    if (!session) {
      if (openAuth) openAuth('signin');
      return;
    }
    setLiked((prev) => {
      const next = !prev;
      setLikesCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
      return next;
    });
  }

  function handleRepost() {
    if (!session) {
      if (openAuth) openAuth('signin');
      return;
    }
    setShowRepostModal(true);
  }

  function handleConfirmRepost(quote) {
    const res = toggleRepost(currentReel.id, currentReel, currentUser, quote);
    setReposted(res.reposted);
    setRepostCount(res.count);
  }

  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentReel.text_content || 'Faith Reel on Shammah',
          url,
        });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareToast('Reel link copied!');
      setTimeout(() => setShareToast(''), 2000);
    } catch {}
  }

  const authorName = currentReel.profiles?.name || currentReel.profiles?.display_name || 'Fellowship Creator';

  return (
    <div className="reel-viewer-fullscreen" role="dialog" aria-modal="true" aria-label="Fullscreen Portrait Faith Reel">
      <div className="reel-viewer-container">
        {/* Video Element */}
        <div className="reel-video-wrapper" onClick={togglePlayPause}>
          <video
            ref={videoRef}
            src={currentReel.media_url}
            className="reel-portrait-video"
            loop
            playsInline
            muted={isMuted}
            autoPlay
          />

          {/* Central Play/Pause Flash Overlay */}
          {!isPlaying && (
            <div className="reel-play-paused-icon">
              <Play size={44} fill="#ffffff" />
            </div>
          )}

          {/* Gradient shadows for readability */}
          <div className="reel-top-gradient" />
          <div className="reel-bottom-gradient" />
        </div>

        {/* Top Header controls */}
        <div className="reel-header-bar">
          <div className="reel-badge-tag">
            <Sparkles size={14} className="reel-sparkle" />
            <span>Shorts &amp; Reels (&lt; 2 min)</span>
          </div>

          <div className="reel-top-actions">
            <button
              type="button"
              className="reel-icon-circle-btn"
              onClick={() => setIsMuted((m) => !m)}
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            <button
              type="button"
              className="reel-icon-circle-btn"
              onClick={onClose}
              aria-label="Close reel viewer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Right Vertical Action Rail */}
        <div className="reel-right-rail" onClick={(e) => e.stopPropagation()}>
          {/* Reaction / Love */}
          <button
            type="button"
            className={`reel-rail-btn${liked ? ' active' : ''}`}
            onClick={handleLikeToggle}
            aria-label="Like or amen"
          >
            <span className="reel-rail-icon-wrap">
              <Heart size={24} fill={liked ? '#ef4444' : 'none'} color={liked ? '#ef4444' : '#ffffff'} />
            </span>
            <span className="reel-rail-label">{likesCount}</span>
          </button>

          {/* Comments */}
          <button
            type="button"
            className="reel-rail-btn"
            onClick={() => setShowComments((v) => !v)}
            aria-label="View comments"
          >
            <span className="reel-rail-icon-wrap">
              <MessageCircle size={24} color="#ffffff" />
            </span>
            <span className="reel-rail-label">{commentCount}</span>
          </button>

          {/* Repost / Retweet */}
          <button
            type="button"
            className={`reel-rail-btn${reposted ? ' is-reposted' : ''}`}
            onClick={handleRepost}
            aria-label="Repost to community"
          >
            <span className="reel-rail-icon-wrap">
              <Repeat size={24} color={reposted ? '#b8842a' : '#ffffff'} />
            </span>
            <span className="reel-rail-label">{repostCount}</span>
          </button>

          {/* Share */}
          <button
            type="button"
            className="reel-rail-btn"
            onClick={handleShare}
            aria-label="Share reel"
          >
            <span className="reel-rail-icon-wrap">
              <Share2 size={24} color="#ffffff" />
            </span>
            <span className="reel-rail-label">Share</span>
          </button>
        </div>

        {/* Vertical Reel navigation buttons (Up / Down) */}
        <div className="reel-nav-arrows">
          {currentIndex > 0 && (
            <button
              type="button"
              className="reel-arrow-btn prev"
              onClick={handlePrev}
              title="Previous reel (Up arrow)"
              aria-label="Previous reel"
            >
              <ChevronUp size={22} />
            </button>
          )}

          {currentIndex < reels.length - 1 && (
            <button
              type="button"
              className="reel-arrow-btn next"
              onClick={handleNext}
              title="Next reel (Down arrow)"
              aria-label="Next reel"
            >
              <ChevronDown size={22} />
            </button>
          )}
        </div>

        {/* Bottom Author & Caption Metadata */}
        <div className="reel-bottom-info">
          <div className="reel-author-row">
            <Avatar
              name={authorName}
              src={currentReel.profiles?.avatar_url}
              className="avatar-sm reel-avatar"
            />
            <div className="reel-author-name-group">
              <span className="reel-author-name">{authorName}</span>
              {currentReel.profiles?.badge && (
                <MemberBadge badgeId={currentReel.profiles.badge} size="sm" />
              )}
              {currentReel.profiles?.badge_verified && (
                <VerifiedBadge badge={currentReel.profiles.badge} size={14} />
              )}
            </div>
          </div>

          {currentReel.text_content && (
            <p className="reel-caption-text">{currentReel.text_content}</p>
          )}

          <div className="reel-audio-track-tag">
            <Music size={13} className="reel-music-icon" />
            <span>Spiritual Fellowship Audio · Original Sound</span>
          </div>
        </div>

        {shareToast && <div className="reel-toast-banner">{shareToast}</div>}

        {/* Bottom Slide-Up Comments Drawer */}
        {showComments && (
          <div className="reel-comments-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="reel-comments-header">
              <h3>Fellowship Comments ({commentCount})</h3>
              <button
                type="button"
                className="reel-comments-close"
                onClick={() => setShowComments(false)}
                aria-label="Close comments"
              >
                <X size={18} />
              </button>
            </div>
            <div className="reel-comments-body">
              <CommentThread
                postId={currentReel.id}
                session={session}
                onRequireSignIn={() => openAuth('signin')}
                onCountChange={setCommentCount}
              />
            </div>
          </div>
        )}

        {/* Repost Confirmation Modal */}
        {showRepostModal && (
          <RepostModal
            post={currentReel}
            currentUser={currentUser}
            onClose={() => setShowRepostModal(false)}
            onConfirm={handleConfirmRepost}
          />
        )}
      </div>
    </div>
  );
}
