'use client';
/**
 * Content Badge Manager
 *
 * Tracks unread / new content count for tabs and sections:
 * - Home (new incoming feed posts)
 * - Alerts (notifications)
 * - Messages (inbox)
 * - Polls (active unvoted community polls)
 * - Podcasts / Audio (new sermons & worship tracks)
 * - Courses (new discipleship modules)
 * - Fundraisers (urgent community projects)
 * - Challenges (active faith challenges)
 * - Games (daily arcade trivia & challenges)
 */

const STORAGE_KEY = 'shammah_content_badges_v1';

const DEFAULT_BADGES = {
  home: 0,
  alerts: 2,
  messages: 1,
  polls: 3,
  podcasts: 4,
  courses: 2,
  fundraisers: 2,
  challenges: 3,
  games: 1,
};

let memoryBadges = { ...DEFAULT_BADGES };
let seenOnFeed = new Set();
let listeners = new Set();

function loadStoredBadges() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryBadges = { ...DEFAULT_BADGES, ...parsed };
    }
  } catch {
    // Keep defaults
  }
}

function saveBadges() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryBadges));
  } catch {
    // ignore
  }
}

function notify() {
  saveBadges();
  listeners.forEach((fn) => {
    try {
      fn({ ...memoryBadges });
    } catch {
      // ignore
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('shammah:content-badges-updated', { detail: { ...memoryBadges } })
    );
  }
}

if (typeof window !== 'undefined') {
  loadStoredBadges();
}

export function getContentBadge(key) {
  return Number(memoryBadges[key]) || 0;
}

export function getAllContentBadges() {
  return { ...memoryBadges };
}

export function setContentBadge(key, count) {
  memoryBadges[key] = Math.max(0, Number(count) || 0);
  notify();
}

export function incrementContentBadge(key, by = 1) {
  memoryBadges[key] = Math.max(0, (memoryBadges[key] || 0) + by);
  notify();
}

export function markSectionSeenOnFeed(key) {
  if (seenOnFeed.has(key)) return;
  seenOnFeed.add(key);

  if (memoryBadges[key] > 0) {
    memoryBadges[key] = 0;
    notify();
  }
}

export function isSectionSeenOnFeed(key) {
  return seenOnFeed.has(key);
}

export function resetFeedSeenStatus() {
  seenOnFeed.clear();
}

export function subscribeToBadges(callback) {
  listeners.add(callback);
  callback({ ...memoryBadges });
  return () => {
    listeners.delete(callback);
  };
}
