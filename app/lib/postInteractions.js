'use client';

const REPOSTS_KEY = 'shammah_reposts_v2';
const VISIBILITY_KEY = 'shammah_post_visibility_v1';
const REACTIONS_KEY = 'shammah_post_reactions_v1';

export const VISIBILITY_OPTIONS = [
  { id: 'public', label: 'Public', icon: '🌍', desc: 'Anyone on Shammah can view' },
  { id: 'followers', label: 'Followers Only', icon: '👥', desc: 'Only your followers can view' },
  { id: 'church', label: 'My Church Only', icon: '⛪', desc: 'Members of your church can view' },
  { id: 'private', label: 'Only Me', icon: '🔒', desc: 'Only visible to you' },
];

export const FAITH_REACTIONS = [
  { id: 'love', emoji: '❤️', label: 'Love' },
  { id: 'pray', emoji: '🙏', label: 'Amen / Pray' },
  { id: 'fire', emoji: '🔥', label: 'Holy Fire' },
  { id: 'praise', emoji: '🙌', label: 'Praise' },
  { id: 'light', emoji: '💡', label: 'Insight' },
  { id: 'peace', emoji: '🕊️', label: 'Peace' },
  { id: 'joy', emoji: '👏', label: 'Joy' },
];

/* ==================== REPOSTS / RETWEET FUNCTIONALITY ==================== */

export function getStoredReposts() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REPOSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredReposts(reposts) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REPOSTS_KEY, JSON.stringify(reposts));
    window.dispatchEvent(new CustomEvent('shammah:reposts-updated'));
  } catch (err) {
    console.error('Failed to save reposts', err);
  }
}

export function isPostReposted(postId, userId = 'me') {
  const reposts = getStoredReposts();
  return reposts.some((r) => r.postId === postId && (r.userId === userId || r.userId === 'me'));
}

export function getPostRepostCount(postId, fallbackCount = 0) {
  const reposts = getStoredReposts();
  const count = reposts.filter((r) => r.postId === postId).length;
  return count > 0 ? count + (fallbackCount || 0) : fallbackCount || 0;
}

export function toggleRepost(postId, post, user, quoteText = null) {
  const reposts = getStoredReposts();
  const userId = user?.id || 'me';
  const existingIndex = reposts.findIndex((r) => r.postId === postId && r.userId === userId);

  if (existingIndex !== -1) {
    // Undo repost
    reposts.splice(existingIndex, 1);
    saveStoredReposts(reposts);
    return { reposted: false, count: getPostRepostCount(postId, post.reposts_count) };
  } else {
    // Add repost
    const newRepost = {
      id: `repost-${Date.now()}`,
      postId,
      post,
      userId,
      userName: user?.name || 'You',
      userAvatar: user?.avatar_url || null,
      quoteText: quoteText || null,
      createdAt: new Date().toISOString(),
    };
    reposts.unshift(newRepost);
    saveStoredReposts(reposts);
    return { reposted: true, count: getPostRepostCount(postId, post.reposts_count) };
  }
}

/* ==================== POST PRIVACY & VISIBILITY ==================== */

export function getStoredVisibilityMap() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(VISIBILITY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getPostVisibility(postId, defaultVisibility = 'public') {
  const map = getStoredVisibilityMap();
  return map[postId] || defaultVisibility;
}

export function setPostVisibility(postId, visibility) {
  if (typeof window === 'undefined') return;
  try {
    const map = getStoredVisibilityMap();
    map[postId] = visibility;
    localStorage.setItem(VISIBILITY_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('shammah:post-visibility-changed', { detail: { postId, visibility } }));
  } catch (err) {
    console.error('Failed to save post visibility', err);
  }
}

export function batchSetAllPostsVisibility(userId, visibility, allPostIds = []) {
  if (typeof window === 'undefined') return;
  try {
    const map = getStoredVisibilityMap();
    allPostIds.forEach((id) => {
      map[id] = visibility;
    });
    localStorage.setItem(VISIBILITY_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('shammah:batch-visibility-changed', { detail: { visibility } }));
  } catch (err) {
    console.error('Failed to batch update visibility', err);
  }
}

/* ==================== EMOJI REACTIONS ==================== */

export function getPostReactions(postId) {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(REACTIONS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[postId] || {};
  } catch {
    return {};
  }
}

export function togglePostReaction(postId, emoji, user) {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(REACTIONS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const postReactions = map[postId] || {};
    const userKey = user?.id || 'me';

    if (postReactions[userKey] === emoji) {
      // Toggle off
      delete postReactions[userKey];
    } else {
      // Toggle on or switch
      postReactions[userKey] = emoji;
    }

    map[postId] = postReactions;
    localStorage.setItem(REACTIONS_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('shammah:post-reacted', { detail: { postId, emoji, userKey } }));
    return postReactions;
  } catch (err) {
    console.error('Failed to save post reaction', err);
    return {};
  }
}
