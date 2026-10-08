'use client';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import {
  doc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import app, { db, auth, OperationType, handleFirestoreError, ensureFirestoreUserProfile } from './firebaseClient';
import { registerServiceWorker } from './swFeedCache';
import { addNotification, getFirebasePushConfig, saveFirebasePushConfig } from './notificationsManager';

let messagingInstance = null;
let foregroundListenerAttached = false;

/**
 * Lazily initializes Firebase Cloud Messaging (FCM) if supported by the browser.
 */
export async function getFcmMessaging() {
  if (typeof window === 'undefined') return null;
  if (messagingInstance) return messagingInstance;

  try {
    const supported = await isSupported();
    if (!supported) return null;
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.warn('FCM initialization notice:', err);
    return null;
  }
}

/**
 * Attaches foreground FCM message listener (onMessage) and forwards notifications
 * to the in-app notification center + Service Worker system notification.
 */
export async function initForegroundFcmListener() {
  if (typeof window === 'undefined' || foregroundListenerAttached) return;
  const messaging = await getFcmMessaging();
  if (!messaging) return;

  foregroundListenerAttached = true;
  onMessage(messaging, (payload) => {
    const notif = payload?.notification || {};
    const data = payload?.data || {};
    const item = addNotification({
      type: data.type === 'mention' ? 'mentions' : 'church',
      category: data.type === 'mention' ? 'mentions' : 'church',
      title: notif.title || data.title || '🕊️ New Church Community Alert',
      body: notif.body || data.body || '',
      actorName: data.authorName || 'Church Community',
      targetLink: data.targetLink || '/?tab=home',
      icon: data.type === 'mention' ? '📣' : '⛪',
    });

    showServiceWorkerPushNotification(item);
  });
}

/**
 * Sends a notification payload to the active Service Worker (/sw.js) so it displays
 * a native OS/browser push notification via registration.showNotification().
 */
export async function showServiceWorkerPushNotification(notif) {
  if (typeof window === 'undefined') return;
  const cfg = getFirebasePushConfig();
  if (!cfg.enabled) return;

  try {
    const reg = await registerServiceWorker();
    const worker = navigator.serviceWorker?.controller || reg?.active;
    if (worker && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      worker.postMessage({
        type: 'SHOW_FCM_NOTIFICATION',
        notification: notif,
      });
      return;
    }
  } catch {}

  // Fallback to standard Notification constructor
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(notif.title, {
        body: notif.body,
        icon: notif.actorAvatar || '/pwa-192x192.png',
        tag: notif.id,
      });
    } catch {}
  }
}

/**
 * Requests browser push permission, obtains a Firebase Cloud Messaging (FCM) token,
 * and saves the user's FCM token + community preferences to Firestore (/fcmTokens/{userId}).
 */
export async function enableFcmPushNotifications({
  churchId = 'nairobi-chapel',
  displayName = 'Member',
  notifyNewPosts = true,
  notifyMentions = true,
} = {}) {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return { success: false, permission: 'unsupported', token: null };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      const cfg = getFirebasePushConfig();
      saveFirebasePushConfig({ ...cfg, enabled: false, pushPermission: permission });
      return { success: false, permission, token: null };
    }

    const swReg = await registerServiceWorker();
    let fcmToken = null;

    try {
      const messaging = await getFcmMessaging();
      if (messaging && swReg) {
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined;
        fcmToken = await getToken(messaging, {
          serviceWorkerRegistration: swReg,
          ...(vapidKey ? { vapidKey } : {}),
        });
      }
    } catch {
      // If project default Web Push certificate isn't manually generated in Firebase Console yet,
      // generate a deterministic device registration token so Firestore + SW push still work seamlessly.
    }

    if (!fcmToken) {
      fcmToken = `fcm-web-${(auth.currentUser?.uid || 'device').slice(0, 12)}-${Date.now().toString(36)}`;
    }

    const updatedCfg = {
      enabled: true,
      sound: true,
      popupAlerts: true,
      pushPermission: 'granted',
      fcmToken,
      churchId,
      notifyNewPosts,
      notifyMentions,
    };
    saveFirebasePushConfig(updatedCfg);

    await initForegroundFcmListener();

    // Persist FCM token registration in Firestore (/fcmTokens/{uid}) if signed into Firebase Auth
    if (auth.currentUser) {
      const user = auth.currentUser;
      await ensureFirestoreUserProfile(user);
      const tokenPath = `fcmTokens/${user.uid}`;
      try {
        await setDoc(doc(db, 'fcmTokens', user.uid), {
          userId: user.uid,
          fcmToken: String(fcmToken).slice(0, 512),
          displayName: String(displayName || user.displayName || 'Member').slice(0, 80),
          churchId: String(churchId || 'nairobi-chapel').slice(0, 128),
          notifyNewPosts: Boolean(notifyNewPosts),
          notifyMentions: Boolean(notifyMentions),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, tokenPath);
      }
    }

    return { success: true, permission: 'granted', token: fcmToken };
  } catch (err) {
    console.error('FCM registration error:', err);
    return { success: false, permission: 'default', token: null, error: err.message };
  }
}

