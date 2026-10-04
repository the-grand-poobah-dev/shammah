'use client';
import { supabase } from '../../lib/supabaseClient';
import { playSound } from './soundEffects';

const NOTIFICATIONS_STORAGE_KEY = 'shammah_notifications_v2';
const READ_NOTIF_IDS_KEY = 'shammah_notifications_read_ids_v1';
const DELETED_NOTIF_IDS_KEY = 'shammah_notifications_deleted_ids_v1';
const FIREBASE_PUSH_CONFIG_KEY = 'shammah_firebase_push_settings';

export const NOTIFICATION_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'reactions', label: 'Reactions' },
  { id: 'comments', label: 'Comments' },
  { id: 'messages', label: 'Messages' },
  { id: 'church', label: 'Church' },
  { id: 'mentions', label: 'Prayers & Mentions' },
];

function isValidUuid(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function getIdSet(key) {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveIdSet(key, setObj) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(setObj)));
  } catch {}
}

export function getNotifications() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNotifications(list) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('shammah:notifications-updated'));
  } catch (err) {
    console.error('Failed to save notifications', err);
  }
}

/**
 * Fetches real notifications derived from Supabase events:
 * - Comments on the user's posts
 * - Reactions on the user's posts
 * - @Mentions in comments
 * - Direct messages received
 * - New followers
 * Merges with any live FCM alerts and applies read/deleted state.
 */
