'use client';

import { supabase } from '../../../lib/supabaseClient';

export const TRIVIA_QUESTIONS = [
  // Kids
  {
    tier: 'kids',
    tierLabel: 'Kids (Sunday School)',
    question: 'Who built the giant wooden ark to save the animals from the great flood?',
    options: ['Moses', 'Noah', 'David', 'Abraham'],
    correct: 1,
    scripture: 'Genesis 6:14 — "Make yourself an ark of gopher wood."',
  },
  {
    tier: 'kids',
    tierLabel: 'Kids (Sunday School)',
    question: 'What weapon did young David use to defeat the giant Goliath?',
    options: ['A heavy sword', 'A golden spear', 'A sling and five smooth stones', 'A bronze bow'],
    correct: 2,
    scripture: '1 Samuel 17:40 — "He took his staff in his hand, chose five smooth stones from the stream..."',
  },
  {
    tier: 'kids',
    tierLabel: 'Kids (Sunday School)',
    question: 'Which prophet was swallowed by a great fish when he tried to run from God?',
    options: ['Elijah', 'Jonah', 'Daniel', 'Samuel'],
    correct: 1,
    scripture: 'Jonah 1:17 — "Now the Lord provided a huge fish to swallow Jonah."',
  },
  {
    tier: 'kids',
    tierLabel: 'Kids (Sunday School)',
    question: 'How many loaves of bread and small fish did Jesus multiply to feed 5,000 men?',
    options: ['5 loaves and 2 fish', '7 loaves and 3 fish', '12 loaves and 1 fish', '2 loaves and 5 fish'],
    correct: 0,
    scripture: 'Matthew 14:17 — "We have here only five loaves of bread and two fish."',
  },

  // Teens
  {
    tier: 'teens',
    tierLabel: 'Teens (Gospels & Acts)',
    question: 'In which river was Jesus baptized by John the Baptist?',
    options: ['Nile River', 'Jordan River', 'Euphrates River', 'Tigris River'],
    correct: 1,
    scripture: 'Mark 1:9 — "Jesus came from Nazareth in Galilee and was baptized by John in the Jordan."',
  },
  {
    tier: 'teens',
    tierLabel: 'Teens (Gospels & Acts)',
    question: 'What was Apostle Paul’s Hebrew name before his miraculous encounter on the Damascus road?',
    options: ['Silas', 'Barnabas', 'Saul', 'Stephen'],
    correct: 2,
    scripture: "Acts 9:4 — \"He fell to the ground and heard a voice say to him, 'Saul, Saul, why do you persecute me?'\"",
  },
  {
    tier: 'teens',
    tierLabel: 'Teens (Gospels & Acts)',
    question: 'Who stepped out of the boat and walked on the stormy water toward Jesus?',
    options: ['John', 'Peter', 'James', 'Andrew'],
    correct: 1,
    scripture: 'Matthew 14:29 — "Then Peter got down out of the boat, walked on the water and came toward Jesus."',
  },
  {
    tier: 'teens',
    tierLabel: 'Teens (Gospels & Acts)',
    question: 'Which fruit of the Spirit is listed first in Galatians 5:22?',
    options: ['Joy', 'Peace', 'Love', 'Patience'],
    correct: 2,
    scripture: 'Galatians 5:22 — "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness..."',
  },

  // Youth & Adults
  {
    tier: 'youth',
    tierLabel: 'Youth & Adults (Theology & Epistles)',
    question: 'According to Hebrews 11:1, what is faith described as?',
    options: [
      'Confidence in what we hope for and assurance about what we do not see',
      'A warm feeling in our heart during worship',
      'Knowledge accumulated through ancient scriptures',
      'Belief without any evidence or trial',
    ],
    correct: 0,
    scripture: 'Hebrews 11:1 — "Now faith is confidence in what we hope for and assurance about what we do not see."',
  },
  {
    tier: 'youth',
    tierLabel: 'Youth & Adults (Theology & Epistles)',
    question: 'In Romans 8:37, believers are declared to be:',
    options: ['Striving servants', 'More than conquerors through Him who loved us', 'Wandering pilgrims', 'Doubtful seekers'],
    correct: 1,
    scripture: 'Romans 8:37 — "No, in all these things we are more than conquerors through him who loved us."',
  },
  {
    tier: 'youth',
    tierLabel: 'Youth & Adults (Theology & Epistles)',
    question: 'Who was the Roman governor that washed his hands during the trial of Jesus?',
    options: ['Pontius Pilate', 'Herod Antipas', 'Felix', 'Festus'],
    correct: 0,
    scripture: 'Matthew 27:24 — "When Pilate saw that he was getting nowhere... he took water and washed his hands before the crowd."',
  },
];

