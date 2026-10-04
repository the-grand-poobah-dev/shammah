import { NextResponse } from 'next/server';
import { getSampleFeedPosts, sortPostsWithPinned } from '../../lib/pinnedPosts';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const sample = getSampleFeedPosts();
    const filtered =
      category === 'all'
        ? sample
        : sample.filter((p) => String(p.category || '').toLowerCase() === category.toLowerCase());
    const posts = sortPostsWithPinned(filtered);
    return NextResponse.json(
      {
        posts,
        category,
        cachedAt: new Date().toISOString(),
        source: 'api-feed-cache',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ posts: [], error: err?.message || 'Cache error' }, { status: 500 });
  }
}
