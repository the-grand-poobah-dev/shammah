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

-- Migration: 012_status_privacy_and_reports.sql
alter table public.profiles
  add column if not exists allow_status_reshare boolean not null default false;

create table if not exists public.content_reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references public.profiles(id) on delete cascade,
  target_type      text not null check (target_type in ('post','status')),
  target_id        uuid not null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  reason           text not null,
  notes            text,
  status           text not null default 'open' check (status in ('open','reviewed','dismissed','actioned')),
  created_at       timestamptz not null default now()
);
create index if not exists content_reports_target_idx on public.content_reports (target_type, target_id);
create index if not exists content_reports_reporter_idx on public.content_reports (reporter_id, created_at desc);
*/

'use client';
import { supabase } from '../../lib/supabaseClient';
import { sendStatusReplyToInbox } from './inboxManager';
import { cleanDisplayName } from './postDisplay';

const STATUS_STORAGE_KEY = 'shammah_24h_statuses_v2';
const STATUS_VIEWED_KEY = 'shammah_status_views_v1';
const STATUS_MUTED_USERS_KEY = 'shammah_muted_status_users_v1';
const STATUS_HIDDEN_KEY = 'shammah_hidden_statuses_v1';
const STATUS_REPORTS_KEY = 'shammah_reported_statuses_v1';
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
 * Retrieves list of muted status user accounts from localStorage.
 * Format: Array<{ userId: string, userName: string, mutedAt: string }>
 */
export function getMutedStatusUsers() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STATUS_MUTED_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Checks whether a specific user is in the muted status posters list.
 */
export function isStatusUserMuted(userId, userName) {
  const list = getMutedStatusUsers();
  if (!list || list.length === 0) return false;
  return list.some(
    (item) =>
      (userId && item.userId === userId) ||
      (userName && item.userName && item.userName.toLowerCase() === userName.toLowerCase())
  );
}

/**
 * Mutes a user from the status tray and viewer.
 */
export function muteStatusUser(userId, userName) {
  if (typeof window === 'undefined') return;
  try {
    const list = getMutedStatusUsers();
    const cleanName = cleanDisplayName(userName, 'Member');
    const existing = list.find(
      (m) =>
        (userId && m.userId === userId) ||
        (m.userName && m.userName.toLowerCase() === cleanName.toLowerCase())
    );
    if (!existing) {
      const updated = [
        ...list,
        {
          userId: userId || `user-${Date.now()}`,
          userName: cleanName,
          mutedAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem(STATUS_MUTED_USERS_KEY, JSON.stringify(updated));
    }
    // Bust memory cache so getActiveStatuses() re-evaluates
    statusesMemoryCache = null;
    window.dispatchEvent(new CustomEvent('shammah:status-updated'));
    window.dispatchEvent(new CustomEvent('shammah:muted-users-changed'));
  } catch (e) {
    console.error('Failed to mute status user', e);
  }
}

/**
 * Unmutes a user account so their statuses can be viewed again.
 */
export function unmuteStatusUser(userId) {
  if (typeof window === 'undefined') return;
  try {
    const list = getMutedStatusUsers();
    const filtered = list.filter((item) => item.userId !== userId && item.userName !== userId);
    localStorage.setItem(STATUS_MUTED_USERS_KEY, JSON.stringify(filtered));
    statusesMemoryCache = null;
    window.dispatchEvent(new CustomEvent('shammah:status-updated'));
    window.dispatchEvent(new CustomEvent('shammah:muted-users-changed'));
  } catch (e) {
    console.error('Failed to unmute status user', e);
  }
}

/**
 * Retrieves list of hidden status IDs (e.g. from reports or hide action).
 */
export function getHiddenStatuses() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STATUS_HIDDEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Checks whether a specific status ID is hidden locally.
 */
export function isStatusHidden(statusId) {
  if (!statusId) return false;
  const list = getHiddenStatuses();
  return list.includes(statusId);
}

/**
 * Hides a status ID locally for the current user.
 */
export function hideStatus(statusId, userId = null, userName = null) {
  if (!statusId && !userId) return;
  if (typeof window === 'undefined') return;
  try {
    if (statusId) {
      const list = getHiddenStatuses();
      if (!list.includes(statusId)) {
        list.push(statusId);
        localStorage.setItem(STATUS_HIDDEN_KEY, JSON.stringify(list));
      }
    }
    statusesMemoryCache = null;
    window.dispatchEvent(new CustomEvent('shammah:status-updated'));
    window.dispatchEvent(new CustomEvent('shammah:status-hidden-changed', { detail: { statusId, userId } }));
  } catch (e) {
    console.error('Failed to hide status', e);
  }
}

/**
 * Unhides a previously hidden status story or un-mutes its author.
 */
export function unhideStatus(statusId, userId = null, userName = null) {
  if (typeof window === 'undefined') return;
  try {
    if (statusId) {
      const list = getHiddenStatuses();
      const filtered = list.filter((id) => id !== statusId);
      localStorage.setItem(STATUS_HIDDEN_KEY, JSON.stringify(filtered));
    }
    if (userId || userName) {
      unmuteStatusUser(userId || userName);
    }
    statusesMemoryCache = null;
    window.dispatchEvent(new CustomEvent('shammah:status-updated'));
    window.dispatchEvent(new CustomEvent('shammah:status-hidden-changed', { detail: { statusId, userId } }));
  } catch (e) {
    console.error('Failed to unhide status', e);
  }
}

/**
 * Unhides all hidden statuses and muted users back into the status tray.
 */
export function unhideAllStatuses() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STATUS_HIDDEN_KEY);
    localStorage.removeItem(STATUS_MUTED_USERS_KEY);
    statusesMemoryCache = null;
    window.dispatchEvent(new CustomEvent('shammah:status-updated'));
    window.dispatchEvent(new CustomEvent('shammah:status-hidden-changed'));
    window.dispatchEvent(new CustomEvent('shammah:muted-users-changed'));
  } catch (e) {
    console.error('Failed to unhide all statuses', e);
  }
}

