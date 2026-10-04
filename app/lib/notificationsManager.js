'use client';
import { playSound } from './soundEffects';

const NOTIFICATIONS_STORAGE_KEY = 'shammah_notifications_v1';
const FIREBASE_PUSH_CONFIG_KEY = 'shammah_firebase_push_settings';

export const NOTIFICATION_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'reactions', label: 'Reactions' },
  { id: 'comments', label: 'Comments' },
  { id: 'messages', label: 'Messages' },
  { id: 'church', label: 'Church' },
  { id: 'mentions', label: 'Prayers & Mentions' },
];

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'notif-1',
    type: 'church',
    category: 'church',
    title: 'Church Announcement from Pastor David',
    body: 'Special All-Night Worship & Fasting service this Friday at 7:00 PM.',
    timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    isRead: false,
    actorName: 'Pastor David Mwangi',
    actorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    actorBadge: 'pastor',
    targetLink: '/?tab=home&section=all',
    icon: '⛪',
  },
  {
    id: 'notif-2',
    type: 'reactions',
    category: 'reactions',
    title: 'Sister Mary Grace reacted to your prayer request',
    body: 'Reacted with 🙏 "Amen / Pray" to your testimony: "God provided during finals week!"',
    timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    isRead: false,
    actorName: 'Sister Mary Grace',
    actorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    actorBadge: 'worship',
    targetLink: '/?tab=home',
    icon: '🙏',
  },
  {
    id: 'notif-3',
    type: 'comments',
    category: 'comments',
    title: 'Brother John commented on your post',
    body: '"Such a powerful word! Standing in agreement with you in faith."',
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    isRead: true,
    actorName: 'Brother John Ochieng',
    actorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    actorBadge: 'partner',
    targetLink: '/?tab=home',
    icon: '💬',
  },
  {
    id: 'notif-4',
    type: 'messages',
    category: 'messages',
    title: 'New Fellowship Direct Message',
    body: 'Pastor David sent you a direct fellowship message.',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    isRead: false,
    actorName: 'Pastor David Mwangi',
    actorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    actorBadge: 'pastor',
    targetLink: '/?tab=messages',
    icon: '✉️',
  },
  {
    id: 'notif-5',
    type: 'mentions',
    category: 'mentions',
    title: 'Prayed for by 14 church members',
    body: 'Your prayer request for health healing was lifted up during morning intercession.',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    isRead: true,
    actorName: 'Nairobi Worship Fellowship',
    actorAvatar: null,
    actorBadge: 'church_admin',
    targetLink: '/?tab=home',
    icon: '🕊️',
  },
];

export function getNotifications() {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATIONS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_NOTIFICATIONS;
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

export function getUnreadNotificationCount() {
  const list = getNotifications();
  return list.filter((n) => !n.isRead).length;
}

export function markNotificationAsRead(id) {
  const list = getNotifications();
  const next = list.map((n) => (n.id === id ? { ...n, isRead: true } : n));
  saveNotifications(next);
}

export function markAllNotificationsAsRead() {
  const list = getNotifications();
  const next = list.map((n) => ({ ...n, isRead: true }));
  saveNotifications(next);
}

export function deleteNotification(id) {
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

  const next = [item, ...list];
  saveNotifications(next);
  playSound('alert');

  // Trigger browser push if enabled
  triggerFirebaseBrowserPush(item);

  return item;
}

// ================= Firebase / Web Push Integration ================= //

export function getFirebasePushConfig() {
  if (typeof window === 'undefined') {
    return {
      enabled: true,
      sound: true,
      popupAlerts: true,
      pushPermission: 'default',
      fcmToken: 'fcm-mock-token-shammah-live',
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
      fcmToken: parsed.fcmToken || 'fcm-token-shammah-firebase-v1',
    };
  } catch {
    return { enabled: true, sound: true, popupAlerts: true, pushPermission: 'default' };
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
      fcmToken: permission === 'granted' ? `fcm-token-${Date.now().toString(36)}` : null,
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
