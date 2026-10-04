'use client';

const ACTIVITY_STORAGE_KEY = 'shammah:activity-log-v2';

/**
 * Get all activities sorted in reverse-chronological order (newest first)
 */
export function getActivityLog() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    console.error('Failed to read activity log:', err);
    return [];
  }
}

/**
 * Log a new user action
 * @param {Object} action
 * @param {string} action.type - 'post' | 'reaction' | 'comment' | 'poll_vote' | 'bookmark' | 'share'
 * @param {string} action.title - Action title
 * @param {string} [action.targetTitle] - Title of post/content acted upon
 * @param {string} [action.snippet] - Excerpt of text or note
 * @param {string} [action.authorName] - Name of content creator
 * @param {string} [action.visibility] - 'public' | 'church' | 'anonymous'
 * @param {Object} [action.meta] - Extra metadata
 */
export function logActivity(action) {
  if (typeof window === 'undefined') return;
  try {
    const current = getActivityLog();
    const newEntry = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: action.type || 'action',
      icon:
        action.icon ||
        (action.type === 'reaction'
          ? action.meta?.emoji || '❤️'
          : action.type === 'comment'
          ? '💬'
          : action.type === 'poll_vote'
          ? '📊'
          : '✍️'),
      title: action.title || 'User Action',
      targetTitle: action.targetTitle || '',
      snippet: action.snippet || '',
      authorName: action.authorName || '',
      visibility: action.visibility || 'public',
      meta: action.meta || {},
    };

    const updated = [newEntry, ...current].slice(0, 150); // Keep last 150
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent('shammah:activity-updated', { detail: newEntry }));
    return newEntry;
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

/**
 * Clear the activity log
 */
export function clearActivityLog() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify([]));
  window.dispatchEvent(new CustomEvent('shammah:activity-updated', { detail: { cleared: true } }));
}

/**
 * Delete a single activity item
 */
export function deleteActivityItem(id) {
  if (typeof window === 'undefined') return;
  const current = getActivityLog();
  const next = current.filter((item) => item.id !== id);
  localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('shammah:activity-updated', { detail: { deletedId: id } }));
}

/**
 * Get summary stats for transparency
 */
export function getActivityStats() {
  const log = getActivityLog();
  return {
    total: log.length,
    posts: log.filter((a) => a.type === 'post').length,
    reactions: log.filter((a) => a.type === 'reaction').length,
    comments: log.filter((a) => a.type === 'comment').length,
    pollVotes: log.filter((a) => a.type === 'poll_vote').length,
  };
}
