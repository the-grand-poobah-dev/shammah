'use client';
import { supabase } from '../../lib/supabaseClient';
import { playSound } from './soundEffects';

const PROFILE_PRIVACY_KEY = 'shammah_profile_privacy_v2';
const FOLLOWS_KEY = 'shammah_profile_follows_v2';
const BLOCKED_USERS_KEY = 'shammah_blocked_users_v2';
const PLAYLISTS_KEY = 'shammah_user_playlists_v1';

function isValidUuid(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

// In-memory caches for synchronous reads
let followsMemoryCache = null;
let blocksMemoryCache = null;

// ================= Profile Privacy & Inbox Settings ================= //

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

export async function updateProfileSettings(userId, { isLocked, inboxPermission }) {
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
    window.dispatchEvent(
      new CustomEvent('shammah:profile-settings-updated', { detail: { userId: key, ...map[key] } })
    );

    // Sync to Supabase profiles table if real UUID
    if (userId && isValidUuid(userId)) {
      const updates = {};
      if (isLocked !== undefined) updates.is_locked = isLocked;
      if (inboxPermission !== undefined) updates.inbox_permission = inboxPermission;

      const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
      if (error) {
        console.warn('Failed to sync profile settings to Supabase:', error.message);
      }
    }
  } catch (err) {
    console.error('Failed to update profile settings', err);
  }
}

// ================= Follow / Unfollow System (Real Supabase) ================= //

export function getFollows() {
  if (followsMemoryCache !== null) {
    return followsMemoryCache;
  }
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FOLLOWS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    followsMemoryCache = Array.isArray(parsed) ? parsed : [];
    return followsMemoryCache;
  } catch {
    followsMemoryCache = [];
    return [];
  }
}

export function isFollowing(targetUserId) {
  if (!targetUserId) return false;
  const follows = getFollows();
  return follows.includes(targetUserId);
}

export async function fetchFollows(userId) {
  if (!userId || !isValidUuid(userId)) {
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('followed_id')
      .eq('follower_id', userId);

    if (error) {
      console.warn('Failed to fetch follows from Supabase:', error.message);
      return getFollows();
    }

    const ids = (data || []).map((row) => row.followed_id);
    followsMemoryCache = ids;
    if (typeof window !== 'undefined') {
      localStorage.setItem(FOLLOWS_KEY, JSON.stringify(ids));
      window.dispatchEvent(
        new CustomEvent('shammah:follows-updated', { detail: { userId, followedUserIds: ids } })
      );
    }
    return ids;
  } catch (err) {
    console.error('fetchFollows error:', err);
    return getFollows();
  }
}

export async function toggleFollow(targetUserId, currentUserId) {
  if (!targetUserId) return false;

  let activeUserId = currentUserId;
  if (!activeUserId) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      activeUserId = sessionData?.session?.user?.id;
    } catch {}
  }

  const follows = getFollows();
  const currentlyFollowing = follows.includes(targetUserId);
  let next;

  if (currentlyFollowing) {
    next = follows.filter((id) => id !== targetUserId);
  } else {
    next = [...follows, targetUserId];
    playSound('reaction');
  }

  // Update memory and local storage cache immediately for optimistic UI
  followsMemoryCache = next;
  if (typeof window !== 'undefined') {
    localStorage.setItem(FOLLOWS_KEY, JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent('shammah:follows-updated', {
        detail: { targetUserId, following: !currentlyFollowing, followedUserIds: next },
      })
    );
  }

  // Sync with real Supabase follows table
  if (activeUserId && isValidUuid(activeUserId) && isValidUuid(targetUserId)) {
    try {
      if (currentlyFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', activeUserId)
          .eq('followed_id', targetUserId);
        if (error) {
          console.error('Failed to delete follow in Supabase:', error.message);
        }
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: activeUserId, followed_id: targetUserId });
        if (error) {
          console.error('Failed to insert follow in Supabase:', error.message);
        }
      }
    } catch (err) {
      console.error('toggleFollow sync error:', err);
    }
  }

  return !currentlyFollowing;
}

export async function fetchFollowStats(userId) {
  if (!userId || !isValidUuid(userId)) {
    return { followersCount: 0, followingCount: 0 };
  }
  try {
    const { data, error } = await supabase.rpc('get_user_follow_stats', { p_user_id: userId });
    if (!error && Array.isArray(data) && data[0]) {
      return {
        followersCount: Number(data[0].followers_count || 0),
        followingCount: Number(data[0].following_count || 0),
      };
    }
    const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followed_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);
    return {
      followersCount: Number(followersCount || 0),
      followingCount: Number(followingCount || 0),
    };
  } catch (err) {
    console.error('Failed to fetch follow stats:', err);
    return { followersCount: 0, followingCount: 0 };
  }
}

// ================= Block / Unblock System (Real Supabase) ================= //

