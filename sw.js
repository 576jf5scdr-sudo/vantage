// Vantage service worker: offline shell + fresh desk data when online
const VERSION = 'vantage-v2.1.0';
const SHELL = ['./', 'index.html', 'manifest.json', 'css/app.css', 'js/icons.js', 'js/charts.js', 'js/store.js', 'js/lessons.js', 'js/app.js',
  'fonts/inter-latin-wght-normal.woff2', 'fonts/outfit-latin-wght-normal.woff2', 'fonts/inter-greek-wght-normal.woff2', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'data/desk.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/data/desk.json')) { // network first, fall back to last copy
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; }).catch(() => caches.match(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; }).catch(() => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined));
    return hit || net;
  }));
});
