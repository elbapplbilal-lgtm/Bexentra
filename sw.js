const CACHE="bexentra-shell-v22";
const SHELL=["./","./index.html","./explorer.html","./public/home.css?v=22","./public/app.js?v=22","./public/style.css?v=18","./public/explorer.js?v=18","./public/icon.svg","./manifest.webmanifest"];
self.addEventListener("install",event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).catch(()=>{}))});
self.addEventListener("activate",event=>{event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))]))});
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;const url=new URL(event.request.url);if(url.origin!==location.origin)return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html"))))});
