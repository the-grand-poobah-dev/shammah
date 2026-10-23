'use client';
import { useState, useEffect } from 'react';

/**
 * Shared Page-Wide Time & Poll Countdown Manager
 *
 * Implements a single singleton interval across all components on the page.
 * Automatically adapts tick frequency:
 * - 1,000 ms (1s) when any active poll closes in under 60 seconds
 * - 30,000 ms (30s) otherwise
 * Stops interval completely when no components are mounted.
 */

const subscribers = new Set();
let timerId = null;
let currentIntervalMs = 30000;
const registeredTargets = new Set();

function getOptimalIntervalMs() {
  const now = Date.now();
  let hasUnderOneMinute = false;

  for (const target of registeredTargets) {
    if (typeof target === 'number' && !Number.isNaN(target)) {
      const diff = target - now;
      // Active countdown under 60 seconds (and not long past zero)
      if (diff > -2000 && diff <= 60000) {
        hasUnderOneMinute = true;
        break;
      }
    }
  }

  return hasUnderOneMinute ? 1000 : 30000;
}

function rescheduleTimer() {
  const desired = getOptimalIntervalMs();
  if (desired !== currentIntervalMs && timerId !== null) {
    clearInterval(timerId);
    currentIntervalMs = desired;
    timerId = setInterval(handleTick, currentIntervalMs);
  }
}

function handleTick() {
  const now = Date.now();
  subscribers.forEach((callback) => {
    try {
      callback(now);
    } catch (err) {
      console.error('Error in useNow subscriber:', err);
    }
  });
  rescheduleTimer();
}

function ensureTimerRunning() {
  if (timerId === null && subscribers.size > 0) {
    currentIntervalMs = getOptimalIntervalMs();
    timerId = setInterval(handleTick, currentIntervalMs);
  }
}

function cleanupTimerIfIdle() {
  if (subscribers.size === 0 && timerId !== null) {
    clearInterval(timerId);
    timerId = null;
    currentIntervalMs = 30000;
  }
}

/**
 * Registers an expiration timestamp target so the shared timer can switch
 * to 1-second high-precision ticking when under 1 minute remains.
 */
export function registerPollTarget(targetTime) {
  if (!targetTime) return () => {};
  const targetMs = typeof targetTime === 'number' ? targetTime : new Date(targetTime).getTime();
  if (Number.isNaN(targetMs)) return () => {};

  registeredTargets.add(targetMs);
  rescheduleTimer();

  return () => {
    registeredTargets.delete(targetMs);
    rescheduleTimer();
  };
}

/**
 * Shared hook returning the current timestamp (ms), updated by the single global interval.
 */
export function useNow() {
  const [now, setNow] = useState(() => (typeof window !== 'undefined' ? Date.now() : 0));

  useEffect(() => {
    const onTick = (timestamp) => setNow(timestamp);
    subscribers.add(onTick);
    ensureTimerRunning();

    return () => {
      subscribers.delete(onTick);
      cleanupTimerIfIdle();
    };
  }, []);

  return now;
}

/**
 * Formats time remaining for a poll based on real target timestamp and current time.
 * Exact formats per spec:
 * - "2d 4h left"
 * - "3h 12m left"
 * - "12m left"
 * - "45s left"
 * - "Poll Closed" at <= 0
 * Returns null if expiresAt is null/missing (no invented durations).
 */
export function formatPollTimeRemaining(expiresAt, nowMs = Date.now()) {
  if (!expiresAt) return null;
  const targetMs = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime();
  if (Number.isNaN(targetMs)) return null;

  const diff = targetMs - nowMs;
  if (diff <= 0) {
    return {
      isClosed: true,
      label: 'Poll Closed',
      fullBadgeText: '🏁 Poll Closed · Final Results',
      secondsRemaining: 0,
    };
  }

  const totalSec = Math.floor(diff / 1000);
  const totalMin = Math.floor(totalSec / 60);
  const totalHours = Math.floor(totalMin / 60);
  const days = Math.floor(totalHours / 24);

  let label = '';
  if (days >= 1) {
    const remHours = totalHours % 24;
    label = `${days}d ${remHours}h left`;
  } else if (totalHours >= 1) {
    const remMin = totalMin % 60;
    label = `${totalHours}h ${remMin}m left`;
  } else if (totalMin >= 1) {
    label = `${totalMin}m left`;
  } else {
    const sec = Math.max(1, totalSec);
    label = `${sec}s left`;
  }

  return {
    isClosed: false,
    label,
    fullBadgeText: label,
    secondsRemaining: totalSec,
  };
}

/**
 * Hook to manage live countdown for a poll card or view.
 * Flips to isExpired=true automatically at zero without reloading.
 */
export function usePollCountdown(pollExpiresAt) {
  const now = useNow();

  useEffect(() => {
    if (!pollExpiresAt) return;
    return registerPollTarget(pollExpiresAt);
  }, [pollExpiresAt]);

  if (!pollExpiresAt) {
    return {
      hasExpiration: false,
      isExpired: false,
      label: null,
      fullBadgeText: null,
    };
  }

  const result = formatPollTimeRemaining(pollExpiresAt, now || Date.now());
  if (!result) {
    return {
      hasExpiration: false,
      isExpired: false,
      label: null,
      fullBadgeText: null,
    };
  }

  return {
    hasExpiration: true,
    isExpired: result.isClosed,
    label: result.label,
    fullBadgeText: result.fullBadgeText,
    secondsRemaining: result.secondsRemaining,
  };
}
