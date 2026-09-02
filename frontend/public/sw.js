const CACHE_NAME = 'ccaa-cache-v2';
const RUNTIME_CACHE = 'ccaa-runtime-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add('/').catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
  self.registration?.navigationPreload?.enable?.();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cache = caches.open(RUNTIME_CACHE);
          if (response && response.status === 200 && request.method === 'GET') {
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  } else if (request.mode === 'navigate') {
    // Toujours récupérer le HTML récent : Vite change les noms de chunks à chaque build.
    event.respondWith(
      (self.registration.navigationPreload ? self.registration.navigationPreload
        .getState().then((state) => state.enabled ? event.preloadResponse : null) : null)
        .then((preload) => preload || fetch(request))
        .catch(() => caches.match('/index.html').then((response) => response || caches.match('/')))
    );
  } else {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
  }
});
