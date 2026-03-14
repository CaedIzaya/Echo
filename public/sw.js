// Echo Service Worker — minimal, network-first, no caching
// Purpose: enables PWA install prompt (beforeinstallprompt) on Chrome/Edge

const CACHE_VERSION = 'echo-sw-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Network-first with graceful fallback — does not cache anything
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests; let everything else pass through natively
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests (e.g. fonts, analytics)
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Skip Next.js internal / API routes so auth and data requests are unaffected
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/__nextjs')
  ) {
    return;
  }

  event.respondWith(fetch(event.request));
});
