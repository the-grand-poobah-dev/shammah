'use client';

const COMMENT_IDENTITY_STORAGE_KEY = 'shammah_comment_identity_v1';

/**
 * Saves metadata for a published comment (anonymity or pseudonym) locally.
 * Note: The backend comments table retains `author_id` for security, moderation, and
 * self-deletion permissions, while hiding the profile visually.
 */
export function saveCommentIdentity(commentId, meta = {}) {
  if (typeof window === 'undefined' || !commentId) return;
  try {
    const raw = localStorage.getItem(COMMENT_IDENTITY_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[commentId] = {
      is_anonymous: Boolean(meta.is_anonymous),
      is_pseudo: Boolean(meta.is_pseudo),
      pseudo_name: meta.pseudo_name || null,
      author_id: meta.author_id || null,
      saved_at: new Date().toISOString(),
    };
    localStorage.setItem(COMMENT_IDENTITY_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save comment identity meta', err);
  }
}

export function getCommentIdentity(commentId) {
  if (typeof window === 'undefined' || !commentId) return null;
  try {
    const raw = localStorage.getItem(COMMENT_IDENTITY_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[commentId] || null;
  } catch {
    return null;
  }
}

export function removeCommentIdentity(commentId) {
  if (typeof window === 'undefined' || !commentId) return;
  try {
    const raw = localStorage.getItem(COMMENT_IDENTITY_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    if (map[commentId]) {
      delete map[commentId];
      localStorage.setItem(COMMENT_IDENTITY_STORAGE_KEY, JSON.stringify(map));
    }
  } catch (err) {
    console.error('Failed to remove comment identity meta', err);
  }
}
