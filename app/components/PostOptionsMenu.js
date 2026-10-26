'use client';
import { useState, useEffect } from 'react';
import {
  MoreHorizontal,
  Bookmark,
  BookmarkCheck,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Flag,
  UserX,
  Check,
  SlidersHorizontal,
  Copy,
  Tv,
  Shield,
} from 'lucide-react';
import PopupSheet from './PopupSheet';
import {
  isPostSaved,
  toggleSavePost,
  hidePost,
  adjustCategoryWeight,
} from '../lib/feedAlgorithm';
import { toggleBlock } from '../lib/profileManager';
import { playSound } from '../lib/soundEffects';

export default function PostOptionsMenu({
  post,
  authorId,
  authorName,
  isAuthor = false,
  isProtectedIdentity = false,
  onOpenVisibility = null,
  onReportClick,
  onProjectClick,
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(() => (post?.id ? isPostSaved(post.id) : false));
  const [feedback, setFeedback] = useState('');
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [highlightedOptionId, setHighlightedOptionId] = useState(null);

  useEffect(() => {
    if (post?.id) {
      setSaved(isPostSaved(post.id));
    }
  }, [post?.id]);

  function handleOpen(e) {
    e.stopPropagation();
    playSound('options_open');
    setConfirmingBlock(false);
    setOpen(true);
  }

  function handleClose(e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
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

  async function handleConfirmBlockAuthor() {
    if (!authorId) return;
    await toggleBlock(authorId);
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

      {/* Main Post Options PopupSheet */}
      <PopupSheet
        open={open}
        onClose={handleClose}
        size="sm"
        title={
          <div className="post-options-popup-title-wrap">
            <SlidersHorizontal size={16} className="text-teal" />
            <span className="post-options-popup-title">Post Options</span>
          </div>
        }
      >
        {/* Author / Post context pill */}
        <div className="post-options-context-row" style={{ margin: '0 0 12px', borderRadius: 10 }}>
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
          <div className="post-options-list no-scrollbar" style={{ padding: 0, maxHeight: 'none' }}>
            {/* Post Privacy & Visibility (Strictly for Post Author / Owner) */}
            {isAuthor && onOpenVisibility && (
              <button
                type="button"
                className={`post-options-item-card${highlightedOptionId === 'visibility' ? ' is-highlighted' : ''}`}
                style={{ '--item-accent': '#14b8a6' }}
                onMouseEnter={() => setHighlightedOptionId('visibility')}
                onMouseLeave={() => setHighlightedOptionId(null)}
                onClick={() => {
                  onOpenVisibility();
                }}
              >
                <span className="post-options-card-icon-wrap">
                  <Shield size={17} />
                </span>
                <div className="post-options-card-text">
                  <span className="post-options-card-label">Post Privacy &amp; Visibility</span>
                  <span className="post-options-card-sub">Choose Public, Followers Only, My Church Only, or Only Me</span>
                </div>
                <span className="item-color-picker-box">
                  <span className="picker-box-swatch" style={{ background: '#14b8a6' }} />
                </span>
              </button>
            )}

            {/* Project to Screen */}
            {onProjectClick && (
              <button
                type="button"
                className={`post-options-item-card${highlightedOptionId === 'project' ? ' is-highlighted' : ''}`}
                style={{ '--item-accent': '#06b6d4' }}
                onMouseEnter={() => setHighlightedOptionId('project')}
                onMouseLeave={() => setHighlightedOptionId(null)}
                onClick={() => {
                  onProjectClick();
                }}
              >
                <span className="post-options-card-icon-wrap">
                  <Tv size={17} />
                </span>
                <div className="post-options-card-text">
                  <span className="post-options-card-label">Project to Screen</span>
                  <span className="post-options-card-sub">Present slides, scriptures &amp; QR code live on stage</span>
                </div>
                <span className="item-color-picker-box">
                  <span className="picker-box-swatch" style={{ background: '#06b6d4' }} />
                </span>
              </button>
            )}

            {/* Save to Faith Playlist - Amber Accent */}
            <button
              type="button"
              className={`post-options-item-card${highlightedOptionId === 'save' ? ' is-highlighted' : ''}`}
              style={{ '--item-accent': '#f59e0b' }}
              onMouseEnter={() => setHighlightedOptionId('save')}
              onMouseLeave={() => setHighlightedOptionId(null)}
              onClick={handleToggleSave}
            >
              <span className="post-options-card-icon-wrap">
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
              <span className="item-color-picker-box">
                <span className="picker-box-swatch" style={{ background: '#f59e0b' }} />
              </span>
            </button>

            {/* Show more like this - Emerald Accent */}
            <button
              type="button"
              className={`post-options-item-card${highlightedOptionId === 'more' ? ' is-highlighted' : ''}`}
              style={{ '--item-accent': '#0d9488' }}
              onMouseEnter={() => setHighlightedOptionId('more')}
              onMouseLeave={() => setHighlightedOptionId(null)}
              onClick={handleMoreLikeThis}
            >
              <span className="post-options-card-icon-wrap">
                <TrendingUp size={17} />
              </span>
              <div className="post-options-card-text">
                <span className="post-options-card-label">Show more from this topic</span>
                <span className="post-options-card-sub">Prioritize uplifting content in {categoryLabel || 'this topic'}</span>
              </div>
              <span className="item-color-picker-box">
                <span className="picker-box-swatch" style={{ background: '#0d9488' }} />
              </span>
            </button>

            {/* Show less like this - Orange Accent */}
            <button
              type="button"
              className={`post-options-item-card${highlightedOptionId === 'less' ? ' is-highlighted' : ''}`}
              style={{ '--item-accent': '#f97316' }}
              onMouseEnter={() => setHighlightedOptionId('less')}
              onMouseLeave={() => setHighlightedOptionId(null)}
              onClick={handleLessLikeThis}
            >
              <span className="post-options-card-icon-wrap">
                <TrendingDown size={17} />
              </span>
              <div className="post-options-card-text">
                <span className="post-options-card-label">Show less from this topic</span>
                <span className="post-options-card-sub">Tune your feed away from {categoryLabel || 'this topic'}</span>
              </div>
              <span className="item-color-picker-box">
                <span className="picker-box-swatch" style={{ background: '#f97316' }} />
              </span>
            </button>

            {/* Copy post link - Sky Blue Accent */}
            <button
              type="button"
              className={`post-options-item-card${highlightedOptionId === 'copy' ? ' is-highlighted' : ''}`}
              style={{ '--item-accent': '#0ea5e9' }}
              onMouseEnter={() => setHighlightedOptionId('copy')}
              onMouseLeave={() => setHighlightedOptionId(null)}
              onClick={handleCopyLink}
            >
              <span className="post-options-card-icon-wrap">
                <Copy size={17} />
              </span>
              <div className="post-options-card-text">
                <span className="post-options-card-label">Copy link to post</span>
                <span className="post-options-card-sub">Share directly with fellow believers</span>
              </div>
              <span className="item-color-picker-box">
                <span className="picker-box-swatch" style={{ background: '#0ea5e9' }} />
              </span>
            </button>

            {/* Hide Post - Slate Accent */}
            <button
              type="button"
              className={`post-options-item-card${highlightedOptionId === 'hide' ? ' is-highlighted' : ''}`}
              style={{ '--item-accent': '#64748b' }}
              onMouseEnter={() => setHighlightedOptionId('hide')}
              onMouseLeave={() => setHighlightedOptionId(null)}
              onClick={handleHidePost}
            >
              <span className="post-options-card-icon-wrap">
                <EyeOff size={17} />
              </span>
              <div className="post-options-card-text">
                <span className="post-options-card-label">Hide this post</span>
                <span className="post-options-card-sub">Do not show this specific post in your feed</span>
              </div>
              <span className="item-color-picker-box">
                <span className="picker-box-swatch" style={{ background: '#64748b' }} />
              </span>
            </button>

            {/* Block Author (if available and not own/anonymous post) - Rose Accent */}
            {authorId && !isAuthor && !isProtectedIdentity && (
              <button
                type="button"
                className={`post-options-item-card danger${highlightedOptionId === 'block' ? ' is-highlighted' : ''}`}
                style={{ '--item-accent': '#e11d48' }}
                onMouseEnter={() => setHighlightedOptionId('block')}
                onMouseLeave={() => setHighlightedOptionId(null)}
                onClick={() => setConfirmingBlock(true)}
              >
                <span className="post-options-card-icon-wrap">
                  <UserX size={17} />
                </span>
                <div className="post-options-card-text">
                  <span className="post-options-card-label">Block @{authorName}</span>
                  <span className="post-options-card-sub">Hide all posts &amp; interactions from this author</span>
                </div>
                <span className="item-color-picker-box">
                  <span className="picker-box-swatch" style={{ background: '#e11d48' }} />
                </span>
              </button>
            )}

            {/* Report post - Crimson Accent */}
            <button
              type="button"
              className={`post-options-item-card danger${highlightedOptionId === 'report' ? ' is-highlighted' : ''}`}
              style={{ '--item-accent': '#ef4444' }}
              onMouseEnter={() => setHighlightedOptionId('report')}
              onMouseLeave={() => setHighlightedOptionId(null)}
              onClick={() => {
                onReportClick?.(post);
              }}
            >
              <span className="post-options-card-icon-wrap">
                <Flag size={17} />
              </span>
              <div className="post-options-card-text">
                <span className="post-options-card-label">Report post</span>
                <span className="post-options-card-sub">Notify church leaders &amp; moderators</span>
              </div>
              <span className="item-color-picker-box">
                <span className="picker-box-swatch" style={{ background: '#ef4444' }} />
              </span>
            </button>
          </div>
        )}
      </PopupSheet>

      {/* Stacked Confirmation PopupSheet for Blocking Author */}
      <PopupSheet
        open={confirmingBlock}
        onClose={() => setConfirmingBlock(false)}
        size="sm"
        title={
          <div className="post-options-popup-title-wrap">
            <UserX size={17} style={{ color: '#e11d48' }} />
            <span className="post-options-popup-title">Confirm Block</span>
          </div>
        }
        footer={
          <div className="visibility-modal-actions">
            <button
              type="button"
              className="vis-cancel-btn"
              onClick={() => setConfirmingBlock(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="report-submit-btn"
              onClick={handleConfirmBlockAuthor}
            >
              Block @{authorName}
            </button>
          </div>
        }
      >
        <p className="visibility-desc" style={{ marginBottom: 0 }}>
          Are you sure you want to block <strong>@{authorName}</strong>? Their posts, comments, and interactions will be hidden from your feed.
        </p>
      </PopupSheet>
    </div>
  );
}
