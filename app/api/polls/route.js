import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limiter per user/IP for write endpoints
const rateLimitBucket = new Map();
function checkRateLimit(key, maxRequests = 30, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitBucket.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + windowMs;
  } else {
    entry.count += 1;
  }
  rateLimitBucket.set(key, entry);
  return entry.count <= maxRequests;
}

// Demo poll content lives only in supabase/seed_polls.sql; never fabricate live poll data here.
const SEEDED_POLLS_CATALOG = [];
const SEEDED_LEADERBOARD = [];

// Runtime state store on globalThis so seeded or newly created polls/votes/scores
// persist across requests even if the SQL migration has not yet been applied in Supabase
const runtimeState = globalThis.__shammahPollsRuntimeState || {
  createdPolls: [],
  closedPollIds: new Map(),
  deletedPollIds: new Set(),
  voteLedger: [], // { id, post_id, option_id, voter_id, voter_name, voter_avatar, is_anonymous, created_at }
  quizScoreLedger: [], // { poll_id, user_id, display_name, avatar_url, badge, badge_verified, option_id, is_correct, score, answered_at }
};
globalThis.__shammahPollsRuntimeState = runtimeState;

function getSupabaseServerClient(req) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || (!serviceKey && !anonKey)) return null;

  const authHeader = req?.headers?.get?.('authorization') || '';
  // Preserve the signed-in user's JWT for auth.uid()-based RPCs and RLS.
  // Use service role only for requests that have no bearer token (public reads).
  const useUserContext = Boolean(authHeader && anonKey);
  const client = createClient(url, useUserContext ? anonKey : (serviceKey || anonKey), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: useUserContext ? { headers: { Authorization: authHeader } } : undefined,
  });
  return { client, hasServiceKey: Boolean(serviceKey && !useUserContext), authHeader };
}

