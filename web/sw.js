// Service worker: tampilan web tetap terbuka saat sinyal lemah. Data disimpan oleh app.js.
const CACHE = 'lka-v1';
const CANGKANG = ['/', '/index.html', '/style.css', '/app.js', '/panduan.js', '/icon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CANGKANG)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((kunci) => Promise.all(kunci.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Jaringan dulu supaya warga selalu dapat versi terbaru; cache hanya cadangan saat offline.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok) {
      const salinan = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, salinan));
    }
    return res;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match('/'))));
});
