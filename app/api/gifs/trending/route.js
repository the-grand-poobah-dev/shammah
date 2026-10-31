import { NextResponse } from 'next/server';
import { getTrendingGifs } from '../../../lib/gifProviders';

export const dynamic = 'force-dynamic';

// In-memory rate limiting map: ip -> { count, expiresAt }
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.expiresAt < now) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  entry.count += 1;
  return true;
}

export async function GET(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anon';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please wait a moment.' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit'), 10) || 20));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || searchParams.get('pos'), 10) || 0);

    const data = await getTrendingGifs({ limit, offset });

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    console.warn('GIF trending route error:', err?.message);
    const isMissingKey = !process.env.GIPHY_API_KEY && !process.env.KLIPY_API_KEY;
    return NextResponse.json(
      {
        error: isMissingKey ? 'GIPHY_API_KEY is not configured on the server.' : err.message,
        missingKey: isMissingKey,
        results: [],
      },
      { status: isMissingKey ? 200 : 500 }
    );
  }
}
