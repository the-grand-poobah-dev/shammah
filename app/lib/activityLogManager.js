'use client';

const ACTIVITY_STORAGE_KEY = 'shammah:activity-log';

const INITIAL_SAMPLE_ACTIVITIES = [
  {
    id: 'act-sample-1',
    type: 'reaction',
    icon: '❤️',
    title: 'Reacted with Amen ❤️',
    targetTitle: 'Sunday Morning Fellowship: He Restores My Soul',
    snippet: 'Praising God for His unfailing mercy and grace in this new season.',
    authorName: 'Pastor Sarah Jenkins',
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18m ago
    visibility: 'public',
    meta: { emoji: '❤️', targetType: 'post' },
  },
  {
    id: 'act-sample-2',
    type: 'comment',
    icon: '💬',
    title: 'Commented on Sermon Notes',
    targetTitle: 'Walking in the Light of Christ (1 John 1:5-9)',
    snippet: 'Amen! This scripture gave me so much peace this week during my exams.',
    authorName: 'Grace Community Church',
    timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(), // ~1.5h ago
    visibility: 'public',
    meta: { targetType: 'comment' },
  },
  {
    id: 'act-sample-3',
    type: 'poll_vote',
    icon: '📊',
    title: 'Participated in Fellowship Poll',
    targetTitle: 'Church Camp 2026: Preferred Weekend Theme',
    snippet: 'Cast anonymous vote: “Deepening Discipleship & Prayer Walking”',
    authorName: 'Church Youth Fellowship',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4h ago
    visibility: 'anonymous',
    meta: { optionChosen: 'Deepening Discipleship & Prayer Walking' },
  },
  {
    id: 'act-sample-4',
    type: 'post',
    icon: '✍️',
    title: 'Published Fellowship Post',
    targetTitle: 'Prayer & Praise in Fellowship',
    snippet: 'Thanking God for healing my mother after months of hospital visits. Our God answers prayers!',
    authorName: 'You',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // 1 day ago
    visibility: 'church',
    meta: { category: 'Stories & Testimonies' },
  },
  {
    id: 'act-sample-5',
    type: 'reaction',
    icon: '🔥',
    title: 'Reacted with Holy Fire 🔥',
    targetTitle: 'Youth Revival Night Praise Highlights',
    snippet: '“The presence of the Holy Spirit was palpable during our worship vigil.”',
    authorName: 'Worship Team Nairobi',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(), // 2 days ago
    visibility: 'public',
    meta: { emoji: '🔥', targetType: 'video' },
  },
];

/**
 * Get all activities sorted in reverse-chronological order (newest first)
 */
export function getActivityLog() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_ACTIVITIES));
      return INITIAL_SAMPLE_ACTIVITIES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return INITIAL_SAMPLE_ACTIVITIES;
    return parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    console.error('Failed to read activity log:', err);
    return INITIAL_SAMPLE_ACTIVITIES;
  }
}

/**
 * Log a new user action
 * @param {Object} action
 * @param {string} action.type - 'post' | 'reaction' | 'comment' | 'poll_vote' | 'bookmark' | 'share'
 * @param {string} action.title - Action title
 * @param {string} [action.targetTitle] - Title of post/content acted upon
 * @param {string} [action.snippet] - Excerpt of text or note
 * @param {string} [action.authorName] - Name of content creator
 * @param {string} [action.visibility] - 'public' | 'church' | 'anonymous'
 * @param {Object} [action.meta] - Extra metadata
 */
export function logActivity(action) {
  if (typeof window === 'undefined') return;
  try {
    const current = getActivityLog();
    const newEntry = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: action.type || 'action',
      icon: action.icon || (action.type === 'reaction' ? (action.meta?.emoji || '❤️') : action.type === 'comment' ? '💬' : action.type === 'poll_vote' ? '📊' : '✍️'),
      title: action.title || 'User Action',
      targetTitle: action.targetTitle || '',
      snippet: action.snippet || '',
      authorName: action.authorName || '',
      visibility: action.visibility || 'public',
      meta: action.meta || {},
    };

    const updated = [newEntry, ...current].slice(0, 150); // Keep last 150
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent('shammah:activity-updated', { detail: newEntry }));
    return newEntry;
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

/**
 * Clear the activity log
 */
export function clearActivityLog() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify([]));
  window.dispatchEvent(new CustomEvent('shammah:activity-updated', { detail: { cleared: true } }));
}

/**
 * Delete a single activity item
 */
export function deleteActivityItem(id) {
  if (typeof window === 'undefined') return;
  const current = getActivityLog();
  const next = current.filter((item) => item.id !== id);
  localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('shammah:activity-updated', { detail: { deletedId: id } }));
}

/**
 * Get summary stats for transparency
 */
export function getActivityStats() {
  const log = getActivityLog();
  return {
    total: log.length,
    posts: log.filter((a) => a.type === 'post').length,
    reactions: log.filter((a) => a.type === 'reaction').length,
    comments: log.filter((a) => a.type === 'comment').length,
    pollVotes: log.filter((a) => a.type === 'poll_vote').length,
  };
}
