'use client';

const OFFLINE_STORAGE_KEY = 'shammah_offline_items_v2';
const OFFLINE_PERMISSIONS_KEY = 'shammah_offline_permissions_v1';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function safeGet(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Storage quota or access error:', err);
  }
}

/**
 * Checks if author permits offline downloads
 */
export function canDownloadOffline(authorId, item = {}) {
  // If individual post explicitly restricts download
  if (item.allow_offline === false || item.allow_download === false) {
    return false;
  }
  if (!authorId) return true;
  const permissions = safeGet(OFFLINE_PERMISSIONS_KEY, {});
  if (permissions[authorId] !== undefined) {
    return Boolean(permissions[authorId]);
  }
  return true; // Default is allowed
}

/**
 * Sets author's profile-level offline download permission
 */
export function setAuthorOfflineDownloadPermission(authorId, allowed) {
  if (!authorId) return;
  const permissions = safeGet(OFFLINE_PERMISSIONS_KEY, {});
  permissions[authorId] = Boolean(allowed);
  safeSet(OFFLINE_PERMISSIONS_KEY, permissions);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('shammah:offline-permission-changed', {
      detail: { authorId, allowed: Boolean(allowed) },
    }));
  }
}

/**
 * Gets author's profile-level offline download permission
 */
export function getAuthorOfflineDownloadPermission(authorId) {
  if (!authorId) return true;
  const permissions = safeGet(OFFLINE_PERMISSIONS_KEY, {});
  if (permissions[authorId] !== undefined) {
    return Boolean(permissions[authorId]);
  }
  return true;
}

/**
 * Clean up expired items older than 30 days
 */
export function purgeExpiredItems() {
  const items = safeGet(OFFLINE_STORAGE_KEY, []);
  const now = Date.now();
  const valid = items.filter((item) => {
    const expiresAt = item.expiresAt || (item.downloadedAt + THIRTY_DAYS_MS);
    return expiresAt > now;
  });
  if (valid.length !== items.length) {
    safeSet(OFFLINE_STORAGE_KEY, valid);
  }
  return valid;
}

/**
 * Retrieves all offline items (with auto-purge of expired)
 */
export function getOfflineItems() {
  return purgeExpiredItems();
}

/**
 * Saves an item (post, audio, video, course, poll, sermon) for up to 30 days
 */
export function saveOfflineItem(item, type = 'post') {
  if (!item || !item.id) return { success: false, reason: 'Invalid item' };

  // Check author permissions
  const authorId = item.user_id || item.profiles?.id || item.author_id;
  if (!canDownloadOffline(authorId, item)) {
    return {
      success: false,
      reason: 'Author has restricted offline downloads for this content in their profile settings.',
    };
  }

  const now = Date.now();
  const expiresAt = now + THIRTY_DAYS_MS;

  const offlineEntry = {
    id: item.id,
    type,
    title: item.title || item.text_content?.slice(0, 40) || 'Fellowship Content',
    text_content: item.text_content || '',
    media_url: item.media_url || null,
    media_type: item.media_type || type,
    category_id: item.category_id || 'general',
    profiles: item.profiles || {
      name: item.instructor || 'Shammah Member',
      avatar_url: item.avatar || null,
    },
    downloadedAt: now,
    expiresAt,
    itemData: item,
  };

  const items = purgeExpiredItems();
  const existingIndex = items.findIndex((i) => i.id === item.id);
  if (existingIndex >= 0) {
    items[existingIndex] = offlineEntry;
  } else {
    items.unshift(offlineEntry);
  }

  safeSet(OFFLINE_STORAGE_KEY, items);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('shammah:offline-updated', {
      detail: { id: item.id, action: 'save' },
    }));
  }

  return { success: true, daysRemaining: 30 };
}

/**
 * Removes an item from offline storage
 */
export function removeOfflineItem(id) {
  if (!id) return;
  const items = safeGet(OFFLINE_STORAGE_KEY, []);
  const filtered = items.filter((i) => i.id !== id);
  safeSet(OFFLINE_STORAGE_KEY, filtered);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('shammah:offline-updated', {
      detail: { id, action: 'remove' },
    }));
  }
}

/**
 * Checks if item is saved offline and still within 30-day window
 */
export function isItemSavedOffline(id) {
  if (!id) return false;
  const items = purgeExpiredItems();
  return items.some((i) => i.id === id);
}

/**
 * Calculates remaining days of offline access (up to 30 days)
 */
export function getRemainingDays(idOrItem) {
  const id = typeof idOrItem === 'string' ? idOrItem : idOrItem?.id;
  if (!id) return 0;
  const items = safeGet(OFFLINE_STORAGE_KEY, []);
  const item = items.find((i) => i.id === id);
  if (!item) return 0;

  const now = Date.now();
  const expiresAt = item.expiresAt || (item.downloadedAt + THIRTY_DAYS_MS);
  const diffMs = expiresAt - now;
  if (diffMs <= 0) return 0;

  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}
