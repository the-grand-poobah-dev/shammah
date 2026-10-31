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

// In-memory / seed fallback mirroring supabase/seed_faith_challenges.sql
const SEED_CHALLENGES = [
  {
    id: 'c1000000-0000-4000-a000-000000000001',
    title: '7-Day Secret Place Prayer Sprint',
    description: 'Set your alarm 20 minutes earlier each morning for uninterrupted communion with the Father (Matthew 6:6).',
    rules_md: `### Rules & Daily Posture:\n- Spend at least 20 minutes in focused, silent prayer before opening social media.\n- Use the SOAP devotional model (Scripture, Observation, Application, Prayer).\n- Check in daily to track your flame streak and share a brief prayer reflection.`,
    cover_url: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=900&auto=format&fit=crop&q=80',
    kind: 'daily',
    category: 'Prayer',
    duration_days: 7,
    points: 70,
    accent: '#06b6d4',
    participants_count: 412,
    status: 'active',
  },
  {
    id: 'c1000000-0000-4000-a000-000000000002',
    title: 'Romans 8 Scripture Memory Mastery',
    description: 'Hide God’s word in your heart by memorizing 1 verse per day from the greatest chapter in the New Testament.',
    rules_md: `### Rules & Daily Posture:\n- Memorize the verse of the day word-for-word.\n- Record a 30-60 second recitation video with the hashtag #ScriptureIn60s.\n- Review previous days to build your full chapter recitation.`,
    cover_url: 'https://images.unsplash.com/photo-1507842229451-7f01be8610ce?w=900&auto=format&fit=crop&q=80',
    kind: 'streak',
    category: 'Scripture memory',
    duration_days: 14,
    points: 140,
    accent: '#8b5cf6',
    participants_count: 286,
    status: 'active',
  },
  {
    id: 'c1000000-0000-4000-a000-000000000003',
    title: '21-Day Daniel Fast & Spiritual Clarity',
    description: 'Consecrate your appetite for deep spiritual breakthrough, physical renewal, and discerning God’s will.',
    rules_md: `### Rules & Daily Posture:\n- Abstain from meats, refined sugars, and carbonated beverages.\n- Focus on vegetables, fruits, whole grains, nuts, and pure water.\n- Pair fasting with intercession for church revival and national unity.`,
    cover_url: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=900&auto=format&fit=crop&q=80',
    kind: 'daily',
    category: 'Fasting',
    duration_days: 21,
    points: 210,
    accent: '#10b981',
    participants_count: 530,
    status: 'active',
  },
  {
    id: 'c1000000-0000-4000-a000-000000000004',
    title: '30 Days of Unspoken Kingdom Gratitude',
    description: 'Shift your spiritual atmosphere by recording 3 specific answered prayers or daily blessings without complaining.',
    rules_md: `### Rules & Daily Posture:\n- Post 3 unique blessings each day.\n- No complaining or cynical talk allowed for 30 consecutive days (Philippians 2:14).\n- Notice the supernatural peace that guards your heart.`,
    cover_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=900&auto=format&fit=crop&q=80',
    kind: 'daily',
    category: 'Prayer',
    duration_days: 30,
    points: 300,
    accent: '#f59e0b',
    participants_count: 195,
    status: 'active',
  },
  {
    id: 'c1000000-0000-4000-a000-000000000005',
    title: 'Random Acts of Christlike Kindness',
    description: 'Be the hands and feet of Jesus: pay a matatu fare, buy lunch for a security guard, or visit an elderly neighbor.',
    rules_md: `### Rules & Daily Posture:\n- Complete 1 intentional act of servant love daily without seeking personal acclaim.\n- Encourage others by sharing a short praise testimony or note.`,
    cover_url: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=900&auto=format&fit=crop&q=80',
    kind: 'daily',
    category: 'Service',
    duration_days: 7,
    points: 100,
    accent: '#ec4899',
    participants_count: 320,
    status: 'active',
  },
  {
    id: 'c1000000-0000-4000-a000-000000000006',
    title: 'Raw Acoustic & Acapella Worship Cover',
    description: 'Share a pure 60-90 second acoustic, piano, or vocal worship chorus honoring the name of Jesus.',
    rules_md: `### Rules & Daily Posture:\n- High sound clarity, zero autotune, pure heart of adoration.\n- Tag your local fellowship or campus Christian Union.`,
    cover_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&auto=format&fit=crop&q=80',
    kind: 'one_off',
    category: 'Worship',
    duration_days: 14,
    points: 150,
    accent: '#ef4444',
    participants_count: 215,
    status: 'active',
  },
];

