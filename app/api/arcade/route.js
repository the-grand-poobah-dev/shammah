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

const DEFAULT_GAMES = [
  {
    slug: 'trivia',
    title: 'Bible Champions Trivia',
    description: 'Fast-paced timed questions spanning Old & New Testaments. Test your knowledge against believers across Kenya.',
    icon: '🏆',
    accent: '#f59e0b',
    kind: 'quiz',
    max_plausible_score: 5000,
    min_duration_ms: 3000,
    plays: 1420,
    cover_url: 'https://images.unsplash.com/photo-1507842229451-7f01be8610ce?w=800',
    tagline: 'Old & New Testament Quiz',
  },
  {
    slug: 'david',
    title: 'David vs Goliath Sling',
    description: 'Adjust your sling angle and power in the Valley of Elah. Knock down the Philistine giant with 5 smooth stones.',
    icon: '🎯',
    accent: '#0ea5e9',
    kind: 'arcade',
    max_plausible_score: 2500,
    min_duration_ms: 2000,
    plays: 980,
    cover_url: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=800',
    tagline: 'Physics Aim & Precision',
  },
  {
    slug: 'ark',
    title: 'Noah’s Ark Pair Rescue',
    description: 'Match animal pairs two-by-two before the torrential rain flood begins to safely board the Ark.',
    icon: '🚢',
    accent: '#10b981',
    kind: 'match',
    max_plausible_score: 2000,
    min_duration_ms: 3000,
    plays: 1120,
    cover_url: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=800',
    tagline: 'Two-by-Two Animal Memory',
  },
  {
    slug: 'scramble',
    title: 'Scripture Scramble',
    description: 'Unscramble divine Bible verses word by word before time runs out. Reinforce your scripture memory.',
    icon: '🧩',
    accent: '#8b5cf6',
    kind: 'puzzle',
    max_plausible_score: 3000,
    min_duration_ms: 3000,
    plays: 870,
    cover_url: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800',
    tagline: 'Word Order & Scripture Recall',
  },
  {
    slug: 'match',
    title: 'Memory Verse Match',
    description: 'Flip cards and connect famous scripture book/chapter references to their holy promises.',
    icon: '📖',
    accent: '#ec4899',
    kind: 'memory',
    max_plausible_score: 2500,
    min_duration_ms: 3000,
    plays: 640,
    cover_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
    tagline: 'Verse & Reference Pairing',
  },
];

