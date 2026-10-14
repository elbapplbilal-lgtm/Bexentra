const CACHE="bexentra-shell-v95-wallet-offline-routing";
const SHELL=[
 "./","./index.html","./explorer.html","./watchlist.html","./public/watchlist.css?v=1","./public/watchlist.js?v=1","./public/watchlist-utils.mjs","./logo.png?v=2","./public/logo-glow-v1.css?v=2","./api-docs.html","./public/api-docs.css?v=1","./public/api-docs.js?v=2","./public/openapi.json",
 "./public/home.css?v=32","./public/stage1.css?v=1",
 "./public/visual-v2.css?v=2","./public/neon-premium.css?v=1",
 "./public/reference-match.css?v=1","./public/mobile-layout-stability.css?v=1","./public/orbit-globe.svg","./public/neon-icons.svg",
 "./public/style.css?v=24","./public/nav.css?v=30",
 "./public/explorer-detail.css?v=31","./public/detail-mobile-fix.css?v=4","./public/neon-detail.css?v=2","./public/tx-detail-help.css?v=1",
 "./public/detail-nav-rescue.css?v=1","./public/category-view.css?v=4","./public/result-clarity.css?v=3","./public/visitor-guide.css?v=1","./public/home-refinement.css?v=1","./public/bnav-v1.css?v=3","./public/bex-scanlight-v1.css?v=2","./public/scanlight-mobile-fixes.css?v=2","./public/scanlight-detail-v2.css?v=1",
 "./public/preferences.js?v=19","./public/i18n-extra.js?v=1","./public/settings-polish-v2.css?v=1","./public/search-input.js?v=3",
 "./public/app.js?v=49","./public/explorer.js?v=52",
 "./public/neon-reference-v5.css?v=1","./public/neon-reference-v6.css?v=1","./public/feature-icons-3d.svg",
 "./public/realtime.css?v=1","./public/realtime-config.js?v=2","./public/realtime-client.js?v=3",
 "./public/bnb-mark.svg?v=2","./public/solana-mark.svg","./public/icon.svg","./manifest.webmanifest"
];
self.addEventListener("install",event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).catch(()=>{}))});
self.addEventListener("activate",event=>{event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))]))});
// Network-first PWA: never silently navigate to the homepage when an
// offline transaction, block or wallet detail URL was requested.
const offlineDocument = request => {
 if (request.mode !== "navigate") return null;
 const u = new URL(request.url);
 const leaf = u.pathname.slice(u.pathname.lastIndexOf("/") + 1);
 if (!leaf || leaf === "index.html") return "./index.html";
 return ["explorer.html","watchlist.html","api-docs.html"].includes(leaf) ? "./" + leaf : null;
};
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET")return;
 const url=new URL(req.url);
 if(url.origin!==location.origin)return;
 event.respondWith((async()=>{
  try{
   const response=await fetch(req);
   // Broken/404 responses are not permanent app-shell cache entries.
   if(response.ok){
    const copy=response.clone();
    event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{}));
   }
   return response;
  }catch{
   // Search/filter/hash query strings should not prevent offline lookup.
   const direct=await caches.match(req,{ignoreSearch:true});
   if(direct)return direct;
   const route=offlineDocument(req);
   if(route){
    const document=await caches.match(route);
    if(document)return document;
   }
   // Missing scripts/images or unknown routes must NEVER return home HTML.
   return Response.error();
  }
 })());
});
