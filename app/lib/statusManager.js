'use client';
import { sendStatusReplyToInbox } from './inboxManager';

const STATUS_STORAGE_KEY = 'shammah_24h_statuses_v1';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// Curated active community statuses from church leaders & members within 24h
const DEFAULT_COMMUNITY_STATUSES = [
  {
    id: 'status-pastor-david',
    userId: 'user-pastor-david',
    userName: 'Pastor David Mwangi',
    userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    userBadge: 'pastor',
    userRole: 'church_admin',
    userVerified: true,
    text: "Prepare your hearts for Sunday worship! 'The Lord is my strength and my shield; in Him my heart trusts.' — Psalm 28:7 🙏",
    scriptureTag: 'Psalm 28:7',
    bgStyle: 'emerald',
    createdAt: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    expiresAt: new Date(Date.now() - 3600000 * 2.5 + TWENTY_FOUR_HOURS_MS).toISOString(),
    isPublic: true,
    views: ['user-1', 'user-2', 'user-3'],
    reactions: [
      { userId: 'user-1', userName: 'Grace', emoji: '🙏', createdAt: new Date().toISOString() },
      { userId: 'user-2', userName: 'John', emoji: '❤️', createdAt: new Date().toISOString() },
    ],
    comments: [],
  },
  {
    id: 'status-sister-mary',
    userId: 'user-sister-mary',
    userName: 'Sister Mary Grace',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    userBadge: 'worship',
    userVerified: true,
    text: 'Worship team soundcheck at 5:00 PM today. Let everything that has breath praise the Lord! 🎶🙌',
    scriptureTag: 'Psalm 150:6',
    bgStyle: 'sunset',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    expiresAt: new Date(Date.now() - 3600000 * 5 + TWENTY_FOUR_HOURS_MS).toISOString(),
    isPublic: true,
    views: ['user-4', 'user-5'],
    reactions: [
      { userId: 'user-4', userName: 'Mark', emoji: '🔥', createdAt: new Date().toISOString() },
    ],
    comments: [],
  },
  {
    id: 'status-elder-james',
    userId: 'user-elder-james',
    userName: 'Elder James Ochieng',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    userBadge: 'elder',
    userVerified: true,
    text: 'Youth Bible Camp registration is now open! 30 spots remaining for this summer fellowship. 📖⛺',
    scriptureTag: 'Proverbs 22:6',
    bgStyle: 'royal',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    expiresAt: new Date(Date.now() - 3600000 * 8 + TWENTY_FOUR_HOURS_MS).toISOString(),
    isPublic: true,
    views: ['user-1'],
    reactions: [],
    comments: [],
  },
  {
    id: 'status-sister-esther',
    userId: 'user-sister-esther',
    userName: 'Esther Wanjiku',
    userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    userBadge: 'intercessor',
    userVerified: true,
    text: 'Early morning prayer fellowship was such an uplifting start to the day. God is faithful! ☀️✨',
    scriptureTag: 'Lamentations 3:22',
    bgStyle: 'amber',
    createdAt: new Date(Date.now() - 3600000 * 11).toISOString(),
    expiresAt: new Date(Date.now() - 3600000 * 11 + TWENTY_FOUR_HOURS_MS).toISOString(),
    isPublic: true,
    views: [],
    reactions: [],
    comments: [],
  },
];

/**
 * Retrieves all valid 24-hour statuses that have not expired.
 */
export function getActiveStatuses() {
  const now = Date.now();
  let stored = [];

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STATUS_STORAGE_KEY);
      if (raw) {
        stored = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading statuses', e);
    }
  }

  // Combine user stored statuses with default community statuses
  const all = [...stored, ...DEFAULT_COMMUNITY_STATUSES];

  // Filter out any status older than 24 hours
  const valid = all.filter((s) => {
    const exp = new Date(s.expiresAt || new Date(s.createdAt).getTime() + TWENTY_FOUR_HOURS_MS).getTime();
    return exp > now;
  });

  // Sort: newest first
  return valid.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Checks if a specific user currently has an active 24-hour status update.
 */
