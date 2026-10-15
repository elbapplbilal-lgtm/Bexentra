import assert from "node:assert/strict";
import {readFile,mkdir} from "node:fs/promises";
import {createServer} from "node:http";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {chromium} from "playwright";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const [home,classic,css,js,sw,marketsJs]=await Promise.all(
 ["index.html","classic.html","public/home-leaderboard.css","public/home-leaderboard.js","sw.js","public/markets.js"]
 .map(name=>readFile(path.join(root,name),"utf8")));
for(const id of ["marketRows","marketSearch","marketChain","marketLang","homeThemeToggle","homeSettingsToggle",
 "homeMenuToggle","homeMenu","homeNetworkIcon","homeNativePrice","homeHeight","marketQuery"]){
 assert(home.includes('id="'+id+'"'),"Redesigned homepage requires "+id);
}
assert(!home.includes('class="hero-card"')&&!home.includes('class="quick-grid"'),"Old dashboard must not appear on homepage");
assert(classic.includes('class="hero-card"')&&classic.includes('id="recentBlocks"'),"Keep original live block views available");
assert(home.includes('classic.html?view=blocks')&&home.includes('classic.html?view=transactions'),
 "Block/transaction routes must remain available");
assert(home.includes("public/home-leaderboard.css?v=1")&&home.includes("public/markets.js?v=2"));
assert(sw.includes("bexentra-shell-v100-token-home")&&sw.includes("public/home-leaderboard.css?v=1"));
assert(sw.includes("classic.html"),"Preserve classic offline");
assert(css.includes("home-bottom-nav")&&css.includes("max-width:385px"),"Mobile design gates");
assert(js.includes('value="bsc"')===false,"JS must not hardcode DOM tokens");
assert(js.includes('source==="coingecko"'),"Live native prices must verify source");
assert(marketsJs.includes("api.geckoterminal.com/api/v2")&&marketsJs.includes('h6:number('));
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".png":"image/png",".svg":"image/svg+xml",".webmanifest":"application/manifest+json",".json":"application/json"};
const server=createServer(async(req,res)=>{
 const pathname=new URL(req.url,"http://127.0.0.1").pathname;
 const file=path.resolve(root,"."+pathname);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{
  const content=await readFile(pathname==="/"?path.join(root,"index.html"):file);
  res.writeHead(200,{"content-type":pathname==="/"?"text/html; charset=utf-8":(mime[path.extname(file)]||"application/octet-stream")}).end(content);
 }catch{res.writeHead(404).end("missing")}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const port=server.address().port;
const bnbAddr="0x"+"a".repeat(40),poolBnb="0x"+"b".repeat(40);
const solAddr="So11111111111111111111111111111111111111112";
const solPool="9".repeat(42);
function poolPayload(network){
 const addr=network==="bsc"?bnbAddr:solAddr,pool=network==="bsc"?poolBnb:solPool;
 return {data:[{id:network+"_"+pool,type:"pool",
  attributes:{address:pool,name:"GREEN / USDT",base_token_price_usd:"0.0142",
   price_change_percentage:{h1:"2.15",h6:"8.40",h24:"-1.23"},
   volume_usd:{h24:"164200.57"},reserve_in_usd:"402100"},
  relationships:{base_token:{data:{type:"token",id:network+"_"+addr}}}}],
  included:[{type:"token",id:network+"_"+addr,attributes:{address:addr,name:"Green Test",symbol:"GREEN"}}]};
}
let browser;
try{
 browser=await chromium.launch({channel:"chrome",headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 await mkdir(path.join(root,"ui-test-shots"),{recursive:true});
 for(const width of [360,390,430,768]){
  const ctx=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1,isMobile:width<=430,hasTouch:width<=430,locale:"ar-MA"});
  const page=await ctx.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  let providerCalls=0;
  await page.route("**/*",async route=>{
   const url=route.request().url();
   if(url.startsWith("https://api.geckoterminal.com/")){
    providerCalls++;
    const net=new URL(url).pathname.includes("/bsc/")?"bsc":"solana";
    return route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(poolPayload(net))});
   }
   if(url.includes("bexentraapi.compute.c-7.us-east-2.aws.neon.tech")){
    const u=new URL(url),network=u.searchParams.get("chain")==="solana"?"solana":"bnb";
    if(u.pathname==="/price")
      return route.fulfill({status:200,headers:{"access-control-allow-origin":"*"},contentType:"application/json",body:JSON.stringify({chain:network,source:"coingecko",quote_currency:"USD",usd_price:network==="bnb"?620.51:128.53,price_updated_at:new Date().toISOString()})});
    if(u.pathname==="/live")
      return route.fulfill({status:200,headers:{"access-control-allow-origin":"*"},contentType:"application/json",body:JSON.stringify({chain:network,blocks:[{height:127568901}]})});
    return route.fulfill({status:503,headers:{"access-control-allow-origin":"*"},body:'{"error":"test"}'});
   }
   if(url.includes("fonts.googleapis.com")||url.includes("fonts.gstatic.com"))
    return route.abort("failed");
   return route.continue();
  });
  await page.goto("http://127.0.0.1:"+port+"/",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#marketRows")?.textContent?.includes("GREEN"),{timeout:16000});
  await page.waitForFunction(()=>document.querySelector("#homeNativePrice")?.textContent?.includes("620.51"),{timeout:16000});
  assert.equal(await page.locator("#marketChain").inputValue(),"bsc","Home starts on BNB");
  assert((await page.locator("#homeHeight").innerText()).includes("127"),"Live block height from API");
  assert((await page.locator("#marketRows").innerText()).includes("-1.23%"),"Real provider change shown");
  assert.equal(await page.locator(".home-rank").first().innerText(),"1","Market row rank is visible");
  assert(providerCalls>0);
  const metrics=await page.evaluate(()=>{
   const table=document.querySelector(".market-data").getBoundingClientRect();
   const header=document.querySelector(".home-header").getBoundingClientRect();
   const input=document.querySelector("#marketSearch").getBoundingClientRect();
   const footer=document.querySelector(".home-bottom-nav").getBoundingClientRect();
   return {width:innerWidth,scroll:document.documentElement.scrollWidth,header:header.width,search:input.width,table:table.width,nav:footer.height,
    oldDashboard:!!document.querySelector(".hero-card")};
  });
  assert(metrics.scroll<=metrics.width+3,"No horizontal overflow at "+width+" "+JSON.stringify(metrics));
  assert(!metrics.oldDashboard,"Old homepage layout must disappear");
  if(width<=430)assert(metrics.nav>45,"Mobile bottom bar visible");
  await page.locator('[data-period="h6"]').click();
  assert((await page.locator("#marketRows").innerText()).includes("+8.4%"),"6h values real");
  await page.locator("#homeMenuToggle").click();
  assert(await page.locator("#homeMenu").isVisible(),"Menu opens");
  await page.locator("#homeMenuClose").click();
  assert(!(await page.locator("#homeMenu").isVisible()),"Menu closes");
  await page.locator("#homeThemeToggle").click();
  assert(await page.locator("body").evaluate(e=>e.classList.contains("home-dark")),"Appearance toggle works");
  await page.locator("#homeThemeToggle").click();
  await page.locator("#homeSettingsToggle").click();
  await page.locator("#marketLang").selectOption("en");
  assert.equal(await page.locator("#marketTitle").innerText(),"Token leaderboard");
  await page.locator("#homeSettingsToggle").click();
  await page.screenshot({path:path.join(root,"ui-test-shots","home-redesign-"+width+".png"),fullPage:true});
  await page.locator("#marketQuery").fill("127568901");
  await page.locator("#marketSearch button[type=submit]").click();
  await page.waitForURL(/explorer\.html\?chain=bnb&type=block&q=127568901/,{timeout:13000});
  assert.deepEqual(errors,[],"No JS errors at "+width+": "+errors.join("; "));
  console.log("PASS new mobile home",width,JSON.stringify(metrics));
  await ctx.close();
 }
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
