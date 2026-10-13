// Browser-driven regression test for the user's approved neon dashboard.
// Test-only blockchain fixtures. Production numbers still come from real RPC / SSE.
import assert from "node:assert/strict";
import {readFile, mkdir} from "node:fs/promises";
import {createServer} from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";
import * as csstree from "css-tree";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const css=await readFile(path.join(root,"public/neon-reference-v5.css"),"utf8")+"\n"+await readFile(path.join(root,"public/neon-reference-v6.css"),"utf8");
const parseErrors=[];
csstree.parse(css,{onParseError:e=>parseErrors.push(String(e.message||e))});
assert.deepEqual(parseErrors,[],"Style parser should not report invalid CSS");
const index=await readFile(path.join(root,"index.html"),"utf8");
assert(index.includes('class="bex-home bex-reference neon-fidelity"'));
assert(index.indexOf('public/neon-reference-v5.css?v=1')>index.indexOf('public/mobile-layout-stability.css'),
 "Neon overrides must load after previous mobile layout patches");
const sw=await readFile(path.join(root,"sw.js"),"utf8");
assert(sw.includes('public/neon-reference-v5.css?v=1'),"PWA must precache the style");
assert(sw.includes('public/neon-reference-v6.css?v=1'),"PWA must precache the premium stylesheet");
assert(sw.includes('public/feature-icons-3d.svg'),"PWA must precache the 3D vector icons");
const bnbLogo=await readFile(path.join(root,"public/bnb-mark.svg"),"utf8");
assert(bnbLogo.includes('#F0B90B')&&bnbLogo.includes('69.3063 34.6397'),"BNB glyph must use original geometry and brand yellow");
assert(index.includes('feature-icons-3d.svg#blocks')&&index.includes('feature-icons-3d.svg#transactions'),"Dashboard quick tiles use dimensional feature icons");
assert(index.indexOf('public/neon-reference-v6.css?v=1')>index.indexOf('public/neon-reference-v5.css?v=1'),"New overrides must load after compact CSS");

const mime={".html":"text/html",".css":"text/css",".js":"text/javascript",".svg":"image/svg+xml",
 ".png":"image/png",".json":"application/json",".webmanifest":"application/manifest+json"};