/**
 * Reports a status story:
 * - Persists locally (hides story for reporter immediately).
 * - Writes confidential report to Supabase `content_reports` table with target_type = 'status'.
 */
export async function reportStatus({
  statusId,
  reason,
  authorId = null,
  notes = '',
  reporterId = null,
}) {
  if (!statusId) return { success: false, error: 'Status ID missing' };

  // 1. Hide locally immediately so reporter never sees it again
  hideStatus(statusId);

  // 2. Cache report locally
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STATUS_REPORTS_KEY);
      const reports = raw ? JSON.parse(raw) : [];
      reports.push({
        statusId,
        authorId,
        reason,
        notes: (notes || '').trim(),
        reportedAt: new Date().toISOString(),
      });
      localStorage.setItem(STATUS_REPORTS_KEY, JSON.stringify(reports));
    } catch (e) {
      console.warn('Failed to cache status report locally', e);
    }
  }

  // 3. Persist confidential report to Supabase content_reports table
  try {
    let activeReporterId = reporterId;
    if (!isValidUuid(activeReporterId)) {
      const { data: sessionData } = await supabase.auth.getSession();
      activeReporterId = sessionData?.session?.user?.id;
    }

    if (isValidUuid(activeReporterId)) {
      const reportRow = {
        reporter_id: activeReporterId,
        target_type: 'status',
        target_id: statusId,
        reported_user_id: isValidUuid(authorId) ? authorId : null,
        reason: reason || 'other',
        notes: (notes || '').trim().slice(0, 500) || null,
        status: 'open',
      };

      const { error: insErr } = await supabase.from('content_reports').insert(reportRow);
      if (insErr) {
        console.warn('Could not insert to content_reports, trying post_reports fallback:', insErr.message);
        if (isValidUuid(statusId)) {
          await supabase.from('post_reports').insert({
            post_id: statusId,
            reporter_id: activeReporterId,
            author_id: isValidUuid(authorId) ? authorId : null,
            reason: reason || 'other',
            notes: (notes || '').trim().slice(0, 300) || null,
          });
        }
      }
    }
  } catch (err) {
    console.warn('Error persisting status report to Supabase:', err);
  }

  return { success: true };
}

/**
 * Reshares a status story as a normal community post (only if author allows reshare).
 * Does not invent a new post type — inserts a standard post into Supabase `posts`.
 */
export async function reshareStatusAsPost({ status, currentUser, comment = '' }) {
  if (!status) return { success: false, error: 'Status not found' };
  if (!currentUser?.id) return { success: false, error: 'Please sign in to reshare stories' };

  if (!status.allowStatusReshare) {
    return { success: false, error: 'The author has not enabled story resharing' };
  }

  const cleanAuthorName = cleanDisplayName(status.userName, 'Member');
  const userComment = (comment || '').trim();
  const quoteSnippet = status.text ? `"${status.text}"` : '';

  let finalContent;
  if (userComment) {
    finalContent = `${userComment}\n\nShared from ${cleanAuthorName}'s story${quoteSnippet ? `: ${quoteSnippet}` : ''}`;
  } else {
    finalContent = `Shared from ${cleanAuthorName}'s story${quoteSnippet ? `: ${quoteSnippet}` : ''}`;
  }

  const resolvedMediaType = status.mediaType || inferMediaType(status.mediaUrl);

  try {
    const postPayload = {
      author_id: currentUser.id,
      church_id: currentUser.church_id || null,
      category_id: 'general',
      text_content: finalContent,
      media_url: status.mediaUrl || null,
      media_type: resolvedMediaType || null,
      visibility: 'public',
      source: 'user',
      is_anonymous: false,
      post_identity: 'real',
    };

    const { data, error } = await supabase.from('posts').insert(postPayload).select('id').single();

    if (error) {
      console.warn('Failed to insert reshared post to Supabase:', error.message);
      return { success: false, error: error.message };
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('shammah:post-created', {
          detail: { postId: data?.id, statusId: status.id },
        })
      );
      window.dispatchEvent(new CustomEvent('shammah:feed-updated'));
    }

    return { success: true, postId: data?.id };
  } catch (err) {
    console.error('Error resharing status as post:', err);
    return { success: false, error: err?.message || 'Could not reshare story' };
  }
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
        allowStatusReshare: Boolean(status.allowStatusReshare),
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
 * Retrieves all valid 24-hour statuses from local memory cache or storage that have not expired.
 * Includes both visible and hidden statuses.
 */
