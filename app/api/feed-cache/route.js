import { NextResponse } from 'next/server';
import { getSampleFeedPosts, sortPostsWithPinned } from '../../lib/pinnedPosts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/feed-cache?category=...
 * Serves main feed posts with cacheable JSON headers so the Service Worker (/sw.js)
 * intercepts and caches responses in CacheStorage ('shammah-main-feed-cache-v1')
 * for offline viewing.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const normalizedCategory = !category || category === 'all' ? null : category;

  const samplePosts = sortPostsWithPinned(getSampleFeedPosts(normalizedCategory));

  return NextResponse.json(
    {
      category: normalizedCategory || 'all',
      posts: samplePosts,
      cachedAt: new Date().toISOString(),
      source: 'network-feed-api',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=86400',
        'X-Shammah-Feed-Endpoint': 'v1',
      },
    }
  );
}
