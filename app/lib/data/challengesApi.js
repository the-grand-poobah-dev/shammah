import { supabase } from '../../../lib/supabaseClient';

// Compatibility shim for existing components importing INITIAL_CHALLENGES / INITIAL_SUBMISSIONS
export const INITIAL_CHALLENGES = [
  {
    id: 'c1000000-0000-4000-a000-000000000001',
    title: '#ScriptureIn60s Challenge',
    tag: '#ScriptureIn60s',
    tagline: 'Recite or dramatize your favorite Bible verse with passion in under 60 seconds!',
    icon: '⚡',
    badge: 'Trending #1',
    category: 'Scripture memory',
    participantsCount: 1420,
    cheersCount: 8930,
    deadline: 'Active this week',
    accent: '#8b5cf6',
  },
  {
    id: 'c1000000-0000-4000-a000-000000000006',
    title: '#AcousticWorship Challenge',
    tag: '#AcousticWorship',
    tagline: 'Record a raw acoustic, piano, or acapella worship chorus that lifts Jesus high.',
    icon: '🎸',
    badge: 'Popular',
    category: 'Worship',
    participantsCount: 980,
    cheersCount: 6540,
    deadline: '4 days left',
    accent: '#ef4444',
  },
  {
    id: 'c1000000-0000-4000-a000-000000000005',
    title: '#SundayFitCheck & Scripture',
    tag: '#SundayFitCheck',
    tagline: 'Show your Sunday best church outfit paired with your posture of worship (Psalm 96:9).',
    icon: '👗',
    badge: 'Youth & Teens',
    category: 'Service',
    participantsCount: 1850,
    cheersCount: 12400,
    deadline: 'Active this Sunday',
    accent: '#ec4899',
  },
  {
    id: 'c1000000-0000-4000-a000-000000000004',
    title: '#1MinTestimony Miracle',
    tag: '#1MinTestimony',
    tagline: 'Share a 60-second testimony of God’s goodness, healing, or answered prayer.',
    icon: '🕊️',
    badge: 'Faith Builder',
    category: 'Prayer',
    participantsCount: 760,
    cheersCount: 4890,
    deadline: 'Ongoing daily',
    accent: '#f59e0b',
  },
];

export const INITIAL_SUBMISSIONS = [
  {
    id: 'd1000000-0000-4000-b000-000000000001',
    challengeId: 'c1000000-0000-4000-a000-000000000002',
    challengeTag: '#ScriptureIn60s',
    title: 'Romans 8:31-39 in one continuous breath! 🔥',
    author: {
      id: 'p-samuel',
      name: 'Evangelist Samuel',
      badge: 'youth',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      branch: 'UoN Christian Union',
    },
    videoUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600',
    audioTitle: 'Deep Worship Beat · Original Praise Sound',
    cheers: 842,
    commentsCount: 67,
    scripture: 'Romans 8:37',
    description: 'No matter what youth face on campus, in all these things we are MORE than conquerors! Tag someone who needs courage today! 🙏',
  },
  {
    id: 'd1000000-0000-4000-b000-000000000002',
    challengeId: 'c1000000-0000-4000-a000-000000000006',
    challengeTag: '#AcousticWorship',
    title: 'Way Maker (Swahili & English Acoustic Mashup)',
    author: {
      id: 'p-mary',
      name: 'Sister Mary Grace',
      badge: 'worship',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      branch: 'CITAM Woodley Youth',
    },
    videoUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
    audioTitle: 'Acoustic Guitar in E Major · Mary Grace',
    cheers: 1240,
    commentsCount: 114,
    scripture: 'Psalm 100:1-2',
    description: 'Bwana anafanya njia pasipo na njia. Recorded this during morning devotion before class. God is so good!',
  },
];

async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  } catch {}
  return headers;
}

export async function listChallenges({ category = 'All', sort = 'popular', search = '', userId = null } = {}) {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (category && category !== 'All') params.set('category', category);
  if (sort) params.set('sort', sort);
  if (search) params.set('search', search);
  if (userId) params.set('userId', userId);

  const res = await fetch(`/api/challenges?${params.toString()}`, { headers, cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load challenges.');
  return data;
}

export async function getChallengeDetail(id) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/challenges?action=detail&id=${encodeURIComponent(id)}`, { headers, cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load challenge details.');
  return data;
}

export async function joinChallenge(challengeId) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/challenges', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'join', challengeId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to join challenge.');
  return data;
}

export async function checkinChallenge({ challengeId, note = '', mediaUrl = null }) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/challenges', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'checkin', challengeId, note, mediaUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Check-in failed.');
  return data;
}

export async function submitChallengeEntry({
  challengeId,
  mediaUrl,
  thumbUrl = null,
  caption = '',
  hashtag = '',
  scripture = '',
  audioTitle = '',
}) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/challenges', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'submit',
      challengeId,
      mediaUrl,
      thumbUrl,
      caption,
      hashtag,
      scripture,
      audioTitle,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to publish challenge entry.');
  return data.submission;
}

export async function voteChallengeSubmission(submissionId) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/challenges', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'vote', submissionId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to cheer submission.');
  return data;
}

export async function createChallenge(payload) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/challenges', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'create', ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create challenge.');
  return data.challenge;
}

export async function deleteChallengeSubmission(submissionId) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/challenges', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'delete-submission', submissionId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete submission.');
  return data;
}