export function getAllActiveStatuses() {
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

  const valid = list.filter((s) => {
    const exp = new Date(s.expiresAt || new Date(s.createdAt).getTime() + TWENTY_FOUR_HOURS_MS).getTime();
    return exp > now;
  });

  return valid.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Retrieves all valid 24-hour statuses from local cache that have not expired,
 * filtering out muted user accounts and hidden/reported stories.
 */
export function getActiveStatuses() {
  const all = getAllActiveStatuses();
  return all.filter((s) => !isStatusHidden(s.id) && !isStatusUserMuted(s.userId, s.userName));
}

/**
 * Retrieves all valid active statuses that are currently HIDDEN by the user.
 */
export function getHiddenActiveStatuses() {
  const all = getAllActiveStatuses();
  return all.filter((s) => isStatusHidden(s.id) || isStatusUserMuted(s.userId, s.userName));
}

/**
 * Fetches real 24-hour statuses from Supabase `statuses` table joined with `profiles`,
 * including `allow_status_reshare`.
 */
export async function fetchActiveStatuses() {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('statuses')
      .select(
        'id, user_id, text_content, scripture_tag, bg_style, media_url, media_type, created_at, expires_at, profiles(id, display_name, avatar_url, badge, badge_verified, role, allow_status_reshare)'
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
        allowStatusReshare: Boolean(prof?.allow_status_reshare),
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
    return getActiveStatuses();
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

export const STATUS_AUDIENCE_DEFAULT_KEY = 'shammah_status_audience_default_v1';

export const STATUS_AUDIENCE_OPTIONS = [
  {
    id: 'public',
    label: 'Everyone',
    shortLabel: 'Everyone',
    description: 'All believers on Shammah can view your story',
    iconName: 'Globe',
  },
  {
    id: 'church',
    label: 'My Church Only',
    shortLabel: 'My Church',
    description: 'Only believers from your church community',
    iconName: 'Church',
  },
  {
    id: 'followers',
    label: 'Followers Only',
    shortLabel: 'Followers',
    description: 'Believers who follow your account',
    iconName: 'UserCheck',
  },
  {
    id: 'private',
    label: 'Only Me (Draft)',
    shortLabel: 'Only Me',
    description: 'Private draft visible only to you',
    iconName: 'Lock',
  },
];

export function getDefaultStatusAudience() {
  if (typeof window === 'undefined') return 'public';
  try {
    return localStorage.getItem(STATUS_AUDIENCE_DEFAULT_KEY) || 'public';
  } catch (e) {
    return 'public';
  }
}

export function setDefaultStatusAudience(audience) {
  if (!audience || typeof window === 'undefined') return;
  try {
    localStorage.setItem(STATUS_AUDIENCE_DEFAULT_KEY, audience);
    window.dispatchEvent(new CustomEvent('shammah:status-audience-changed', { detail: { audience } }));
  } catch (e) {}
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
  visibility = 'public',
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
    allowStatusReshare: false,
    text: cleanText,
    mediaUrl,
    mediaType: resolvedMediaType,
    bgStyle: bgStyle || 'emerald',
    scriptureTag: scriptureTag || null,
    visibility: visibility || 'public',
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    isPublic: visibility === 'public',
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

  const existing = getAllActiveStatuses();
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
 * Deletes a status update created by the user before the 24-hour timer expires.
 * Removes from Supabase `statuses` table and local cache/storage.
 */
export async function deleteStatus(statusId) {
  if (!statusId) return { success: false, error: 'Status ID missing' };

  // 1. Remove from local storage & memory cache immediately
  if (typeof window !== 'undefined') {
    try {
      const all = getAllActiveStatuses();
      const updated = all.filter((s) => s.id !== statusId);
      statusesMemoryCache = updated;
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update local status storage on delete', e);
    }
  }

  // 2. Delete from Supabase if valid UUID
  if (isValidUuid(statusId)) {
    try {
      const { error } = await supabase.from('statuses').delete().eq('id', statusId);
      if (error) {
        console.warn('Supabase status delete warning:', error.message);
      }
    } catch (err) {
      console.warn('Failed to delete status from Supabase:', err);
    }
  }

  // 3. Dispatch events to notify tray and open viewers
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('shammah:status-updated', { detail: { deletedId: statusId } }));
    window.dispatchEvent(new CustomEvent('shammah:status-deleted', { detail: { statusId } }));
  }

  return { success: true };
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
