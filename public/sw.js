/**
 * CareLoop Service Worker
 * Caches app shell assets for offline availability and PWA installability.
 */

const CACHE_NAME = 'careloop-shell-v1';
const SHELL_URLS = [
  '/',
  '/patient',
  '/manifest.json',
  '/globals.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_URLS).catch(() => {
        // Tolerant if some assets are generated dynamically
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests for shell assets
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // Do not cache API requests so clinical status is always live
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Fallback for offline navigation
        return caches.match('/patient');
      });
    })
  );
});

