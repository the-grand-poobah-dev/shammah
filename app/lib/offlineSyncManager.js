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

// Compatibility alias for components that import saveForOffline
export const saveForOffline = (item, type) => saveOfflineItem(item, type);

const OFFLINE_AUDIO_DB = 'shammah_offline_audio_v1';
const OFFLINE_AUDIO_STORE = 'audio';

function openOfflineAudioDb() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Offline storage is not supported by this browser.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_AUDIO_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_AUDIO_STORE)) db.createObjectStore(OFFLINE_AUDIO_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open offline audio storage.'));
  });
}

/** Download and persist the actual audio bytes in IndexedDB (not just a bookmark). */
export async function cacheOfflineAudio(itemId, mediaUrl) {
  if (!itemId || !mediaUrl) return { success: false, reason: 'Audio URL is missing.' };
  try {
    const response = await window.fetch(mediaUrl);
    if (!response.ok) throw new Error('Audio download failed. Check your connection and try again.');
    const declaredSize = Number(response.headers.get('content-length') || 0);
    if (declaredSize > 50 * 1024 * 1024) throw new Error('This audio file is larger than the 50 MB offline limit.');
    const blob = await response.blob();
    if (blob.size > 50 * 1024 * 1024) throw new Error('This audio file is larger than the 50 MB offline limit.');
    const db = await openOfflineAudioDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_AUDIO_STORE, 'readwrite');
      tx.objectStore(OFFLINE_AUDIO_STORE).put({ id: itemId, blob, type: blob.type || 'audio/mpeg', size: blob.size, cachedAt: Date.now() });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not save audio for offline playback.'));
      tx.onabort = () => reject(tx.error || new Error('Offline audio save was interrupted.'));
    });
    db.close();
    return { success: true, bytes: blob.size };
  } catch (error) {
    return { success: false, reason: error?.message || 'Could not download audio for offline playback.' };
  }
}

export async function getOfflineAudioBlob(itemId) {
  if (!itemId) return null;
  try {
    const db = await openOfflineAudioDb();
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_AUDIO_STORE, 'readonly');
      const request = tx.objectStore(OFFLINE_AUDIO_STORE).get(itemId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return record?.blob || null;
  } catch {
    return null;
  }
}

export async function removeOfflineAudio(itemId) {
  if (!itemId) return;
  try {
    const db = await openOfflineAudioDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_AUDIO_STORE, 'readwrite');
      tx.objectStore(OFFLINE_AUDIO_STORE).delete(itemId);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {}
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
    title: item.title || item.text_content?.slice(0, 40) || 'Saved Content',
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
  removeOfflineAudio(id);
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

// -------------------------------------------------------------
// Offline Church Feeds Management (specific church posts & info)
// -------------------------------------------------------------
const OFFLINE_CHURCH_FEEDS_KEY = 'shammah_offline_church_feeds_v2';

export function getOfflineChurchFeeds() {
  const feeds = safeGet(OFFLINE_CHURCH_FEEDS_KEY, []);
  const now = Date.now();
  const valid = feeds.filter((f) => {
    const expiresAt = f.expiresAt || (f.downloadedAt + THIRTY_DAYS_MS);
    return expiresAt > now;
  });
  if (valid.length !== feeds.length) {
    safeSet(OFFLINE_CHURCH_FEEDS_KEY, valid);
  }
  return valid;
}

export function saveOfflineChurchFeed(church, posts = []) {
  if (!church || !church.id) return { success: false, reason: 'Invalid church record' };

  const now = Date.now();
  const expiresAt = now + THIRTY_DAYS_MS;

  const feedEntry = {
    id: `church-feed-${church.id}`,
    churchId: church.id,
    type: 'church_feed',
    title: `${church.name || 'Church'} Feed`,
    churchName: church.name || 'Church',
    branch: church.branch || '',
    avatar_url: church.avatar_url || null,
    banner_url: church.banner_url || null,
    description: church.description || '',
    postsCount: posts.length,
    posts: posts.slice(0, 30), // cache up to 30 recent church posts
    downloadedAt: now,
    expiresAt,
  };

  const feeds = getOfflineChurchFeeds();
  const existingIdx = feeds.findIndex((f) => f.churchId === church.id);
  if (existingIdx >= 0) {
    feeds[existingIdx] = feedEntry;
  } else {
    feeds.unshift(feedEntry);
  }

  safeSet(OFFLINE_CHURCH_FEEDS_KEY, feeds);

  // Also register in general offline items list for unified visibility in the library
  saveOfflineItem({
    id: `church-feed-${church.id}`,
    title: `${church.name} Offline Feed (${posts.length} posts)`,
    text_content: church.description || `Cached offline feed for ${church.name}`,
    media_url: church.avatar_url || null,
    media_type: 'church_feed',
    category_id: 'church',
    profiles: { name: church.name, avatar_url: church.avatar_url },
    churchFeedData: feedEntry,
  }, 'church_feed');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('shammah:offline-updated', {
      detail: { id: church.id, type: 'church_feed', action: 'save' },
    }));
  }

  return { success: true, count: posts.length };
}

