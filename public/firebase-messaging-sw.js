/* Firebase Cloud Messaging service worker for Shammah web push. */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyC2X1WMtm7zzHo2ogDG5sowrXywe5QKfPI',
  authDomain: 'qualified-acre-428112-d0.firebaseapp.com',
  projectId: 'qualified-acre-428112-d0',
  storageBucket: 'qualified-acre-428112-d0.firebasestorage.app',
  messagingSenderId: '141591009642',
  appId: '1:141591009642:web:797beefc2b0f733011ed13',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload?.data || {};
  const title = data.title || 'Shammah';
  const options = {
    body: data.body || 'You have a new Shammah notification.',
    icon: data.icon || '/favicon.ico',
    tag: data.kind || 'shammah-notification',
    data: { link: data.link || '/' },
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = event.notification?.data?.link || '/';
  const target = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
