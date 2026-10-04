'use client';
import { supabase } from '../../lib/supabaseClient';
import { sendStatusReplyToInbox } from './inboxManager';

const STATUS_STORAGE_KEY = 'shammah_24h_statuses_v2';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

let statusesMemoryCache = null;

function isValidUuid(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Retrieves all valid 24-hour statuses from local cache that have not expired.
 * Use fetchActiveStatuses() to hydrate from Supabase.
 */
export function getActiveStatuses() {
  const now = Date.now();
  let stored = statusesMemoryCache;

  if (stored === null && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STATUS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        stored = Array.isArray(parsed) ? parsed : [];
      } else {
        stored = [];
      }
    } catch (e) {
      console.warn('Error reading statuses', e);
      stored = [];
    }
    statusesMemoryCache = stored;
  }

  const list = Array.isArray(stored) ? stored : [];

  // Filter out any status older than 24 hours
  const valid = list.filter((s) => {
    const exp = new Date(s.expiresAt || new Date(s.createdAt).getTime() + TWENTY_FOUR_HOURS_MS).getTime();
    return exp > now;
  });

  // Sort: newest first
  return valid.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Fetches real 24-hour statuses from Supabase `statuses` table joined with `profiles`.
 */
export async function fetchActiveStatuses() {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('statuses')
      .select(
        'id, user_id, text_content, scripture_tag, bg_style, media_url, created_at, expires_at, profiles(id, display_name, avatar_url, badge, badge_verified, role)'
      )
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('Could not fetch statuses from Supabase:', error.message);
      return getActiveStatuses();
    }

    const mapped = (data || []).map((row) => {
      const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.id,
        userId: row.user_id,
        userName: prof?.display_name || 'Fellowship Member',
        userAvatar: prof?.avatar_url || null,
        userBadge: prof?.badge || 'believer',
        userRole: prof?.role || 'member',
        userVerified: Boolean(prof?.badge_verified),
        text: row.text_content,
        scriptureTag: row.scripture_tag || null,
        bgStyle: row.bg_style || 'emerald',
        mediaUrl: row.media_url || null,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        isPublic: true,
        views: [],
        reactions: [],
        comments: [],
      };
    });

    statusesMemoryCache = mapped;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(mapped));
      window.dispatchEvent(new CustomEvent('shammah:status-updated', { detail: mapped }));
    }
    return mapped;
  } catch (err) {
    console.warn('fetchActiveStatuses error:', err);
    return getActiveStatuses();
  }
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
 * Creates and publishes a new 24-hour status update to Supabase.
 */
export async function createStatusUpdate({
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
  const cleanText = (text || '').trim();

  let activeUserId = userId;
  if (!isValidUuid(activeUserId)) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      activeUserId = sessionData?.session?.user?.id || userId;
    } catch {}
  }

  let newStatus = {
    id: `status-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    userId: activeUserId || 'my-user',
    userName: userName || 'You',
    userAvatar: userAvatar || null,
    userBadge: userBadge || 'believer',
    userRole: userRole || 'member',
    userVerified: Boolean(userVerified),
    text: cleanText,
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

  if (isValidUuid(activeUserId)) {
    try {
      const { data, error } = await supabase
        .from('statuses')
        .insert({
          user_id: activeUserId,
          text_content: cleanText,
          scripture_tag: scriptureTag || null,
          bg_style: bgStyle || 'emerald',
          media_url: mediaUrl || null,
          expires_at: expiresAt.toISOString(),
        })
        .select('id, created_at, expires_at')
        .single();

      if (!error && data) {
        newStatus = {
          ...newStatus,
          id: data.id,
          createdAt: data.created_at,
          expiresAt: data.expires_at,
        };
      } else if (error) {
        console.warn('Failed to persist status to Supabase:', error.message);
      }
    } catch (err) {
      console.warn('Error persisting status to Supabase:', err);
    }
  }

  const existing = getActiveStatuses();
  const updated = [newStatus, ...existing];
  statusesMemoryCache = updated;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('shammah:status-updated', { detail: newStatus }));
    } catch (err) {
      console.error('Failed to cache status locally', err);
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
    const existing = getActiveStatuses();
    const idx = existing.findIndex((s) => s.id === statusId);

    const reaction = {
      userId: user?.id || 'me',
      userName: user?.name || 'You',
      emoji,
      createdAt: new Date().toISOString(),
    };

    if (idx !== -1) {
      existing[idx].reactions = [...(existing[idx].reactions || []), reaction];
      statusesMemoryCache = existing;
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(existing));
    }

    window.dispatchEvent(new CustomEvent('shammah:status-reacted', { detail: { statusId, reaction } }));
  } catch (err) {
    console.error('Failed to react to status', err);
  }
}

/**
 * Comments on a status story -> routed to the poster's real Supabase direct_messages inbox.
 */
export async function commentOnStatus(status, commentText, sender) {
  if (!status || !commentText.trim()) return { sent: false, error: 'Empty reply' };

  let senderId = sender?.id;
  if (!isValidUuid(senderId)) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      senderId = sessionData?.session?.user?.id;
    } catch {}
  }

  if (!isValidUuid(senderId)) {
    return { sent: false, error: 'Please sign in to send a status reply to their inbox.' };
  }

  if (!isValidUuid(status.userId)) {
    return { sent: false, error: 'This status author cannot receive direct inbox replies.' };
  }

  if (status.userId === senderId) {
    return { sent: false, error: 'You cannot send a status reply to your own inbox.' };
  }

  // Deliver directly into the poster's real Supabase direct_messages inbox
  const dmResult = await sendStatusReplyToInbox({
    recipientId: status.userId,
    senderId,
    commentText: commentText.trim(),
    statusPreviewText: status.text,
  });

  if (!dmResult) {
    return {
      sent: false,
      error: 'Could not deliver reply — recipient may have closed their inbox.',
    };
  }

  const commentObj = {
    id: dmResult.id || `comm-${Date.now()}`,
    senderId,
    senderName: sender?.name || 'You',
    senderAvatar: sender?.avatar || null,
    senderBadge: sender?.badge || null,
    senderVerified: sender?.verified || false,
    text: commentText.trim(),
    createdAt: dmResult.timestamp || new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('shammah:status-commented', { detail: { statusId: status.id, comment: commentObj } })
    );
  }

  return { sent: true, comment: commentObj };
}
