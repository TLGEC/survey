const CACHE = 'lg-survey-pro-v4-review-2026-10-01-1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './brand.css',
  './storage.js',
  './app.js',
  './src/schema.js',
  './src/import.js',
  './src/pricing-data.js',
  './src/pricing.js',
  './src/outputs.js',
  './vendor/pdf-lib.min.js',
  './manifest.json',
  './icon.svg',
  './app-icon-192.png',
  './app-icon-512.png',
  './tlgec-logo.png',
  './tlgec-home-hero.webp',
  './vendor/Montserrat-VariableFont_wght.woff2',
  './tesla-powerwall.webp',
  './sigenergy-battery.webp',
  './reset.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './index.html'));
    return;
  }

  event.respondWith(cacheFirstWithRefresh(request));
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(request)) || cache.match(fallbackUrl) || new Response('LG Survey Pro is not cached on this device yet.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function cacheFirstWithRefresh(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request).then(response => {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  if (cached) {
    refresh;
    return cached;
  }
  return (await refresh) || new Response('', { status: 504, statusText: 'Offline' });
}
