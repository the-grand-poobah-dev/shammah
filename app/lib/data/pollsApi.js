'use client';

import { supabase } from '../../../lib/supabaseClient';

async function getAuthHeaders() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/**
 * Fetch all polls (Surveys, Faith Quizzes, Icebreakers, Live Ending Soon, Closed Polls)
 */
export async function listPolls({ userId = null } = {}) {
  const headers = await getAuthHeaders();
  const qs = new URLSearchParams({ action: 'list' });
  if (userId) qs.set('user_id', userId);

  const res = await fetch(`/api/polls?${qs.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...headers,
    },
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load polls');
  }
  return Array.isArray(data.polls) ? data.polls : [];
}

/**
 * Cast a vote on a poll option via server-validated cast_vote RPC & route handler
 */
export async function castPollVote({
  pollId,
  optionId,
  userId,
  voterName,
  voterAvatar,
  voterBadge,
  voterVerified,
}) {
  const headers = await getAuthHeaders();

  // First try server API (which invokes cast_vote RPC and enforces all rules)
  const res = await fetch('/api/polls', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      action: 'cast_vote',
      poll_id: pollId,
      option_id: optionId,
      user_id: userId,
      voter_name: voterName,
      voter_avatar: voterAvatar,
      voter_badge: voterBadge,
      voter_verified: voterVerified,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Unable to record vote');
  }
  return data;
}

/**
 * Upload an option image to Supabase Storage (poll-images or post-media bucket)
 */
export async function uploadPollOptionImage(file, userId) {
  if (!file) return null;
  const safeName = (file.name || 'option.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId || 'anon'}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${safeName}`;

  for (const bucket of ['poll-images', 'post-media']) {
    try {
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        if (data?.publicUrl) return data.publicUrl;
      }
    } catch {}
  }

  // Fallback to object URL if storage bucket is unavailable in preview
  return URL.createObjectURL(file);
}

/**
 * Create a new Poll, Faith Quiz, or Icebreaker
 */
export async function createPoll(payload) {
  const headers = await getAuthHeaders();

  // Upload any attached option files first
  const uploadedOptions = await Promise.all(
    (payload.options || []).map(async (opt, idx) => {
      let imageUrl = opt.image_url || null;
      if (opt.file) {
        imageUrl = await uploadPollOptionImage(opt.file, payload.user_id);
      } else if (opt.preview && opt.preview.startsWith('http')) {
        imageUrl = opt.preview;
      }
      return {
        label: (opt.label || '').trim(),
        image_url: imageUrl,
        is_correct: Boolean(opt.is_correct),
        position: idx,
      };
    })
  );

  const res = await fetch('/api/polls', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      action: 'create_poll',
      ...payload,
      options: uploadedOptions,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to publish poll');
  }
  return data.poll;
}

/**
 * Close a poll early (creator or church/platform moderator)
 */
export async function closePollEarly({ pollId, userId }) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/polls', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      action: 'close_poll',
      poll_id: pollId,
      user_id: userId,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to close poll early');
  }
  return data;
}

/**
 * Delete a poll (creator or church/platform moderator)
 */
export async function deletePoll({ pollId, userId }) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/polls', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      action: 'delete_poll',
      poll_id: pollId,
      user_id: userId,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete poll');
  }
  return data;
}

/**
 * Fetch detailed analytics for a poll (timeline, option breakdown, quiz accuracy, CSV data)
 */
export async function getPollAnalytics(pollId) {
  const headers = await getAuthHeaders();
  const qs = new URLSearchParams({ action: 'analytics', poll_id: pollId });
  const res = await fetch(`/api/polls?${qs.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...headers,
    },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load poll analytics');
  }
  return data;
}

/**
 * Fetch weekly Faith Quiz leaderboard
 */
export async function getQuizLeaderboard(limit = 10) {
  const headers = await getAuthHeaders();
  const qs = new URLSearchParams({ action: 'leaderboard', limit: String(limit) });
  const res = await fetch(`/api/polls?${qs.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...headers,
    },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load quiz leaderboard');
  }
  return Array.isArray(data.leaderboard) ? data.leaderboard : [];
}

/**
 * Subscribe to real-time vote updates on public.poll_votes and public.quiz_scores
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToPollRealtime(onUpdate) {
  if (!supabase?.channel) return () => {};

  const channel = supabase
    .channel(`polls-live-${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'poll_votes' },
      (payload) => {
        if (typeof onUpdate === 'function') {
          onUpdate({ type: 'vote', payload });
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'quiz_scores' },
      (payload) => {
        if (typeof onUpdate === 'function') {
          onUpdate({ type: 'quiz_score', payload });
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      (payload) => {
        if (typeof onUpdate === 'function') {
          onUpdate({ type: 'post', payload });
        }
      }
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {}
  };
}
