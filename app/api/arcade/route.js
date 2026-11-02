import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const rateBuckets = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 12;

function supabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (value && /^https?:\/\//i.test(value) && !/placeholder|your-project-url/i.test(value)) return value;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && serviceKey.split('.').length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64').toString('utf8'));
      if (payload?.ref) return `https://${payload.ref}.supabase.co`;
    } catch {}
  }
  return null;
}

function makeClient(key, authorization) {
  const url = supabaseUrl();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(authorization ? { global: { headers: { Authorization: authorization } } } : {})
  });
}

async function authenticatedUser(request) {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const client = makeClient(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, `Bearer ${token}`);
  if (!client) return null;
  const { data, error } = await client.auth.getUser(token);
  return error || !data?.user ? null : data.user;
}

function rateLimit(userId) {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);
  if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(userId, { startedAt: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_MAX;
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'catalog';
    const game = String(url.searchParams.get('game') || '').slice(0, 80);
    const scope = ['daily', 'weekly', 'all'].includes(url.searchParams.get('scope'))
      ? url.searchParams.get('scope') : 'weekly';
    const user = await authenticatedUser(request);
    const admin = makeClient(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const publicClient = makeClient(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const client = admin || publicClient;
    if (!client) return NextResponse.json({ error: 'Arcade data is not configured yet.' }, { status: 503 });

    if (action === 'catalog') {
      const { data, error } = await client.from('arcade_games')
        .select('slug,title,description,icon,accent,kind,is_active')
        .eq('is_active', true).order('title');
      if (error) throw error;
      if (!user) return NextResponse.json({ games: data || [], signedIn: false });
      const { data: progress, error: progressError } = await client.from('arcade_progress')
        .select('game_slug,best_score,plays,last_played_on,streak,level')
        .eq('user_id', user.id);
      if (progressError) throw progressError;
      const { data: achievements, error: achievementError } = await client.from('arcade_achievements')
        .select('code,earned_at,metadata').eq('user_id', user.id).order('earned_at', { ascending: false });
      if (achievementError) throw achievementError;
      return NextResponse.json({ games: data || [], progress: progress || [], achievements: achievements || [], signedIn: true });
    }

    if (action === 'leaderboard') {
      if (!game) return NextResponse.json({ error: 'A game slug is required.' }, { status: 400 });
      const rpcClient = user ? (admin || makeClient(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, request.headers.get('authorization'))) : null;
      if (!rpcClient) return NextResponse.json({ error: 'Sign in to view leaderboards.' }, { status: 401 });
      const { data, error } = await rpcClient.rpc('arcade_leaderboard', { p_game_slug: game, p_scope: scope });
      if (error) throw error;
      return NextResponse.json({ leaderboard: data || [], scope, game });
    }

    if (action === 'daily_seed') {
      if (!user) return NextResponse.json({ error: 'Sign in to load the daily challenge.' }, { status: 401 });
      const { data, error } = await (admin || makeClient(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, request.headers.get('authorization')))
        .rpc('arcade_daily_seed', { p_game_slug: game });
      if (error) throw error;
      return NextResponse.json({ game, seed: data, day: new Date().toISOString().slice(0, 10) });
    }

    if (action === 'questions' || action === 'verses') {
      const table = action === 'questions' ? 'arcade_questions' : 'arcade_verses';
      const { data, error } = await client.from(table).select('*').limit(action === 'questions' ? 100 : 60);
      if (error) throw error;
      // Do not expose answer keys through the public questions endpoint.
      if (action === 'questions') {
        return NextResponse.json({ questions: (data || []).map(({ correct_index, ...q }) => q) });
      }
      return NextResponse.json({ verses: data || [] });
    }

    return NextResponse.json({ error: 'Unsupported Arcade action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Could not load Arcade data.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Sign in to save your Arcade score.' }, { status: 401 });
    if (!rateLimit(user.id)) return NextResponse.json({ error: 'Too many score submissions. Please wait a minute.' }, { status: 429 });

    const body = await request.json();
    const gameSlug = String(body.gameSlug || '').trim().slice(0, 80);
    const score = Number(body.score);
    const durationMs = Number(body.durationMs);
    const meta = body.meta && typeof body.meta === 'object' && !Array.isArray(body.meta) ? body.meta : {};
    if (!/^[a-z0-9-]{2,80}$/.test(gameSlug) || !Number.isSafeInteger(score) || score < 0 ||
        !Number.isSafeInteger(durationMs) || durationMs < 1000 || durationMs > 7200000) {
      return NextResponse.json({ error: 'Invalid game result.' }, { status: 400 });
    }
    const service = makeClient(process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (!service) return NextResponse.json({ error: 'Score saving is not configured yet.' }, { status: 503 });
    const { data, error } = await service.rpc('submit_arcade_score', {
      p_user_id: user.id,
      p_game_slug: gameSlug,
      p_score: score,
      p_duration_ms: durationMs,
      p_meta: {
        perfect: meta.perfect === true,
        completed: meta.completed === true,
        questionsAnswered: Number.isFinite(Number(meta.questionsAnswered))
          ? Math.max(0, Math.min(200, Math.trunc(Number(meta.questionsAnswered)))) : 0
      }
    });
    if (error) {
      const status = /limit|invalid|unavailable|duration/i.test(error.message || '') ? 400 : 500;
      return NextResponse.json({ error: error.message || 'Could not save score.' }, { status });
    }
    return NextResponse.json({ ok: true, result: data });
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Could not save Arcade score.' }, { status: 500 });
  }
}
