/* 아이돌 보정실 — offline cache */
const CACHE = 'idol-studio-v9';
const CORE = ['./', './index.html', './apple-touch-icon.png', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  const isHTML = e.request.mode === 'navigate' || url.endsWith('/') || url.endsWith('index.html');
  // network-first for the app shell so UI updates appear right away
  if (isHTML) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit => {
      const network = fetch(e.request).then(res => {
        const url = e.request.url;
        const cacheable =
          (res.ok || res.type === 'opaque') &&
          (url.startsWith(self.location.origin) || url.includes('cdn.jsdelivr.net'));
        if (cacheable) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
      return hit || network;
    })
  );
});
