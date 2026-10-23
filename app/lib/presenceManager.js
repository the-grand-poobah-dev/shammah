'use client';
import { useEffect, useState } from 'react';

const ACTIVITY_STATUS_KEY = 'shammah_user_activity_status_v1';

export const ACTIVITY_STATUS_OPTIONS = [
  { id: 'online', label: 'Online', desc: 'Available for fellowship & study', color: '#10b981' },
  { id: 'busy', label: 'Busy', desc: 'In prayer, service or reading', color: '#f59e0b' },
  { id: 'offline', label: 'Offline', desc: 'Appear offline to members', color: '#94a3b8' },
];

/**
 * Returns current activity status: 'online' | 'busy' | 'offline'.
 * Automatically resolves to 'offline' if browser/network is disconnected.
 */
export function getUserActivityStatus() {
  if (typeof window === 'undefined') return 'online';
  try {
    // If completely offline from network perspective, reflect offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'offline';
    }
    const stored = localStorage.getItem(ACTIVITY_STATUS_KEY);
    if (stored && ['online', 'busy', 'offline'].includes(stored)) {
      return stored;
    }
    return 'online';
  } catch {
    return 'online';
  }
}

/**
 * Sets user activity status and broadcasts custom event.
 */
export function setUserActivityStatus(status) {
  if (typeof window === 'undefined') return;
  const safe = ['online', 'busy', 'offline'].includes(status) ? status : 'online';
  try {
    localStorage.setItem(ACTIVITY_STATUS_KEY, safe);
    window.dispatchEvent(
      new CustomEvent('shammah:activity-status-changed', { detail: safe })
    );
  } catch (err) {
    console.warn('Failed to persist user activity status:', err);
  }
}

/**
 * Hook to read and update user activity status with auto-sync across components
 */
export function useUserActivityStatus() {
  const [activityStatus, setStatusState] = useState('online');

  useEffect(() => {
    setStatusState(getUserActivityStatus());

    function onStatusChange(e) {
      if (e.detail && ['online', 'busy', 'offline'].includes(e.detail)) {
        setStatusState(e.detail);
      } else {
        setStatusState(getUserActivityStatus());
      }
    }

    function onNetworkChange() {
      setStatusState(getUserActivityStatus());
    }

    window.addEventListener('shammah:activity-status-changed', onStatusChange);
    window.addEventListener('online', onNetworkChange);
    window.addEventListener('offline', onNetworkChange);
    window.addEventListener('shammah:sw-network-status', onNetworkChange);

    return () => {
      window.removeEventListener('shammah:activity-status-changed', onStatusChange);
      window.removeEventListener('online', onNetworkChange);
      window.removeEventListener('offline', onNetworkChange);
      window.removeEventListener('shammah:sw-network-status', onNetworkChange);
    };
  }, []);

  return [activityStatus, setUserActivityStatus];
}