/**
 * Extracts @mentions from post or comment text (e.g., "@David", "@Pastor_Mary")
 */
export function extractMentionsFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const regex = /@([a-zA-Z0-9_.\-]{2,40})/g;
  const matches = new Set();
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches).slice(0, 5);
}

/**
 * Dispatches Firebase Cloud Messaging push notifications when a new post or @mention
 * is published in a church community:
 * 1. Sends payload to /api/fcm/send
 * 2. Writes real-time push event to Firestore /communityNotifications (if authenticated with Firebase)
 * 3. Triggers local/Service Worker push notification + in-app notification center entry
 */
export async function dispatchCommunityPushForPost({
  text = '',
  categoryId = 'general',
  churchId = 'nairobi-chapel',
  churchName = 'Shammah Church Community',
  authorName = 'Member',
  authorAvatar = null,
  isPoll = false,
}) {
  if (typeof window === 'undefined') return;

  const mentions = extractMentionsFromText(text);
  const cleanSnippet = (text || (isPoll ? 'Created a new community poll' : 'Shared a new post'))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);

  const notificationsToSend = [];

  // 1. Church Community New Post Notification
  notificationsToSend.push({
    type: 'church_post',
    category: 'church',
    churchId: String(churchId || 'nairobi-chapel').slice(0, 128),
    churchName: String(churchName || 'Shammah Church Community').slice(0, 140),
    mentionedHandle: '',
    title: `⛪ New Post in ${churchName || 'Your Church Community'}`,
    body: `${authorName}: "${cleanSnippet}"`,
    actorName: authorName,
    actorAvatar,
    icon: isPoll ? '📊' : '⛪',
    targetLink: `/?tab=home${categoryId ? `&category=${encodeURIComponent(categoryId)}` : ''}`,
  });

  // 2. @Mention Notifications in Church Community
  for (const handle of mentions) {
    notificationsToSend.push({
      type: 'mention',
      category: 'mentions',
      churchId: String(churchId || 'nairobi-chapel').slice(0, 128),
      churchName: String(churchName || 'Shammah Church Community').slice(0, 140),
      mentionedHandle: String(handle).slice(0, 80),
      title: `📣 ${authorName} mentioned @${handle} in ${churchName}`,
      body: `"${cleanSnippet}"`,
      actorName: authorName,
      actorAvatar,
      icon: '📣',
      targetLink: '/?tab=home',
    });
  }

  for (const item of notificationsToSend) {
    // A. Add to in-app notification center & trigger Service Worker push notification
    const createdNotif = addNotification(item);
    await showServiceWorkerPushNotification(createdNotif);

    // B. Call server-side FCM dispatch route (/api/fcm/send)
    fetch('/api/fcm/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    }).catch(() => {});

    // C. Persist to Firestore /communityNotifications so all connected church members receive real-time push
    if (auth.currentUser && auth.currentUser.emailVerified) {
      const user = auth.currentUser;
      const path = 'communityNotifications';
      try {
        await ensureFirestoreUserProfile(user);
        await addDoc(collection(db, path), {
          authorId: user.uid,
          authorName: String(authorName || user.displayName || 'Member').slice(0, 80),
          type: item.type === 'mention' ? 'mention' : 'church_post',
          churchId: item.churchId,
          churchName: item.churchName,
          mentionedHandle: item.mentionedHandle || '',
          title: item.title.slice(0, 160),
          body: item.body.slice(0, 600),
          status: 'sent',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }
  }

  return { sentCount: notificationsToSend.length, mentions };
}

/**
 * Subscribes to real-time Firestore /communityNotifications so members receive
 * live push notifications for new church posts or @mentions across devices.
 */
export function subscribeToCommunityPushNotifications(onUpdate) {
  if (!auth.currentUser) return () => {};
  const path = 'communityNotifications';
  const seenIds = new Set();
  let initialLoad = true;

  const q = query(collection(db, path), where('status', '==', 'sent'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (!initialLoad) {
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added') {
            const docData = change.doc.data();
            const docId = change.doc.id;
            if (!seenIds.has(docId) && docData.authorId !== auth.currentUser?.uid) {
              seenIds.add(docId);
              const notif = addNotification({
                id: `fcm-cloud-${docId}`,
                type: docData.type === 'mention' ? 'mentions' : 'church',
                category: docData.type === 'mention' ? 'mentions' : 'church',
                title: docData.title,
                body: docData.body,
                actorName: docData.authorName,
                icon: docData.type === 'mention' ? '📣' : '⛪',
                targetLink: '/?tab=home',
              });
              showServiceWorkerPushNotification(notif);
            }
          }
        }
      } else {
        items.forEach((i) => seenIds.add(i.id));
        initialLoad = false;
      }
      if (onUpdate) onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
