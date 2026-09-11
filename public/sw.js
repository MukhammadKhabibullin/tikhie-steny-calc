const CACHE_NAME = 'tikhie-steny-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

// Установка Service Worker и кэширование базовой статики
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[PWA SW] Precache warning:', err))
  );
});

// Активация и удаление устаревших версий кэша
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Перехват запросов (стратегия Stale-While-Revalidate для статики и Network-Only для API)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Игнорируем не-GET запросы
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Игнорируем запросы к внешним API (Supabase и т.д.)
  if (url.origin.includes('supabase.co') || url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/')) {
    return;
  }

  // Для навигационных запросов (переход по страницам SPA)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match('/index.html');
        return cachedResponse || new Response('Offline', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  // Для локальных файлов и статических ресурсов: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
