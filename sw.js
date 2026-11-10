const revision = "519486f8b3c998aa";
const files = ["./app.js","./graphics.js","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png","./icons/source.svg","./","./manifest.webmanifest","./model.js","./storage.js","./styles.css","./views.js"];
const scope = new URL(self.registration.scope);
const prefix = `podhod:${scope.pathname}:`;
const cacheName = prefix + revision;
const shell = scope.href;
const indexPath = new URL('index.html', scope).pathname;
const assets = new Set(files.map(file => new URL(file, scope).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll([...assets].map(url => new Request(url, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(prefix) && name !== cacheName)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin) return;
  const isHome = request.mode === 'navigate' && (url.pathname === scope.pathname || url.pathname === indexPath);
  if (!isHome && !assets.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return await cache.match(isHome ? shell : request) || await fetch(request);
  })());
});
