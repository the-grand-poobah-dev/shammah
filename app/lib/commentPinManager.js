'use client';
import { playSound } from './soundEffects';

const PINNED_COMMENTS_KEY = 'shammah_pinned_comments_v1';
const AUTHOR_REACTIONS_KEY = 'shammah_author_comment_reactions_v1';

export function getPinnedCommentId(postId) {
  if (typeof window === 'undefined' || !postId) return null;
  try {
    const raw = localStorage.getItem(PINNED_COMMENTS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[postId] || null;
  } catch {
    return null;
  }
}

export function togglePinComment(postId, commentId) {
  if (typeof window === 'undefined' || !postId) return null;
  try {
    const raw = localStorage.getItem(PINNED_COMMENTS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    if (map[postId] === commentId) {
      delete map[postId];
      localStorage.setItem(PINNED_COMMENTS_KEY, JSON.stringify(map));
      window.dispatchEvent(new CustomEvent('shammah:comments-updated', { detail: { postId } }));
      return null;
    } else {
      map[postId] = commentId;
      localStorage.setItem(PINNED_COMMENTS_KEY, JSON.stringify(map));
      playSound('reaction');
      window.dispatchEvent(new CustomEvent('shammah:comments-updated', { detail: { postId } }));
      return commentId;
    }
  } catch {
    return null;
  }
}

export function getAuthorCommentReactions(postId) {
  if (typeof window === 'undefined' || !postId) return {};
  try {
    const raw = localStorage.getItem(AUTHOR_REACTIONS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[postId] || {};
  } catch {
    return {};
  }
}

export function setAuthorCommentReaction(postId, commentId, emoji) {
  if (typeof window === 'undefined' || !postId || !commentId) return;
  try {
    const raw = localStorage.getItem(AUTHOR_REACTIONS_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[postId] = all[postId] || {};

    if (all[postId][commentId] === emoji) {
      delete all[postId][commentId];
    } else {
      all[postId][commentId] = emoji;
      playSound('reaction');
    }

    localStorage.setItem(AUTHOR_REACTIONS_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('shammah:comments-updated', { detail: { postId } }));
  } catch (err) {
    console.error('Failed to set author comment reaction', err);
  }
}
