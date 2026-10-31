/**
 * Daily Fellowship Icebreaker Polls Engine (Supabase-backed compatibility shim)
 *
 * All icebreaker polls, options, and votes are persisted in Supabase (`posts`,
 * `poll_options`, `poll_votes`) via `/api/polls` and `pollsApi.js`.
 * Exports are retained for backward compatibility with existing components.
 */

import { listPolls, castPollVote, createPoll, deletePoll } from './data/pollsApi';

export const DEFAULT_ICEBREAKER_POLLS = [
  {
    id: 'c4000000-0000-0000-0000-000000000001',
    question: 'How is your spirit feeling walking into fellowship today?',
    category: 'Icebreaker',
    emoji: '🕊️',
    authorName: 'Pastor Grace Wanjiku',
    isAnonymous: true,
    createdAt: new Date().toISOString(),
    options: [
      { id: 'd4000001-0000-0000-0000-000000000001', label: "🔥 On fire & grateful for God's grace", votes: 58 },
      { id: 'd4000001-0000-0000-0000-000000000002', label: '🕊️ Seeking quiet peace & renewal', votes: 41 },
      { id: 'd4000001-0000-0000-0000-000000000003', label: '🙏 Standing in prayer for a breakthrough', votes: 29 },
      { id: 'd4000001-0000-0000-0000-000000000004', label: '💪 Ready to serve & encourage someone', votes: 14 },
    ],
  },
  {
    id: 'c4000000-0000-0000-0000-000000000002',
    question: 'What is your go-to way to connect with God first thing in the morning?',
    category: 'Icebreaker',
    emoji: '☀️',
    authorName: 'David Omondi · Youth Ministry',
    isAnonymous: false,
    createdAt: new Date().toISOString(),
    options: [
      { id: 'd4000002-0000-0000-0000-000000000001', label: '🎶 Worship playlist on full volume', votes: 44 },
      { id: 'd4000002-0000-0000-0000-000000000002', label: '📖 Reading a chapter in Psalms or Proverbs', votes: 39 },
      { id: 'd4000002-0000-0000-0000-000000000003', label: '☕ Quiet prayer over morning chai/coffee', votes: 35 },
    ],
  },
  {
    id: 'c4000000-0000-0000-0000-000000000003',
    question: 'Sunday afternoon vibes after church service:',
    category: 'Icebreaker',
    emoji: '🍛',
    authorName: 'Deacon Mary Njoroge',
    isAnonymous: false,
    createdAt: new Date().toISOString(),
    options: [
      { id: 'd4000003-0000-0000-0000-000000000001', label: '🍛 Nyama choma & fellowship with family', votes: 67 },
      { id: 'd4000003-0000-0000-0000-000000000002', label: '😴 Legendary 2-hour Sunday afternoon nap', votes: 59 },
      { id: 'd4000003-0000-0000-0000-000000000003', label: '🎤 Choir & youth ministry rehearsal', votes: 37 },
    ],
  },
];

function mapPollToIcebreaker(p) {
  return {
    id: p.id,
    question: p.text_content,
    category: p.poll_category || 'Icebreaker',
    emoji: '🕊️',
    authorName: p.poll_anonymous
      ? 'Anonymous Member'
      : p.profiles?.display_name || 'Church Ministry',
    isAnonymous: Boolean(p.poll_anonymous),
    createdAt: p.created_at,
    myVote: p.my_votes?.[0] || null,
    options: (p.options || []).map((o) => ({
      id: o.id,
      label: o.label,
      votes: Number(p.counts?.[o.id] ?? o.vote_count ?? 0),
    })),
  };
}

export async function fetchIcebreakerPollsFromDb(userId = null) {
  try {
    const allPolls = await listPolls({ userId });
    const icebreakers = allPolls.filter((p) => p.poll_type === 'icebreaker');
    if (icebreakers.length > 0) {
      return icebreakers.map(mapPollToIcebreaker);
    }
  } catch {}
  return DEFAULT_ICEBREAKER_POLLS;
}

export function getIcebreakerPolls() {
  return DEFAULT_ICEBREAKER_POLLS;
}

export function getIcebreakerVotes() {
  return {};
}

export function getUserVotes() {
  return getIcebreakerVotes();
}

export async function voteInIcebreakerPoll(pollId, optionId, userId = null) {
  if (!userId) return { polls: DEFAULT_ICEBREAKER_POLLS, votes: {} };
  await castPollVote({ pollId, optionId, userId });
  const polls = await fetchIcebreakerPollsFromDb(userId);
  const votes = {};
  polls.forEach((p) => {
    if (p.myVote) votes[p.id] = p.myVote;
  });
  return { polls, votes };
}

export async function createIcebreakerPoll({
  question,
  category = 'Icebreaker',
  options = [],
  authorName = 'Member',
  isAnonymous = false,
  userId = null,
}) {
  if (!question || options.length < 2) return null;
  const created = await createPoll({
    user_id: userId,
    question: question.trim(),
    poll_type: 'icebreaker',
    poll_category: category,
    poll_anonymous: isAnonymous,
    options: options.map((label, idx) => ({
      label: typeof label === 'string' ? label.trim() : label.label,
      position: idx,
    })),
    author_profile: {
      id: userId,
      display_name: isAnonymous ? 'Anonymous Member' : authorName,
    },
  });
  return created ? mapPollToIcebreaker(created) : null;
}

export async function deleteIcebreakerPoll(pollId, userId = null) {
  await deletePoll({ pollId, userId });
  return fetchIcebreakerPollsFromDb(userId);
}