export const NOAH_ANIMALS = [
  { id: 'lion', emoji: '🦁', name: 'Lion' },
  { id: 'sheep', emoji: '🐑', name: 'Sheep' },
  { id: 'dove', emoji: '🕊️', name: 'Dove' },
  { id: 'giraffe', emoji: '🦒', name: 'Giraffe' },
  { id: 'camel', emoji: '🐪', name: 'Camel' },
  { id: 'elephant', emoji: '🐘', name: 'Elephant' },
];

async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return headers;
}

export async function getArcadeHubData({ game = 'trivia', scope = 'weekly' } = {}) {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (game) params.set('game', game);
  if (scope) params.set('scope', scope);

  const res = await fetch(`/api/arcade?${params.toString()}`, { headers, cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load arcade hub.');
  return data;
}

export async function getArcadeQuestions({ difficulty = 'all', category = 'all', limit = 10 } = {}) {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({
    action: 'questions',
    difficulty,
    category,
    limit: String(limit),
  });

  try {
    const res = await fetch(`/api/arcade?${params.toString()}`, { headers, cache: 'no-store' });
    const data = await res.json();
    if (data?.ok && data.questions?.length > 0) {
      return data.questions;
    }
  } catch (err) {
    console.warn('Questions API error, falling back to local pool:', err);
  }

  // Fallback to local questions
  return TRIVIA_QUESTIONS.map((q, idx) => ({
    id: `local-q-${idx}`,
    question: q.question,
    options: q.options,
    correct_index: q.correct,
    reference: q.scripture,
    category: 'Gospel',
    difficulty: q.tier,
  }));
}

export async function submitArcadeScore({ gameSlug, score, durationMs = 0, meta = {} }) {
  const payload = {
    gameSlug,
    score: Math.max(0, parseInt(score, 10) || 0),
    durationMs: Math.max(0, parseInt(durationMs, 10) || 0),
    meta,
    clientTimestamp: Date.now(),
  };

  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/arcade/score', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Score submission rejected.');
    }

    // Try flushing offline queue if successful
    syncOfflineScores();

    return data;
  } catch (error) {
    console.warn('Online score submission failed, queuing in localStorage cache:', error);
    // Queue offline
    queueOfflineScore(payload);
    return {
      ok: true,
      score: payload.score,
      bestScore: payload.score,
      isNewBest: true,
      streak: 1,
      unlockedAchievements: [],
      isOfflineCached: true,
    };
  }
}

function queueOfflineScore(payload) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('shammah_arcade_offline_scores');
    const queue = raw ? JSON.parse(raw) : [];
    queue.push({ ...payload, queuedAt: Date.now() });
    localStorage.setItem('shammah_arcade_offline_scores', JSON.stringify(queue.slice(-20)));
  } catch {}
}

export async function syncOfflineScores() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('shammah_arcade_offline_scores');
    if (!raw) return;
    const queue = JSON.parse(raw);
    if (!Array.isArray(queue) || queue.length === 0) return;

    const headers = await getAuthHeaders();
    const remaining = [];

    for (const item of queue) {
      try {
        await fetch('/api/arcade/score', {
          method: 'POST',
          headers,
          body: JSON.stringify(item),
        });
      } catch {
        remaining.push(item);
      }
    }

    if (remaining.length === 0) {
      localStorage.removeItem('shammah_arcade_offline_scores');
    } else {
      localStorage.setItem('shammah_arcade_offline_scores', JSON.stringify(remaining));
    }
  } catch {}
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflineScores();
  });
}
