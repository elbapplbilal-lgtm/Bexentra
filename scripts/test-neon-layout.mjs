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
const css=await readFile(path.join(root,"public/neon-reference-v5.css"),"utf8");
const parseErrors=[];
csstree.parse(css,{onParseError:e=>parseErrors.push(String(e.message||e))});
assert.deepEqual(parseErrors,[],"Style parser should not report invalid CSS");
const index=await readFile(path.join(root,"index.html"),"utf8");
assert(index.includes('class="bex-home bex-reference neon-fidelity"'));
assert(index.indexOf('public/neon-reference-v5.css?v=1')>index.indexOf('public/mobile-layout-stability.css'),
 "Neon overrides must load after previous mobile layout patches");
const sw=await readFile(path.join(root,"sw.js"),"utf8");
assert(sw.includes('public/neon-reference-v5.css?v=1'),"PWA must precache the style");

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
  res.writeHead(200,{"content-type":mime[path.extname(full)]||"application/octet-stream"});
  res.end(bytes);
 }catch{res.writeHead(404).end("not found")}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const port=server.address().port;
let browser,failures=[];
try{
 browser=await chromium.launch({channel:"chrome",headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 await mkdir(path.join(root,"ui-test-shots"),{recursive:true});
 for(const width of [360,390,430,768]){
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
  assert(rects.nav&&rects.nav.b<=852&&rects.nav.l>=0,"Bottom nav stays inside the viewport at "+width);
  assert(rects.card.w>0,"Stats section must be visible at "+width);
  assert.equal(rects.networkName,"BNB Smart Chain");
  assert.deepEqual(pageErrors,[],"No JS crashes at "+width);
  await page.screenshot({path:path.join(root,"ui-test-shots","bexentra-"+width+".png"),fullPage:true});
  if(width===390){
   await page.locator("#network").selectOption("solana");
   await page.waitForFunction(()=>document.querySelector("#summaryNetwork")?.textContent==="Solana",{timeout:12000});
   await page.locator("#network").selectOption("bnb");
   await page.waitForFunction(()=>document.querySelector("#summaryNetwork")?.textContent==="BNB Smart Chain",{timeout:12000});
   await page.locator("#menuToggle").click();
   assert(await page.locator("#mobileMenu").evaluate(el=>el.classList.contains("open")),"Mobile menu opens");
   await page.locator("#menuClose").click();
   assert(!(await page.locator("#mobileMenu").evaluate(el=>el.classList.contains("open"))),"Mobile menu closes");
   await page.locator("#globalInput").fill("0x"+"a".repeat(64));
   await page.locator("#globalSearch button[type=submit]").click();
   await page.waitForURL(/explorer\.html\?.*type=tx/,{timeout:10000});
   assert(page.url().includes("chain=bnb"),"Search keeps the network");
  }
  console.log("PASS viewport",width,"actual data slots, mobile alignment and navigation");
  await context.close();
 }
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
console.log("PASS 4 device viewports, working search/network/menu, CSS syntax, no fake production stats");
