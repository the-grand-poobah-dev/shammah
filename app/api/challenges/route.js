import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CATEGORIES = ['Prayer', 'Fasting', 'Scripture memory', 'Service', 'Worship', 'Generosity'];
const KINDS = ['daily', 'weekly', 'one_off', 'streak'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveSupabaseUrl() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (raw && /^https?:\/\//i.test(raw) && !/placeholder|your-project-url/i.test(raw)) return raw;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && serviceKey.split('.').length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64').toString('utf8'));
      if (payload?.ref) return 'https://' + payload.ref + '.supabase.co';
    } catch {}
  }
  return null;
}

function serviceClient() {
  const url = resolveSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function userClient(request) {
  const url = resolveSupabaseUrl();
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !token || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: 'Bearer ' + token } },
  });
}

async function sessionUser(request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const url = resolveSupabaseUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !url || !key) return null;
  try {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.getUser(token);
    return !error ? data?.user || null : null;
  } catch {
    return null;
  }
}

async function getProfile(db, userId) {
  if (!userId) return null;
  const { data } = await db.from('profiles').select('id, display_name, avatar_url, badge, role, church_id').eq('id', userId).maybeSingle();
  return data || null;
}

function isModerator(profile) {
  return ['admin', 'platform_admin', 'moderator'].includes(profile?.role);
}