const SEED_SUBMISSIONS = [
  {
    id: 'd1000000-0000-4000-b000-000000000001',
    challenge_id: 'c1000000-0000-4000-a000-000000000002',
    media_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600',
    thumb_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400',
    caption: 'Romans 8:31-39 in one continuous breath! If God is for us, who can be against us?! 🔥',
    hashtag: '#ScriptureIn60s',
    scripture: 'Romans 8:37',
    audio_title: 'Deep Worship Beat · Original Praise Sound',
    like_count: 842,
    comment_count: 67,
    status: 'approved',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    author: {
      display_name: 'Evangelist Samuel',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      badge: 'youth',
      branch: 'UoN Christian Union',
    },
  },
  {
    id: 'd1000000-0000-4000-b000-000000000002',
    challenge_id: 'c1000000-0000-4000-a000-000000000006',
    media_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
    thumb_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
    caption: 'Way Maker (Swahili & English Acoustic Mashup) recorded during morning chapel devotion! 🎸',
    hashtag: '#AcousticWorship',
    scripture: 'Psalm 100:1-2',
    audio_title: 'Acoustic Guitar in E Major · Mary Grace',
    like_count: 1240,
    comment_count: 114,
    status: 'approved',
    created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
    author: {
      display_name: 'Sister Mary Grace',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      badge: 'worship',
      branch: 'CITAM Woodley Youth',
    },
  },
  {
    id: 'd1000000-0000-4000-b000-000000000003',
    challenge_id: 'c1000000-0000-4000-a000-000000000005',
    media_url: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=600',
    thumb_url: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=400',
    caption: 'Paid the bus fare for 3 stranded university students in Nairobi CBD today. Jesus is Lord! 🚌✨',
    hashtag: '#KindnessInAction',
    scripture: 'Matthew 25:40',
    audio_title: 'Joy In The Morning · Gospel Rhythm',
    like_count: 420,
    comment_count: 38,
    status: 'approved',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    author: {
      display_name: 'Deaconess Rebecca',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      badge: 'deacon',
      branch: 'Grace Community Fellowship',
    },
  },
];

