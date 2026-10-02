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
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    setSaved(isPostSaved(post.id));
  }, [post.id]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

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
    showToast(next ? 'Saved to Faith Playlist' : 'Removed from Saved');
  }

  function handleHidePost() {
    hidePost(post.id);
    playSound('reaction');
    showToast('Post hidden from your feed');
  }

  function handleMoreLikeThis() {
    if (post.category_id) {
      adjustCategoryWeight(post.category_id, 4);
    }
    playSound('reaction');
    showToast('Algorithm updated: Showing more like this');
  }

  function handleLessLikeThis() {
    if (post.category_id) {
      adjustCategoryWeight(post.category_id, -4);
    }
    playSound('reaction');
    showToast('Algorithm updated: Showing less like this');
  }

  function handleCopyLink() {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?post=${post.id}` : '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    playSound('reaction');
    showToast('Post link copied to clipboard');
  }

  const [confirmingBlock, setConfirmingBlock] = useState(false);

  function handleBlockAuthor() {
    if (!authorId) return;
    if (!confirmingBlock) {
      setConfirmingBlock(true);
      return;
    }
    toggleBlock(authorId);
    hidePost(post.id);
    setConfirmingBlock(false);
    showToast(`Blocked ${authorName}`);
  }

  return (
    <div className="post-options-dropdown-wrap" ref={menuRef}>
      <button
        type="button"
        className="post-options-menu-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Post actions"
        title="Post options & algorithm preferences"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div className="post-options-popover" role="menu">
          {feedback ? (
            <div className="post-options-feedback">
              <Check size={14} />
              <span>{feedback}</span>
            </div>
          ) : (
            <>
              <button type="button" className="post-opt-row" onClick={handleToggleSave}>
                {saved ? <BookmarkCheck size={15} className="opt-icon gold" /> : <Bookmark size={15} className="opt-icon" />}
                <span>{saved ? 'Saved in Faith Playlist' : 'Save to Faith Playlist'}</span>
              </button>

              <button type="button" className="post-opt-row" onClick={handleHidePost}>
                <EyeOff size={15} className="opt-icon" />
                <span>Hide this post</span>
              </button>

              <button type="button" className="post-opt-row" onClick={handleMoreLikeThis}>
                <TrendingUp size={15} className="opt-icon teal" />
                <span>Show more of this category</span>
              </button>

              <button type="button" className="post-opt-row" onClick={handleLessLikeThis}>
                <TrendingDown size={15} className="opt-icon" />
                <span>Show less of this category</span>
              </button>

              <button type="button" className="post-opt-row" onClick={handleCopyLink}>
                <Share2 size={15} className="opt-icon" />
                <span>Copy post link</span>
              </button>

              <div className="post-opt-divider" />

              {authorId && (
                <button type="button" className="post-opt-row danger" onClick={handleBlockAuthor}>
                  <UserX size={15} className="opt-icon" />
                  <span>{confirmingBlock ? `Tap again to confirm block @${authorName}` : `Block @${authorName}`}</span>
                </button>
              )}

              <button
                type="button"
                className="post-opt-row danger"
                onClick={() => {
                  setOpen(false);
                  onReportClick(post);
                }}
              >
                <Flag size={15} className="opt-icon" />
                <span>Report post…</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
