/* Hift App — service worker
   L'app resta sulla versione installata (funziona anche offline) finché
   non premi "Aggiorna": il tasto compare quando version.json annuncia
   una versione nuova. Non serve cambiare questo file a ogni rilascio. */
const CACHE = 'hift-app';
const ASSETS = [
  './', './index.html', './aggiornamenti.js', './manifest.json',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/favicon-32.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromNetwork(req, key) {
  return fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(key || req, copy));
    }
    return res;
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.endsWith('version.json')) return; // controllo aggiornamenti: sempre dalla rete

  // Pagina: la versione installata; se manca, dalla rete
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(hit => hit || caches.match(req, { ignoreSearch: true }))
        .then(hit => hit || fromNetwork(req, './index.html'))
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // File dell'app e font: prima la copia installata
  const font = url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  if (url.origin === self.location.origin || font) {
    e.respondWith(
      caches.match(req, { ignoreSearch: url.origin === self.location.origin })
        .then(hit => hit || fromNetwork(req))
        .catch(() => caches.match(req))
    );
  }
});

// Tasto "Aggiorna": attiva subito un eventuale service worker nuovo
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
