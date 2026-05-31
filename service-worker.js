const CACHE='tlgec-survey-v22';
const FILES=['./','./index.html','./styles.css','./app.js','./manifest.json','./icon.svg','./tesla-powerwall.webp','./sigenergy-battery.webp','./tlgec-logo.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
