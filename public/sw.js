const CACHE = 'tp-cache-v1';
const OFFLINE_URLS = ['/', '/settings', '/help', '/about', '/library', '/favicon.ico', '/site.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try { await cache.addAll(OFFLINE_URLS); } catch (_) {}
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    // Network first for navigations, fallback to cache
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(req, net.clone());
          return net;
        } catch (_) {
          const cache = await caches.open(CACHE);
          const res = await cache.match(req) || await cache.match('/');
          return res || new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }
  if (url.origin === location.origin) {
    // Cache-first for same-origin assets
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const net = await fetch(req);
          cache.put(req, net.clone());
          return net;
        } catch (_) {
          return cached || Response.error();
        }
      })()
    );
  }
});
