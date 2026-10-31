export const INITIAL_CHALLENGES = [
  {
    id: 'chal-1',
    title: '21 Days of Radical Gratitude & Generosity',
    description: 'Daily scripture meditation, thanksgiving journal entry, and a secret act of kindness for someone in your neighborhood.',
    category: 'Daily Habit',
    streak_days: 21,
    accent: '#ec4899',
    participants_count: 486,
    active_streak: 7,
    completed_today: false,
    end_date: new Date(Date.now() + 86400000 * 14).toISOString(),
    creator: {
      display_name: 'Pastor David Karanja',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      badge: 'pastor',
      verified: true,
    },
  },
  {
    id: 'chal-2',
    title: 'Dawn Watch: 5 AM Prayer Streak',
    description: 'Join believers across East Africa for 15 minutes of uninterrupted prayer and intercession before the sunrise.',
    category: 'Prayer & Fasting',
    streak_days: 14,
    accent: '#06b6d4',
    participants_count: 612,
    active_streak: 5,
    completed_today: true,
    end_date: new Date(Date.now() + 86400000 * 9).toISOString(),
    creator: {
      display_name: 'Joy Wambui',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      badge: 'worship_leader',
      verified: true,
    },
  },
  {
    id: 'chal-3',
    title: 'Gospel of John in 21 Days',
    description: 'Read one chapter of the Gospel of John each day, highlighting your verse of breakthrough and journaling.',
    category: 'Scripture Memory',
    streak_days: 21,
    accent: '#10b981',
    participants_count: 830,
    active_streak: 12,
    completed_today: false,
    end_date: new Date(Date.now() + 86400000 * 10).toISOString(),
    creator: {
      display_name: 'Bishop Sarah Ndung\'u',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      badge: 'bishop',
      verified: true,
    },
  },
];

export const INITIAL_SUBMISSIONS = [
  {
    id: 'sub-1',
    challenge_id: 'chal-1',
    author: {
      display_name: 'Mercy Achieng',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    },
    reflection: 'Day 7: Bought groceries for our building security guard. The joy on his face reminded me of Christ’s unconditional grace!',
    votes_count: 48,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'sub-2',
    challenge_id: 'chal-2',
    author: {
      display_name: 'Brian Kiprop',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
    reflection: 'Day 5 at dawn: Psalm 63:1. "O God, you are my God, earnestly I seek you." Deep peace in the morning stillness.',
    votes_count: 65,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

export async function listChallenges() {
  return INITIAL_CHALLENGES;
}

export async function voteChallengeSubmission(subId) {
  return { success: true };
}

export async function joinChallenge(challengeId) {
  return { success: true };
}