export function hasUserActiveStatus(userId, userName) {
  const active = getActiveStatuses();
  if (!active || active.length === 0) return false;

  return active.some((s) => {
    if (userId && (s.userId === userId || s.id === `status-${userId}`)) return true;
    if (userName && s.userName && s.userName.toLowerCase() === userName.toLowerCase()) return true;
    return false;
  });
}

/**
 * Creates and publishes a new 24-hour status update.
 */
export function createStatusUpdate({
  userId,
  userName,
  userAvatar,
  userBadge,
  userRole,
  userVerified = false,
  text,
  mediaUrl = null,
  bgStyle = 'emerald',
  scriptureTag = null,
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TWENTY_FOUR_HOURS_MS);

  const newStatus = {
    id: `status-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    userId: userId || 'my-user',
    userName: userName || 'You',
    userAvatar: userAvatar || null,
    userBadge: userBadge || 'believer',
    userRole: userRole || 'member',
    userVerified: Boolean(userVerified),
    text: text.trim(),
    mediaUrl,
    bgStyle: bgStyle || 'emerald',
    scriptureTag: scriptureTag || null,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    isPublic: true,
    views: [],
    reactions: [],
    comments: [],
  };

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STATUS_STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      // Keep other active statuses and prepend this one
      const updated = [newStatus, ...existing];
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('shammah:status-updated', { detail: newStatus }));
    } catch (err) {
      console.error('Failed to save status', err);
    }
  }

  return newStatus;
}

/**
 * Reacts to a status story (❤️, 🙏, 🔥, 🙌, etc.).
 */
export function reactToStatus(statusId, emoji, user) {
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem(STATUS_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const idx = existing.findIndex((s) => s.id === statusId);

    const reaction = {
      userId: user?.id || 'me',
      userName: user?.name || 'You',
      emoji,
      createdAt: new Date().toISOString(),
    };

    if (idx !== -1) {
      existing[idx].reactions = [...(existing[idx].reactions || []), reaction];
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(existing));
    }

    window.dispatchEvent(new CustomEvent('shammah:status-reacted', { detail: { statusId, reaction } }));
  } catch (err) {
    console.error('Failed to react to status', err);
  }
}

/**
 * Comments on a status story -> automatically routed to the poster's direct inbox!
 */
export function commentOnStatus(status, commentText, sender) {
  if (!status || !commentText.trim()) return;

  const commentObj = {
    id: `comm-${Date.now()}`,
    senderId: sender?.id || 'me',
    senderName: sender?.name || 'You',
    senderAvatar: sender?.avatar || null,
    senderBadge: sender?.badge || null,
    senderVerified: sender?.verified || false,
    text: commentText.trim(),
    createdAt: new Date().toISOString(),
  };

  // 1. Deliver directly into the poster's inbox
  sendStatusReplyToInbox({
    recipientId: status.userId,
    recipientName: status.userName,
    recipientAvatar: status.userAvatar,
    recipientBadge: status.userBadge,
    recipientVerified: status.userVerified,
    senderId: sender?.id,
    senderName: sender?.name,
    senderAvatar: sender?.avatar,
    senderBadge: sender?.badge,
    senderVerified: sender?.verified,
    commentText: commentText.trim(),
    statusPreviewText: status.text,
  });

  // 2. Also record in status comments array
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STATUS_STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const idx = existing.findIndex((s) => s.id === status.id);

      if (idx !== -1) {
        existing[idx].comments = [...(existing[idx].comments || []), commentObj];
        localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(existing));
      }
      window.dispatchEvent(new CustomEvent('shammah:status-commented', { detail: { statusId: status.id, comment: commentObj } }));
    } catch (err) {
      console.error('Failed to record comment', err);
    }
  }

  return commentObj;
}
