// Minimal PWA shell service worker. No offline caching yet (open question,
// see docs/architecture.md §14.3) — this only makes the app installable and
// keeps the fetch handler as a plain passthrough so nothing goes stale.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
