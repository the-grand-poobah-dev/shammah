'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreVertical,
  Volume2,
  VolumeX,
  Play,
  Plus,
  Check,
  Disc,
  Music,
  Camera,
  ChevronUp,
  ChevronDown,
  X,
  Sparkles,
  Link2,
  Flag,
  EyeOff,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';
import CommentThread from './CommentThread';
import ReelCreatorModal from './ReelCreatorModal';
import { listReels, toggleReelLike, recordReelView, toggleFollowAuthor, checkIsFollowing } from '../lib/data/reelsApi';
import { playSound } from '../lib/soundEffects';

export default function ReelsFeed({
  initialReels = [],
  initialIndex = 0,
  currentUser,
  session,
  isModal = false,
  onClose,
  openAuth,
}) {
  const [feedTab, setFeedTab] = useState('foryou'); // 'foryou' | 'following'
  const [reels, setReels] = useState(initialReels);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(initialReels.length === 0);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('shammah_reels_muted') === 'true';
    }
    return false;
  });
  const [showCreator, setShowCreator] = useState(false);
  const [activeCommentsReelId, setActiveCommentsReelId] = useState(null);
  const [activeMoreMenuReelId, setActiveMoreMenuReelId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [doubleTapHearts, setDoubleTapHearts] = useState([]); // [{ id, x, y }]

  const containerRef = useRef(null);
  const reelRefs = useRef({});
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });

  // Update localStorage when mute status toggles
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('shammah_reels_muted', String(next));
      }
      return next;
    });
  }, []);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  }, []);

  // Fetch reels from Supabase
  const loadFeed = useCallback(async (tab) => {
    setLoading(true);
    const { data } = await listReels({ feed: tab, limit: 20 });
    if (data && data.length > 0) {
      setReels(data);
    } else if (initialReels.length > 0 && tab === 'foryou') {
      setReels(initialReels);
    } else {
      setReels([]);
    }
    setLoading(false);
  }, [initialReels]);

  useEffect(() => {
    if (initialReels.length === 0) {
      loadFeed(feedTab);
    }
  }, [feedTab, initialReels.length, loadFeed]);

  // Keyboard navigation on desktop (Up, Down, Space, M, Esc)
  useEffect(() => {
    function handleKeyDown(e) {
      if (activeCommentsReelId) return; // Allow typing in comments

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollDelta(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollDelta(-1);
      } else if (e.key === 'Escape') {
        if (activeMoreMenuReelId) {
          setActiveMoreMenuReelId(null);
        } else if (activeCommentsReelId) {
          setActiveCommentsReelId(null);
        } else if (isModal && onClose) {
          onClose();
        }
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, reels.length, activeCommentsReelId, activeMoreMenuReelId, isModal, onClose, handleToggleMute]);

  // Pause playback when tab is hidden
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        Object.values(reelRefs.current).forEach((video) => {
          if (video && !video.paused) video.pause();
        });
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  function scrollDelta(delta) {
    const nextIdx = Math.max(0, Math.min(reels.length - 1, currentIndex + delta));
    if (nextIdx !== currentIndex) {
      scrollToIndex(nextIdx);
    }
  }

  function scrollToIndex(idx) {
    setCurrentIndex(idx);
    const container = containerRef.current;
    if (container) {
      const child = container.children[idx];
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  // Handle scroll snap events to update currentIndex
  function handleContainerScroll() {
    const container = containerRef.current;
    if (!container) return;
    const height = container.clientHeight;
    if (height <= 0) return;
    const index = Math.round(container.scrollTop / height);
    if (index !== currentIndex && index >= 0 && index < reels.length) {
      setCurrentIndex(index);
    }
  }

  return (
    <div className={`reels-hub-shell${isModal ? ' is-modal-mode' : ''}`}>
      {/* Top Header Overlay */}
      <header className="reels-top-nav">
        {isModal ? (
          <button
            type="button"
            className="reels-header-btn close"
            onClick={onClose}
            aria-label="Close reels viewer"
          >
            <X size={20} />
          </button>
        ) : (
          <div className="reels-brand-pill">
            <Sparkles size={14} className="text-amber-400" />
            <span>Reels</span>
          </div>
        )}

        <div className="reels-feed-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={feedTab === 'following'}
            className={`reels-tab-btn${feedTab === 'following' ? ' active' : ''}`}
            onClick={() => {
              setFeedTab('following');
              setCurrentIndex(0);
            }}
          >
            Following
          </button>
          <div className="reels-tab-divider" />
          <button
            type="button"
            role="tab"
            aria-selected={feedTab === 'foryou'}
            className={`reels-tab-btn${feedTab === 'foryou' ? ' active' : ''}`}
            onClick={() => {
              setFeedTab('foryou');
              setCurrentIndex(0);
            }}
          >
            For You
          </button>
        </div>

        <div className="reels-header-actions">
          <button
            type="button"
            className="reels-header-btn"
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Unmute reels audio' : 'Mute reels audio'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button
            type="button"
            className="reels-header-btn camera"
            onClick={() => {
              if (!session?.user?.id && openAuth) {
                openAuth('signin');
                return;
              }
              setShowCreator(true);
            }}
            aria-label="Create reel"
          >
            <Camera size={18} />
          </button>
        </div>
      </header>

      {/* Main Snap-Scroll Container */}
      <div
        ref={containerRef}
        className="reels-scroll-snap-feed no-scrollbar"
        onScroll={handleContainerScroll}
      >
        {loading ? (
          <div className="reels-loading-screen">
            <div className="reels-spinner" />
            <p>Loading faith reels...</p>
          </div>
        ) : reels.length === 0 ? (
          <div className="reels-empty-screen">
            <Sparkles size={48} className="text-purple-400 mb-3" />
            <h3>No reels yet in this feed</h3>
            <p>Be the first to share a vertical testimony or worship moment.</p>
            <button
              type="button"
              className="reels-create-cta-btn"
              onClick={() => setShowCreator(true)}
            >
              <Camera size={16} /> Post a Reel
            </button>
          </div>
        ) : (
          reels.map((reel, idx) => {
            const isMounted = Math.abs(idx - currentIndex) <= 2; // Keep max 3-5 around current
            const isCurrent = idx === currentIndex;

            return (
              <ReelItem
                key={reel.id}
                reel={reel}
                isActive={isCurrent}
                isMounted={isMounted}
                isMuted={isMuted}
                session={session}
                currentUser={currentUser}
                openAuth={openAuth}
                showToast={showToast}
                videoRef={(el) => {
                  if (el) reelRefs.current[reel.id] = el;
                  else delete reelRefs.current[reel.id];
                }}
                onOpenComments={() => setActiveCommentsReelId(reel.id)}
                onOpenMore={() => setActiveMoreMenuReelId(reel.id)}
                lastTapRef={lastTapRef}
                onDoubleTapHeart={(x, y) => {
                  const id = Math.random().toString(36).substring(2, 9);
                  setDoubleTapHearts((prev) => [...prev, { id, x, y }]);
                  setTimeout(() => {
                    setDoubleTapHearts((prev) => prev.filter((h) => h.id !== id));
                  }, 900);
                }}
              />
            );
          })
        )}
      </div>

      {/* Desktop Navigation Chevrons */}
      <div className="reels-desktop-controls">
        <button
          type="button"
          className="reels-desktop-chevron"
          disabled={currentIndex <= 0}
          onClick={() => scrollDelta(-1)}
          aria-label="Previous reel"
        >
          <ChevronUp size={22} />
        </button>
        <button
          type="button"
          className="reels-desktop-chevron"
          disabled={currentIndex >= reels.length - 1}
          onClick={() => scrollDelta(1)}
          aria-label="Next reel"
        >
          <ChevronDown size={22} />
        </button>
      </div>

      {/* Floating Double Tap Hearts */}
      {doubleTapHearts.map((heart) => (
        <div
          key={heart.id}
          className="reel-double-tap-heart"
          style={{ left: heart.x, top: heart.y }}
        >
          <Heart size={80} fill="#ef4444" color="#ef4444" />
        </div>
      ))}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="reels-toast-banner" role="status">
          {toastMessage}
        </div>
      )}

      {/* Comments Drawer (Bottom Sheet on mobile, docked panel on desktop) */}
      {activeCommentsReelId && (
        <div
          className="reels-comments-overlay"
          onClick={() => setActiveCommentsReelId(null)}
        >
          <div
            className="reels-comments-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="reels-comments-head">
              <h3>Comments</h3>
              <button
                type="button"
                className="reels-comments-close-btn"
                onClick={() => setActiveCommentsReelId(null)}
                aria-label="Close comments drawer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="reels-comments-body">
              <CommentThread
                postId={activeCommentsReelId}
                session={session}
                profile={currentUser}
                onRequireSignIn={() => openAuth && openAuth('signin')}
              />
            </div>
          </div>
        </div>
      )}

      {/* More Options Sheet */}
      {activeMoreMenuReelId && (
        <div
          className="reels-more-overlay"
          onClick={() => setActiveMoreMenuReelId(null)}
        >
          <div
            className="reels-more-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="reels-more-action-item"
              onClick={() => {
                const url = typeof window !== 'undefined' ? `${window.location.origin}/reels?id=${activeMoreMenuReelId}` : '';
                navigator.clipboard?.writeText(url);
                showToast('Reel link copied to clipboard!');
                setActiveMoreMenuReelId(null);
              }}
            >
              <Link2 size={18} /> Copy Link
            </button>
            <button
              type="button"
              className="reels-more-action-item"
              onClick={() => {
                showToast('Content preferences updated.');
                setActiveMoreMenuReelId(null);
              }}
            >
              <EyeOff size={18} /> Not Interested
            </button>
            <button
              type="button"
              className="reels-more-action-item danger"
              onClick={() => {
                showToast('Thank you. Reel reported for community review.');
                setActiveMoreMenuReelId(null);
              }}
            >
              <Flag size={18} /> Report Content
            </button>
            <button
              type="button"
              className="reels-more-cancel-btn"
              onClick={() => setActiveMoreMenuReelId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reel Creator Modal */}
      {showCreator && (
        <ReelCreatorModal
          isOpen={showCreator}
          onClose={() => setShowCreator(false)}
          session={session}
          profile={currentUser}
          onCreated={(newReel) => {
            setReels((prev) => [newReel, ...prev]);
            setCurrentIndex(0);
            showToast('Reel published to community feed!');
          }}
        />
      )}
    </div>
  );
}

/**
 * Single Full-Height Reel Item
 */
function ReelItem({
  reel,
  isActive,
  isMounted,
  isMuted,
  session,
  currentUser,
  openAuth,
  showToast,
  videoRef,
  onOpenComments,
  onOpenMore,
  lastTapRef,
  onDoubleTapHeart,
}) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reel.like_count || 18);
  const [commentCount, setCommentCount] = useState(reel.comment_count || 4);
  const [following, setFollowing] = useState(Boolean(reel.is_following));
  const [saved, setSaved] = useState(false);
  const [showPlayFlash, setShowPlayFlash] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  const localVideoRef = useRef(null);
  const hasViewCounted = useRef(false);

  // Synchronize external ref
  const setCombinedRef = useCallback(
    (el) => {
      localVideoRef.current = el;
      videoRef(el);
    },
    [videoRef]
  );

  // Autoplay/pause based on active state
  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;

    if (isActive) {
      setIsPlaying(true);
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Fallback if browser requires user interaction
          setIsPlaying(false);
        });
      }

      // Record view after 4 seconds of active viewing
      if (!hasViewCounted.current) {
        const timer = setTimeout(() => {
          hasViewCounted.current = true;
          recordReelView(reel.id);
        }, 4000);
        return () => clearTimeout(timer);
      }
    } else {
      setIsPlaying(false);
      video.pause();
    }
  }, [isActive, reel.id]);

  // Check following status for session
  useEffect(() => {
    if (session?.user?.id && reel.author_id && reel.author_id !== session.user.id) {
      checkIsFollowing(reel.author_id).then((isFol) => setFollowing(isFol));
    }
  }, [session?.user?.id, reel.author_id]);

  function handleVideoClick(e) {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const diff = now - lastTapRef.current.time;
    const dist = Math.hypot(x - lastTapRef.current.x, y - lastTapRef.current.y);

    if (diff < 300 && dist < 40) {
      // Double tap detected! Like and trigger heart burst
      handleLike();
      onDoubleTapHeart(e.clientX, e.clientY);
      lastTapRef.current = { time: 0, x: 0, y: 0 };
    } else {
      // Single tap -> toggle play/pause
      lastTapRef.current = { time: now, x, y };
      setTimeout(() => {
        if (Date.now() - lastTapRef.current.time >= 280 && lastTapRef.current.time !== 0) {
          togglePlayPause();
        }
      }, 300);
    }
  }

  function togglePlayPause() {
    const video = localVideoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    setShowPlayFlash(true);
    setTimeout(() => setShowPlayFlash(false), 500);
  }

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
    await toggleReelLike(reel.id);
  }

  async function handleFollow(e) {
    e.stopPropagation();
    if (!session?.user?.id) {
      if (openAuth) openAuth('signin');
      return;
    }
    const res = await toggleFollowAuthor(reel.author_id);
    setFollowing(res.following);
    playSound('reaction');
    showToast(res.following ? 'Following creator' : 'Unfollowed creator');
  }

  async function handleShare(e) {
    e.stopPropagation();
    const url = typeof window !== 'undefined' ? `${window.location.origin}/reels?id=${reel.id}` : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: reel.text_content || 'Faith Reel on Shammah',
          url,
        });
      } catch {}
      return;
    }
    navigator.clipboard?.writeText(url);
    showToast('Reel link copied!');
  }

  function handleSave(e) {
    e.stopPropagation();
    if (!session?.user?.id) {
      if (openAuth) openAuth('signin');
      return;
    }
    setSaved((s) => !s);
    playSound('reaction');
    showToast(!saved ? 'Saved to Bookmarks' : 'Removed from Bookmarks');
  }

  const authorName = reel.profiles?.display_name || 'Faith Member';
  const soundName = reel.sound_title || 'Original Sound · Shammah Community';

  return (
    <div className="reels-card-viewport">
      <div className="reels-card-frame" onClick={handleVideoClick}>
        {/* Background Blurred Video / Backdrop to prevent black borders */}
        {isMounted && (
          <video
            src={reel.media_url}
            className="reels-video-blurred-backdrop"
            muted
            loop
            playsInline
            aria-hidden="true"
          />
        )}

        {/* Foreground 9:16 Video */}
        {isMounted ? (
          <video
            ref={setCombinedRef}
            src={reel.media_url}
            className="reels-video-element"
            loop
            playsInline
            muted={isMuted}
            preload={isActive ? 'auto' : 'metadata'}
            onTimeUpdate={(e) => {
              const cur = e.currentTarget.currentTime;
              const dur = e.currentTarget.duration || 1;
              setProgressPercent(Math.min(100, (cur / dur) * 100));
            }}
          />
        ) : (
          <div className="reels-video-placeholder" />
        )}

        {/* Dark Vignettes for Readable Text */}
        <div className="reels-gradient-top" />
        <div className="reels-gradient-bottom" />

        {/* Play/Pause Center Flash */}
        {showPlayFlash && (
          <div className="reels-play-flash">
            {isPlaying ? <Play size={44} fill="#ffffff" /> : <Play size={44} />}
          </div>
        )}

        {/* Right Action Rail (TikTok/Snapchat Style) */}
        <div className="reels-action-rail" onClick={(e) => e.stopPropagation()}>
          {/* Creator Avatar with Follow (+) */}
          <div className="reels-avatar-anchor">
            <Avatar
              name={authorName}
              src={reel.profiles?.avatar_url}
              className="reels-rail-avatar"
            />
            {session?.user?.id !== reel.author_id && (
              <button
                type="button"
                className={`reels-follow-badge-btn${following ? ' is-following' : ''}`}
                onClick={handleFollow}
                aria-label={following ? 'Following creator' : 'Follow creator'}
              >
                {following ? <Check size={12} /> : <Plus size={12} />}
              </button>
            )}
          </div>

          {/* Like Button */}
          <button
            type="button"
            className={`reels-rail-btn${liked ? ' active' : ''}`}
            onClick={handleLike}
            aria-label="Like reel"
          >
            <div className="reels-rail-icon-circle">
              <Heart size={24} fill={liked ? '#ef4444' : 'none'} color={liked ? '#ef4444' : '#ffffff'} />
            </div>
            <span className="reels-rail-count">{likeCount}</span>
          </button>

          {/* Comments Button */}
          <button
            type="button"
            className="reels-rail-btn"
            onClick={onOpenComments}
            aria-label="View comments"
          >
            <div className="reels-rail-icon-circle">
              <MessageCircle size={24} color="#ffffff" />
            </div>
            <span className="reels-rail-count">{commentCount}</span>
          </button>

          {/* Save / Bookmark Button */}
          <button
            type="button"
            className={`reels-rail-btn${saved ? ' is-saved' : ''}`}
            onClick={handleSave}
            aria-label="Save reel to bookmarks"
          >
            <div className="reels-rail-icon-circle">
              <Bookmark size={24} fill={saved ? '#f59e0b' : 'none'} color={saved ? '#f59e0b' : '#ffffff'} />
            </div>
            <span className="reels-rail-count">Save</span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            className="reels-rail-btn"
            onClick={handleShare}
            aria-label="Share reel"
          >
            <div className="reels-rail-icon-circle">
              <Share2 size={24} color="#ffffff" />
            </div>
            <span className="reels-rail-count">Share</span>
          </button>

          {/* More Button */}
          <button
            type="button"
            className="reels-rail-btn"
            onClick={onOpenMore}
            aria-label="More options"
          >
            <div className="reels-rail-icon-circle">
              <MoreVertical size={22} color="#ffffff" />
            </div>
          </button>

          {/* Spinning Audio Disc */}
          <div className={`reels-spinning-disc${isPlaying ? ' spinning' : ''}`}>
            <Disc size={36} className="text-zinc-300" />
            <Music size={12} className="reels-disc-note" />
          </div>
        </div>

        {/* Bottom Left Info / Caption */}
        <div className="reels-info-block" onClick={(e) => e.stopPropagation()}>
          <div className="reels-creator-meta">
            <span className="reels-creator-name">{authorName}</span>
            {reel.profiles?.badge && (
              <MemberBadge badgeId={reel.profiles.badge} size="sm" />
            )}
            {reel.profiles?.badge_verified && (
              <VerifiedBadge badge={reel.profiles.badge} size={14} />
            )}
          </div>

          {reel.text_content && (
            <div className="reels-caption-wrap">
              <p className={`reels-caption-text${captionExpanded ? ' expanded' : ''}`}>
                {reel.text_content}
              </p>
              {reel.text_content.length > 75 && (
                <button
                  type="button"
                  className="reels-caption-more-btn"
                  onClick={() => setCaptionExpanded((e) => !e)}
                >
                  {captionExpanded ? 'Less' : 'More'}
                </button>
              )}
            </div>
          )}

          {/* Sound / Music Track row */}
          <div className="reels-sound-strip">
            <Music size={13} className="shrink-0" />
            <span className="reels-sound-marquee">{soundName}</span>
          </div>
        </div>

        {/* Thin Video Scrubber Progress Bar */}
        <div className="reels-bottom-progress-bar">
          <div
            className="reels-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
