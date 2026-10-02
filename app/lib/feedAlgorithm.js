'use client';
import { playSound } from './soundEffects';

const HIDDEN_POSTS_KEY = 'shammah_hidden_posts_v1';
const SAVED_POSTS_KEY = 'shammah_saved_posts_v1';
const CATEGORY_WEIGHTS_KEY = 'shammah_category_weights_v1';
const REPORTED_POSTS_KEY = 'shammah_reported_posts_v1';

export function getHiddenPostIds() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HIDDEN_POSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function hidePost(postId) {
  if (typeof window === 'undefined') return;
  const list = getHiddenPostIds();
  if (!list.includes(postId)) {
    const next = [...list, postId];
    localStorage.setItem(HIDDEN_POSTS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('shammah:feed-algorithm-updated'));
  }
}

export function getSavedPosts() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_POSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isPostSaved(postId) {
  const list = getSavedPosts();
  return list.some((p) => p.id === postId);
}

export function toggleSavePost(post) {
  if (typeof window === 'undefined') return false;
  const list = getSavedPosts();
  const exists = list.some((p) => p.id === post.id);
  let next;
  if (exists) {
    next = list.filter((p) => p.id !== post.id);
  } else {
    next = [
      {
        id: post.id,
        text_content: post.text_content,
        media_url: post.media_url,
        media_type: post.media_type,
        category_id: post.category_id,
        author_name: post.profiles?.display_name || post.profiles?.name || 'Fellowship Member',
        author_avatar: post.profiles?.avatar_url,
        saved_at: new Date().toISOString(),
      },
      ...list,
    ];
    playSound('reaction');
  }
  localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('shammah:saved-posts-updated'));
  return !exists;
}

export function getCategoryWeights() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CATEGORY_WEIGHTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function adjustCategoryWeight(categoryId, delta) {
  if (typeof window === 'undefined' || !categoryId) return;
  const weights = getCategoryWeights();
  const current = weights[categoryId] || 0;
  weights[categoryId] = current + delta;
  localStorage.setItem(CATEGORY_WEIGHTS_KEY, JSON.stringify(weights));
  window.dispatchEvent(new CustomEvent('shammah:feed-algorithm-updated'));
}

export function reportPost(postId, reason, authorId = null) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(REPORTED_POSTS_KEY);
    const reports = raw ? JSON.parse(raw) : [];
    reports.push({
      postId,
      authorId,
      reason,
      reportedAt: new Date().toISOString(),
    });
    localStorage.setItem(REPORTED_POSTS_KEY, JSON.stringify(reports));

    // Immediately hide the post
    hidePost(postId);
  } catch (err) {
    console.error('Failed to report post', err);
  }
}

/**
 * Applies algorithm scoring to posts:
 * - Filters out hidden posts and posts by blocked users
 * - Keeps pinned posts at top
 * - Ranks unpinned posts based on category weights, recency, and followed authors
 */
export function rankPostsWithAlgorithm(posts, { blockedUserIds = [], followedUserIds = [] }) {
  const hidden = new Set(getHiddenPostIds());
  const blocked = new Set(blockedUserIds);
  const weights = getCategoryWeights();

  // Filter out hidden or blocked
  const eligible = posts.filter((p) => {
    if (hidden.has(p.id)) return false;
    const authorId = p.author_id || p.user_id;
    if (authorId && blocked.has(authorId)) return false;
    return true;
  });

  const pinned = eligible.filter((p) => p.is_pinned);
  const unpinned = eligible.filter((p) => !p.is_pinned);

  // Compute recommendation score for unpinned
  const scored = unpinned.map((p) => {
    let score = 0;
    // Category affinity
    if (p.category_id && weights[p.category_id]) {
      score += weights[p.category_id] * 2;
    }
    // Followed author bonus
    const authorId = p.author_id || p.user_id;
    if (authorId && followedUserIds.includes(authorId)) {
      score += 15;
    }
    // Developer broadcast / announcement bonus
    if (p.is_developer_broadcast) {
      score += 25;
    }
    // Has media bonus
    if (p.media_url) {
      score += 5;
    }

    // Time decay: 1 point loss per 3 hours
    if (p.created_at) {
      const hoursAgo = (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60);
      score -= Math.min(20, hoursAgo / 3);
    }

    return { post: p, score };
  });

  // Sort by score descending while keeping relative order for ties
  scored.sort((a, b) => b.score - a.score);

  return [...pinned, ...scored.map((s) => s.post)];
}
