const CACHE_NAME = 'alvoun-pwa-v3';
const PRECACHE_ASSETS = [
  '/',
  '/login',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache error during install:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(async (err) => {
      try {
        const response = await caches.match(event.request);
        if (response) {
          return response;
        }
      } catch (cacheErr) {
        console.warn('Cache error:', cacheErr);
      }
      
      // If we reach here, network failed and it's not in cache.
      // Return a 503 Response instead of throwing an unhandled rejection
      // which causes the browser to log "FetchEvent resulted in a network error"
      return new Response('Offline or Network Error', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'Content-Type': 'text/plain' })
      });
    })
  );
});
