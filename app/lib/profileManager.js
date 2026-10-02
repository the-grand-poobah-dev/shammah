'use client';
import { playSound } from './soundEffects';

const PROFILE_PRIVACY_KEY = 'shammah_profile_privacy_v1';
const FOLLOWS_KEY = 'shammah_profile_follows_v1';
const BLOCKED_USERS_KEY = 'shammah_blocked_users_v1';
const PLAYLISTS_KEY = 'shammah_user_playlists_v1';
const VERIFICATION_SUB_KEY = 'shammah_verification_subscription_v1';

export const VERIFICATION_TIERS = [
  {
    id: 'monthly',
    name: 'Monthly Verification',
    priceKes: 300,
    billingCycle: 'Billed monthly',
    discountLabel: 'Standard Rate',
    periodMonths: 1,
    perMonthKes: 300,
  },
  {
    id: 'quarterly',
    name: 'Quarterly Verification (3 Months)',
    priceKes: 800,
    billingCycle: 'Billed every 3 months',
    discountLabel: 'Save 11% (Was Kes. 900)',
    periodMonths: 3,
    perMonthKes: 267,
    popular: true,
  },
  {
    id: 'biannual',
    name: 'Bi-Annual Verification (6 Months)',
    priceKes: 1500,
    billingCycle: 'Billed every 6 months',
    discountLabel: 'Save 17% (Was Kes. 1,800)',
    periodMonths: 6,
    perMonthKes: 250,
  },
  {
    id: 'yearly',
    name: 'Yearly Verification (12 Months)',
    priceKes: 2700,
    billingCycle: 'Billed annually',
    discountLabel: 'Save 25% (Was Kes. 3,600)',
    periodMonths: 12,
    perMonthKes: 225,
    bestValue: true,
  },
];

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
    window.dispatchEvent(
      new CustomEvent('shammah:profile-settings-updated', { detail: { userId: key, ...map[key] } })
    );
  } catch (err) {
    console.error('Failed to update profile settings', err);
  }
}

// ================= Follow / Unfollow System ================= //

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
    playSound('reaction');
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(FOLLOWS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('shammah:follows-updated', { detail: { targetUserId, following: next.includes(targetUserId) } }));
  }
  return next.includes(targetUserId);
}

// ================= Block / Unblock System ================= //

export function getBlockedUsers() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BLOCKED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isBlocked(targetUserId) {
  const list = getBlockedUsers();
  return list.includes(targetUserId);
}

export function toggleBlock(targetUserId) {
  const list = getBlockedUsers();
  let next;
  const alreadyBlocked = list.includes(targetUserId);
  if (alreadyBlocked) {
    next = list.filter((id) => id !== targetUserId);
  } else {
    next = [...list, targetUserId];
    // If blocking someone, also unfollow them
    if (isFollowing(targetUserId)) {
      toggleFollow(targetUserId);
    }
    playSound('reaction');
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent('shammah:blocks-updated', { detail: { targetUserId, blocked: !alreadyBlocked } })
    );
  }
  return !alreadyBlocked;
}

// ================= Verification Badge Subscription (Kes. 300 / mo with discounts) ================= //

export function getVerificationSubscription(userId) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(VERIFICATION_SUB_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[userId || 'me'] || null;
  } catch {
    return null;
  }
}

export function requestVerificationSubscription(userId, tierId, roleDetails = 'pastor') {
  if (typeof window === 'undefined') return null;
  const tier = VERIFICATION_TIERS.find((t) => t.id === tierId) || VERIFICATION_TIERS[0];
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * tier.periodMonths).toISOString();

  const sub = {
    tierId: tier.id,
    tierName: tier.name,
    amountKes: tier.priceKes,
    roleDetails,
    status: 'active',
    badgeType: roleDetails || 'pastor',
    activatedAt: new Date().toISOString(),
    expiresAt,
  };

  try {
    const raw = localStorage.getItem(VERIFICATION_SUB_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const key = userId || 'me';
    map[key] = sub;
    localStorage.setItem(VERIFICATION_SUB_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('shammah:verification-updated', { detail: sub }));
    playSound('postPublished');
  } catch (err) {
    console.error('Failed to save verification subscription', err);
  }

  return sub;
}

export function cancelVerificationSubscription(userId) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(VERIFICATION_SUB_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const key = userId || 'me';
    delete map[key];
    localStorage.setItem(VERIFICATION_SUB_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('shammah:verification-updated', { detail: null }));
  } catch {}
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