const server=createServer(async(req,res)=>{
 const reqPath=new URL(req.url,"http://127.0.0.1").pathname;
 let requestPath;
 try{requestPath=decodeURIComponent(reqPath)}catch{res.writeHead(400).end();return}
 const full=path.resolve(root,"."+requestPath);
 if(full!==root && !full.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{
  const bytes=await readFile(reqPath==="/" ? path.join(root,"index.html") : full);
  res.writeHead(200,{"content-type":reqPath==="/"?"text/html; charset=utf-8":mime[path.extname(full)]||"application/octet-stream"});
  res.end(bytes);
 }catch{res.writeHead(404).end("not found")}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const port=server.address().port;
let browser,failures=[];
try{
 browser=await chromium.launch({channel:"chrome",headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 await mkdir(path.join(root,"ui-test-shots"),{recursive:true});
 for(const width of [360,390,430,768,980]){
  const context=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1,
   isMobile:width<=430,hasTouch:width<=430,locale:"ar-MA"});
  const page=await context.newPage();
  const pageErrors=[];
  page.on("pageerror",e=>pageErrors.push(e.message));
  await page.route("**/*",async route=>{
   const request=route.request(),url=request.url();
   if(url.includes("br-old-sun-b5txcoym-bexentraapi.compute.c-7.us-east-2.aws.neon.tech")){
    const u=new URL(url),chain=u.searchParams.get("chain")==="solana"?"solana":"bnb";
    const height=chain==="bnb"?128000123:457000456;
    const hashes=Array.from({length:8},(_,i)=>chain==="bnb"?
     "0x"+(1001+i).toString(16).padStart(64,"0"):String(i+2).repeat(88));
    if(u.pathname==="/tx"){
     const valid=chain==="bnb"&&u.searchParams.get("height")==="128000123"&&
      hashes.some(x=>x===u.searchParams.get("hash"));
     const body=valid?{chain,tx_hash:u.searchParams.get("hash"),block_height:height,
      sender:null,recipient:null,status:null,fee_native:null,
      source:"rpc_block_verified",coverage:"on_demand_block"}
      :{error:"Transaction not verified on the selected network",reason:"not_verified"};
     return route.fulfill({status:valid?200:404,headers:{"content-type":"application/json",
      "access-control-allow-origin":"*"},body:JSON.stringify(body)});
    }
    const payload={
     chain,source:"rpc_live",coverage:"latest_block_sample",observed_at:new Date().toISOString(),
     blocks:[{chain,height,block_hash:"0x"+"a".repeat(64),block_time:new Date().toISOString(),
      transaction_count:110,indexed_at:null,source:"rpc_live"}],
     transactions:hashes.map(tx_hash=>({chain,tx_hash,block_height:height,
      sender:null,recipient:null,status:null,fee_native:null,source:"rpc_live"}))
    };
    return route.fulfill({status:200,headers:{"access-control-allow-origin":"*",
     "content-type":"application/json"},body:JSON.stringify(payload)});
   }
   if(url.includes("elbapplbilal.workers.dev"))return route.abort("failed");
   if(url.includes("fonts.googleapis.com")||url.includes("fonts.gstatic.com"))
    return route.abort("failed"); // ensure fallback font layout is robust
   return route.continue();
  });
  await page.goto("http://127.0.0.1:"+port+"/",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.getElementById("summaryHeight")?.textContent?.includes("128"),{timeout:15000});
  const rects=await page.evaluate(()=>{
   const rect=selector=>{const e=document.querySelector(selector);if(!e)return null;
    const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,l:r.left,r:r.right,b:r.bottom}};
   const quick=[...document.querySelectorAll(".quick-grid > *")].map(e=>{
    const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};
   });
   const stat=[...document.querySelectorAll(".stats-grid article")].map(e=>{
    const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};
   });
   return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
    hero:rect(".hero-card"),header:rect(".app-header"),brand:rect(".brand"),
    network:rect(".network-pill"),search:rect(".hero-search"),searchInput:rect("#globalInput"),
    titleRange:(()=>{const e=document.querySelector(".hero-copy h1");
      const r=document.createRange();r.selectNodeContents(e);
      const b=r.getBoundingClientRect();
      return {left:b.left,right:b.right,lineCount:r.getClientRects().length}})(),
    solCube:rect(".sol-cube"),bnbCube:rect(".bnb-cube"),
    logoIsLoaded:document.getElementById("networkIcon")?.naturalWidth>0,
    navDisplay:getComputedStyle(document.querySelector(".bottom-nav")).display,
    settings:rect("#settingsToggle"),
    searchButton:rect("#globalSearch button[type=submit]"),nav:rect(".bottom-nav"),
    quick,stat,card:rect(".stats-card"),statsCount:stat.length,
    source:getComputedStyle(document.querySelector(".hero-card")).backgroundImage,
    title:document.querySelector(".hero-copy h1")?.textContent,
    networkName:document.querySelector("#summaryNetwork")?.textContent};
  });
  console.log("LAYOUT",width,JSON.stringify(rects));
  assert(rects.scrollWidth<=rects.viewport+2,"No horizontal overflow at "+width);
  assert(rects.hero.w>300&&rects.hero.w<=width,"Hero in viewport at "+width);
  assert(rects.searchButton.l>=rects.searchInput.r-2,"Search button should appear on the RIGHT at "+width);
  assert(rects.quick.length===4&&rects.quick[0].y===rects.quick[1].y,"Two quick tiles on the same first row at "+width);
  assert(rects.quick[2].y>rects.quick[0].y,"Two quick tile rows at "+width);
  assert(rects.statsCount===4,"Four real-data metric cards at "+width);
  assert(rects.stat[0].y===rects.stat[1].y,"Metric cards align in a row at "+width);
  assert(rects.brand.l>rects.network.r,"No header brand/network overlap at "+width);
  assert(rects.titleRange.right<=rects.viewport+2&&rects.titleRange.left>=-2,"The Arabic headline must stay inside the viewport at "+width);
  assert(rects.titleRange.lineCount<=2,"The Arabic headline should fit in at most two lines at "+width);
  assert(rects.nav&&rects.nav.b<=852&&rects.nav.l>=0,"Bottom nav stays inside the viewport at "+width);
  assert.equal(rects.navDisplay,"grid","Bottom navigation must stay visible including desktop-site mode at "+width);
  assert(rects.logoIsLoaded,"Authentic BNB mark should load at "+width);
  if(width>=640)assert(rects.settings&&rects.settings.y>=0&&rects.settings.b<=rects.header.b+3,"Settings belongs inside the header at "+width);
  assert(rects.card.w>0,"Stats section must be visible at "+width);
  assert.equal(rects.networkName,"BNB Smart Chain");
  assert.deepEqual(pageErrors,[],"No JS crashes at "+width);
  await page.screenshot({path:path.join(root,"ui-test-shots","bexentra-"+width+".png"),fullPage:true});
  if(width===390){
   assert.equal(await page.locator("#recentTransactions .reference-row").count(),3,
    "Approved design starts with three visible real transactions");
   await page.locator("#refreshTx").click();
   assert.equal(await page.locator("#recentTransactions .reference-row").count(),8,
    "View All expands the actual received RPC sample");
   assert.equal(await page.locator("#refreshTx").getAttribute("aria-expanded"),"true");
   await page.locator("#refreshTx").click();
   assert.equal(await page.locator("#recentTransactions .reference-row").count(),3,
    "Show Less returns to the approved three-row view");
   await page.locator("#network").selectOption("solana");
   await page.waitForFunction(()=>document.querySelector("#summaryNetwork")?.textContent==="Solana",{timeout:12000});
   await page.locator("#network").selectOption("bnb");
   await page.waitForFunction(()=>document.querySelector("#summaryNetwork")?.textContent==="BNB Smart Chain",{timeout:12000});
   await page.locator("#menuToggle").click();
   assert(await page.locator("#mobileMenu").evaluate(el=>el.classList.contains("open")),"Mobile menu opens");
   await page.locator("#menuClose").click();
   assert(!(await page.locator("#mobileMenu").evaluate(el=>el.classList.contains("open"))),"Mobile menu closes");
   const liveRow=page.locator("#recentTransactions .reference-row .feed-main a").first();
   const liveHref=await liveRow.getAttribute("href");
   assert(liveHref.includes("height=128000123"),"Fresh blockchain transactions carry their observed block height");
   await page.locator("#globalInput").fill("0x"+"a".repeat(64));
   await page.locator("#globalSearch button[type=submit]").click();
   await page.waitForURL(/explorer\.html\?.*type=tx/,{timeout:10000});
   assert(page.url().includes("chain=bnb"),"Search keeps the network");
   await page.waitForSelector("#detailError:not([hidden])");
   assert(await page.locator("#detailError .error-actions a").count()===1,
    "An unverified manual hash offers an external verifier instead of an unqualified index claim");
   await page.goto("http://127.0.0.1:"+port+"/",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelector("#recentTransactions .reference-row .feed-main a"),{timeout:15000});
   await page.locator("#recentTransactions .reference-row .feed-main a").first().click();
   await page.waitForURL(/explorer\.html\?.*height=128000123/,{timeout:10000});
   await page.waitForSelector("#detailOverview:not([hidden])",{timeout:15000});
   assert((await page.locator("#detailFields").innerText()).includes("128000123"),
    "Observed BNB hash opens a verified on-chain-block detail instead of a false 404");
   assert(!(await page.locator("#detailFields").innerText()).includes("0 BNB"),
    "Details must not manufacture a zero fee when a matching receipt is absent");
  }
  // Regression: user opened a real transaction from the live feed and their
  // Android page showed neither navigation nor a usable on-chain retry.
  // Test both normal phone and Chrome desktop-site viewport, with intentionally
  // unavailable RPC to verify honest fallback and visible external verification.
  if(width===390||width===980){
   const hash="0x"+"a".repeat(64);
   await page.goto("http://127.0.0.1:"+port+"/explorer.html?chain=bnb&type=tx&q="+hash,{waitUntil:"domcontentloaded"});
   await page.waitForSelector("#detailError:not([hidden])",{timeout:15000});
   const info=await page.evaluate(()=>{
    const nav=document.querySelector(".bottom-nav.bottom-v30");
    const r=nav.getBoundingClientRect();
    return {display:getComputedStyle(nav).display,x:r.x,y:r.y,right:r.right,bottom:r.bottom,
     vw:innerWidth,vh:innerHeight,
     links:[...nav.querySelectorAll("a")].map(a=>({href:a.getAttribute("href"),text:a.textContent.trim()})),
     actions:[...document.querySelectorAll("#detailError .error-actions a")].map(a=>a.href),
     reload:document.querySelector("#detailError .error-actions button")?.textContent};
   });
   console.log("DETAIL_NAV",width,JSON.stringify(info));
   assert.equal(info.display,"grid","Detail bottom bar must remain visible at "+width);
   assert(info.x>=0&&info.right<=info.vw+1&&info.bottom<=info.vh+1,
     "Detail navigation must stay within device viewport at "+width);
   assert(info.links.length===4,"Detail navigation must retain its four destinations");
   assert(info.actions.some(a=>a.startsWith("https://bscscan.com/tx/")),
     "Unverified hash must show real external verification link");
   assert(info.reload,"Unverified hash must show read-only retry");
   await page.screenshot({path:path.join(root,"ui-test-shots","detail-"+width+".png"),fullPage:true});
  }
  console.log("PASS viewport",width,"actual data slots, mobile alignment and navigation");
  await context.close();
 }
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
console.log("PASS 5 device viewports plus detail navigation in Android and desktop-site modes, real BNB vector, 3D icons, nav in desktop mode, search/network/menu, CSS syntax, no fake production stats");
