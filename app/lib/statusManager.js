/*
-- Migration: 011_statuses_table.sql (only if table does not already exist)
create table if not exists public.statuses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  text_content  text,
  scripture_tag text,
  bg_style      text default 'emerald',
  media_url     text,
  media_type    text check (media_type is null or media_type in ('image','video','audio')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null
);
create index if not exists statuses_expires_idx on public.statuses (expires_at);
create index if not exists statuses_user_created_idx on public.statuses (user_id, created_at desc);
*/

'use client';
import { supabase } from '../../lib/supabaseClient';
import { sendStatusReplyToInbox } from './inboxManager';
import { cleanDisplayName } from './postDisplay';

const STATUS_STORAGE_KEY = 'shammah_24h_statuses_v2';
const STATUS_VIEWED_KEY = 'shammah_status_views_v1';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

let statusesMemoryCache = null;

function isValidUuid(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Infers whether a status media URL is 'image', 'video', or 'audio'.
 */
export function inferMediaType(url, explicitType = null) {
  if (explicitType && ['image', 'video', 'audio'].includes(explicitType)) {
    return explicitType;
  }
  if (!url || typeof url !== 'string') return null;
  const clean = url.split('?')[0].toLowerCase();
  if (/\.(mp4|webm|mov|m4v|ogg)$/.test(clean)) return 'video';
  if (/\.(mp3|wav|m4a|aac|flac)$/.test(clean)) return 'audio';
  if (/\.(jpg|jpeg|png|webp|gif|svg|bmp|avif)$/.test(clean)) return 'image';
  return 'image';
}

/**
 * Retrieves the client-side viewed statuses lookup map from localStorage.
 */
export function getStatusViewedMap() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STATUS_VIEWED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Checks if a status is viewed by viewerId (keyed by statusId:viewerId in localStorage).
 */
export function isStatusViewed(statusId, viewerId = 'me') {
  if (!statusId) return false;
  const vId = viewerId || 'me';
  const map = getStatusViewedMap();
  return Boolean(map[`${statusId}:${vId}`] || map[`${statusId}:me`]);
}

/**
 * Determines whether a given status item has been viewed by the viewer.
 * Checks both status.views array and client-side localStorage map.
 */
export function isStatusRead(status, viewerId = 'me') {
  if (!status || !status.id) return false;
  const vId = viewerId || 'me';
  if (Array.isArray(status.views) && (status.views.includes(vId) || status.views.includes('me'))) {
    return true;
  }
  return isStatusViewed(status.id, vId);
}

/**
 * Marks a status as viewed client-side and syncs with cache & localStorage.
 */
export function markStatusViewed(statusId, viewerId = 'me') {
  if (!statusId || typeof window === 'undefined') return;
  const vId = viewerId || 'me';
  const key = `${statusId}:${vId}`;
  const map = getStatusViewedMap();

  if (!map[key]) {
    map[key] = Date.now();
    try {
      localStorage.setItem(STATUS_VIEWED_KEY, JSON.stringify(map));
    } catch (e) {}

    // Synchronize views array in memory and local status cache
    const active = getActiveStatuses();
    const item = active.find((s) => s.id === statusId);
    if (item) {
      if (!Array.isArray(item.views)) item.views = [];
      if (!item.views.includes(vId)) {
        item.views.push(vId);
      }
      statusesMemoryCache = active;
      try {
        localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(active));
      } catch (e) {}
    }

    window.dispatchEvent(
      new CustomEvent('shammah:status-viewed', { detail: { statusId, viewerId: vId } })
    );
  }
}

/**
 * Groups a flat array of active statuses by userId (fallback userName).
 * Preserves tray order based on each user's most recent status.
 */
export function groupStatusesByUser(rawStatuses = [], currentViewerId = 'me') {
  if (!Array.isArray(rawStatuses) || rawStatuses.length === 0) return [];
  const vId = currentViewerId || 'me';

  const groupMap = new Map();

  for (const status of rawStatuses) {
    const userKey = status.userId || status.userName || 'unknown';
    if (!groupMap.has(userKey)) {
      groupMap.set(userKey, {
        key: userKey,
        userId: status.userId,
        userName: cleanDisplayName(status.userName, 'Member'),
        userAvatar: status.userAvatar || null,
        userBadge: status.userBadge || 'believer',
        userRole: status.userRole || 'member',
        userVerified: Boolean(status.userVerified),
        statuses: [],
      });
    }
    groupMap.get(userKey).statuses.push(status);
  }

  const result = [];
  for (const group of groupMap.values()) {
    // Sort this user's statuses newest first
    group.statuses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    group.count = group.statuses.length;
    // Card media and thumbnail is that user's MOST RECENT status
    group.latestStatus = group.statuses[0];

    // Determine viewed state across this user's statuses
    const unviewed = group.statuses.filter((s) => !isStatusRead(s, vId));
    group.unviewedCount = unviewed.length;
    group.hasUnviewed = unviewed.length > 0;
    group.allViewed = unviewed.length === 0;

    result.push(group);
  }

  return result;
}

/**
 * Builds the continuous playback playlist and start indices for StatusViewerModal.
 * Enforces start rules:
 * - Any unviewed: start at newest unviewed, play forward through remaining for that user.
 * - All viewed: start at oldest, cycle through all once.
 * - After last status of a user, naturally advances to next user in tray order; terminates at end.
 */
export function buildViewerPlaylist(groupedUsers = [], currentViewerId = 'me') {
  const viewerStatuses = [];
  const groupStartIndices = {};
  const vId = currentViewerId || 'me';

  for (const group of groupedUsers) {
    const unviewed = group.statuses
      .filter((s) => !isStatusRead(s, vId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // newest unviewed first

    const viewed = group.statuses
      .filter((s) => isStatusRead(s, vId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let userPlaylist;
    if (unviewed.length > 0) {
      // Start at newest unviewed, followed by remaining unviewed, then viewed
      userPlaylist = [...unviewed, ...viewed];
    } else {
      // All viewed -> start at oldest, cycle through all once
      userPlaylist = [...group.statuses].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    groupStartIndices[group.key] = viewerStatuses.length;
    viewerStatuses.push(...userPlaylist);
  }

  return { viewerStatuses, groupStartIndices };
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
        'id, user_id, text_content, scripture_tag, bg_style, media_url, media_type, created_at, expires_at, profiles(id, display_name, avatar_url, badge, badge_verified, role)'
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
      const resolvedMediaType = row.media_type || inferMediaType(row.media_url);
      return {
        id: row.id,
        userId: row.user_id,
        userName: cleanDisplayName(prof?.display_name, 'Member'),
        userAvatar: prof?.avatar_url || null,
        userBadge: prof?.badge || 'believer',
        userRole: prof?.role || 'member',
        userVerified: Boolean(prof?.badge_verified),
        text: row.text_content,
        scriptureTag: row.scripture_tag || null,
        bgStyle: row.bg_style || 'emerald',
        mediaUrl: row.media_url || null,
        mediaType: resolvedMediaType,
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
  mediaType = null,
  bgStyle = 'emerald',
  scriptureTag = null,
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TWENTY_FOUR_HOURS_MS);
  const cleanText = (text || '').trim();
  const resolvedMediaType = mediaType || inferMediaType(mediaUrl);

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
    userName: cleanDisplayName(userName, 'You'),
    userAvatar: userAvatar || null,
    userBadge: userBadge || 'believer',
    userRole: userRole || 'member',
    userVerified: Boolean(userVerified),
    text: cleanText,
    mediaUrl,
    mediaType: resolvedMediaType,
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
          media_type: resolvedMediaType || null,
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
