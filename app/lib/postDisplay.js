'use client';
import React, { useState, useEffect } from 'react';

// Small, shared pieces of UI logic that both the main feed and individual
// post cards need. Pulled out so there is exactly one copy of each.

export const CATEGORY_STYLES = {
  lessons: { label: 'Lessons & Icebreakers', accent: '#b8842a', soft: '#f4e9d6', text: '#8a611c' },
  stories: { label: 'Stories & Experiences', accent: '#1e6b66', soft: '#dceeec', text: '#175450' },
  podcasts: { label: 'Podcasts & Videos', accent: '#a94b46', soft: '#f3dfdd', text: '#833a36' },
  events: { label: 'Events', accent: '#b8842a', soft: '#f4e9d6', text: '#8a611c' },
  involved: { label: 'Get Involved', accent: '#1e6b66', soft: '#dceeec', text: '#175450' },
  resources: { label: 'Resources', accent: '#a94b46', soft: '#f3dfdd', text: '#833a36' },
  parent: { label: 'Parent Corner', accent: '#b8842a', soft: '#f4e9d6', text: '#8a611c' },
  worship: { label: 'Worship & Creative Arts', accent: '#1e6b66', soft: '#dceeec', text: '#175450' },
  teen: { label: 'Teen Talks', accent: '#a94b46', soft: '#f3dfdd', text: '#833a36' },
  kids: { label: "Kids' Corner", accent: '#b8842a', soft: '#f4e9d6', text: '#8a611c' },
  volunteer: { label: 'Volunteer Spotlight', accent: '#1e6b66', soft: '#dceeec', text: '#175450' },
  hacks: { label: 'Ministry Hacks', accent: '#a94b46', soft: '#f3dfdd', text: '#833a36' },
  prayer: { label: 'Prayer Requests & Praise Reports', accent: '#b8842a', soft: '#f4e9d6', text: '#8a611c' },
  seasonal: { label: 'Seasonal Specials', accent: '#1e6b66', soft: '#dceeec', text: '#175450' },
  field: { label: 'From the Mission Field', accent: '#b8842a', soft: '#f4e9d6', text: '#8a611c' },
};

export function categoryStyle(categoryId) {
  return (
    CATEGORY_STYLES[categoryId] || {
      label: categoryId,
      accent: '#b8842a',
      soft: '#f4e9d6',
      text: '#8a611c',
    }
  );
}

export function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const chars = parts.length > 1 ? [parts[0][0], parts[1][0]] : [parts[0][0]];
  return chars.join('').toUpperCase();
}

export function getOrdinalSuffix(day) {
  const d = Math.abs(Number(day)) || 0;
  const mod100 = d % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return 'th';
  }
  const mod10 = d % 10;
  if (mod10 === 1) return 'st';
  if (mod10 === 2) return 'nd';
  if (mod10 === 3) return 'rd';
  return 'th';
}

export function formatFullDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDate();
  const suffix = getOrdinalSuffix(day);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${weekday}, ${day}${suffix} ${month}, ${year}`;
}

export function formatPostDate(iso, now = Date.now()) {
  if (!iso) return '';
  const thenDate = iso instanceof Date ? iso : new Date(iso);
  const then = thenDate.getTime();
  if (Number.isNaN(then)) return '';

  const nowMs = typeof now === 'number' ? now : (now instanceof Date ? now.getTime() : new Date(now).getTime());
  const diffMs = nowMs - then;

  // Future timestamp (clock skew) or under 1 minute
  if (diffMs < 60000) {
    return 'Just now';
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }

  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  return formatFullDate(thenDate);
}

// Kept for seamless backwards compatibility
export function timeAgo(iso, now = Date.now()) {
  return formatPostDate(iso, now);
}

export function getPostDateTitle(iso) {
  if (!iso) return '';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    const formatted = d.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
    return `${formatted} (${d.toISOString()})`;
  } catch {
    return d.toISOString();
  }
}

// ==========================================
// SHARED MINUTE-INTERVAL STORE FOR THE PAGE
// One single timer for all relative timestamps,
// paused automatically when tab is hidden.
// ==========================================
let sharedCurrentTime = Date.now();
const timeListeners = new Set();
let minuteTimerId = null;
let isPageTabVisible = true;

function notifyTimeSubscribers() {
  sharedCurrentTime = Date.now();
  timeListeners.forEach((listener) => {
    try {
      listener(sharedCurrentTime);
    } catch (err) {
      console.error('Error in time listener', err);
    }
  });
}

function startMinuteTimer() {
  if (typeof window === 'undefined') return;
  if (minuteTimerId !== null) return;
  minuteTimerId = setInterval(() => {
    if (isPageTabVisible) {
      notifyTimeSubscribers();
    }
  }, 60000);
}

function stopMinuteTimer() {
  if (minuteTimerId !== null) {
    clearInterval(minuteTimerId);
    minuteTimerId = null;
  }
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    isPageTabVisible = document.visibilityState !== 'hidden';
    if (isPageTabVisible) {
      notifyTimeSubscribers();
      if (timeListeners.size > 0) {
        startMinuteTimer();
      }
    } else {
      stopMinuteTimer();
    }
  });
}

export function subscribeTimeTick(listener) {
  timeListeners.add(listener);
  if (timeListeners.size === 1 && isPageTabVisible) {
    startMinuteTimer();
  }
  return () => {
    timeListeners.delete(listener);
    if (timeListeners.size === 0) {
      stopMinuteTimer();
    }
  };
}

export function getSharedCurrentTime() {
  return sharedCurrentTime;
}

// React hooks and shared components

export function useRelativeTimeTick() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(sharedCurrentTime);
    const unsubscribe = subscribeTimeTick((updatedTime) => {
      setNow(updatedTime);
    });
    return unsubscribe;
  }, []);

  return now;
}

export function useTimeAgo(iso) {
  const now = useRelativeTimeTick();
  return formatPostDate(iso, now);
}

export function PostTimestamp({ iso, className, fallback = '' }) {
  const formatted = useTimeAgo(iso);
  const title = getPostDateTitle(iso);
  if (!formatted) return fallback ? <span className={className}>{fallback}</span> : null;
  return (
    <span className={className} title={title} suppressHydrationWarning>
      {formatted}
    </span>
  );
}

