import { NextResponse } from 'next/server';
import { getTrendingGifs } from '../../../lib/gifProviders';

// In-memory rate limiting map: ip -> { count, resetAt }
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = 60; // 60 requests/minute

  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
  } else {
    record.count += 1;
  }
  rateLimitMap.set(ip, record);
  return record.count <= limit;
}

export async function GET(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a moment.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit'), 10) || 24));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || searchParams.get('pos'), 10) || 0);

  try {
    const result = await getTrendingGifs({ limit, offset });
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    console.error('[API /api/gifs/trending] Error:', err);
    return NextResponse.json(
      {
        configured: Boolean(process.env.GIPHY_API_KEY),
        error: err.message || 'Failed to fetch trending GIFs',
        data: [],
      },
      { status: 500 }
    );
  }
}