function safeUrl(value) {
  if (!value) return null;
  try {
    const parsed = new URL(String(value).trim());
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function normalizeChallenge(row) {
  if (!row) return null;
  const tag = '#' + String(row.title || 'FaithChallenge').replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
  return {
    ...row,
    tag,
    tagline: row.description || '',
    participantsCount: Number(row.participants_count || 0),
    deadline: row.ends_at || null,
    isCompleted: row.status === 'completed',
  };
}

function normalizeSubmission(row, profiles = {}) {
  const author = profiles[row.user_id] || row.author || null;
  return {
    ...row,
    challengeId: row.challenge_id,
    videoUrl: row.video_url || row.media_url,
    audioTitle: row.audio_title || null,
    scripture: row.scripture || row.verse_ref || null,
    cheers: Number(row.like_count || row.votes_count || 0),
    commentsCount: Number(row.comment_count || 0),
    author: author ? {
      id: row.user_id,
      name: author.display_name || 'Shammah member',
      display_name: author.display_name || 'Shammah member',
      avatar: author.avatar_url || null,
      avatar_url: author.avatar_url || null,
      badge: author.badge || null,
      church_id: author.church_id || null,
    } : { id: row.user_id, name: 'Shammah member', avatar: null },
  };
}

async function profileMap(db, userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return {};
  const { data, error } = await db.from('profiles').select('id, display_name, avatar_url, badge, church_id').in('id', ids);
  if (error) throw error;
  return Object.fromEntries((data || []).map((profile) => [profile.id, profile]));
}

function visibleTo(row, user, profile) {
  if (row.visibility === 'public') return true;
  if (user?.id && row.creator_id === user.id) return true;
  if (isModerator(profile)) return true;
  return Boolean(row.visibility === 'church' && profile?.church_id && row.church_id === profile.church_id);
}

function jsonError(message, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(request) {
  const db = serviceClient();
  if (!db) return jsonError('Faith Challenges storage is not configured.', 503);
  const user = await sessionUser(request);
  const profile = await getProfile(db, user?.id);
  const params = new URL(request.url).searchParams;
  const action = params.get('action') || 'list';

  try {
    if (action === 'detail') {
      const id = params.get('id') || '';
      if (!UUID_RE.test(id)) return jsonError('A valid challenge ID is required.');
      const { data: challengeRow, error } = await db.from('challenges').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!challengeRow || !visibleTo(challengeRow, user, profile) || !['active', 'completed'].includes(challengeRow.status) && challengeRow.creator_id !== user?.id && !isModerator(profile)) {
        return jsonError('Challenge not found.', 404);
      }

      let participant = null;
      let checkins = [];
      if (user?.id) {
        const { data: part, error: partError } = await db.from('challenge_participants').select('*')
          .eq('challenge_id', id).eq('user_id', user.id).maybeSingle();
        if (partError) throw partError;
        participant = part || null;
        const { data: ownCheckins, error: checkinError } = await db.from('challenge_checkins').select('id, challenge_id, user_id, day, note, media_url, points_awarded, created_at')
          .eq('challenge_id', id).eq('user_id', user.id).order('day', { ascending: false }).limit(90);
        if (checkinError) throw checkinError;
        checkins = ownCheckins || [];
      }

      let submissionQuery = db.from('challenge_submissions').select('*').eq('challenge_id', id);
      if (challengeRow.creator_id === user?.id || isModerator(profile)) {
        submissionQuery = submissionQuery.in('status', ['approved', 'pending_review']);
      } else {
        submissionQuery = submissionQuery.or(user?.id ? 'status.eq.approved,user_id.eq.' + user.id : 'status.eq.approved');
      }
      const { data: submissionRows, error: submissionsError } = await submissionQuery
        .order('created_at', { ascending: false }).limit(60);
      if (submissionsError) throw submissionsError;
      const authors = await profileMap(db, (submissionRows || []).map((row) => row.user_id));
      const submissions = (submissionRows || []).map((row) => normalizeSubmission(row, authors));
      const scope = ['all', 'week', 'church'].includes(params.get('scope')) ? params.get('scope') : 'all';
      const rpcClient = user?.id ? (userClient(request) || db) : db;
      let leaderboard = [];
      if (rpcClient && (scope !== 'church' || user?.id)) {
        const { data, error: leaderboardError } = await rpcClient.rpc('challenge_leaderboard', { p_challenge_id: id, p_scope: scope });
        if (leaderboardError) throw leaderboardError;
        leaderboard = data || [];
      }
      const today = new Date().toISOString().slice(0, 10);
      const hasCheckedInToday = checkins.some((row) => String(row.day || '').slice(0, 10) === today);
      let userVotes = [];
      if (user?.id && submissions.length) {
        const { data: voteRows, error: voteError } = await db.from('challenge_votes').select('submission_id')
          .eq('user_id', user.id).in('submission_id', submissions.map((row) => row.id));
        if (voteError) throw voteError;
        userVotes = (voteRows || []).map((row) => row.submission_id);
      }
      const participantPayload = participant ? {
        ...participant,
        isJoined: true,
        has_checked_in_today: hasCheckedInToday,
      } : null;
      const recentCheckins = checkins.slice(0, 28);
      const challenge = normalizeChallenge(challengeRow);
      return NextResponse.json({
        ok: true, challenge, participant: participantPayload,
        has_checked_in_today: hasCheckedInToday, hasCheckedInToday,
        checkins, recent_checkins: recentCheckins,
        submissions, leaderboard, user_votes: userVotes,
      });
    }

    const category = (params.get('category') || 'All').trim();
    const sort = params.get('sort') || 'trending';
    const search = (params.get('search') || '').trim().toLowerCase().slice(0, 100);
    const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1);
    const pageSize = Math.min(24, Math.max(6, Number.parseInt(params.get('pageSize') || '12', 10) || 12));

    const { data: rows, error } = await db.from('challenges').select('*')
      .in('status', ['active', 'completed']).order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    const visibleRows = (rows || []).filter((row) => visibleTo(row, user, profile));
    let allChallenges = [...visibleRows];
    if (category !== 'All') allChallenges = allChallenges.filter((row) => row.category?.toLowerCase() === category.toLowerCase());
    if (search) allChallenges = allChallenges.filter((row) =>
      [row.title, row.description, row.rules_md, row.category].some((value) => String(value || '').toLowerCase().includes(search))
    );

    if (sort === 'newest') allChallenges.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    else if (sort === 'points_high') allChallenges.sort((a, b) => Number(b.points || 0) - Number(a.points || 0));
    else if (sort === 'most_participants' || sort === 'popular') allChallenges.sort((a, b) => Number(b.participants_count || 0) - Number(a.participants_count || 0));
    else allChallenges.sort((a, b) => Number(b.participants_count || 0) - Number(a.participants_count || 0) || new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const totalCount = allChallenges.length;
    const pageRows = allChallenges.slice((page - 1) * pageSize, page * pageSize);
    const normalizedChallenges = pageRows.map(normalizeChallenge);
    const activeRows = allChallenges.filter((row) => row.status === 'active');
    const todayChallenge = normalizeChallenge(activeRows[0] || null);

    let myActive = [];
    let userVotes = [];
    let earnedBadges = [];
    if (user?.id) {
      const { data: parts, error: partError } = await db.from('challenge_participants').select('*').eq('user_id', user.id);
      if (partError) throw partError;
      const byId = new Map(visibleRows.map((row) => [row.id, row]));
      myActive = (parts || []).map((part) => {
        const challenge = byId.get(part.challenge_id);
        return challenge ? { ...normalizeChallenge(challenge), ...part, user_points: part.points, has_checked_in_today: part.last_checkin_on === new Date().toISOString().slice(0, 10) } : null;
      }).filter(Boolean);
      const { data: awards, error: awardError } = await db.from('challenge_badge_awards').select('*')
        .eq('user_id', user.id).order('earned_at', { ascending: false }).limit(40);
      if (awardError && awardError.code !== '42P01') throw awardError;
      earnedBadges = (awards || []).map((award) => ({ ...award, earned: true, unlocked: true }));
    }

    const { data: submissionRows, error: subsError } = await db.from('challenge_submissions').select('*')
      .eq('status', 'approved').order('like_count', { ascending: false }).order('created_at', { ascending: false }).limit(8);
    if (subsError) throw subsError;
    const authors = await profileMap(db, (submissionRows || []).map((row) => row.user_id));
    const submissions = (submissionRows || []).map((row) => normalizeSubmission(row, authors));

    const { data: participantRows, error: leaderboardError } = await db.from('challenge_participants').select('user_id, points, streak_current, streak_best')
      .order('points', { ascending: false }).order('streak_best', { ascending: false }).limit(12);
    if (leaderboardError) throw leaderboardError;
    const leaderProfiles = await profileMap(db, (participantRows || []).map((row) => row.user_id));
    const leaderboard = (participantRows || []).map((row) => ({
      ...row, display_name: leaderProfiles[row.user_id]?.display_name || 'Shammah member',
      avatar_url: leaderProfiles[row.user_id]?.avatar_url || null, badge: leaderProfiles[row.user_id]?.badge || null,
    }));

    if (user?.id && submissions.length) {
      const { data: votes, error: votesError } = await db.from('challenge_votes').select('submission_id').eq('user_id', user.id)
        .in('submission_id', submissions.map((row) => row.id));
      if (votesError) throw votesError;
      userVotes = (votes || []).map((row) => row.submission_id);
    }

    return NextResponse.json({
      ok: true,
      challenges: normalizedChallenges,
      today_challenge: todayChallenge,
      my_active: myActive,
      submissions,
      leaderboard,
      badges: earnedBadges,
      user_votes: userVotes,
      totalCount,
      page,
      pageSize,
      hasMore: page * pageSize < totalCount,
      participantsTotal: visibleRows.reduce((sum, row) => sum + Number(row.participants_count || 0), 0),
      // Existing compatibility keys.
      todayChallenge,
      myActiveChallenges: myActive,
      trendingSubmissions: submissions,
      allChallenges: normalizedChallenges,
      badgesEarned: earnedBadges,
    });
  } catch (error) {
    console.error('Faith Challenges GET failed:', error?.message || error);
    return jsonError('Unable to load Faith Challenges right now. Please retry.', 500);
  }
}

export async function POST(request) {
  const db = serviceClient();
  if (!db) return jsonError('Faith Challenges storage is not configured.', 503);
  const user = await sessionUser(request);
  if (!user?.id) return jsonError('Please sign in to continue.', 401);
  const rpcClient = userClient(request);
  if (!rpcClient) return jsonError('Your authenticated session could not be verified. Please sign in again.', 401);
  const profile = await getProfile(db, user.id);

  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '');
    const challengeId = String(body.challengeId || '');
    const submissionId = String(body.submissionId || '');

    if (['join', 'checkin', 'submit', 'leave', 'close'].includes(action) && !UUID_RE.test(challengeId)) {
      return jsonError('A valid challenge ID is required.');
    }
    if (['vote', 'delete-submission', 'moderate-submission'].includes(action) && !UUID_RE.test(submissionId)) {
      return jsonError('A valid submission ID is required.');
    }

    if (action === 'join') {
      const { data, error } = await rpcClient.rpc('join_challenge', { p_challenge_id: challengeId });
      if (error) throw error;
      if (!data?.success) return jsonError(data?.error || 'Could not join this challenge.', 409);
      return NextResponse.json({ ok: true, participant: { ...data.participant, isJoined: true }, message: 'You joined this challenge.' });
    }

    if (action === 'checkin') {
      const note = String(body.note || '').trim().slice(0, 1000);
      const mediaUrl = body.mediaUrl ? safeUrl(body.mediaUrl) : null;
      if (body.mediaUrl && !mediaUrl) return jsonError('Choose a valid http or https media URL.');
      const { data, error } = await rpcClient.rpc('checkin', {
        p_challenge_id: challengeId, p_note: note || null, p_media_url: mediaUrl,
      });
      if (error) throw error;
      if (!data?.success) return jsonError(data?.error || 'Check-in failed.', /already checked in/i.test(data?.error || '') ? 409 : 400);
      return NextResponse.json({ ok: true, ...data });
    }

    if (action === 'submit') {
      const mediaUrl = safeUrl(body.mediaUrl);
      const mediaType = body.mediaType === 'video' ? 'video' : 'image';
      const caption = String(body.caption || '').trim().slice(0, 500);
      const hashtag = String(body.hashtag || '').trim().slice(0, 80);
      const scripture = String(body.scripture || '').trim().slice(0, 160);
      const audioTitle = String(body.audioTitle || '').trim().slice(0, 120);
      const thumbUrl = body.thumbUrl ? safeUrl(body.thumbUrl) : mediaUrl;
      if (!mediaUrl) return jsonError('Attach a valid photo or video URL.');
      if (caption.length < 3) return jsonError('Please add a caption of at least 3 characters.');
      if (body.thumbUrl && !thumbUrl) return jsonError('Thumbnail URL is invalid.');
      const { data: challenge, error: challengeError } = await db.from('challenges').select('id,status,visibility,creator_id,church_id')
        .eq('id', challengeId).maybeSingle();
      if (challengeError) throw challengeError;
      if (!challenge || challenge.status !== 'active') return jsonError('This challenge is not accepting submissions.', 409);
      if (challenge.visibility === 'private' && challenge.creator_id !== user.id) return jsonError('This challenge is private.', 403);
      if (challenge.visibility === 'church' && challenge.church_id !== profile?.church_id) return jsonError('This challenge is only available to its church community.', 403);
      const { data: participant, error: participantError } = await db.from('challenge_participants').select('user_id')
        .eq('challenge_id', challengeId).eq('user_id', user.id).maybeSingle();
      if (participantError) throw participantError;
      if (!participant) return jsonError('Join the challenge before submitting an entry.', 409);
      const { data, error } = await db.from('challenge_submissions').insert({
        challenge_id: challengeId, user_id: user.id, media_url: mediaUrl, video_url: mediaType === 'video' ? mediaUrl : null,
        media_type: mediaType, thumb_url: thumbUrl, caption, hashtag: hashtag || null, scripture: scripture || null,
        verse_ref: scripture || null, audio_title: audioTitle || null, like_count: 0, votes_count: 0,
        comment_count: 0, status: 'pending_review',
      }).select('*').single();
      if (error) throw error;
      return NextResponse.json({ ok: true, submission: data, message: 'Your entry was submitted for review.' }, { status: 201 });
    }

    if (action === 'vote') {
      const { data, error } = await rpcClient.rpc('vote_submission', { p_submission_id: submissionId });
      if (error) throw error;
      if (!data?.success) return jsonError(data?.error || 'Vote could not be recorded.', 400);
      return NextResponse.json({ ok: true, ...data });
    }

    if (action === 'create') {
      const title = String(body.title || '').trim().slice(0, 160);
      const description = String(body.description || '').trim().slice(0, 2000);
      const rulesMd = String(body.rulesMd || '').trim().slice(0, 12000);
      const category = String(body.category || 'Prayer');
      const kind = String(body.kind || 'daily');
      const durationDays = Number(body.durationDays || 7);
      const points = Number(body.points || 50);
      const coverUrl = safeUrl(body.coverUrl);
      const visibility = ['public', 'church', 'private'].includes(body.visibility) ? body.visibility : 'public';
      if (title.length < 5) return jsonError('Please enter a clear challenge title.');
      if (description.length < 10) return jsonError('Please provide a description of at least 10 characters.');
      if (!CATEGORIES.includes(category)) return jsonError('Choose a valid challenge category.');
      if (!KINDS.includes(kind)) return jsonError('Choose a valid challenge type.');
      if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365) return jsonError('Challenge duration must be 1 to 365 days.');
      if (!Number.isInteger(points) || points < 10 || points > 10000) return jsonError('Challenge points must be between 10 and 10000.');
      if (body.coverUrl && !coverUrl) return jsonError('Cover image URL is invalid.');
      if (visibility === 'church' && !profile?.church_id) return jsonError('Join a church before creating a church-only challenge.');
      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + durationDays * 86400000);
      const { data: challenge, error } = await db.from('challenges').insert({
        title, description, rules_md: rulesMd, category, kind, duration_days: durationDays,
        points, cover_url: coverUrl, accent: String(body.accent || '#8b5cf6').slice(0, 20),
        creator_id: user.id, church_id: visibility === 'church' ? profile.church_id : null,
        visibility, status: 'active', starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(),
        participants_count: 0,
      }).select('*').single();
      if (error) throw error;
      const { error: joinError } = await rpcClient.rpc('join_challenge', { p_challenge_id: challenge.id });
      if (joinError) console.error('Challenge creator auto-join failed:', joinError.message);
      return NextResponse.json({ ok: true, challenge: normalizeChallenge(challenge) }, { status: 201 });
    }

    if (action === 'leave') {
      const { data: existing, error: existingError } = await db.from('challenge_participants').select('challenge_id')
        .eq('challenge_id', challengeId).eq('user_id', user.id).maybeSingle();
      if (existingError) throw existingError;
      if (!existing) return jsonError('You have not joined this challenge.', 409);
      const { error } = await db.from('challenge_participants').delete().eq('challenge_id', challengeId).eq('user_id', user.id);
      if (error) throw error;
      const { count, error: countError } = await db.from('challenge_participants').select('user_id', { count: 'exact', head: true }).eq('challenge_id', challengeId);
      if (countError) throw countError;
      await db.from('challenges').update({ participants_count: count || 0 }).eq('id', challengeId);
      return NextResponse.json({ ok: true, left: true });
    }

    if (action === 'close') {
      const { data: challenge, error: challengeError } = await db.from('challenges').select('id,creator_id,status').eq('id', challengeId).maybeSingle();
      if (challengeError) throw challengeError;
      if (!challenge) return jsonError('Challenge not found.', 404);
      if (challenge.creator_id !== user.id && !isModerator(profile)) return jsonError('Only the challenge creator or a moderator can close it.', 403);
      const { data, error } = await db.from('challenges').update({ status: 'completed', ends_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', challengeId).select('*').single();
      if (error) throw error;
      return NextResponse.json({ ok: true, challenge: normalizeChallenge(data) });
    }

    if (action === 'moderate-submission') {
      const decision = String(body.decision || '');
      if (!['approve', 'reject'].includes(decision)) return jsonError('Choose approve or reject.');
      const { data: submission, error: submissionError } = await db.from('challenge_submissions').select('id,challenge_id,user_id,status')
        .eq('id', submissionId).maybeSingle();
      if (submissionError) throw submissionError;
      if (!submission) return jsonError('Submission not found.', 404);
      const { data: challenge, error: challengeError } = await db.from('challenges').select('creator_id').eq('id', submission.challenge_id).maybeSingle();
      if (challengeError) throw challengeError;
      if (challenge?.creator_id !== user.id && !isModerator(profile)) return jsonError('Only the challenge creator or a moderator can review submissions.', 403);
      const { data, error } = await db.from('challenge_submissions').update({ status: decision === 'approve' ? 'approved' : 'rejected' })
        .eq('id', submissionId).select('*').single();
      if (error) throw error;
      return NextResponse.json({ ok: true, submission: data });
    }

    if (action === 'delete-submission') {
      const { data: submission, error: submissionError } = await db.from('challenge_submissions').select('id,challenge_id,user_id')
        .eq('id', submissionId).maybeSingle();
      if (submissionError) throw submissionError;
      if (!submission) return jsonError('Submission not found.', 404);
      const { data: challenge, error: challengeError } = await db.from('challenges').select('creator_id').eq('id', submission.challenge_id).maybeSingle();
      if (challengeError) throw challengeError;
      if (submission.user_id !== user.id && challenge?.creator_id !== user.id && !isModerator(profile)) {
        return jsonError('You do not have permission to remove this submission.', 403);
      }
      const { error } = await db.from('challenge_submissions').delete().eq('id', submissionId);
      if (error) throw error;
      return NextResponse.json({ ok: true, message: 'Submission removed.' });
    }

    return jsonError('Unsupported Faith Challenges action.', 400);
  } catch (error) {
    console.error('Faith Challenges POST failed:', error?.message || error);
    return jsonError('Unable to complete this Faith Challenges action. Please retry.', 500);
  }
}
