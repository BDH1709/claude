// Basis service worker voor de PWA-installeerbaarheid.
//
// Dit cachet alleen de statische app-shell (CSS/JS/iconen) zodat de app
// installeerbaar is en snel laadt. Er is bewust nog GEEN offline-inzage van
// leerlingdata of offline-opslag van notities: dat vraagt een eigen
// sync-strategie en volgt in een latere uitbreiding (zie README).

const CACHE_NAAM = 'onderwijshub-shell-v1';
const SHELL_BESTANDEN = [
  '/css/style.css',
  '/js/app.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/offline.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAAM).then((cache) => cache.addAll(SHELL_BESTANDEN)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== CACHE_NAAM).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Paginanavigatie: probeer het netwerk (actuele, ingelogde inhoud), val terug
  // op een simpele offline-pagina als er geen verbinding is.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Statische bestanden: cache-first.
  if (SHELL_BESTANDEN.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
