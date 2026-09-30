// Gaia's service worker. It only shows notifications: nothing is cached, so
// Gaia loads exactly as it does without it. Messages come from api/remind.ts.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    // Not JSON; show Gaia's name rather than nothing.
  }
  // Every push must show something: iPhones stop delivering to a page that stays silent.
  event.waitUntil(
    self.registration.showNotification(message.title || 'Gaia', {
      body: message.body || '',
      tag: message.tag,
      icon: '/icon-192.png',
      badge: '/favicon-64.png',
      data: { url: message.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      if (open) {
        await open.focus();
        if ('navigate' in open) await open.navigate(url).catch(() => undefined);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
