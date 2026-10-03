'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
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
  Tv,
} from 'lucide-react';
import {
  isPostSaved,
  toggleSavePost,
  hidePost,
  adjustCategoryWeight,
} from '../lib/feedAlgorithm';
import { isBlocked, toggleBlock } from '../lib/profileManager';
import { playSound } from '../lib/soundEffects';

export default function PostOptionsMenu({
  post,
  authorId,
  authorName,
  onReportClick,
  onProjectClick,
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(() => (post?.id ? isPostSaved(post.id) : false));
  const [feedback, setFeedback] = useState('');
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [highlightedOptionId, setHighlightedOptionId] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  function handleOpen(e) {
    e.stopPropagation();
    playSound('options_open');
    setConfirmingBlock(false);
    setOpen(true);
  }

  function handleClose(e) {
    if (e) e.stopPropagation();
    setOpen(false);
    setConfirmingBlock(false);
  }

  function showToast(msg) {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback('');
      setOpen(false);
    }, 1300);
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

  const modalContent = mounted && typeof document !== 'undefined'
    ? createPortal(
        <AnimatePresence>
          {open && (
            <div
              key={`post-options-backdrop-${post?.id || 'item'}`}
              className="post-options-modal-backdrop"
              onClick={handleClose}
              role="dialog"
              aria-modal="true"
              aria-label="Post Options"
            >
              <motion.div
                className="post-options-popup-window"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.94, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 14 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Popup Header */}
                <div className="post-options-popup-header">
                  <div className="post-options-popup-title-wrap">
                    <SlidersHorizontal size={16} className="text-teal" />
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
                  <div className="post-options-list no-scrollbar">
                    {/* Project to Sanctuary Screen (Moved from post engagement bar) */}
                    {onProjectClick && (
                      <button
                        type="button"
                        className={`post-options-item-card${highlightedOptionId === 'project' ? ' is-highlighted' : ''}`}
                        style={{
                          '--item-accent': '#06b6d4',
                          borderColor: highlightedOptionId === 'project' ? '#06b6d4' : 'var(--border)',
                          background: highlightedOptionId === 'project' ? 'color-mix(in srgb, #06b6d4 12%, var(--surface))' : 'var(--surface)',
                          boxShadow: highlightedOptionId === 'project' ? '0 0 14px rgba(6, 182, 212, 0.35)' : 'none',
                        }}
                        onMouseEnter={() => setHighlightedOptionId('project')}
                        onMouseLeave={() => setHighlightedOptionId(null)}
                        onClick={() => {
                          handleClose();
                          onProjectClick();
                        }}
                      >
                        <span
                          className="post-options-card-icon-wrap"
                          style={{
                            '--item-accent': '#06b6d4',
                            color: '#06b6d4',
                            background: highlightedOptionId === 'project' ? 'rgba(6, 182, 212, 0.22)' : 'rgba(6, 182, 212, 0.12)',
                          }}
                        >
                          <Tv size={17} />
                        </span>
                        <div className="post-options-card-text">
                          <span className="post-options-card-label">Project to Sanctuary Screen</span>
                          <span className="post-options-card-sub">Present slides, scriptures &amp; QR code live on stage</span>
                        </div>
                        <span
                          className={`item-color-picker-box${highlightedOptionId === 'project' ? ' active-picker' : ''}`}
                          style={{
                            '--picker-color': '#06b6d4',
                            borderColor: highlightedOptionId === 'project' ? '#06b6d4' : 'var(--border)',
                          }}
                        >
                          <span className="picker-box-swatch" style={{ background: '#06b6d4' }} />
                        </span>
                      </button>
                    )}

                    {/* Save to Faith Playlist - Amber Accent */}
                    <button
                      type="button"
                      className={`post-options-item-card${highlightedOptionId === 'save' ? ' is-highlighted' : ''}`}
                      style={{
                        '--item-accent': '#f59e0b',
                        borderColor: highlightedOptionId === 'save' ? '#f59e0b' : 'var(--border)',
                        background: highlightedOptionId === 'save' ? 'color-mix(in srgb, #f59e0b 12%, var(--surface))' : 'var(--surface)',
                        boxShadow: highlightedOptionId === 'save' ? '0 0 14px rgba(245, 158, 11, 0.35)' : 'none',
                      }}
                      onMouseEnter={() => setHighlightedOptionId('save')}
                      onMouseLeave={() => setHighlightedOptionId(null)}
                      onClick={handleToggleSave}
                    >
                      <span
                        className="post-options-card-icon-wrap"
                        style={{
                          '--item-accent': '#f59e0b',
                          color: '#f59e0b',
                          background: highlightedOptionId === 'save' ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.12)',
                        }}
                      >
                        {saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
                      </span>
                      <div className="post-options-card-text">
                        <span className="post-options-card-label">
                          {saved ? 'Saved in Faith Playlist' : 'Save to Faith Playlist'}
                        </span>
                        <span className="post-options-card-sub">
                          {saved ? 'Remove from saved quiet time teachings' : 'Bookmark for personal reflection & study'}
                        </span>
                      </div>
                      <span
                        className={`item-color-picker-box${highlightedOptionId === 'save' ? ' active-picker' : ''}`}
                        style={{
                          '--picker-color': '#f59e0b',
                          borderColor: highlightedOptionId === 'save' ? '#f59e0b' : 'var(--border)',
                        }}
                      >
                        <span className="picker-box-swatch" style={{ background: '#f59e0b' }} />
                      </span>
                    </button>

                    {/* Show more like this - Emerald Accent */}
                    <button
                      type="button"
                      className={`post-options-item-card${highlightedOptionId === 'more' ? ' is-highlighted' : ''}`}
                      style={{
                        '--item-accent': '#0d9488',
                        borderColor: highlightedOptionId === 'more' ? '#0d9488' : 'var(--border)',
                        background: highlightedOptionId === 'more' ? 'color-mix(in srgb, #0d9488 12%, var(--surface))' : 'var(--surface)',
                        boxShadow: highlightedOptionId === 'more' ? '0 0 14px rgba(13, 148, 136, 0.35)' : 'none',
                      }}
                      onMouseEnter={() => setHighlightedOptionId('more')}
                      onMouseLeave={() => setHighlightedOptionId(null)}
                      onClick={handleMoreLikeThis}
                    >
                      <span
                        className="post-options-card-icon-wrap"
                        style={{
                          '--item-accent': '#0d9488',
                          color: '#0d9488',
                          background: highlightedOptionId === 'more' ? 'rgba(13, 148, 136, 0.22)' : 'rgba(13, 148, 136, 0.12)',
                        }}
                      >
                        <TrendingUp size={17} />
                      </span>
                      <div className="post-options-card-text">
                        <span className="post-options-card-label">Show more from this topic</span>
                        <span className="post-options-card-sub">Prioritize uplifting content in {categoryLabel || 'this topic'}</span>
                      </div>
                      <span
                        className={`item-color-picker-box${highlightedOptionId === 'more' ? ' active-picker' : ''}`}
                        style={{
                          '--picker-color': '#0d9488',
                          borderColor: highlightedOptionId === 'more' ? '#0d9488' : 'var(--border)',
                        }}
                      >
                        <span className="picker-box-swatch" style={{ background: '#0d9488' }} />
                      </span>
                    </button>

                    {/* Show less like this - Orange Accent */}
                    <button
                      type="button"
                      className={`post-options-item-card${highlightedOptionId === 'less' ? ' is-highlighted' : ''}`}
                      style={{
                        '--item-accent': '#f97316',
                        borderColor: highlightedOptionId === 'less' ? '#f97316' : 'var(--border)',
                        background: highlightedOptionId === 'less' ? 'color-mix(in srgb, #f97316 12%, var(--surface))' : 'var(--surface)',
                        boxShadow: highlightedOptionId === 'less' ? '0 0 14px rgba(249, 115, 22, 0.35)' : 'none',
                      }}
                      onMouseEnter={() => setHighlightedOptionId('less')}
                      onMouseLeave={() => setHighlightedOptionId(null)}
                      onClick={handleLessLikeThis}
                    >
                      <span
                        className="post-options-card-icon-wrap"
                        style={{
                          '--item-accent': '#f97316',
                          color: '#f97316',
                          background: highlightedOptionId === 'less' ? 'rgba(249, 115, 22, 0.22)' : 'rgba(249, 115, 22, 0.12)',
                        }}
                      >
                        <TrendingDown size={17} />
                      </span>
                      <div className="post-options-card-text">
                        <span className="post-options-card-label">Show less from this topic</span>
                        <span className="post-options-card-sub">Tune your feed away from {categoryLabel || 'this topic'}</span>
                      </div>
                      <span
                        className={`item-color-picker-box${highlightedOptionId === 'less' ? ' active-picker' : ''}`}
                        style={{
                          '--picker-color': '#f97316',
                          borderColor: highlightedOptionId === 'less' ? '#f97316' : 'var(--border)',
                        }}
                      >
                        <span className="picker-box-swatch" style={{ background: '#f97316' }} />
                      </span>
                    </button>

                    {/* Copy post link - Sky Blue Accent */}
                    <button
                      type="button"
                      className={`post-options-item-card${highlightedOptionId === 'copy' ? ' is-highlighted' : ''}`}
                      style={{
                        '--item-accent': '#0ea5e9',
                        borderColor: highlightedOptionId === 'copy' ? '#0ea5e9' : 'var(--border)',
                        background: highlightedOptionId === 'copy' ? 'color-mix(in srgb, #0ea5e9 12%, var(--surface))' : 'var(--surface)',
                        boxShadow: highlightedOptionId === 'copy' ? '0 0 14px rgba(14, 165, 233, 0.35)' : 'none',
                      }}
                      onMouseEnter={() => setHighlightedOptionId('copy')}
                      onMouseLeave={() => setHighlightedOptionId(null)}
                      onClick={handleCopyLink}
                    >
                      <span
                        className="post-options-card-icon-wrap"
                        style={{
                          '--item-accent': '#0ea5e9',
                          color: '#0ea5e9',
                          background: highlightedOptionId === 'copy' ? 'rgba(14, 165, 233, 0.22)' : 'rgba(14, 165, 233, 0.12)',
                        }}
                      >
                        <Copy size={17} />
                      </span>
                      <div className="post-options-card-text">
                        <span className="post-options-card-label">Copy link to post</span>
                        <span className="post-options-card-sub">Share directly with fellow believers</span>
                      </div>
                      <span
                        className={`item-color-picker-box${highlightedOptionId === 'copy' ? ' active-picker' : ''}`}
                        style={{
                          '--picker-color': '#0ea5e9',
                          borderColor: highlightedOptionId === 'copy' ? '#0ea5e9' : 'var(--border)',
                        }}
                      >
                        <span className="picker-box-swatch" style={{ background: '#0ea5e9' }} />
                      </span>
                    </button>

                    {/* Hide Post - Slate Accent */}
                    <button
                      type="button"
                      className={`post-options-item-card${highlightedOptionId === 'hide' ? ' is-highlighted' : ''}`}
                      style={{
                        '--item-accent': '#64748b',
                        borderColor: highlightedOptionId === 'hide' ? '#64748b' : 'var(--border)',
                        background: highlightedOptionId === 'hide' ? 'color-mix(in srgb, #64748b 12%, var(--surface))' : 'var(--surface)',
                        boxShadow: highlightedOptionId === 'hide' ? '0 0 14px rgba(100, 116, 139, 0.35)' : 'none',
                      }}
                      onMouseEnter={() => setHighlightedOptionId('hide')}
                      onMouseLeave={() => setHighlightedOptionId(null)}
                      onClick={handleHidePost}
                    >
                      <span
                        className="post-options-card-icon-wrap"
                        style={{
                          '--item-accent': '#64748b',
                          color: '#64748b',
                          background: highlightedOptionId === 'hide' ? 'rgba(100, 116, 139, 0.22)' : 'rgba(100, 116, 139, 0.12)',
                        }}
                      >
                        <EyeOff size={17} />
                      </span>
                      <div className="post-options-card-text">
                        <span className="post-options-card-label">Hide this post</span>
                        <span className="post-options-card-sub">Do not show this specific post in your feed</span>
                      </div>
                      <span
                        className={`item-color-picker-box${highlightedOptionId === 'hide' ? ' active-picker' : ''}`}
                        style={{
                          '--picker-color': '#64748b',
                          borderColor: highlightedOptionId === 'hide' ? '#64748b' : 'var(--border)',
                        }}
                      >
                        <span className="picker-box-swatch" style={{ background: '#64748b' }} />
                      </span>
                    </button>

                    {/* Block Author (if available) - Rose Accent */}
                    {authorId && (
                      <button
                        type="button"
                        className={`post-options-item-card danger${confirmingBlock ? ' is-confirming' : ''}${highlightedOptionId === 'block' ? ' is-highlighted' : ''}`}
                        style={{
                          '--item-accent': '#e11d48',
                          borderColor: highlightedOptionId === 'block' || confirmingBlock ? '#e11d48' : 'var(--border)',
                          background: highlightedOptionId === 'block' || confirmingBlock ? 'rgba(225, 29, 72, 0.15)' : 'var(--surface)',
                          boxShadow: highlightedOptionId === 'block' ? '0 0 14px rgba(225, 29, 72, 0.35)' : 'none',
                        }}
                        onMouseEnter={() => setHighlightedOptionId('block')}
                        onMouseLeave={() => setHighlightedOptionId(null)}
                        onClick={handleBlockAuthor}
                      >
                        <span
                          className="post-options-card-icon-wrap"
                          style={{
                            '--item-accent': '#e11d48',
                            color: '#e11d48',
                            background: highlightedOptionId === 'block' || confirmingBlock ? 'rgba(225, 29, 72, 0.25)' : 'rgba(225, 29, 72, 0.12)',
                          }}
                        >
                          <UserX size={17} />
                        </span>
                        <div className="post-options-card-text">
                          <span className="post-options-card-label">
                            {confirmingBlock ? `Tap again to confirm blocking @${authorName}` : `Block @${authorName}`}
                          </span>
                          <span className="post-options-card-sub">Hide all posts &amp; interactions from this author</span>
                        </div>
                        <span
                          className={`item-color-picker-box${highlightedOptionId === 'block' ? ' active-picker' : ''}`}
                          style={{
                            '--picker-color': '#e11d48',
                            borderColor: highlightedOptionId === 'block' || confirmingBlock ? '#e11d48' : 'var(--border)',
                          }}
                        >
                          <span className="picker-box-swatch" style={{ background: '#e11d48' }} />
                        </span>
                      </button>
                    )}

                    {/* Report post - Crimson Accent */}
                    <button
                      type="button"
                      className={`post-options-item-card danger${highlightedOptionId === 'report' ? ' is-highlighted' : ''}`}
                      style={{
                        '--item-accent': '#ef4444',
                        borderColor: highlightedOptionId === 'report' ? '#ef4444' : 'var(--border)',
                        background: highlightedOptionId === 'report' ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface)',
                        boxShadow: highlightedOptionId === 'report' ? '0 0 14px rgba(239, 68, 68, 0.35)' : 'none',
                      }}
                      onMouseEnter={() => setHighlightedOptionId('report')}
                      onMouseLeave={() => setHighlightedOptionId(null)}
                      onClick={() => {
                        handleClose();
                        onReportClick(post);
                      }}
                    >
                      <span
                        className="post-options-card-icon-wrap"
                        style={{
                          '--item-accent': '#ef4444',
                          color: '#ef4444',
                          background: highlightedOptionId === 'report' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.12)',
                        }}
                      >
                        <Flag size={17} />
                      </span>
                      <div className="post-options-card-text">
                        <span className="post-options-card-label">Report post</span>
                        <span className="post-options-card-sub">Notify church leaders &amp; moderators</span>
                      </div>
                      <span
                        className={`item-color-picker-box${highlightedOptionId === 'report' ? ' active-picker' : ''}`}
                        style={{
                          '--picker-color': '#ef4444',
                          borderColor: highlightedOptionId === 'report' ? '#ef4444' : 'var(--border)',
                        }}
                      >
                        <span className="picker-box-swatch" style={{ background: '#ef4444' }} />
                      </span>
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )
    : null;

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

      {/* Render modal directly in document.body via Portal to prevent any ancestor transform glitch */}
      {modalContent}
    </div>
  );
}