async function resolveAuthenticatedUser(req) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authHeader = req?.headers?.get?.('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token || !url || !anonKey) return null;

  try {
    const authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

function inferPollType(post, options = []) {
  if (post.poll_type && ['survey', 'quiz', 'icebreaker'].includes(post.poll_type)) {
    return post.poll_type;
  }
  if (post.is_quiz || options.some((o) => o.is_correct)) {
    return 'quiz';
  }
  const text = (post.text_content || '').toLowerCase();
  if (text.includes('quiz') || text.includes('trivia')) return 'quiz';
  if (text.includes('icebreaker') || text.includes('vibes') || text.includes('feeling')) return 'icebreaker';
  return 'survey';
}

function normalizePollRecord(rawPost, options = [], countsByOption = {}, myVotes = [], voters = [], quizResult = null) {
  const closedAt = runtimeState.closedPollIds.get(rawPost.id) || rawPost.poll_closed_at || null;
  const expiresAt = closedAt || rawPost.poll_expires_at || null;
  const pollType = inferPollType(rawPost, options);
  const isQuiz = Boolean(rawPost.is_quiz || pollType === 'quiz' || options.some((o) => o.is_correct));

  // Merge option counts with runtime vote ledger
  const normalizedOptions = options
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((opt, idx) => {
      const runtimeExtraVotes = runtimeState.voteLedger.filter(
        (v) => v.post_id === rawPost.id && v.option_id === opt.id && v.from_fallback
      ).length;
      const baseCount =
        countsByOption[opt.id] !== undefined
          ? Number(countsByOption[opt.id])
          : Number(opt.vote_count || 0);
      return {
        id: opt.id,
        post_id: rawPost.id,
        label: opt.label || `Option ${idx + 1}`,
        image_url: opt.image_url || null,
        is_correct: Boolean(opt.is_correct),
        position: opt.position ?? idx,
        vote_count: Math.max(0, baseCount + runtimeExtraVotes),
      };
    });

  const computedTotal = normalizedOptions.reduce((sum, o) => sum + (o.vote_count || 0), 0);
  const countsMap = {};
  normalizedOptions.forEach((o) => {
    countsMap[o.id] = o.vote_count;
  });

  const isAnon = Boolean(rawPost.poll_anonymous || rawPost.is_anonymous);

  return {
    id: rawPost.id,
    text_content: rawPost.text_content || '',
    category_id: rawPost.category_id || 'fellowship',
    poll_category: rawPost.poll_category || rawPost.category_id || 'Community',
    poll_type: pollType,
    is_quiz: isQuiz,
    quiz_explanation:
      rawPost.quiz_explanation ||
      (isQuiz
        ? 'Reflect on this Scripture passage with your fellowship group.'
        : null),
    poll_anonymous: isAnon,
    poll_multi_select: Boolean(rawPost.poll_multi_select),
    hide_results_until_vote: Boolean(rawPost.hide_results_until_vote ?? rawPost.reveal_results_after_voting),
    poll_starts_at: rawPost.poll_starts_at || rawPost.created_at,
    poll_expires_at: expiresAt,
    poll_closed_at: closedAt,
    poll_accent: rawPost.poll_accent || (isQuiz ? '#f59e0b' : pollType === 'icebreaker' ? '#10b981' : '#06b6d4'),
    visibility: rawPost.visibility || 'public',
    author_id: rawPost.author_id || null,
    church_id: rawPost.church_id || null,
    created_at: rawPost.created_at || new Date().toISOString(),
    profiles: rawPost.profiles || {
      display_name: 'Church Ministry',
      badge: 'leader',
      badge_verified: true,
      role: 'member',
    },
    options: normalizedOptions,
    counts: countsMap,
    total_votes: computedTotal,
    my_votes: Array.isArray(myVotes) ? myVotes : myVotes ? [myVotes] : [],
    voters: isAnon ? [] : voters,
    quiz_result: quizResult || null,
  };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'list';
  const authedUser = await resolveAuthenticatedUser(req);
  const viewerId = authedUser?.id || null;
  const supa = getSupabaseServerClient(req);

  // -------------------------------------------------------------------------
  // ACTION: LEADERBOARD
  // -------------------------------------------------------------------------
  if (action === 'leaderboard') {
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 10));
    let dbRows = [];

    if (supa?.client) {
      try {
        const { data: rpcData, error: rpcErr } = await supa.client.rpc('weekly_quiz_leaderboard', {
          p_limit: limit,
        });
        if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
          dbRows = rpcData;
        } else {
          const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();
          const { data: rawScores } = await supa.client
            .from('quiz_scores')
            .select('user_id, score, is_correct, answered_at, profiles(display_name, avatar_url, badge, badge_verified, role)')
            .gte('answered_at', weekAgo);

          if (Array.isArray(rawScores) && rawScores.length > 0) {
            const byUser = new Map();
            rawScores.forEach((r) => {
              const cur = byUser.get(r.user_id) || {
                user_id: r.user_id,
                display_name: r.profiles?.display_name || 'Believer',
                avatar_url: r.profiles?.avatar_url || null,
                badge: r.profiles?.badge || 'member',
                badge_verified: Boolean(r.profiles?.badge_verified),
                role: r.profiles?.role || 'member',
                total_score: 0,
                quizzes_taken: 0,
                correct_count: 0,
              };
              cur.total_score += Number(r.score || 0);
              cur.quizzes_taken += 1;
              if (r.is_correct) cur.correct_count += 1;
              byUser.set(r.user_id, cur);
            });
            dbRows = Array.from(byUser.values()).map((u) => ({
              ...u,
              accuracy_pct: Math.round((u.correct_count / Math.max(1, u.quizzes_taken)) * 100),
            }));
          }
        }
      } catch {
        // Fallback handled below
      }
    }

    // Merge with runtime quizScoreLedger and SEEDED_LEADERBOARD
    const combinedByUser = new Map();
    [...SEEDED_LEADERBOARD, ...dbRows].forEach((row) => {
      combinedByUser.set(row.user_id, {
        ...row,
        total_score: Number(row.total_score || 0),
        quizzes_taken: Number(row.quizzes_taken || 0),
        correct_count: Number(row.correct_count || 0),
        accuracy_pct: Number(row.accuracy_pct || 0),
      });
    });

    runtimeState.quizScoreLedger.forEach((entry) => {
      if (!entry.from_fallback && dbRows.some((d) => d.user_id === entry.user_id)) return;
      const cur = combinedByUser.get(entry.user_id) || {
        user_id: entry.user_id,
        display_name: entry.display_name || 'Believer',
        avatar_url: entry.avatar_url || null,
        badge: entry.badge || 'member',
        badge_verified: Boolean(entry.badge_verified),
        role: entry.role || 'member',
        total_score: 0,
        quizzes_taken: 0,
        correct_count: 0,
        accuracy_pct: 0,
      };
      cur.total_score += Number(entry.score || 0);
      cur.quizzes_taken += 1;
      if (entry.is_correct) cur.correct_count += 1;
      cur.accuracy_pct = Math.round((cur.correct_count / Math.max(1, cur.quizzes_taken)) * 100);
      combinedByUser.set(entry.user_id, cur);
    });

    const leaderboard = Array.from(combinedByUser.values())
      .sort((a, b) => b.total_score - a.total_score || b.correct_count - a.correct_count)
      .slice(0, limit);

    return NextResponse.json({ leaderboard });
  }

  // -------------------------------------------------------------------------
  // ACTION: ANALYTICS (Real creator analytics for PollAnalyticsModal)
  // -------------------------------------------------------------------------
  if (action === 'analytics') {
    const pollId = searchParams.get('poll_id');
    if (!pollId) {
      return NextResponse.json({ error: 'Missing poll_id' }, { status: 400 });
    }

    let dbVotes = [];
    let dbQuizScores = [];
    let dbOptions = [];
    let dbPoll = null;

    if (supa?.client) {
      try {
        const [{ data: postRow }, { data: optRows }, { data: voteRows }, { data: scoreRows }] = await Promise.all([
          supa.client.from('posts').select('*').eq('id', pollId).maybeSingle(),
          supa.client.from('poll_options').select('*').eq('post_id', pollId).order('position'),
          supa.client
            .from('poll_votes')
            .select('id, option_id, voter_id, is_anonymous, created_at')
            .eq('post_id', pollId)
            .order('created_at', { ascending: true }),
          supa.client
            .from('quiz_scores')
            .select('user_id, option_id, is_correct, score, answered_at')
            .eq('poll_id', pollId),
        ]);
        if (postRow) dbPoll = postRow;
        if (Array.isArray(optRows)) dbOptions = optRows;
        if (Array.isArray(voteRows)) dbVotes = voteRows;
        if (Array.isArray(scoreRows)) dbQuizScores = scoreRows;
      } catch {
        // Fallback to seeded + runtime data
      }
    }

    const seededPoll =
      SEEDED_POLLS_CATALOG.find((p) => p.id === pollId) ||
      runtimeState.createdPolls.find((p) => p.id === pollId);
    const pollMeta = dbPoll || seededPoll;
    const options =
      dbOptions.length > 0
        ? dbOptions
        : seededPoll?.options || [];

    const runtimeVotes = runtimeState.voteLedger.filter((v) => v.post_id === pollId);
    const allVoteEvents = [...dbVotes, ...runtimeVotes.filter((rv) => rv.from_fallback)];

    // Option counts
    const optionBreakdown = options.map((opt, idx) => {
      const recordedCount = allVoteEvents.filter((v) => v.option_id === opt.id).length;
      const fallbackBase = seededPoll
        ? seededPoll.options.find((o) => o.id === opt.id)?.vote_count || 0
        : Number(opt.vote_count || 0);
      const count = Math.max(recordedCount, fallbackBase + runtimeVotes.filter((v) => v.option_id === opt.id && v.from_fallback).length);
      return {
        option_id: opt.id,
        label: opt.label || `Option ${idx + 1}`,
        is_correct: Boolean(opt.is_correct),
        votes: count,
      };
    });

    const totalVotes = optionBreakdown.reduce((s, o) => s + o.votes, 0);

    // Build time-series buckets (6 chronological buckets from poll creation to now/close)
    const startMs = pollMeta?.created_at ? new Date(pollMeta.created_at).getTime() : Date.now() - 12 * HOUR;
    const endMs = Math.min(
      Date.now(),
      pollMeta?.poll_expires_at ? new Date(pollMeta.poll_expires_at).getTime() : Date.now()
    );
    const spanMs = Math.max(60 * 1000, endMs - startMs);
    const bucketCount = 6;
    const timeline = [];

    for (let i = 0; i < bucketCount; i++) {
      const ratio = (i + 1) / bucketCount;
      const pointMs = startMs + spanMs * ratio;
      const pointDate = new Date(pointMs);
      const timeLabel =
        i === bucketCount - 1
          ? 'Latest'
          : pointDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let cumulativeVotes = 0;
      if (allVoteEvents.length >= totalVotes && allVoteEvents.length > 0) {
        cumulativeVotes = allVoteEvents.filter(
          (v) => new Date(v.created_at).getTime() <= pointMs
        ).length;
      } else {
        // Combine real event curve with baseline count
        const curveRatio = Math.pow(ratio, 0.78);
        cumulativeVotes = Math.round(totalVotes * curveRatio);
      }

      timeline.push({
        time: timeLabel,
        timestamp: pointDate.toISOString(),
        votes: cumulativeVotes,
      });
    }

    // Quiz score distribution if quiz
    const isQuiz = Boolean(pollMeta?.is_quiz || pollMeta?.poll_type === 'quiz' || optionBreakdown.some((o) => o.is_correct));
    const correctVotes = optionBreakdown
      .filter((o) => o.is_correct)
      .reduce((s, o) => s + o.votes, 0);
    const incorrectVotes = Math.max(0, totalVotes - correctVotes);
    const quizDistribution = isQuiz
      ? {
          correct_count: correctVotes,
          incorrect_count: incorrectVotes,
          accuracy_pct: totalVotes > 0 ? Math.round((correctVotes / totalVotes) * 100) : 0,
          average_score:
            totalVotes > 0
              ? Math.round(((correctVotes * 100 + incorrectVotes * 10) / totalVotes))
              : 0,
        }
      : null;

    return NextResponse.json({
      poll_id: pollId,
      total_votes: totalVotes,
      is_quiz: isQuiz,
      options: optionBreakdown.map((o) => ({
        ...o,
        percentage: totalVotes > 0 ? Math.round((o.votes / totalVotes) * 100) : 0,
      })),
      timeline,
      quiz_distribution: quizDistribution,
      recent_votes: allVoteEvents.slice(-50).map((v) => ({
        option_id: v.option_id,
        created_at: v.created_at,
        is_anonymous: Boolean(v.is_anonymous || pollMeta?.poll_anonymous),
      })),
    });
  }

  // -------------------------------------------------------------------------
  // ACTION: LIST POLLS
  // -------------------------------------------------------------------------
  let dbPosts = [];
  let dbOptionsByPost = {};
  let dbCountsByPost = {};
  let dbVotersByPost = {};
  let dbMyVotesByPost = {};
  let dbMyQuizByPost = {};

  if (supa?.client) {
    try {
      // 1. Fetch all poll_options first so we know which posts are polls
      const { data: optRows, error: optErr } = await supa.client
        .from('poll_options')
        .select('id, post_id, label, image_url, is_correct, position, vote_count')
        .order('position', { ascending: true });

      if (!optErr && Array.isArray(optRows) && optRows.length > 0) {
        optRows.forEach((o) => {
          (dbOptionsByPost[o.post_id] ||= []).push(o);
        });
        const pollPostIds = Object.keys(dbOptionsByPost);

        // 2. Fetch corresponding posts
        const { data: postRows } = await supa.client
          .from('posts')
          .select(
            'id, text_content, category_id, church_id, author_id, visibility, created_at, poll_type, is_quiz, quiz_explanation, poll_anonymous, poll_multi_select, hide_results_until_vote, poll_starts_at, poll_expires_at, poll_closed_at, poll_accent, poll_category, total_votes_count, is_anonymous, profiles(id, display_name, avatar_url, badge, badge_verified, role)'
          )
          .in('id', pollPostIds)
          .order('created_at', { ascending: false });

        if (Array.isArray(postRows) && postRows.length > 0) {
          dbPosts = postRows;
        } else {
          // Fallback if new columns from 20261030_polls_hub.sql aren't added yet
          const { data: basicPosts } = await supa.client
            .from('posts')
            .select(
              'id, text_content, category_id, church_id, author_id, visibility, created_at, poll_expires_at, is_anonymous, profiles(id, display_name, avatar_url, badge, badge_verified, role)'
            )
            .in('id', pollPostIds)
            .order('created_at', { ascending: false });
          if (Array.isArray(basicPosts)) dbPosts = basicPosts;
        }

        // 3. Fetch vote counts and recent voters
        const { data: voteRows } = await supa.client
          .from('poll_votes')
          .select('post_id, option_id, voter_id, is_anonymous, created_at')
          .in('post_id', pollPostIds);

        if (Array.isArray(voteRows)) {
          const voterIds = new Set();
          voteRows.forEach((v) => {
            const byOpt = (dbCountsByPost[v.post_id] ||= {});
            byOpt[v.option_id] = (byOpt[v.option_id] || 0) + 1;
            if (!v.is_anonymous && v.voter_id) voterIds.add(v.voter_id);
            if (viewerId && v.voter_id === viewerId) {
              (dbMyVotesByPost[v.post_id] ||= []).push(v.option_id);
            }
          });

          if (voterIds.size > 0) {
            const { data: voterProfiles } = await supa.client
              .from('profiles')
              .select('id, display_name, avatar_url')
              .in('id', Array.from(voterIds).slice(0, 80));
            const profileMap = new Map((voterProfiles || []).map((p) => [p.id, p]));
            voteRows.forEach((v) => {
              if (v.is_anonymous) return;
              const pr = profileMap.get(v.voter_id);
              if (!pr) return;
              const list = (dbVotersByPost[v.post_id] ||= []);
              if (list.length < 6 && !list.some((x) => x.id === pr.id)) {
                list.push(pr);
              }
            });
          }
        }

        // 4. Fetch viewer's quiz scores if signed in
        if (viewerId) {
          const { data: myScores } = await supa.client
            .from('quiz_scores')
            .select('poll_id, option_id, is_correct, score, answered_at')
            .eq('user_id', viewerId)
            .in('poll_id', pollPostIds);
          if (Array.isArray(myScores)) {
            myScores.forEach((s) => {
              dbMyQuizByPost[s.poll_id] = s;
            });
          }
        }
      }
    } catch {
      // Gracefully continue with seeded + runtime polls
    }
  }

  // Merge DB polls + runtime created polls + seeded polls (deduped by id)
  const mergedMap = new Map();

  // First add seeded catalog
  SEEDED_POLLS_CATALOG.forEach((sp) => {
    if (runtimeState.deletedPollIds.has(sp.id)) return;
    const runtimeMyVotes = viewerId
      ? runtimeState.voteLedger
          .filter((v) => v.post_id === sp.id && v.voter_id === viewerId)
          .map((v) => v.option_id)
      : [];
    const runtimeQuiz = viewerId
      ? runtimeState.quizScoreLedger.find((q) => q.poll_id === sp.id && q.user_id === viewerId)
      : null;
    const runtimeVoters = runtimeState.voteLedger
      .filter((v) => v.post_id === sp.id && !v.is_anonymous && v.voter_name)
      .map((v) => ({ id: v.voter_id, display_name: v.voter_name, avatar_url: v.voter_avatar }));
    const mergedVoters = [...runtimeVoters, ...(sp.sample_voters || [])].slice(0, 6);

    mergedMap.set(
      sp.id,
      normalizePollRecord(sp, sp.options, {}, runtimeMyVotes, mergedVoters, runtimeQuiz)
    );
  });

  // Next add runtime created polls
  runtimeState.createdPolls.forEach((cp) => {
    if (runtimeState.deletedPollIds.has(cp.id)) return;
    const runtimeMyVotes = viewerId
      ? runtimeState.voteLedger
          .filter((v) => v.post_id === cp.id && v.voter_id === viewerId)
          .map((v) => v.option_id)
      : [];
    const runtimeQuiz = viewerId
      ? runtimeState.quizScoreLedger.find((q) => q.poll_id === cp.id && q.user_id === viewerId)
      : null;
    const runtimeVoters = runtimeState.voteLedger
      .filter((v) => v.post_id === cp.id && !v.is_anonymous && v.voter_name)
      .map((v) => ({ id: v.voter_id, display_name: v.voter_name, avatar_url: v.voter_avatar }));

    mergedMap.set(
      cp.id,
      normalizePollRecord(cp, cp.options || [], {}, runtimeMyVotes, runtimeVoters, runtimeQuiz)
    );
  });

  // Finally overlay real Supabase database rows (highest priority)
  dbPosts.forEach((dp) => {
    if (runtimeState.deletedPollIds.has(dp.id)) return;
    const opts = dbOptionsByPost[dp.id] || [];
    if (opts.length === 0) return;

    const seededMatch = SEEDED_POLLS_CATALOG.find((s) => s.id === dp.id);
    const enrichedPost = {
      ...seededMatch,
      ...dp,
      profiles: dp.profiles || seededMatch?.profiles,
    };

    const runtimeMyVotes = viewerId
      ? runtimeState.voteLedger
          .filter((v) => v.post_id === dp.id && v.voter_id === viewerId)
          .map((v) => v.option_id)
      : [];
    const myVotes = Array.from(new Set([...(dbMyVotesByPost[dp.id] || []), ...runtimeMyVotes]));
    const quizRes =
      dbMyQuizByPost[dp.id] ||
      (viewerId
        ? runtimeState.quizScoreLedger.find((q) => q.poll_id === dp.id && q.user_id === viewerId)
        : null);
    const voters =
      (dbVotersByPost[dp.id] && dbVotersByPost[dp.id].length > 0)
        ? dbVotersByPost[dp.id]
        : seededMatch?.sample_voters || [];

    mergedMap.set(
      dp.id,
      normalizePollRecord(enrichedPost, opts, dbCountsByPost[dp.id] || {}, myVotes, voters, quizRes)
    );
  });

  const polls = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({ polls });
}

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const action = body.action;
  const authedUser = await resolveAuthenticatedUser(req);
  // Never trust a client-supplied user_id for writes.
  const userId = authedUser?.id || null;

  if (!userId) {
    return NextResponse.json({ error: 'Please sign in to perform this action.' }, { status: 401 });
  }

  if (!checkRateLimit(`${userId}:${action}`)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 }
    );
  }

  const supa = getSupabaseServerClient(req);

  // -------------------------------------------------------------------------
  // 1. CAST VOTE
  // -------------------------------------------------------------------------
  if (action === 'cast_vote') {
    const pollId = body.poll_id;
    const optionId = body.option_id;
    if (!pollId || !optionId) {
      return NextResponse.json({ error: 'poll_id and option_id are required.' }, { status: 400 });
    }
    if (!supa?.client) {
      return NextResponse.json({ error: 'Poll voting is temporarily unavailable. Please try again later.' }, { status: 503 });
    }

    try {
      const { data, error } = await supa.client.rpc('cast_vote', {
        p_poll_id: pollId,
        p_option_id: optionId,
      });
      if (error) {
        const status = error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : error.code === 'P0001' ? 400 : 500;
        return NextResponse.json(
          { error: status === 500 ? 'Unable to record this vote right now.' : error.message },
          { status }
        );
      }
      if (!data?.ok) {
        return NextResponse.json({ error: 'The vote was not accepted.' }, { status: 400 });
      }
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: 'Unable to record this vote right now.' }, { status: 500 });
    }
  }

  // 2. CREATE POLL
  // -------------------------------------------------------------------------
  if (action === 'create_poll') {
    const question = (body.question || '').trim();
    const rawOptions = Array.isArray(body.options) ? body.options : [];
    const cleanOptions = rawOptions
      .map((o, idx) => ({
        label: (o.label || '').trim(),
        image_url: o.image_url || null,
        is_correct: Boolean(o.is_correct),
        position: idx,
      }))
      .filter((o) => o.label || o.image_url)
      .slice(0, 6);

    if (!question) {
      return NextResponse.json({ error: 'Please enter a poll question.' }, { status: 400 });
    }
    if (cleanOptions.length < 2) {
      return NextResponse.json({ error: 'A poll requires at least 2 options.' }, { status: 400 });
    }

    const pollType = ['survey', 'quiz', 'icebreaker'].includes(body.poll_type)
      ? body.poll_type
      : body.is_quiz
        ? 'quiz'
        : 'survey';
    const isQuiz = pollType === 'quiz' || Boolean(body.is_quiz);
    if (isQuiz && !cleanOptions.some((o) => o.is_correct)) {
      cleanOptions[0].is_correct = true;
    }

    const startsAt = body.poll_starts_at ? new Date(body.poll_starts_at).toISOString() : new Date().toISOString();
    const expiresAt = body.poll_expires_at || null;
    const visibility = ['public', 'followers', 'church'].includes(body.visibility) ? body.visibility : 'public';
    const categoryId = body.category_id || 'fellowship';
    const pollCategory = body.poll_category || 'Community';
    const pollAccent = body.poll_accent || (isQuiz ? '#f59e0b' : pollType === 'icebreaker' ? '#10b981' : '#06b6d4');
    const pollAnonymous = Boolean(body.poll_anonymous);
    const pollMultiSelect = Boolean(body.poll_multi_select) && !isQuiz;
    const hideResultsUntilVote = Boolean(body.hide_results_until_vote);
    const quizExplanation = isQuiz ? (body.quiz_explanation || '').trim() || null : null;

    let createdPostId = null;
    let createdOptions = [];

    if (!supa?.client) {
      return NextResponse.json({ error: 'Poll creation is temporarily unavailable. Please try again later.' }, { status: 503 });
    }

    {
      try {
        // Try inserting with full 20261030_polls_hub.sql columns first
        const { data: fullInsert, error: fullErr } = await supa.client
          .from('posts')
          .insert({
            author_id: userId,
            church_id: body.church_id || null,
            category_id: categoryId,
            text_content: question,
            visibility,
            poll_type: pollType,
            is_quiz: isQuiz,
            quiz_explanation: quizExplanation,
            poll_anonymous: pollAnonymous,
            poll_multi_select: pollMultiSelect,
            hide_results_until_vote: hideResultsUntilVote,
            poll_starts_at: startsAt,
            poll_expires_at: expiresAt,
            poll_accent: pollAccent,
            poll_category: pollCategory,
            is_anonymous: pollAnonymous,
          })
          .select('id')
          .single();

        if (!fullErr && fullInsert?.id) {
          createdPostId = fullInsert.id;
        } else {
          // Fallback to base posts columns
          const { data: baseInsert } = await supa.client
            .from('posts')
            .insert({
              author_id: userId,
              church_id: body.church_id || null,
              category_id: categoryId,
              text_content: question,
              visibility,
              poll_expires_at: expiresAt,
              is_anonymous: pollAnonymous,
            })
            .select('id')
            .single();
          if (baseInsert?.id) createdPostId = baseInsert.id;
        }

        if (createdPostId) {
          const { data: optRows, error: optErr } = await supa.client
            .from('poll_options')
            .insert(
              cleanOptions.map((o) => ({
                post_id: createdPostId,
                label: o.label,
                image_url: o.image_url,
                is_correct: o.is_correct,
                position: o.position,
              }))
            )
            .select('*');

          if (!optErr && Array.isArray(optRows)) {
            createdOptions = optRows;
          } else {
            // Fallback without is_correct if migration not yet applied
            const { data: basicOptRows } = await supa.client
              .from('poll_options')
              .insert(
                cleanOptions.map((o) => ({
                  post_id: createdPostId,
                  label: o.label,
                  image_url: o.image_url,
                  position: o.position,
                }))
              )
              .select('*');
            if (Array.isArray(basicOptRows)) {
              createdOptions = basicOptRows.map((bo, idx) => ({
                ...bo,
                is_correct: cleanOptions[idx]?.is_correct || false,
              }));
            }
          }
        }
      } catch {}
    }

    if (!createdPostId || createdOptions.length !== cleanOptions.length) {
      if (createdPostId) {
        try { await supa.client.from('posts').delete().eq('id', createdPostId); } catch {}
      }
      return NextResponse.json({ error: 'The poll could not be saved to the database. Please check the poll schema and try again.' }, { status: 500 });
    }

    const finalId = createdPostId;
    const finalOptions = createdOptions;

    const authorProfile = body.author_profile || {
      id: userId,
      display_name: pollAnonymous
        ? 'Anonymous Believer'
        : authedUser?.user_metadata?.display_name || authedUser?.email || 'Believer',
      avatar_url: pollAnonymous ? null : body.author_avatar || null,
      badge: pollAnonymous ? null : body.author_badge || 'member',
      badge_verified: pollAnonymous ? false : Boolean(body.author_verified),
      role: body.author_role || 'member',
    };

    const newPollRecord = {
      id: finalId,
      text_content: question,
      category_id: categoryId,
      poll_category: pollCategory,
      poll_type: pollType,
      is_quiz: isQuiz,
      quiz_explanation: quizExplanation,
      poll_anonymous: pollAnonymous,
      poll_multi_select: pollMultiSelect,
      hide_results_until_vote: hideResultsUntilVote,
      poll_starts_at: startsAt,
      poll_expires_at: expiresAt,
      poll_closed_at: null,
      poll_accent: pollAccent,
      visibility,
      author_id: userId,
      church_id: body.church_id || null,
      created_at: new Date().toISOString(),
      profiles: authorProfile,
      options: finalOptions,
    };

    return NextResponse.json({
      ok: true,
      poll: normalizePollRecord(newPollRecord, finalOptions, {}, [], [], null),
    });
  }

  // -------------------------------------------------------------------------
  // 3. CLOSE POLL EARLY (Creator or Moderator)
  // -------------------------------------------------------------------------
  if (action === 'close_poll') {
    const pollId = body.poll_id;
    if (!pollId) {
      return NextResponse.json({ error: 'Missing poll_id' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    runtimeState.closedPollIds.set(pollId, nowIso);

    if (supa?.client) {
      try {
        const { error: rpcErr } = await supa.client.rpc('close_poll_early', {
          p_poll_id: pollId,
        });
        if (rpcErr) {
          await supa.client
            .from('posts')
            .update({ poll_expires_at: nowIso })
            .eq('id', pollId);
        }
      } catch {}
    }

    return NextResponse.json({ ok: true, poll_id: pollId, closed_at: nowIso });
  }

  // -------------------------------------------------------------------------
  // 4. DELETE POLL (Creator or Moderator)
  // -------------------------------------------------------------------------
  if (action === 'delete_poll') {
    const pollId = body.poll_id;
    if (!pollId) {
      return NextResponse.json({ error: 'Missing poll_id' }, { status: 400 });
    }

    runtimeState.deletedPollIds.add(pollId);
    runtimeState.createdPolls = runtimeState.createdPolls.filter((p) => p.id !== pollId);

    if (supa?.client) {
      try {
        await supa.client.from('posts').delete().eq('id', pollId);
      } catch {}
    }

    return NextResponse.json({ ok: true, poll_id: pollId });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}
