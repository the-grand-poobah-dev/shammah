'use client';
import { useState, useEffect } from 'react';

const LOCAL_FEED_BACKUP_PREFIX = 'shammah_sw_main_feed_v1_';
const LOCAL_FEED_META_KEY = 'shammah_sw_main_feed_meta_v1';
const PENDING_SYNC_QUEUE_KEY = 'shammah_sw_pending_sync_queue_v1';

let swRegistrationPromise = null;

export function getPendingSyncQueue() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PENDING_SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addPendingSyncItem(item) {
  if (typeof window === 'undefined') return [];
  const queue = getPendingSyncQueue();
  const next = [
    ...queue,
    {
      id: item?.id || `sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: item?.type || 'post_sync',
      label: item?.label || 'Pending feed sync',
      createdAt: new Date().toISOString(),
    },
  ];
  try {
    localStorage.setItem(PENDING_SYNC_QUEUE_KEY, JSON.stringify(next));
  } catch {}
  window.dispatchEvent(
    new CustomEvent('shammah:sw-sync-status-changed', {
      detail: { pendingSyncCount: next.length },
    })
  );
  return next;
}

export function clearPendingSyncQueue() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PENDING_SYNC_QUEUE_KEY);
  } catch {}
  window.dispatchEvent(
    new CustomEvent('shammah:sw-sync-status-changed', {
      detail: { pendingSyncCount: 0 },
    })
  );
}

/**
 * Registers the Service Worker (/sw.js) and sets up listeners for
 * offline feed cache updates, network loss detection, and FCM clicks.
 */
export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  if (swRegistrationPromise) return swRegistrationPromise;

  swRegistrationPromise = (async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event.data || {};
        if (data.type === 'FEED_CACHE_UPDATED') {
          window.dispatchEvent(
            new CustomEvent('shammah:sw-feed-cache-updated', {
              detail: {
                category: data.category,
                count: data.count,
                cachedAt: data.cachedAt,
              },
            })
          );
        } else if (data.type === 'SW_NETWORK_STATUS') {
          window.dispatchEvent(
            new CustomEvent('shammah:sw-network-status', {
              detail: {
                status: data.status,
                reason: data.reason || null,
                timestamp: data.timestamp,
              },
            })
          );
        } else if (data.type === 'FCM_NOTIFICATION_CLICKED' && data.url) {
          window.dispatchEvent(
            new CustomEvent('shammah:fcm-notification-clicked', {
              detail: { url: data.url },
            })
          );
        }
      });

      return registration;
    } catch (err) {
      console.warn('Service Worker registration warning:', err);
      return null;
    }
  })();

  return swRegistrationPromise;
}

/**
 * Caches recently loaded main feed posts in the Service Worker's CacheStorage
 * ('shammah-main-feed-cache-v1') and maintains a synchronized localStorage mirror
 * so users can view recently loaded posts seamlessly while offline.
 */
export async function cacheMainFeedPosts(
  category,
  posts = [],
  pollOptionsByPost = {},
  pollCountsByPost = {}
) {
  if (typeof window === 'undefined' || !Array.isArray(posts) || posts.length === 0) {
    return;
  }

  const normalizedCategory = !category || category === 'all' ? 'all' : category;
  const cachedAt = new Date().toISOString();
  const payload = {
    category: normalizedCategory,
    posts: posts.slice(0, 60),
    pollOptionsByPost,
    pollCountsByPost,
    cachedAt,
    count: Math.min(posts.length, 60),
  };

  // Signal brief pending sync state while writing to Service Worker CacheStorage
  window.dispatchEvent(
    new CustomEvent('shammah:sw-sync-in-flight', { detail: { inFlight: true } })
  );

  // 1. Save immediate mirror in localStorage for instant synchronous fallback
  try {
    localStorage.setItem(
      `${LOCAL_FEED_BACKUP_PREFIX}${normalizedCategory}`,
      JSON.stringify(payload)
    );
    localStorage.setItem(
      LOCAL_FEED_META_KEY,
      JSON.stringify({
        lastCachedAt: cachedAt,
        lastCategory: normalizedCategory,
        cachedPostCount: payload.count,
      })
    );
  } catch (err) {
    console.warn('Feed cache storage notice:', err);
  }

  // 2. Send to Service Worker CacheStorage ('shammah-main-feed-cache-v1')
  try {
    const reg = await registerServiceWorker();
    const targetWorker =
      navigator.serviceWorker?.controller || reg?.active || reg?.waiting || reg?.installing;

    if (targetWorker) {
      targetWorker.postMessage({
        type: 'CACHE_FEED_POSTS',
        category: normalizedCategory,
        posts: payload.posts,
        pollOptionsByPost,
        pollCountsByPost,
      });
    }

    // Also warm the Network-First /api/feed-cache route in the Service Worker when online
    if (navigator.onLine) {
      fetch(`/api/feed-cache?category=${encodeURIComponent(normalizedCategory)}`).catch(() => {
        window.dispatchEvent(
          new CustomEvent('shammah:sw-network-status', {
            detail: { status: 'disconnected', reason: 'feed_cache_warm_failed' },
          })
        );
      });
    }
  } catch {}

  setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent('shammah:sw-sync-in-flight', { detail: { inFlight: false } })
    );
  }, 450);
}

/**
 * Retrieves cached main feed posts when the user is offline or when network requests fail.
 */
export async function getCachedMainFeedPosts(category) {
  if (typeof window === 'undefined') return null;
  const normalizedCategory = !category || category === 'all' ? 'all' : category;

  // 1. Query Service Worker CacheStorage synthetic endpoint
  try {
    const res = await fetch(
      `/__sw_cache/feed-posts?category=${encodeURIComponent(normalizedCategory)}`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.posts) && data.posts.length > 0) {
        return {
          posts: data.posts,
          pollOptionsByPost: data.pollOptionsByPost || {},
          pollCountsByPost: data.pollCountsByPost || {},
          cachedAt: data.cachedAt,
          source: 'service-worker-cache',
        };
      }
    }
  } catch {}

  // 2. Fallback to localStorage mirror for the requested category (or 'all')
  try {
    const raw =
      localStorage.getItem(`${LOCAL_FEED_BACKUP_PREFIX}${normalizedCategory}`) ||
      localStorage.getItem(`${LOCAL_FEED_BACKUP_PREFIX}all`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const filteredPosts =
        normalizedCategory === 'all'
          ? parsed.posts
          : (parsed.posts || []).filter((p) => p.category_id === normalizedCategory);

      if (filteredPosts && filteredPosts.length > 0) {
        return {
          posts: filteredPosts,
          pollOptionsByPost: parsed.pollOptionsByPost || {},
          pollCountsByPost: parsed.pollCountsByPost || {},
          cachedAt: parsed.cachedAt,
          source: 'offline-cache-mirror',
        };
      }
    }
  } catch {}

  return null;
}

/**
 * Returns metadata about the currently cached main feed posts.
 */
export function getFeedCacheMeta() {
  if (typeof window === 'undefined') {
    return { cachedPostCount: 0, lastCachedAt: null };
  }
  try {
    const raw = localStorage.getItem(LOCAL_FEED_META_KEY);
    return raw ? JSON.parse(raw) : { cachedPostCount: 0, lastCachedAt: null };
  } catch {
    return { cachedPostCount: 0, lastCachedAt: null };
  }
}

/**
 * Hook: Tracks browser online/offline connectivity state AND Service Worker network loss detection
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      clearPendingSyncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    const handleSwNetworkStatus = (e) => {
      if (e.detail?.status === 'disconnected') {
        setIsOnline(false);
      } else if (e.detail?.status === 'online' && navigator.onLine) {
        setIsOnline(true);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('shammah:sw-network-status', handleSwNetworkStatus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('shammah:sw-network-status', handleSwNetworkStatus);
    };
  }, []);

  return isOnline;
}

/**
 * Hook: Provides complete state for the top-of-page 'Offline' indicator badge:
 * - Yellow dot ('pending') when there are pending syncs queued or syncing in flight
 * - Red dot ('disconnected') when there is complete network disconnection
 */
export function useOfflineIndicatorStatus() {
  const isOnline = useOnlineStatus();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncInFlight, setSyncInFlight] = useState(false);

  useEffect(() => {
    setPendingSyncCount(getPendingSyncQueue().length);

    function onSyncStatusChanged(e) {
      if (typeof e.detail?.pendingSyncCount === 'number') {
        setPendingSyncCount(e.detail.pendingSyncCount);
      } else {
        setPendingSyncCount(getPendingSyncQueue().length);
      }
    }

    function onSyncInFlight(e) {
      setSyncInFlight(Boolean(e.detail?.inFlight));
    }

    window.addEventListener('shammah:sw-sync-status-changed', onSyncStatusChanged);
    window.addEventListener('shammah:sw-sync-in-flight', onSyncInFlight);
    return () => {
      window.removeEventListener('shammah:sw-sync-status-changed', onSyncStatusChanged);
      window.removeEventListener('shammah:sw-sync-in-flight', onSyncInFlight);
    };
  }, []);

  const hasPendingSyncs = pendingSyncCount > 0 || syncInFlight;
  const isDisconnected = !isOnline;

  return {
    isOnline,
    isDisconnected,
    hasPendingSyncs,
    pendingSyncCount,
    // 'yellow' for pending syncs, 'red' for complete disconnection
    dotColor: hasPendingSyncs ? 'yellow' : 'red',
  };
}

/**
 * Hook: Manages PWA install prompt (beforeinstallprompt + iOS Safari detection)
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}
