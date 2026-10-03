'use client';
import { useState, useRef, useEffect } from 'react';
import {
  MoreHorizontal,
  Bookmark,
  BookmarkCheck,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Share2,
  Flag,
  UserX,
  Check,
  X,
  Sparkles,
  SlidersHorizontal,
  Copy,
} from 'lucide-react';
import {
  isPostSaved,
  toggleSavePost,
  hidePost,
  adjustCategoryWeight,
} from '../lib/feedAlgorithm';
import { isBlocked, toggleBlock } from '../lib/profileManager';
import { playSound } from '../lib/soundEffects';

export default function PostOptionsMenu({ post, authorId, authorName, onReportClick }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(() => (post?.id ? isPostSaved(post.id) : false));
  const [feedback, setFeedback] = useState('');
  const [confirmingBlock, setConfirmingBlock] = useState(false);

  useEffect(() => {
    if (post?.id) {
      setSaved(isPostSaved(post.id));
    }
  }, [post?.id]);

  // Handle ESC key to dismiss
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  function handleOpen() {
    playSound('options_open');
    setConfirmingBlock(false);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setConfirmingBlock(false);
  }

  function showToast(msg) {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback('');
      setOpen(false);
    }, 1400);
  }

  function handleToggleSave() {
    const next = toggleSavePost(post);
    setSaved(next);
    playSound('bookmark');
    showToast(next ? 'Saved to Faith Playlist ✓' : 'Removed from Saved');
  }

  function handleHidePost() {
    hidePost(post.id);
    playSound('offline_remove');
    showToast('Post hidden from your feed');
  }

  function handleMoreLikeThis() {
    if (post.category_id) {
      adjustCategoryWeight(post.category_id, 4);
    }
    playSound('reaction');
    showToast('Preferences updated: Showing more like this');
  }

  function handleLessLikeThis() {
    if (post.category_id) {
      adjustCategoryWeight(post.category_id, -4);
    }
    playSound('reaction');
    showToast('Preferences updated: Showing less like this');
  }

  function handleCopyLink() {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?post=${post.id}` : '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    playSound('share');
    showToast('Post link copied to clipboard ✓');
  }

  function handleBlockAuthor() {
    if (!authorId) return;
    if (!confirmingBlock) {
      setConfirmingBlock(true);
      return;
    }
    toggleBlock(authorId);
    hidePost(post.id);
    setConfirmingBlock(false);
    playSound('offline_remove');
    showToast(`Blocked @${authorName}`);
  }

  const categoryLabel = post.category_name || post.categories?.name || post.category_id;

  return (
    <div className="post-options-dropdown-wrap">
      {/* Post options trigger icon button */}
      <button
        type="button"
        className="post-options-menu-btn"
        onClick={handleOpen}
        aria-label="Post options"
        title="Post options & algorithm preferences"
      >
        <MoreHorizontal size={17} className="options-icon" />
      </button>

      {/* Beautiful Popup Window */}
      {open && (
        <div
          className="post-options-modal-backdrop"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="Post Options"
        >
          <div
            className="post-options-popup-window"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popup Header */}
            <div className="post-options-popup-header">
              <div className="post-options-popup-title-wrap">
                <SlidersHorizontal size={16} className="text-emerald-500" />
                <span className="post-options-popup-title">Post Options</span>
              </div>
              <button
                type="button"
                className="post-options-popup-close-btn"
                onClick={handleClose}
                aria-label="Close post options"
              >
                <X size={16} />
              </button>
            </div>

            {/* Author / Post context pill */}
            <div className="post-options-context-row">
              <span className="post-options-author-text">
                Post by <strong>@{authorName || 'member'}</strong>
              </span>
              {categoryLabel && (
                <span className="post-options-cat-pill">
                  {categoryLabel}
                </span>
              )}
            </div>

            {/* Feedback alert if active */}
            {feedback ? (
              <div className="post-options-feedback-banner">
                <Check size={16} className="text-emerald-400" />
                <span>{feedback}</span>
              </div>
            ) : (
              <div className="post-options-list">
                {/* Save to Faith Playlist */}
                <button
                  type="button"
                  className="post-options-item"
                  onClick={handleToggleSave}
                >
                  <span className={`post-options-item-icon ${saved ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                  </span>
                  <div className="post-options-item-text">
                    <span className="post-options-item-label">
                      {saved ? 'Saved in Faith Playlist' : 'Save to Faith Playlist'}
                    </span>
                    <span className="post-options-item-sub">
                      {saved ? 'Remove from your saved teachings & posts' : 'Bookmark for quiet time study'}
                    </span>
                  </div>
                </button>

                {/* Hide Post */}
                <button
                  type="button"
                  className="post-options-item"
                  onClick={handleHidePost}
                >
                  <span className="post-options-item-icon bg-slate-500/10 text-slate-400">
                    <EyeOff size={16} />
                  </span>
                  <div className="post-options-item-text">
                    <span className="post-options-item-label">Hide this post</span>
                    <span className="post-options-item-sub">Do not show this specific post in your feed</span>
                  </div>
                </button>

                {/* Show more like this */}
                <button
                  type="button"
                  className="post-options-item"
                  onClick={handleMoreLikeThis}
                >
                  <span className="post-options-item-icon bg-teal-500/10 text-teal-400">
                    <TrendingUp size={16} />
                  </span>
                  <div className="post-options-item-text">
                    <span className="post-options-item-label">Show more from this topic</span>
                    <span className="post-options-item-sub">Prioritize uplifting content in {categoryLabel || 'this category'}</span>
                  </div>
                </button>

                {/* Show less like this */}
                <button
                  type="button"
                  className="post-options-item"
                  onClick={handleLessLikeThis}
                >
                  <span className="post-options-item-icon bg-amber-500/10 text-amber-400">
                    <TrendingDown size={16} />
                  </span>
                  <div className="post-options-item-text">
                    <span className="post-options-item-label">Show less from this topic</span>
                    <span className="post-options-item-sub">Reduce frequency of {categoryLabel || 'this category'} posts</span>
                  </div>
                </button>

                {/* Copy post link */}
                <button
                  type="button"
                  className="post-options-item"
                  onClick={handleCopyLink}
                >
                  <span className="post-options-item-icon bg-blue-500/10 text-blue-400">
                    <Copy size={16} />
                  </span>
                  <div className="post-options-item-text">
                    <span className="post-options-item-label">Copy link to post</span>
                    <span className="post-options-item-sub">Share directly with fellow believers</span>
                  </div>
                </button>

                <div className="post-options-divider" />

                {/* Block Author (if available) */}
                {authorId && (
                  <button
                    type="button"
                    className={`post-options-item danger ${confirmingBlock ? 'confirming-danger' : ''}`}
                    onClick={handleBlockAuthor}
                  >
                    <span className="post-options-item-icon bg-rose-500/10 text-rose-400">
                      <UserX size={16} />
                    </span>
                    <div className="post-options-item-text">
                      <span className="post-options-item-label">
                        {confirmingBlock ? `Tap again to confirm blocking @${authorName}` : `Block @${authorName}`}
                      </span>
                      <span className="post-options-item-sub">Hide all posts & interactions from this author</span>
                    </div>
                  </button>
                )}

                {/* Report post */}
                <button
                  type="button"
                  className="post-options-item danger"
                  onClick={() => {
                    handleClose();
                    onReportClick(post);
                  }}
                >
                  <span className="post-options-item-icon bg-rose-500/10 text-rose-400">
                    <Flag size={16} />
                  </span>
                  <div className="post-options-item-text">
                    <span className="post-options-item-label">Report post</span>
                    <span className="post-options-item-sub">Notify church leaders & moderators</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
