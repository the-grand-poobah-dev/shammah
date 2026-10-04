/* eslint-disable no-restricted-globals */
/**
 * Shammah Service Worker (/sw.js)
 * 1. Main Feed Offline Caching Strategy (Network-First with Cache Fallback + Direct Post Snapshot Sync)
 * 2. Static & Media Asset Caching (Stale-While-Revalidate)
 * 3. Firebase Cloud Messaging (FCM) Background Push Notifications & Mention Alerts
 */

const FEED_CACHE_NAME = 'shammah-main-feed-cache-v1';
const STATIC_CACHE_NAME = 'shammah-static-assets-v1';
const OFFLINE_SYNTHETIC_PREFIX = '/__sw_cache/feed-posts';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) =>
        cache.addAll(['/', '/icon.svg', '/pwa-192x192.png', '/pwa-512x512.png', '/apple-touch-icon.png']).catch(() => {})
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== FEED_CACHE_NAME && k !== STATIC_CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/**
 * Helper: Build a synthetic JSON Response for CacheStorage
 */
function buildJsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Shammah-SW-Cache': 'HIT',
      'Cache-Control': 'no-cache',
    },
  });
}

async function broadcastNetworkStatus(status, extra = {}) {
  try {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      client.postMessage({
        type: 'SW_NETWORK_STATUS',
        status,
        timestamp: new Date().toISOString(),
        ...extra,
      });
    }
  } catch {}
}

/**
 * Intercept Fetch Requests:
 * - Synthetic feed cache endpoints (/api/feed-cache* and /__sw_cache/feed-posts*)
 * - Supabase REST post queries (/rest/v1/posts*)
 * - Static assets & images
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Direct synthetic offline feed endpoint: /__sw_cache/feed-posts?category=...
  if (url.pathname === OFFLINE_SYNTHETIC_PREFIX) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(FEED_CACHE_NAME);
        const category = url.searchParams.get('category') || 'all';
        const keyUrl = `${self.location.origin}${OFFLINE_SYNTHETIC_PREFIX}?category=${encodeURIComponent(category)}`;
        const fallbackAllUrl = `${self.location.origin}${OFFLINE_SYNTHETIC_PREFIX}?category=all`;

        let matched = await cache.match(keyUrl);
        if (!matched && category !== 'all') {
          const allMatched = await cache.match(fallbackAllUrl);
          if (allMatched) {
            try {
              const allData = await allMatched.clone().json();
              const filteredPosts = Array.isArray(allData.posts)
                ? allData.posts.filter((p) => p.category_id === category)
                : [];
              return buildJsonResponse({
                ...allData,
                category,
                posts: filteredPosts,
                fromOfflineFallback: true,
              });
            } catch {
              matched = allMatched;
            }
          }
        }

        if (matched) return matched;
        return buildJsonResponse({ posts: [], cachedAt: null, empty: true });
      })()
    );
    return;
  }

  // 2. Network-First with Cache Fallback for Main Feed API (/api/feed-cache* or Supabase /rest/v1/posts*)
  const isFeedApi =
    url.pathname.startsWith('/api/feed-cache') ||
    url.pathname.includes('/rest/v1/posts') ||
    url.pathname.includes('/rest/v1/poll_options');

  if (isFeedApi) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(FEED_CACHE_NAME);
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
            broadcastNetworkStatus('online');
          }
          return networkResponse;
        } catch (err) {
          broadcastNetworkStatus('disconnected', { reason: 'feed_fetch_failed' });
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to synthetic feed cache if available
          const category = url.searchParams.get('category') || 'all';
          const synthKey = `${self.location.origin}${OFFLINE_SYNTHETIC_PREFIX}?category=${encodeURIComponent(category)}`;
          const synthMatch = await cache.match(synthKey);
          if (synthMatch) return synthMatch;

          return buildJsonResponse({ posts: [], offline: true, error: 'Offline and no cached feed found' });
        }
      })()
    );
    return;
  }

  // 3. Stale-While-Revalidate for Next.js static bundles, fonts, and post images
  const isStaticOrMedia =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp') ||
    url.hostname.includes('images.unsplash.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isStaticOrMedia) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE_NAME);
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((res) => {
            if (res && (res.status === 200 || res.type === 'opaque')) {
              cache.put(request, res.clone()).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || networkPromise;
      })()
    );
    return;
  }

  // 4. Navigation requests: Network-First with cached app-shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(STATIC_CACHE_NAME);
          cache.put('/', response.clone()).catch(() => {});
          return response;
        } catch {
          const cache = await caches.open(STATIC_CACHE_NAME);
          const cachedRoot = await cache.match('/');
          if (cachedRoot) return cachedRoot;
          throw new Error('Offline');
        }
      })()
    );
  }
});

/**
 * Client <-> Service Worker Message Bus
 * - CACHE_FEED_POSTS: Saves main feed posts into CacheStorage so they persist offline
 * - GET_FEED_CACHE_STATS: Returns count & timestamp of cached main feed posts
 * - CLEAR_FEED_CACHE: Clears cached main feed posts
 * - SHOW_FCM_NOTIFICATION: Shows a native push notification via ServiceWorkerRegistration
 */