export async function fetchRealNotifications(userId) {
  let uid = userId;
  if (!isValidUuid(uid)) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      uid = sessionData?.session?.user?.id;
    } catch {}
  }

  if (!isValidUuid(uid)) {
    return getNotifications();
  }

  const readIds = getIdSet(READ_NOTIF_IDS_KEY);
  const deletedIds = getIdSet(DELETED_NOTIF_IDS_KEY);

  try {
    // 1. Find the user's own posts so we can query comments & reactions on them
    const { data: myPosts } = await supabase
      .from('posts')
      .select('id, text_content')
      .eq('author_id', uid)
      .order('created_at', { ascending: false })
      .limit(40);

    const myPostIds = (myPosts || []).map((p) => p.id);
    const postSnippetById = new Map(
      (myPosts || []).map((p) => [p.id, (p.text_content || 'your post').slice(0, 60)])
    );

    const [commentsRes, reactionsRes, mentionsRes, dmsRes, followsRes] = await Promise.all([
      myPostIds.length > 0
        ? supabase
            .from('comments')
            .select('id, post_id, author_id, text_content, created_at')
            .in('post_id', myPostIds)
            .neq('author_id', uid)
            .order('created_at', { ascending: false })
            .limit(25)
        : Promise.resolve({ data: [] }),
      myPostIds.length > 0
        ? supabase
            .from('reactions')
            .select('id, target_id, user_id, emoji, created_at')
            .eq('target_type', 'post')
            .in('target_id', myPostIds)
            .neq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(25)
        : Promise.resolve({ data: [] }),
      supabase
        .from('comments')
        .select('id, post_id, author_id, text_content, created_at')
        .contains('mentioned_user_ids', [uid])
        .neq('author_id', uid)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('direct_messages')
        .select('id, sender_id, text_content, created_at, read_at')
        .eq('recipient_id', uid)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('follows')
        .select('follower_id, created_at')
        .eq('followed_id', uid)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const actorIds = new Set();
    (commentsRes.data || []).forEach((c) => c.author_id && actorIds.add(c.author_id));
    (reactionsRes.data || []).forEach((r) => r.user_id && actorIds.add(r.user_id));
    (mentionsRes.data || []).forEach((m) => m.author_id && actorIds.add(m.author_id));
    (dmsRes.data || []).forEach((d) => d.sender_id && actorIds.add(d.sender_id));
    (followsRes.data || []).forEach((f) => f.follower_id && actorIds.add(f.follower_id));

    let profileById = new Map();
    if (actorIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, badge, badge_verified')
        .in('id', Array.from(actorIds));
      profileById = new Map((profiles || []).map((p) => [p.id, p]));
    }

    const derived = [];

    for (const c of commentsRes.data || []) {
      const id = `db-comment-${c.id}`;
      if (deletedIds.has(id)) continue;
      const actor = profileById.get(c.author_id);
      const actorName = actor?.display_name || 'Fellowship Member';
      derived.push({
        id,
        type: 'comments',
        category: 'comments',
        title: `${actorName} commented on your post`,
        body: `"${(c.text_content || '').slice(0, 120)}"`,
        timestamp: c.created_at,
        isRead: readIds.has(id),
        actorName,
        actorAvatar: actor?.avatar_url || null,
        actorBadge: actor?.badge || null,
        targetLink: '/?tab=home',
        icon: '💬',
      });
    }

    for (const r of reactionsRes.data || []) {
      const id = `db-reaction-${r.id}`;
      if (deletedIds.has(id)) continue;
      const actor = profileById.get(r.user_id);
      const actorName = actor?.display_name || 'Fellowship Member';
      const snippet = postSnippetById.get(r.target_id) || 'your post';
      derived.push({
        id,
        type: 'reactions',
        category: 'reactions',
        title: `${actorName} reacted ${r.emoji || '🙏'} to your post`,
        body: `On: "${snippet}"`,
        timestamp: r.created_at,
        isRead: readIds.has(id),
        actorName,
        actorAvatar: actor?.avatar_url || null,
        actorBadge: actor?.badge || null,
        targetLink: '/?tab=home',
        icon: r.emoji || '🙏',
      });
    }

    for (const m of mentionsRes.data || []) {
      const id = `db-mention-${m.id}`;
      if (deletedIds.has(id)) continue;
      const actor = profileById.get(m.author_id);
      const actorName = actor?.display_name || 'Fellowship Member';
      derived.push({
        id,
        type: 'mentions',
        category: 'mentions',
        title: `${actorName} mentioned you in a comment`,
        body: `"${(m.text_content || '').slice(0, 120)}"`,
        timestamp: m.created_at,
        isRead: readIds.has(id),
        actorName,
        actorAvatar: actor?.avatar_url || null,
        actorBadge: actor?.badge || null,
        targetLink: '/?tab=home',
        icon: '📣',
      });
    }

    for (const d of dmsRes.data || []) {
      const id = `db-dm-${d.id}`;
      if (deletedIds.has(id)) continue;
      const actor = profileById.get(d.sender_id);
      const actorName = actor?.display_name || 'Fellowship Member';
      derived.push({
        id,
        type: 'messages',
        category: 'messages',
        title: `Direct message from ${actorName}`,
        body: (d.text_content || '').slice(0, 120),
        timestamp: d.created_at,
        isRead: Boolean(d.read_at) || readIds.has(id),
        actorName,
        actorAvatar: actor?.avatar_url || null,
        actorBadge: actor?.badge || null,
        targetLink: `/?tab=messages&recipient=${d.sender_id}`,
        icon: '✉️',
      });
    }

    for (const f of followsRes.data || []) {
      const id = `db-follow-${f.follower_id}`;
      if (deletedIds.has(id)) continue;
      const actor = profileById.get(f.follower_id);
      const actorName = actor?.display_name || 'Fellowship Member';
      derived.push({
        id,
        type: 'church',
        category: 'church',
        title: `${actorName} started following you`,
        body: 'Connected with you in fellowship.',
        timestamp: f.created_at,
        isRead: readIds.has(id),
        actorName,
        actorAvatar: actor?.avatar_url || null,
        actorBadge: actor?.badge || null,
        targetLink: '/?tab=home',
        icon: '🤝',
      });
    }

    // Keep any live FCM push alerts that are not db-* rows
    const existingLocal = getNotifications().filter(
      (n) => !String(n.id).startsWith('db-') && !deletedIds.has(n.id)
    );

    const byId = new Map();
    [...existingLocal, ...derived].forEach((item) => {
      if (!byId.has(item.id)) {
        byId.set(item.id, {
          ...item,
          isRead: Boolean(item.isRead || readIds.has(item.id)),
        });
      }
    });

    const merged = Array.from(byId.values()).sort(
      (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    );

    saveNotifications(merged);
    return merged;
  } catch (err) {
    console.warn('Failed to fetch real notifications:', err);
    return getNotifications();
  }
}

export function getUnreadNotificationCount() {
  const list = getNotifications();
  return list.filter((n) => !n.isRead).length;
}

export function markNotificationAsRead(id) {
  const readIds = getIdSet(READ_NOTIF_IDS_KEY);
  readIds.add(id);
  saveIdSet(READ_NOTIF_IDS_KEY, readIds);

  const list = getNotifications();
  const next = list.map((n) => (n.id === id ? { ...n, isRead: true } : n));
  saveNotifications(next);
}

export function markAllNotificationsAsRead() {
  const readIds = getIdSet(READ_NOTIF_IDS_KEY);
  const list = getNotifications();
  list.forEach((n) => readIds.add(n.id));
  saveIdSet(READ_NOTIF_IDS_KEY, readIds);

  const next = list.map((n) => ({ ...n, isRead: true }));
  saveNotifications(next);
}

export function deleteNotification(id) {
  const deletedIds = getIdSet(DELETED_NOTIF_IDS_KEY);
  deletedIds.add(id);
  saveIdSet(DELETED_NOTIF_IDS_KEY, deletedIds);

  const list = getNotifications();
  const next = list.filter((n) => n.id !== id);
  saveNotifications(next);
}

export function addNotification(notif) {
  const list = getNotifications();
  const item = {
    id: notif.id || `notif-${Date.now()}`,
    type: notif.type || 'all',
    category: notif.category || notif.type || 'all',
    title: notif.title || 'Fellowship Alert',
    body: notif.body || notif.text || '',
    timestamp: new Date().toISOString(),
    isRead: false,
    actorName: notif.actorName || notif.senderName || 'Fellowship Member',
    actorAvatar: notif.actorAvatar || notif.avatar || null,
    actorBadge: notif.actorBadge || null,
    targetLink: notif.targetLink || '/?tab=alerts',
    icon: notif.icon || '🔔',
  };

  const next = [item, ...list.filter((n) => n.id !== item.id)];
  saveNotifications(next);
  playSound('alert');

  // Trigger browser push if enabled
  triggerFirebaseBrowserPush(item);

  return item;
}

// ================= Firebase / Web Push Integration (Per-Device) ================= //

export function getFirebasePushConfig() {
  if (typeof window === 'undefined') {
    return {
      enabled: true,
      sound: true,
      popupAlerts: true,
      pushPermission: 'default',
      fcmToken: null,
    };
  }
  try {
    const raw = localStorage.getItem(FIREBASE_PUSH_CONFIG_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      enabled: parsed.enabled ?? true,
      sound: parsed.sound ?? true,
      popupAlerts: parsed.popupAlerts ?? true,
      pushPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
      fcmToken: parsed.fcmToken || null,
      notifyNewPosts: parsed.notifyNewPosts ?? true,
      notifyMentions: parsed.notifyMentions ?? true,
    };
  } catch {
    return { enabled: true, sound: true, popupAlerts: true, pushPermission: 'default', fcmToken: null };
  }
}

export function saveFirebasePushConfig(cfg) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FIREBASE_PUSH_CONFIG_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent('shammah:firebase-config-updated', { detail: cfg }));
  } catch (err) {
    console.error('Failed to save Firebase config', err);
  }
}

export async function requestFirebasePushPermission() {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return { success: false, permission: 'unsupported' };
  }

  try {
    const permission = await Notification.requestPermission();
    const current = getFirebasePushConfig();
    const updated = {
      ...current,
      enabled: permission === 'granted',
      pushPermission: permission,
      fcmToken: permission === 'granted' ? current.fcmToken : null,
    };
    saveFirebasePushConfig(updated);
    return { success: permission === 'granted', permission };
  } catch (err) {
    console.error('Notification permission request error:', err);
    return { success: false, permission: 'denied' };
  }
}

export function triggerFirebaseBrowserPush(notif) {
  if (typeof window === 'undefined') return;
  const cfg = getFirebasePushConfig();
  if (!cfg.enabled) return;

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(notif.title, {
        body: notif.body,
        icon: notif.actorAvatar || '/favicon.ico',
        tag: notif.id,
      });
    } catch {}
  }
}
