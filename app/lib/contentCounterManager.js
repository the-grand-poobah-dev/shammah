'use client';
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'shammah_content_seen_timestamps';

export function getSeenTimestamps() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

export function markContentSeen(sectionId) {
  if (typeof window === 'undefined' || !sectionId) return;
  try {
    const current = getSeenTimestamps();
    current[sectionId] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('shammah:counters-updated'));
  } catch (_) {}
}

export function useContentCounters() {
  const [counters, setCounters] = useState({});

  const refreshCounters = useCallback(() => {
    // In production, compares section update times with seen timestamps
    setCounters({
      videos: 0,
      podcasts: 0,
      polls: 0,
      courses: 0,
      bible: 0,
      fundraisers: 0,
      challenges: 0,
      games: 0,
      rss: 0,
    });
  }, []);

  useEffect(() => {
    refreshCounters();
    window.addEventListener('shammah:counters-updated', refreshCounters);
    return () => window.removeEventListener('shammah:counters-updated', refreshCounters);
  }, [refreshCounters]);

  return counters;
}

export default useContentCounters;
