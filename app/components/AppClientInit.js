'use client';
import { useEffect, useState } from 'react';
import { initGlobalHorizontalDrag } from '../lib/useDragScroll';
import GlobalSearchModal from './GlobalSearchModal';
import {
  registerServiceWorker,
  useOfflineIndicatorStatus,
  getFeedCacheMeta,
} from '../lib/swFeedCache';
import { initForegroundFcmListener, subscribeToCommunityPushNotifications } from '../lib/fcmClient';
import { subscribeToFirebaseAuth } from '../lib/firebaseClient';

export default function AppClientInit() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cacheMeta, setCacheMeta] = useState({ cachedPostCount: 0, lastCachedAt: null });
  const { isDisconnected, hasPendingSyncs, pendingSyncCount, dotColor } =
    useOfflineIndicatorStatus();

  useEffect(() => {
    // 1. Enable global mouse drag-to-scroll on all horizontal items
    const cleanupDrag = initGlobalHorizontalDrag();

    // 2. Register Service Worker (/sw.js) for offline feed caching & FCM push notifications
    registerServiceWorker();
    initForegroundFcmListener();
    setCacheMeta(getFeedCacheMeta());

    function handleSwCacheUpdate(e) {
      if (e.detail) {
        setCacheMeta({
          cachedPostCount: e.detail.count || 0,
          lastCachedAt: e.detail.cachedAt || new Date().toISOString(),
        });
      }
    }

    // 3. Subscribe to real-time Firestore community push notifications when authenticated
    let unsubPush = () => {};
    const unsubAuth = subscribeToFirebaseAuth((user) => {
      unsubPush();
      if (user) {
        unsubPush = subscribeToCommunityPushNotifications();
      }
    });

    // 4. Global shortcut for search: '/' or 'Ctrl+K' / 'Cmd+K'
    function handleKeyDown(e) {
      if (
        (e.key === 'k' && (e.metaKey || e.ctrlKey)) ||
        (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA')
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }

    // 5. Custom event listener for opening search
    function handleOpenSearch(e) {
      setSearchQuery(e.detail?.query || '');
      setSearchOpen(true);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('shammah:open-search', handleOpenSearch);
    window.addEventListener('shammah:sw-feed-cache-updated', handleSwCacheUpdate);

    return () => {
      cleanupDrag?.();
      unsubPush?.();
      unsubAuth?.();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('shammah:open-search', handleOpenSearch);
      window.removeEventListener('shammah:sw-feed-cache-updated', handleSwCacheUpdate);
    };
  }, []);

  const showTopOfflineBadge = isDisconnected || hasPendingSyncs;

  return (
    <>
      {showTopOfflineBadge && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-2.5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-slate-950/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg border border-white/15"
        >
          {/* Small yellow dot for pending syncs, red dot for complete disconnection */}
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 rounded-full shrink-0 animate-pulse ${
              dotColor === 'yellow'
                ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.9)]'
                : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]'
            }`}
          />
          <span>
            {dotColor === 'yellow'
              ? `Offline · Pending Sync${pendingSyncCount > 0 ? ` (${pendingSyncCount})` : ''}`
              : 'Offline'}
          </span>
          {cacheMeta.cachedPostCount > 0 && (
            <span className="text-[11px] font-normal text-slate-300 hidden sm:inline">
              · {cacheMeta.cachedPostCount} cached posts available
            </span>
          )}
        </div>
      )}

      <GlobalSearchModal
        isOpen={searchOpen}
        initialQuery={searchQuery}
        onClose={() => {
          setSearchOpen(false);
          setSearchQuery('');
        }}
      />
    </>
  );
}
