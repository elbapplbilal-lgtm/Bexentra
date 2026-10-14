const CACHE="bexentra-shell-v68-rich-real-tx";
const SHELL=[
 "./","./index.html","./explorer.html",
 "./public/home.css?v=32","./public/stage1.css?v=1",
 "./public/visual-v2.css?v=2","./public/neon-premium.css?v=1",
 "./public/reference-match.css?v=1","./public/mobile-layout-stability.css?v=1","./public/orbit-globe.svg","./public/neon-icons.svg",
 "./public/style.css?v=24","./public/nav.css?v=30",
 "./public/explorer-detail.css?v=31","./public/detail-mobile-fix.css?v=4","./public/neon-detail.css?v=2","./public/tx-detail-help.css?v=1",
 "./public/detail-nav-rescue.css?v=1","./public/category-view.css?v=3","./public/result-clarity.css?v=2","./public/visitor-guide.css?v=1","./public/home-refinement.css?v=1",
 "./public/preferences.js?v=9","./public/search-input.js?v=1",
 "./public/app.js?v=43","./public/explorer.js?v=43",
 "./public/neon-reference-v5.css?v=1","./public/neon-reference-v6.css?v=1","./public/feature-icons-3d.svg",
 "./public/realtime.css?v=1","./public/realtime-config.js?v=2","./public/realtime-client.js?v=1",
 "./public/bnb-mark.svg?v=2","./public/solana-mark.svg","./public/icon.svg","./manifest.webmanifest"
];
self.addEventListener("install",event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).catch(()=>{}))});
self.addEventListener("activate",event=>{event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))]))});
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;const url=new URL(event.request.url);if(url.origin!==location.origin)return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html"))))});
