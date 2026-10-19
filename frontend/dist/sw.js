const CACHE_NAME = 'assistive-tutor-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. API and AI inference requests: Network first, with graceful structured offline fallback
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/detect') ||
    url.pathname.startsWith('/ocr') ||
    url.pathname.startsWith('/speak') ||
    url.pathname.startsWith('/listen') ||
    url.pathname.startsWith('/digital-twin')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({
            offline: true,
            error: 'You are currently offline. FieldNet object detection, cloud OCR, and Gemini tutoring require network connectivity.',
            status: 'offline_unavailable'
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // 2. Navigation requests: Network first with cached index.html fallback for PWA single-page app
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // 3. Static assets: Stale-while-revalidate / cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // In worst-case offline scenario, return nothing or root
      return caches.match('/');
    })
  );
});