export function getOfflineChurchFeed(churchId) {
  if (!churchId) return null;
  const feeds = getOfflineChurchFeeds();
  return feeds.find((f) => f.churchId === churchId) || null;
}

export function removeOfflineChurchFeed(churchId) {
  if (!churchId) return;
  const feeds = safeGet(OFFLINE_CHURCH_FEEDS_KEY, []);
  const filtered = feeds.filter((f) => f.churchId !== churchId);
  safeSet(OFFLINE_CHURCH_FEEDS_KEY, filtered);
  removeOfflineItem(`church-feed-${churchId}`);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('shammah:offline-updated', {
      detail: { id: churchId, type: 'church_feed', action: 'remove' },
    }));
  }
}

export function isChurchFeedSavedOffline(churchId) {
  if (!churchId) return false;
  const feed = getOfflineChurchFeed(churchId);
  return Boolean(feed);
}

// -------------------------------------------------------------
// Offline Bible Chapters Management (scripture verses cached)
// -------------------------------------------------------------
const OFFLINE_BIBLE_CHAPTERS_KEY = 'shammah_offline_bible_chapters_v2';

export function getOfflineBibleChapters() {
  const chapters = safeGet(OFFLINE_BIBLE_CHAPTERS_KEY, []);
  const now = Date.now();
  const valid = chapters.filter((c) => {
    const expiresAt = c.expiresAt || (c.downloadedAt + THIRTY_DAYS_MS);
    return expiresAt > now;
  });
  if (valid.length !== chapters.length) {
    safeSet(OFFLINE_BIBLE_CHAPTERS_KEY, valid);
  }
  return valid;
}

export function saveOfflineBibleChapter(bookId, bookName, chapterNum, verses = [], translation = 'NIV') {
  if (!bookName || !chapterNum) return { success: false, reason: 'Invalid chapter reference' };

  const key = `${bookName}-${chapterNum}-${translation}`;
  const now = Date.now();
  const expiresAt = now + THIRTY_DAYS_MS;

  const chapterEntry = {
    id: `bible-${key}`,
    key,
    bookId,
    bookName,
    chapterNum,
    translation,
    type: 'bible_chapter',
    title: `${bookName} Chapter ${chapterNum} (${translation})`,
    versesCount: verses.length,
    verses,
    previewText: verses.slice(0, 3).map((v) => `${v.num}. ${v.text}`).join(' '),
    downloadedAt: now,
    expiresAt,
  };

  const chapters = getOfflineBibleChapters();
  const existingIdx = chapters.findIndex((c) => c.key === key);
  if (existingIdx >= 0) {
    chapters[existingIdx] = chapterEntry;
  } else {
    chapters.unshift(chapterEntry);
  }

  safeSet(OFFLINE_BIBLE_CHAPTERS_KEY, chapters);

  // Also register in general offline items list
  saveOfflineItem({
    id: `bible-${key}`,
    title: `${bookName} ${chapterNum} (${translation})`,
    text_content: chapterEntry.previewText,
    media_type: 'bible_chapter',
    category_id: 'bible',
    profiles: { name: `Holy Bible (${translation})` },
    bibleChapterData: chapterEntry,
  }, 'bible_chapter');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('shammah:offline-updated', {
      detail: { key, type: 'bible_chapter', action: 'save' },
    }));
  }

  return { success: true, versesCount: verses.length };
}

export function getOfflineBibleChapter(bookName, chapterNum, translation = 'NIV') {
  const key = `${bookName}-${chapterNum}-${translation}`;
  const chapters = getOfflineBibleChapters();
  return chapters.find((c) => c.key === key) || null;
}

export function removeOfflineBibleChapter(bookName, chapterNum, translation = 'NIV') {
  const key = `${bookName}-${chapterNum}-${translation}`;
  const chapters = safeGet(OFFLINE_BIBLE_CHAPTERS_KEY, []);
  const filtered = chapters.filter((c) => c.key !== key);
  safeSet(OFFLINE_BIBLE_CHAPTERS_KEY, filtered);
  removeOfflineItem(`bible-${key}`);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('shammah:offline-updated', {
      detail: { key, type: 'bible_chapter', action: 'remove' },
    }));
  }
}

export function isBibleChapterSavedOffline(bookName, chapterNum, translation = 'NIV') {
  const chapter = getOfflineBibleChapter(bookName, chapterNum, translation);
  return Boolean(chapter);
}
