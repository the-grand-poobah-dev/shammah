import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function resolveSupabaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (
    rawUrl &&
    (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) &&
    !rawUrl.includes('placeholder') &&
    !rawUrl.includes('your-project-url')
  ) {
    return rawUrl;
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && serviceKey.split('.').length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64').toString('utf8'));
      if (payload?.ref) return `https://${payload.ref}.supabase.co`;
    } catch {}
  }
  return null;
}

function getSupabaseServerClient(authHeader) {
  const url = resolveSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;
  if (!url || !key || key.includes('your-anon-key')) return null;

  const headers = {};
  if (!serviceKey && authHeader) {
    headers.Authorization = authHeader;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers },
  });
}

async function resolveSessionUser(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const url = resolveSupabaseUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (token && url && key && !key.includes('your-anon-key')) {
    try {
      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await client.auth.getUser(token);
      if (data?.user) return data.user;
    } catch {}
  }
  return null;
}

// In-memory rate limiting map (IP or user ID -> last submit timestamp)
const rateLimitMap = new Map();

// Game plausibility limits
const GAME_LIMITS = {
  trivia: { maxScore: 5000, minDurationMs: 2500 },
  david: { maxScore: 2500, minDurationMs: 1500 },
  ark: { maxScore: 2000, minDurationMs: 2500 },
  scramble: { maxScore: 3000, minDurationMs: 2500 },
  match: { maxScore: 2500, minDurationMs: 2500 },
};

export async function POST(request) {
  try {
    const user = await resolveSessionUser(request);
    const authHeader = request.headers.get('authorization') || '';
    const supabase = getSupabaseServerClient(authHeader);

    // Rate limiting: 1 submission per 2 seconds
    const clientKey = user?.id || request.headers.get('x-forwarded-for') || 'guest';
    const now = Date.now();
    const lastTime = rateLimitMap.get(clientKey);
    if (lastTime && now - lastTime < 2000) {
      return NextResponse.json(
        { ok: false, error: 'Rate limit exceeded. Please wait a moment between rounds.' },
        { status: 429 }
      );
    }
    rateLimitMap.set(clientKey, now);

    // Clean up rate limit map
    if (rateLimitMap.size > 2000) {
      for (const [k, t] of rateLimitMap.entries()) {
        if (now - t > 60000) rateLimitMap.delete(k);
      }
    }

    const body = await request.json();
    const {
      gameSlug,
      score = 0,
      durationMs = 0,
      meta = {},
      clientTimestamp,
    } = body;

    if (!gameSlug) {
      return NextResponse.json({ ok: false, error: 'gameSlug is required.' }, { status: 400 });
    }

    const limits = GAME_LIMITS[gameSlug] || { maxScore: 5000, minDurationMs: 2000 };

    // Plausibility bounds check
    if (typeof score !== 'number' || score < 0 || score > limits.maxScore) {
      return NextResponse.json(
        { ok: false, error: `Score ${score} rejected: exceeds plausible limits for ${gameSlug}.` },
        { status: 400 }
      );
    }

    if (durationMs < limits.minDurationMs && score > 50) {
      return NextResponse.json(
        { ok: false, error: 'Play session duration is too short for reported score.' },
        { status: 400 }
      );
    }

    // Monotonic timestamp check (client clock vs server clock within 5 minutes)
    if (clientTimestamp && Math.abs(now - clientTimestamp) > 300000) {
      console.warn('Clock drift detected for arcade score submission:', now, clientTimestamp);
    }

    // If authenticated and Supabase is configured, submit via RPC
    if (user?.id && supabase) {
      try {
        const { data, error } = await supabase.rpc('submit_arcade_score', {
          p_game_slug: gameSlug,
          p_score: score,
          p_meta: meta,
          p_duration_ms: durationMs,
        });

        if (error) {
          console.error('Supabase submit_arcade_score error:', error);
          throw error;
        }

        return NextResponse.json({
          ok: true,
          score: data.score,
          bestScore: data.best_score,
          isNewBest: data.is_new_best,
          streak: data.streak,
          unlockedAchievements: data.unlocked_achievements || [],
        });
      } catch (err) {
        console.warn('RPC submission fallback triggered:', err.message);
      }
    }

    // Guest fallback / Local calculation
    const isNewBest = score > 0;
    const unlockedAchievements = [];
    if (score > 0) unlockedAchievements.push('first_win');
    if (score >= 500) unlockedAchievements.push('score_500');
    if (score >= 1000) unlockedAchievements.push('score_1000');
    if (gameSlug === 'david' && meta?.goliath_down) unlockedAchievements.push('goliath_slayer');
    if (gameSlug === 'ark' && meta?.pairs_rescued >= 6) unlockedAchievements.push('ark_master');
    if (gameSlug === 'scramble' && score >= 300) unlockedAchievements.push('scramble_whiz');

    return NextResponse.json({
      ok: true,
      score,
      bestScore: score,
      isNewBest,
      streak: 1,
      unlockedAchievements,
      guestNote: !user?.id ? 'Sign in to save your scores to the global church leaderboard!' : null,
    });
  } catch (error) {
    console.error('Arcade score API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
