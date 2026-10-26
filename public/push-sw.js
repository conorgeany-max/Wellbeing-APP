// Loaded into the service worker (see vite.config.ts) to show reminder notifications.
self.addEventListener('push', (event) => {
  let data = { title: 'Steady', body: 'A few quiet minutes for your check-in?', url: './#/checkin' };
  try { data = { ...data, ...event.data.json() }; } catch (e) { /* plain or empty payload */ }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: 'steady-reminder',
      data: { url: data.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || './', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => w.url.startsWith(self.registration.scope));
      if (win) return win.navigate(url).then((w) => (w || win).focus());
      return self.clients.openWindow(url);
    }),
  );
});
