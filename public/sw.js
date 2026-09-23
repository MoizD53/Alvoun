const CACHE_NAME = 'alvoun-pwa-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Minimal fetch handler to satisfy Chrome's PWA install requirements.
  // We simply pass through the network request for Level 1.
  event.respondWith(fetch(event.request));
});
