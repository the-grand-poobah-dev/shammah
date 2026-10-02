'use client';

const PROFILE_PRIVACY_KEY = 'shammah_profile_privacy_v1';
const FOLLOWS_KEY = 'shammah_profile_follows_v1';
const PLAYLISTS_KEY = 'shammah_user_playlists_v1';

const DEFAULT_PLAYLISTS = [
  {
    id: 'pl-1',
    userId: 'user-pastor-david',
    title: 'Sunday Morning Worship & Praise',
    description: 'Uplifting hymns and modern worship songs from our fellowship services.',
    coverBg: 'linear-gradient(135deg, #065f46, #10b981)',
    trackCount: 8,
    category: 'worship',
    isPublic: true,
  },
  {
    id: 'pl-2',
    userId: 'user-pastor-david',
    title: 'Living Faith Sermon Series',
    description: 'A 5-part verse-by-verse teaching through the Book of James.',
    coverBg: 'linear-gradient(135deg, #1e1b4b, #6366f1)',
    trackCount: 5,
    category: 'lessons',
    isPublic: true,
  },
  {
    id: 'pl-3',
    userId: 'user-sister-mary',
    title: 'Acoustic Prayer Nights',
    description: 'Intimate prayer room recordings and acoustic worship melodies.',
    coverBg: 'linear-gradient(135deg, #831843, #f59e0b)',
    trackCount: 6,
    category: 'prayer',
    isPublic: true,
  },
];

export function getProfileSettings(userId) {
  if (typeof window === 'undefined') {
    return { isLocked: false, inboxPermission: 'everyone' };
  }
  try {
    const raw = localStorage.getItem(PROFILE_PRIVACY_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[userId || 'me'] || { isLocked: false, inboxPermission: 'everyone' };
  } catch {
    return { isLocked: false, inboxPermission: 'everyone' };
  }
}

export function updateProfileSettings(userId, { isLocked, inboxPermission }) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(PROFILE_PRIVACY_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const key = userId || 'me';
    map[key] = {
      ...map[key],
      ...(isLocked !== undefined ? { isLocked } : {}),
      ...(inboxPermission !== undefined ? { inboxPermission } : {}),
    };
    localStorage.setItem(PROFILE_PRIVACY_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('shammah:profile-settings-updated', { detail: { userId: key, ...map[key] } }));
  } catch (err) {
    console.error('Failed to update profile settings', err);
  }
}

export function getFollows() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FOLLOWS_KEY);
    return raw ? JSON.parse(raw) : ['user-pastor-david', 'user-sister-mary'];
  } catch {
    return ['user-pastor-david', 'user-sister-mary'];
  }
}

export function isFollowing(targetUserId) {
  const follows = getFollows();
  return follows.includes(targetUserId);
}

export function toggleFollow(targetUserId) {
  const follows = getFollows();
  let next;
  if (follows.includes(targetUserId)) {
    next = follows.filter((id) => id !== targetUserId);
  } else {
    next = [...follows, targetUserId];
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(FOLLOWS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('shammah:follows-updated'));
  }
  return next.includes(targetUserId);
}

export function getUserPlaylists(userId) {
  if (typeof window === 'undefined') return DEFAULT_PLAYLISTS;
  try {
    const raw = localStorage.getItem(PLAYLISTS_KEY);
    const stored = raw ? JSON.parse(raw) : [];
    const all = [...stored, ...DEFAULT_PLAYLISTS];
    if (!userId || userId === 'me') return all;
    return all.filter((p) => p.userId === userId || p.isPublic);
  } catch {
    return DEFAULT_PLAYLISTS;
  }
}