self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'CACHE_FEED_POSTS') {
    const category = data.category || 'all';
    const posts = Array.isArray(data.posts) ? data.posts.slice(0, 60) : [];
    const pollOptionsByPost = data.pollOptionsByPost || {};
    const pollCountsByPost = data.pollCountsByPost || {};
    const cachedAt = new Date().toISOString();

    event.waitUntil(
      (async () => {
        const cache = await caches.open(FEED_CACHE_NAME);
        const payload = {
          category,
          posts,
          pollOptionsByPost,
          pollCountsByPost,
          cachedAt,
          count: posts.length,
        };
        const keyUrl = `${self.location.origin}${OFFLINE_SYNTHETIC_PREFIX}?category=${encodeURIComponent(category)}`;
        await cache.put(keyUrl, buildJsonResponse(payload));

        // Also update metadata summary entry
        const metaUrl = `${self.location.origin}${OFFLINE_SYNTHETIC_PREFIX}?category=__meta__`;
        await cache.put(
          metaUrl,
          buildJsonResponse({
            lastCachedAt: cachedAt,
            lastCategory: category,
            cachedPostCount: posts.length,
          })
        );

        // Notify open clients that feed cache was updated
        const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientsList) {
          client.postMessage({
            type: 'FEED_CACHE_UPDATED',
            category,
            count: posts.length,
            cachedAt,
          });
        }
      })()
    );
    return;
  }

  if (data.type === 'GET_FEED_CACHE_STATS') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(FEED_CACHE_NAME);
        const metaUrl = `${self.location.origin}${OFFLINE_SYNTHETIC_PREFIX}?category=__meta__`;
        const allUrl = `${self.location.origin}${OFFLINE_SYNTHETIC_PREFIX}?category=all`;
        let stats = { cachedPostCount: 0, lastCachedAt: null };

        const metaRes = await cache.match(metaUrl);
        if (metaRes) {
          try {
            stats = await metaRes.json();
          } catch {}
        } else {
          const allRes = await cache.match(allUrl);
          if (allRes) {
            try {
              const allData = await allRes.json();
              stats = {
                cachedPostCount: Array.isArray(allData.posts) ? allData.posts.length : 0,
                lastCachedAt: allData.cachedAt || null,
              };
            } catch {}
          }
        }

        if (event.source) {
          event.source.postMessage({
            type: 'FEED_CACHE_STATS',
            ...stats,
          });
        }
      })()
    );
    return;
  }

  if (data.type === 'SHOW_FCM_NOTIFICATION' && data.notification) {
    const n = data.notification;
    event.waitUntil(
      self.registration.showNotification(n.title || 'Shammah Fellowship Alert', {
        body: n.body || '',
        icon: n.icon || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: n.id || `shammah-fcm-${Date.now()}`,
        data: {
          url: n.targetLink || '/?tab=home',
          churchName: n.churchName || null,
          notifType: n.type || 'church',
        },
      })
    );
  }
});

/**
 * Firebase Cloud Messaging (FCM) / Web Push Event Handler
 */
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = {
        notification: {
          title: 'Shammah Church Community',
          body: event.data.text(),
        },
      };
    }
  }

  const notif = payload.notification || {};
  const data = payload.data || {};
  const title = notif.title || data.title || '🕊️ New Fellowship Update';
  const body = notif.body || data.body || 'A new post or mention was shared in your church community.';
  const targetUrl = data.targetLink || data.url || '/?tab=home';

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body,
        icon: notif.icon || data.actorAvatar || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: data.id || `fcm-${Date.now()}`,
        data: { url: targetUrl, ...data },
      });

      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientsList) {
        client.postMessage({
          type: 'FCM_BACKGROUND_MESSAGE',
          payload: { title, body, data },
        });
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/?tab=home';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'FCM_NOTIFICATION_CLICKED',
            url: targetUrl,
          });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
