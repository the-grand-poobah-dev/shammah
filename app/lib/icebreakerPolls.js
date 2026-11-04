/**
 * Daily Fellowship Icebreaker Polls Engine (Supabase-backed compatibility shim)
 *
 * All icebreaker polls, options, and votes are persisted in Supabase (`posts`,
 * `poll_options`, `poll_votes`) via `/api/polls` and `pollsApi.js`.
 * Exports are retained for backward compatibility with existing components.
 */

import { listPolls, castPollVote, createPoll, deletePoll } from './data/pollsApi';

// Demo content is stored in supabase/seed_polls.sql; never fabricate live poll data.
export const DEFAULT_ICEBREAKER_POLLS = [];

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
  return [];
}

export function getIcebreakerPolls() {
  return [];
}

export function getIcebreakerVotes() {
  return {};
}

export async function voteInIcebreakerPoll(pollId, optionId, userId = null) {
  if (!userId) return { polls: [], votes: {} };
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
