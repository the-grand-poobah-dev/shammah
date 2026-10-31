'use client';
import { useState, useEffect } from 'react';
import { getTotalUnreadMessagesCount } from './inboxManager';
import { getUnreadNotificationCount } from './notificationsManager';
import { getIcebreakerPolls, getUserVotes } from './icebreakerPolls';

const STORAGE_KEY = 'shammah_content_counters_v2';
const SEEN_ITEMS_KEY = 'shammah_seen_content_items_v2';

const DEFAULT_INITIAL_COUNTERS = {
  home: 0,
  messages: 0,
  alerts: 0,
  churches: 3,
  polls: 2,
  fundraisers: 3,
  podcasts: 2,
  courses: 1,
  challenges: 2,
  games: 1,
  bible: 1,
  videos: 2,
  rss: 3,
};

let inMemoryCounters = { ...DEFAULT_INITIAL_COUNTERS };
const listeners = new Set();

function getStoredCounters() {
  if (typeof window === 'undefined') return { ...DEFAULT_INITIAL_COUNTERS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_COUNTERS));
      return { ...DEFAULT_INITIAL_COUNTERS };
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_INITIAL_COUNTERS, ...parsed };
  } catch {
    return { ...DEFAULT_INITIAL_COUNTERS };
  }
}

function saveCounters(updated) {
  inMemoryCounters = { ...updated };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    window.dispatchEvent(new CustomEvent('shammah:content-counters-updated', { detail: updated }));
  }
  listeners.forEach((cb) => {
    try {
      cb(inMemoryCounters);
    } catch {}
  });
}

export function getContentCounters() {
  return getStoredCounters();
}

/**
 * Marks a section or tab content as seen/reviewed by the user.
 * Zeroes out the counter badge for that section or tab.
 */
export function markContentSeen(sectionOrTabId) {
  if (!sectionOrTabId) return;
  const current = getStoredCounters();

  // Normalize aliases
  let targetKey = sectionOrTabId;
  if (sectionOrTabId === 'audio') targetKey = 'podcasts';
  if (sectionOrTabId === 'institutions') targetKey = 'churches';
  if (sectionOrTabId === 'menu') targetKey = 'churches';

  if (current[targetKey] !== 0) {
    const next = { ...current, [targetKey]: 0 };
    saveCounters(next);
  }
}

/**
 * Increments the unread/new counter for a specific section or tab.
 */
export function incrementContentCounter(sectionOrTabId, amount = 1) {
  if (!sectionOrTabId) return;
  const current = getStoredCounters();
  let targetKey = sectionOrTabId;
  if (sectionOrTabId === 'audio') targetKey = 'podcasts';
  if (sectionOrTabId === 'institutions') targetKey = 'churches';

  const nextVal = Math.max(0, (current[targetKey] || 0) + amount);
  const next = { ...current, [targetKey]: nextVal };
  saveCounters(next);
}

/**
 * Recalculates counters from live sources (inbox, notifications, unvoted polls)
 */
export async function syncLiveCounters() {
  const current = getStoredCounters();
  let messagesCount = current.messages || 0;
  let alertsCount = current.alerts || 0;
  let pollsCount = current.polls;

  try {
    const unread = await getTotalUnreadMessagesCount();
    messagesCount = Number(unread) || 0;
  } catch {}

  try {
    alertsCount = getUnreadNotificationCount() || 0;
  } catch {}

  try {
    const allPolls = getIcebreakerPolls();
    const userVotes = getUserVotes();
    const unvoted = allPolls.filter((p) => !userVotes[p.id]).length;
    pollsCount = Math.min(unvoted, 5);
  } catch {}

  const updated = {
    ...current,
    messages: messagesCount,
    alerts: alertsCount,
    polls: pollsCount,
  };

  saveCounters(updated);
  return updated;
}

/**
 * React hook for components needing reactive content counter badges
 */
export function useContentCounters() {
  const [counters, setCounters] = useState(() => getStoredCounters());

  useEffect(() => {
    function handleChange(e) {
      if (e?.detail) {
        setCounters({ ...e.detail });
      } else {
        setCounters(getStoredCounters());
      }
    }

    listeners.add(setCounters);
    window.addEventListener('shammah:content-counters-updated', handleChange);
    window.addEventListener('shammah:inbox-updated', syncLiveCounters);
    window.addEventListener('shammah:notifications-updated', syncLiveCounters);
    window.addEventListener('shammah:icebreaker-polls-updated', syncLiveCounters);

    syncLiveCounters().catch(() => {});

    return () => {
      listeners.delete(setCounters);
      window.removeEventListener('shammah:content-counters-updated', handleChange);
      window.removeEventListener('shammah:inbox-updated', syncLiveCounters);
      window.removeEventListener('shammah:notifications-updated', syncLiveCounters);
      window.removeEventListener('shammah:icebreaker-polls-updated', syncLiveCounters);
    };
  }, []);

  return counters;
}
