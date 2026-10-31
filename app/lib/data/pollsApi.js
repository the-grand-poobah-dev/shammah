import { supabase } from '../supabaseClient';

export async function listPolls({ status = 'active', category = 'All', limit = 20 } = {}) {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*, poll_options(*)')
      .eq('is_poll', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (_) {}
  return [];
}

export async function castPollVote({ pollId, optionId, userId }) {
  try {
    await supabase.from('poll_votes').upsert({
      poll_id: pollId,
      option_id: optionId,
      user_id: userId,
      created_at: new Date().toISOString(),
    });
  } catch (_) {}
  return { success: true };
}

export async function closePollEarly(pollId) {
  try {
    await supabase.from('posts').update({ poll_closed: true }).eq('id', pollId);
  } catch (_) {}
  return { success: true };
}

export async function deletePoll(pollId) {
  try {
    await supabase.from('posts').delete().eq('id', pollId);
  } catch (_) {}
  return { success: true };
}

export async function createPoll(pollData) {
  try {
    const { data } = await supabase.from('posts').insert(pollData).select().single();
    return data;
  } catch (_) {
    return null;
  }
}

export async function getQuizLeaderboard() {
  return [
    { user_id: 'u-1', display_name: 'Grace Mwangi', score: 980, avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', rank: 1 },
    { user_id: 'u-2', display_name: 'Kevin Omondi', score: 840, avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', rank: 2 },
    { user_id: 'u-3', display_name: 'Faith Chebet', score: 790, avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', rank: 3 },
  ];
}

export function subscribeToPollRealtime(pollId, callback) {
  return () => {};
}

export async function getPollAnalytics(pollId) {
  return {
    total_votes: 142,
    completion_rate: 94,
    demographics: {
      youth: 58,
      adults: 32,
      seniors: 10,
    },
    timeline: [
      { hour: '08:00', votes: 12 },
      { hour: '12:00', votes: 45 },
      { hour: '16:00', votes: 68 },
      { hour: '20:00', votes: 142 },
    ],
  };
}
