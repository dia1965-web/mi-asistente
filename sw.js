const CACHE_VERSION = 'v3.0.0';
const CACHE_NAME = `mi-asistente-${CACHE_VERSION}`;

// Archivos a cachear
const urlsToCache = [
  '/',
  '/index.html',
  '/script.js',
  '/styles.css',
  '/manifest.json',
  '/icono-app.png'
];

// Instalar el Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caché instalado');
      return cache.addAll(urlsToCache).catch(err => {
        console.log('Algunos archivos no se pudieron cachear:', err);
      });
    })
  );
  self.skipWaiting(); // Activar inmediatamente
});

// Activar el Service Worker y limpiar cachés antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la red funciona, cachea la respuesta nueva
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Si la red falla, usa el caché
        return caches.match(event.request).then((response) => {
          return response || new Response('Offline - No disponible en caché');
        });
      })
  );
});