const ACHIEVEMENTS_DEF = [
  {
    code: 'first_win',
    title: 'First Victory',
    description: 'Complete your first game and register a score in the Hall of Faith.',
    icon: '🌱',
    points: 50,
  },
  {
    code: 'score_500',
    title: 'High Scorer',
    description: 'Score 500+ points in a single round of any arcade game.',
    icon: '⚡',
    points: 100,
  },
  {
    code: 'score_1000',
    title: 'Arcade Champion',
    description: 'Surpass 1,000 points in a single master game session.',
    icon: '👑',
    points: 250,
  },
  {
    code: 'streak_3',
    title: 'Devoted Player',
    description: 'Play and record scores for 3 consecutive days.',
    icon: '🔥',
    points: 75,
  },
  {
    code: 'streak_7',
    title: 'Unbroken Flame',
    description: 'Hold a 7-day uninterrupted arcade playing streak.',
    icon: '🛡️',
    points: 200,
  },
  {
    code: 'goliath_slayer',
    title: 'Goliath Slayer',
    description: 'Direct hit on Goliath of Gath with the first smooth stone.',
    icon: '🪨',
    points: 150,
  },
  {
    code: 'ark_master',
    title: 'Ark Captain',
    description: 'Rescue all 6 animal pairs with more than 15 seconds remaining.',
    icon: '🌈',
    points: 150,
  },
  {
    code: 'scramble_whiz',
    title: 'Word of Life',
    description: 'Unscramble 5 verses without using a single hint.',
    icon: '📜',
    points: 200,
  },
];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'hub';
    const gameSlug = searchParams.get('game') || 'trivia';
    const scope = searchParams.get('scope') || 'weekly'; // daily | weekly | all | church
    const user = await resolveSessionUser(request);
    const authHeader = request.headers.get('authorization') || '';
    const supabase = getSupabaseServerClient(authHeader);

    // ACTION: Questions bank for trivia
    if (action === 'questions') {
      const difficulty = searchParams.get('difficulty') || 'all';
      const category = searchParams.get('category') || 'all';
      const limit = parseInt(searchParams.get('limit'), 10) || 10;

      if (supabase) {
        try {
          let query = supabase.from('arcade_questions').select('*');
          if (difficulty !== 'all') query = query.eq('difficulty', difficulty);
          if (category !== 'all') query = query.eq('category', category);
          const { data, error } = await query.limit(limit * 3);

          if (!error && data && data.length > 0) {
            // Shuffle
            const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, limit);
            return NextResponse.json({ ok: true, questions: shuffled });
          }
        } catch (dbErr) {
          console.warn('Questions fetch error, falling back to local pool:', dbErr);
        }
      }

      return NextResponse.json({ ok: true, questions: [] });
    }

    // ACTION: Daily seed
    if (action === 'daily_seed') {
      const today = new Date().toISOString().split('T')[0];
      if (supabase) {
        try {
          const { data } = await supabase.rpc('get_arcade_daily_seed', { p_game_slug: gameSlug });
          if (data) return NextResponse.json({ ok: true, daily: data });
        } catch {}
      }
      return NextResponse.json({
        ok: true,
        daily: {
          game_slug: gameSlug,
          day: today,
          seed: `daily-seed-${today}-${gameSlug}`,
          bonus_multiplier: 2.0,
        },
      });
    }

    // MAIN HUB DATA
    let dbGames = DEFAULT_GAMES;
    let userProgress = [];
    let leaderboard = [];
    let userAchievements = [];

    if (supabase) {
      try {
        // 1. Games
        const { data: gamesData } = await supabase
          .from('arcade_games')
          .select('*')
          .eq('is_active', true);
        if (gamesData && gamesData.length > 0) {
          // Merge metadata
          dbGames = DEFAULT_GAMES.map((def) => {
            const row = gamesData.find((g) => g.slug === def.slug);
            return row ? { ...def, ...row } : def;
          });
        }

        // 2. User Progress
        if (user?.id) {
          const { data: progData } = await supabase
            .from('arcade_progress')
            .select('*')
            .eq('user_id', user.id);
          if (progData) userProgress = progData;

          // Achievements
          const { data: achData } = await supabase
            .from('arcade_achievements')
            .select('*')
            .eq('user_id', user.id);
          if (achData) userAchievements = achData.map((a) => a.code);
        }

        // 3. Leaderboard
        const { data: lbData } = await supabase.rpc('arcade_leaderboard', {
          p_game_slug: gameSlug,
          p_scope: scope,
        });
        if (lbData) leaderboard = lbData;
      } catch (err) {
        console.warn('Supabase fetch failed in arcade hub route:', err);
      }
    }

    // Fallback leaderboard if empty
    if (leaderboard.length === 0) {
      leaderboard = [
        {
          rank: 1,
          display_name: 'Evangelist Samuel',
          avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
          badge: 'youth',
          church_name: 'UoN Christian Union',
          score: 1850,
          game_slug: gameSlug,
        },
        {
          rank: 2,
          display_name: 'Sister Mary Grace',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          badge: 'worship',
          church_name: 'CITAM Woodley Youth',
          score: 1420,
          game_slug: gameSlug,
        },
        {
          rank: 3,
          display_name: 'Deacon Joshua',
          avatar_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
          badge: 'deacon',
          church_name: 'PCEA St. Andrews',
          score: 1100,
          game_slug: gameSlug,
        },
        {
          rank: 4,
          display_name: 'Sister Rebecca',
          avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
          badge: 'intercessor',
          church_name: 'Deliverance Church Umoja',
          score: 950,
          game_slug: gameSlug,
        },
      ];
    }

    // Today's featured daily game
    const dailyGame = dbGames[0]; // Trivia is the primary daily challenge

    return NextResponse.json({
      ok: true,
      games: dbGames,
      dailyChallenge: {
        game: dailyGame,
        bonusMultiplier: 2.0,
        day: new Date().toISOString().split('T')[0],
        expiresInHours: 24 - new Date().getHours(),
      },
      userProgress,
      userAchievements,
      achievementsCatalog: ACHIEVEMENTS_DEF,
      leaderboard,
    });
  } catch (error) {
    console.error('Arcade API GET error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
