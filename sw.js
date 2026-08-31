const CACHE='road-guard-%%VERSION%%';
const ASSETS=['./','./index.html','./styles.css?v=%%VERSION%%','./app.js?v=%%VERSION%%','./data.js?v=%%VERSION%%','./osm.js?v=%%VERSION%%','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));});