export function getBlockedUsers() {
  if (blocksMemoryCache !== null) {
    return blocksMemoryCache;
  }
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BLOCKED_USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    blocksMemoryCache = Array.isArray(parsed) ? parsed : [];
    return blocksMemoryCache;
  } catch {
    blocksMemoryCache = [];
    return [];
  }
}

export function isBlocked(targetUserId) {
  if (!targetUserId) return false;
  const list = getBlockedUsers();
  return list.includes(targetUserId);
}

export async function fetchBlockedUsers(userId) {
  if (!userId || !isValidUuid(userId)) {
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', userId);

    if (error) {
      console.warn('Failed to fetch blocked users from Supabase:', error.message);
      return getBlockedUsers();
    }

    const ids = (data || []).map((row) => row.blocked_id);
    blocksMemoryCache = ids;
    if (typeof window !== 'undefined') {
      localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(ids));
      window.dispatchEvent(
        new CustomEvent('shammah:blocks-updated', { detail: { userId, blockedUserIds: ids } })
      );
    }
    return ids;
  } catch (err) {
    console.error('fetchBlockedUsers error:', err);
    return getBlockedUsers();
  }
}

export async function toggleBlock(targetUserId, currentUserId) {
  if (!targetUserId) return false;

  let activeUserId = currentUserId;
  if (!activeUserId) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      activeUserId = sessionData?.session?.user?.id;
    } catch {}
  }

  const list = getBlockedUsers();
  const alreadyBlocked = list.includes(targetUserId);
  let next;

  if (alreadyBlocked) {
    next = list.filter((id) => id !== targetUserId);
  } else {
    next = [...list, targetUserId];
    // If blocking someone, also unfollow them
    if (isFollowing(targetUserId)) {
      toggleFollow(targetUserId, activeUserId);
    }
    playSound('reaction');
  }

  // Update memory and local storage cache immediately
  blocksMemoryCache = next;
  if (typeof window !== 'undefined') {
    localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent('shammah:blocks-updated', {
        detail: { targetUserId, blocked: !alreadyBlocked, blockedUserIds: next },
      })
    );
  }

  // Sync with real Supabase blocks table
  if (activeUserId && isValidUuid(activeUserId) && isValidUuid(targetUserId)) {
    try {
      if (alreadyBlocked) {
        const { error } = await supabase
          .from('blocks')
          .delete()
          .eq('blocker_id', activeUserId)
          .eq('blocked_id', targetUserId);
        if (error) {
          console.error('Failed to delete block in Supabase:', error.message);
        }
      } else {
        const { error } = await supabase
          .from('blocks')
          .insert({ blocker_id: activeUserId, blocked_id: targetUserId });
        if (error) {
          console.error('Failed to insert block in Supabase:', error.message);
        }
      }
    } catch (err) {
      console.error('toggleBlock sync error:', err);
    }
  }

  return !alreadyBlocked;
}

// ================= Verification Badge Review System (Real Supabase badge_requests) ================= //

export const VERIFICATION_TIERS = [];

export async function fetchPendingBadgeRequest(userId) {
  if (!userId || !isValidUuid(userId)) return null;
  try {
    const { data, error } = await supabase
      .from('badge_requests')
      .select('id, current_badge, requested_badge, reason, status, created_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (error) {
      console.warn('Failed to fetch pending badge request:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('fetchPendingBadgeRequest error:', err);
    return null;
  }
}

export async function submitVerificationBadgeRequest({ userId, currentBadge, requestedBadge, reason }) {
  if (!userId || !isValidUuid(userId)) {
    return { error: 'Please sign in to submit a verification request.' };
  }
  if (!requestedBadge) {
    return { error: 'Please choose a ministry badge to request.' };
  }
  const cleanReason = (reason || '').trim();
  if (cleanReason.length < 10) {
    return { error: 'Please provide at least 10 characters explaining your ministry affiliation.' };
  }

  try {
    const { data, error } = await supabase
      .from('badge_requests')
      .insert({
        user_id: userId,
        current_badge: currentBadge || null,
        requested_badge: requestedBadge,
        reason: cleanReason.slice(0, 500),
      })
      .select('id, requested_badge, reason, status, created_at')
      .single();

    if (error) {
      if (error.message.includes('one_pending') || error.code === '23505') {
        return { error: 'You already have a pending verification request under review.' };
      }
      return { error: error.message };
    }

    playSound('postPublished');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shammah:badge-request-submitted', { detail: data }));
    }
    return { data };
  } catch (err) {
    return { error: err.message || 'Could not submit verification request.' };
  }
}

// Legacy helper compatibility
export function getVerificationSubscription() {
  return null;
}
export function requestVerificationSubscription() {
  return null;
}
export function cancelVerificationSubscription() {}

// ================= Playlists ================= //

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
