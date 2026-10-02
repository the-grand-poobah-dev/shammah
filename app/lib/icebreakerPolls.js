'use client';
import { playSound } from './soundEffects';

const ICEBREAKER_POLLS_KEY = 'shammah_institution_icebreaker_polls_v1';
const USER_VOTES_KEY = 'shammah_anon_poll_votes_v1';

export const DEFAULT_ICEBREAKER_POLLS = [
  {
    id: 'poll-sermon-1',
    churchId: 'inst-citam',
    churchName: 'CITAM Valley Road',
    category: 'Sunday Sermon Icebreaker',
    question: 'During today’s sermon on "Faith Over Fear", which area of your life needs the most prayer right now?',
    context: 'Sunday Service Live Survey · 100% Anonymous Reflection',
    targetGroup: 'All Congregation',
    active: true,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    options: [
      { id: 'opt-1', label: 'Financial provision & job transitions', votes: 142 },
      { id: 'opt-2', label: 'Family relationships, healing & marriage', votes: 189 },
      { id: 'opt-3', label: 'Overcoming anxiety & mental exhaustion', votes: 215 },
      { id: 'opt-4', label: 'Spiritual breakthrough & consistency in prayer', votes: 268 },
    ],
  },
  {
    id: 'poll-youth-1',
    churchId: 'inst-uon-cu',
    churchName: 'University of Nairobi Christian Union',
    category: 'Youth & Campus Icebreaker',
    question: 'Campus Quick Poll: What is the biggest challenge Christian students face on campus today?',
    context: 'Weekly Wednesday Fellowship · Real-Time Anonymous Survey',
    targetGroup: 'Youth & Campus Students',
    active: true,
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    options: [
      { id: 'opt-y1', label: 'Balancing hectic academics with spiritual life', votes: 94 },
      { id: 'opt-y2', label: 'Peer pressure & compromised lifestyle choices', votes: 112 },
      { id: 'opt-y3', label: 'Loneliness, finding godly mentors & friends', votes: 76 },
      { id: 'opt-y4', label: 'Financial hardship & campus living expenses', votes: 135 },
    ],
  },
  {
    id: 'poll-bsf-1',
    churchId: 'inst-bsf',
    churchName: 'Bible Study Fellowship Nairobi',
    category: 'Bible Class Discussion',
    question: 'How many days this past week did you spend quiet time in God’s Word?',
    context: 'Class Discussion Starter · Anonymous Accountability Poll',
    targetGroup: 'Bible Study Groups',
    active: true,
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    options: [
      { id: 'opt-b1', label: 'Daily (6–7 days) with deep journaling', votes: 68 },
      { id: 'opt-b2', label: '3 to 5 days, growing in consistency', votes: 142 },
      { id: 'opt-b3', label: '1 to 2 days, seeking to restart my habit', votes: 85 },
      { id: 'opt-b4', label: 'Struggled this week, need encouragement', votes: 44 },
    ],
  },
  {
    id: 'poll-kids-1',
    churchId: 'inst-mavuno',
    churchName: 'Mavuno Church Mashariki',
    category: 'Kids & Teens Sunday School',
    question: 'Kids Sunday Icebreaker: Which hero from the Bible inspires your courage the most?',
    context: 'Kids & Teens Class Interactive Poll',
    targetGroup: 'Kids & Teens',
    active: true,
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    options: [
      { id: 'opt-k1', label: 'David confronting Goliath with a sling & five stones 🪨', votes: 178 },
      { id: 'opt-k2', label: 'Queen Esther standing up with bold prayer 👑', votes: 124 },
      { id: 'opt-k3', label: 'Daniel peaceful in the lions’ den 🦁', votes: 165 },
      { id: 'opt-k4', label: 'Peter stepping out onto the stormy water 🌊', votes: 98 },
    ],
  },
];

export function getIcebreakerPolls() {
  if (typeof window === 'undefined') return DEFAULT_ICEBREAKER_POLLS;
  try {
    const raw = localStorage.getItem(ICEBREAKER_POLLS_KEY);
    if (!raw) {
      localStorage.setItem(ICEBREAKER_POLLS_KEY, JSON.stringify(DEFAULT_ICEBREAKER_POLLS));
      return DEFAULT_ICEBREAKER_POLLS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_ICEBREAKER_POLLS;
  }
}

export function getPollsForInstitution(churchId) {
  const all = getIcebreakerPolls();
  return all.filter((p) => p.churchId === churchId);
}

export function getUserVotes() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(USER_VOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function voteOnIcebreakerPoll(pollId, optionId) {
  if (typeof window === 'undefined') return;
  try {
    const allVotes = getUserVotes();
    if (allVotes[pollId]) return; // already voted anonymously

    const polls = getIcebreakerPolls();
    const updated = polls.map((p) => {
      if (p.id !== pollId) return p;
      return {
        ...p,
        options: p.options.map((opt) =>
          opt.id === optionId ? { ...opt, votes: (opt.votes || 0) + 1 } : opt
        ),
      };
    });

    localStorage.setItem(ICEBREAKER_POLLS_KEY, JSON.stringify(updated));
    allVotes[pollId] = optionId;
    localStorage.setItem(USER_VOTES_KEY, JSON.stringify(allVotes));

    playSound('reaction');
    window.dispatchEvent(new CustomEvent('shammah:icebreaker-polls-updated'));
  } catch (err) {
    console.error('Failed to vote on icebreaker poll', err);
  }
}

export function createIcebreakerPoll({
  churchId,
  churchName,
  category = 'Sunday Sermon Icebreaker',
  question,
  context,
  targetGroup = 'All Congregation',
  options,
}) {
  if (typeof window === 'undefined') return null;
  try {
    const polls = getIcebreakerPolls();
    const newPoll = {
      id: `poll-${Date.now()}`,
      churchId,
      churchName,
      category,
      question,
      context: context || `${category} · 100% Anonymous Reflection`,
      targetGroup,
      active: true,
      createdAt: new Date().toISOString(),
      options: options
        .filter((o) => o && o.trim())
        .map((label, idx) => ({ id: `opt-${Date.now()}-${idx}`, label: label.trim(), votes: 0 })),
    };

    const nextList = [newPoll, ...polls];
    localStorage.setItem(ICEBREAKER_POLLS_KEY, JSON.stringify(nextList));
    playSound('postPublished');
    window.dispatchEvent(new CustomEvent('shammah:icebreaker-polls-updated'));
    return newPoll;
  } catch (err) {
    console.error('Failed to create icebreaker poll', err);
    return null;
  }
}