const SEED_LEADERBOARD = [
  { user_id: 'u1', display_name: 'Pastor Julius Mwangi', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', badge: 'pastor', points: 420, streak_current: 14, streak_best: 21 },
  { user_id: 'u2', display_name: 'Sister Mary Grace', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', badge: 'worship', points: 380, streak_current: 12, streak_best: 14 },
  { user_id: 'u3', display_name: 'Evangelist Samuel', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', badge: 'youth', points: 310, streak_current: 9, streak_best: 11 },
  { user_id: 'u4', display_name: 'David Kimani', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', badge: 'student', points: 260, streak_current: 7, streak_best: 9 },
  { user_id: 'u5', display_name: 'Faith Wanjiku', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', badge: 'teacher', points: 190, streak_current: 5, streak_best: 7 },
];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'list';
  const supabase = getSupabaseServerClient(request.headers.get('authorization'));
  const user = await resolveSessionUser(request);

  try {
    // 1. DETAIL VIEW
    if (action === 'detail') {
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'Missing challenge id.' }, { status: 400 });

      let challenge = null;
      let participant = null;
      let checkins = [];
      let submissions = [];
      let leaderboard = [];

      if (supabase) {
        try {
          const { data: ch } = await supabase
            .from('challenges')
            .select('*')
            .eq('id', id)
            .maybeSingle();
          if (ch) challenge = ch;

          if (user?.id) {
            const { data: part } = await supabase
              .from('challenge_participants')
              .select('*')
              .eq('challenge_id', id)
              .eq('user_id', user.id)
              .maybeSingle();
            participant = part;

            const { data: chk } = await supabase
              .from('challenge_checkins')
              .select('*')
              .eq('challenge_id', id)
              .eq('user_id', user.id)
              .order('day', { ascending: false });
            if (chk) checkins = chk;
          }

          const { data: subs } = await supabase
            .from('challenge_submissions')
            .select('*, author:user_id(display_name, avatar_url, badge)')
            .eq('challenge_id', id)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });
          if (subs) submissions = subs;

          const { data: lb } = await supabase.rpc('challenge_leaderboard', { p_challenge_id: id, p_scope: 'all' });
          if (lb && lb.length > 0) leaderboard = lb;
        } catch {}
      }

      if (!challenge) {
        challenge = SEED_CHALLENGES.find((c) => c.id === id) || SEED_CHALLENGES[0];
        submissions = SEED_SUBMISSIONS.filter((s) => s.challenge_id === id);
        leaderboard = SEED_LEADERBOARD;
      }

      // Check if user checked in today
      const todayStr = new Date().toISOString().split('T')[0];
      const hasCheckedInToday = Boolean(
        checkins.some((c) => c.day === todayStr) || (participant?.last_checkin_on === todayStr)
      );

      return NextResponse.json({
        ok: true,
        challenge,
        participant: participant || {
          isJoined: false,
          streak_current: 0,
          streak_best: 0,
          points: 0,
        },
        hasCheckedInToday,
        checkins,
        submissions,
        leaderboard,
      });
    }

    // 2. MAIN HUB LIST VIEW
    const category = searchParams.get('category') || 'All';
    const sort = searchParams.get('sort') || 'popular';
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const userId = user?.id || searchParams.get('userId');

    let allChallenges = [];
    let myActive = [];
    let trendingSubs = [];
    let globalLeaderboard = [];

    if (supabase) {
      try {
        const { data: chList } = await supabase
          .from('challenges')
          .select('*')
          .in('status', ['active', 'completed'])
          .order('participants_count', { ascending: false });
        if (chList && chList.length > 0) allChallenges = chList;

        if (userId) {
          const { data: myParts } = await supabase
            .from('challenge_participants')
            .select('*, challenge:challenge_id(*)')
            .eq('user_id', userId);
          if (myParts) myActive = myParts;
        }

        const { data: subs } = await supabase
          .from('challenge_submissions')
          .select('*, author:user_id(display_name, avatar_url, badge)')
          .eq('status', 'approved')
          .order('like_count', { ascending: false })
          .limit(8);
        if (subs) trendingSubs = subs;
      } catch {}
    }

    if (allChallenges.length === 0) allChallenges = [...SEED_CHALLENGES];
    if (trendingSubs.length === 0) trendingSubs = [...SEED_SUBMISSIONS];
    globalLeaderboard = [...SEED_LEADERBOARD];

    // Filter by category & search
    let filtered = allChallenges.filter((c) => {
      if (search) {
        const titleMatch = c.title?.toLowerCase().includes(search);
        const descMatch = c.description?.toLowerCase().includes(search);
        if (!titleMatch && !descMatch) return false;
      }
      if (category && category !== 'All') {
        if (c.category?.toLowerCase() !== category.toLowerCase()) return false;
      }
      return true;
    });

    // Today's featured challenge
    const todayChallenge = allChallenges[0] || SEED_CHALLENGES[0];

    // Badges earned showcase
    const badgesEarned = [
      { id: 'b-spark', title: 'Spiritual Spark', milestone: '3-Day Streak', icon: '⚡', accent: '#06b6d4', unlocked: true },
      { id: 'b-steadfast', title: 'Steadfast Believer', milestone: '7-Day Streak', icon: '🔥', accent: '#8b5cf6', unlocked: true },
      { id: 'b-overcomer', title: 'Overcomer in Christ', milestone: '21-Day Streak', icon: '🛡️', accent: '#10b981', unlocked: false },
      { id: 'b-champion', title: 'Kingdom Champion', milestone: '40-Day Fast/Prayer', icon: '👑', accent: '#f59e0b', unlocked: false },
    ];

    return NextResponse.json({
      ok: true,
      todayChallenge,
      myActiveChallenges: myActive.map((p) => ({
        ...p.challenge,
        streak_current: p.streak_current,
        streak_best: p.streak_best,
        user_points: p.points,
        last_checkin_on: p.last_checkin_on,
      })),
      trendingSubmissions: trendingSubs,
      allChallenges: filtered,
      leaderboard: globalLeaderboard,
      badgesEarned,
      totalCount: filtered.length,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Unable to fetch challenges.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await resolveSessionUser(request);
    const body = await request.json();
    const { action } = body || {};
    const supabase = getSupabaseServerClient(request.headers.get('authorization'));

    if (!user && action !== 'vote') {
      // In guest preview mode, generate mock participant response for clean UX
    }

    // 1. JOIN CHALLENGE
    if (action === 'join') {
      const { challengeId } = body;
      if (!challengeId) return NextResponse.json({ error: 'Missing challenge id.' }, { status: 400 });

      if (supabase && user?.id) {
        const { data, error } = await supabase.rpc('join_challenge', { p_challenge_id: challengeId });
        if (error) {
          // Fallback direct insert
          await supabase
            .from('challenge_participants')
            .upsert({ challenge_id: challengeId, user_id: user.id }, { onConflict: 'challenge_id,user_id' });
        }
      }

      return NextResponse.json({
        ok: true,
        message: 'Successfully joined challenge! Start your daily streak today.',
        participant: { challenge_id: challengeId, streak_current: 0, streak_best: 0, points: 0 },
      });
    }

    // 2. CHECK-IN
    if (action === 'checkin') {
      const { challengeId, note, mediaUrl } = body;
      if (!challengeId) return NextResponse.json({ error: 'Missing challenge id.' }, { status: 400 });

      const todayStr = new Date().toISOString().split('T')[0];

      if (supabase && user?.id) {
        const { data, error } = await supabase.rpc('checkin', {
          p_challenge_id: challengeId,
          p_note: note || null,
          p_media_url: mediaUrl || null,
        });

        if (error || data?.success === false) {
          return NextResponse.json({ error: data?.error || error?.message || 'Check-in failed.' }, { status: 400 });
        }

        return NextResponse.json({ ok: true, ...data });
      }

      // Preview mode simulation
      return NextResponse.json({
        ok: true,
        day: todayStr,
        streak_current: 1,
        streak_best: 1,
        points_awarded: 10,
        badge_awarded: null,
      });
    }

    // 3. SUBMIT CHALLENGE VIDEO / ENTRY
    if (action === 'submit') {
      const { challengeId, mediaUrl, thumbUrl, caption, hashtag, scripture, audioTitle } = body;
      if (!challengeId || !mediaUrl) {
        return NextResponse.json({ error: 'Please attach a photo or video for your challenge entry.' }, { status: 400 });
      }

      const newSub = {
        challenge_id: challengeId,
        user_id: user?.id || null,
        media_url: mediaUrl,
        thumb_url: thumbUrl || mediaUrl,
        caption: caption?.trim() || '',
        hashtag: hashtag?.trim() || '#FaithChallenge',
        scripture: scripture?.trim() || null,
        audio_title: audioTitle?.trim() || 'Original Praise Sound',
        status: 'approved',
        like_count: 1,
        comment_count: 0,
        created_at: new Date().toISOString(),
      };

      let inserted = null;
      if (supabase && user?.id) {
        const { data, error } = await supabase
          .from('challenge_submissions')
          .insert(newSub)
          .select()
          .single();
        if (error) throw new Error(error.message);
        inserted = data;
      } else {
        inserted = { id: `sub-${Date.now()}`, ...newSub };
      }

      return NextResponse.json({
        ok: true,
        submission: inserted,
        message: 'Submission published! You are a Kingdom Faith Champion! 🔥',
      });
    }

    // 4. VOTE / CHEER SUBMISSION
    if (action === 'vote') {
      const { submissionId } = body;
      if (!submissionId) return NextResponse.json({ error: 'Missing submission id.' }, { status: 400 });

      if (supabase && user?.id) {
        const { data } = await supabase.rpc('vote_submission', { p_submission_id: submissionId });
        if (data) return NextResponse.json({ ok: true, ...data });
      }

      return NextResponse.json({ ok: true, voted: true, like_count: 1 });
    }

    // 5. CREATE CHALLENGE
    if (action === 'create') {
      const { title, description, rulesMd, category, kind, durationDays, points, coverUrl, accent } = body;
      if (!title || title.trim().length < 5) {
        return NextResponse.json({ error: 'Please enter a clear challenge title.' }, { status: 400 });
      }

      const newChallenge = {
        title: title.trim(),
        description: description?.trim() || '',
        rules_md: rulesMd?.trim() || '',
        category: category || 'Prayer',
        kind: kind || 'daily',
        duration_days: Math.max(1, Number(durationDays || 7)),
        points: Math.max(10, Number(points || 50)),
        cover_url: coverUrl || 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=900&auto=format&fit=crop&q=80',
        accent: accent || '#8b5cf6',
        creator_id: user?.id || null,
        visibility: 'public',
        status: 'active',
        participants_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let inserted = null;
      if (supabase) {
        const { data, error } = await supabase
          .from('challenges')
          .insert(newChallenge)
          .select()
          .single();
        if (error) throw new Error(error.message);
        inserted = data;
      } else {
        inserted = { id: `c-${Date.now()}`, ...newChallenge };
      }

      return NextResponse.json({ ok: true, challenge: inserted });
    }

    // 6. DELETE SUBMISSION
    if (action === 'delete-submission') {
      const { submissionId } = body;
      if (!submissionId) return NextResponse.json({ error: 'Missing submission id.' }, { status: 400 });

      if (supabase && user?.id) {
        await supabase
          .from('challenge_submissions')
          .delete()
          .eq('id', submissionId);
      }

      return NextResponse.json({ ok: true, message: 'Submission removed.' });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Operation failed.' }, { status: 500 });
  }
}
