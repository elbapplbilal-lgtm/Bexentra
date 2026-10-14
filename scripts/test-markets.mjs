import assert from "node:assert/strict";
import {readFile,mkdir} from "node:fs/promises";
import {createServer} from "node:http";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {chromium} from "playwright";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const [home,explorer,markets,css,js,sw]=await Promise.all(
 ["index.html","explorer.html","markets.html","public/markets.css","public/markets.js","sw.js"].map(x=>readFile(path.join(root,x),"utf8")));
assert(home.includes('href="markets.html"'),"Home shortcut needs market navigation");
assert(explorer.includes('href="markets.html"'),"Explorer token menu needs market navigation");
assert(sw.includes('"./markets.html"'),"SW needs markets precache");
assert(sw.includes("public/markets.css?v=1")&&sw.includes("public/markets.js?v=1"));
assert(markets.includes('id="marketRows"')&&markets.includes('id="marketChain"'));
assert(!markets.includes("4055")&&!markets.includes("73.22"),"No screenshot fake market stats");
assert(js.includes("https://api.geckoterminal.com/api/v2/"));
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".png":"image/png",".svg":"image/svg+xml",".webmanifest":"application/manifest+json",".json":"application/json"};
const server=createServer(async(req,res)=>{
 const pathname=new URL(req.url,"http://127.0.0.1").pathname;
 const dest=path.resolve(root,"."+pathname);
 if(dest!==root&&!dest.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{
  const bytes=await readFile(pathname==="/"?path.join(root,"index.html"):dest);
  res.writeHead(200,{"content-type":mime[path.extname(dest)]||"application/octet-stream"}).end(bytes);
 }catch{res.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));const port=server.address().port;
const solMint="So11111111111111111111111111111111111111112";
const bscMint="0x"+"a".repeat(40);
let count=0;
const makeData=network=>{
 const address=network==="solana"?solMint:bscMint;
 const pool=network==="solana"?"9".repeat(42):"0x"+"b".repeat(40);
 return {data:[{id:network+"_"+pool,type:"pool",attributes:{
  address:pool,name:"Orbit / SOL",base_token_price_usd:"0.001095",
  price_change_percentage:{h1:"2.4",h24:"-12.5"},
  volume_usd:{h24:"4055000"},reserve_in_usd:"120000",
  transactions:{h24:{buys:7,sells:5}}
 },relationships:{base_token:{data:{id:network+"_"+address,type:"token"}}}}],
 included:[{id:network+"_"+address,type:"token",attributes:{address,name:"Orbit Coin <script>",symbol:"ORBT"}}]};
};
let browser;
try{
 browser=await chromium.launch({channel:"chrome",headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 await mkdir(path.join(root,"ui-test-shots"),{recursive:true});
 for(const width of [360,390,768]){
  const context=await browser.newContext({viewport:{width,height:820},deviceScaleFactor:1,isMobile:width<600,hasTouch:width<600});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/*",async route=>{
   const url=route.request().url();
   if(url.includes("api.geckoterminal.com")){
    count++;const network=new URL(url).pathname.includes("/bsc/")?"bsc":"solana";
    return route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(makeData(network))});
   }
   if(url.includes("fonts.googleapis.com")||url.includes("fonts.gstatic.com"))return route.abort("failed");
   return route.continue();
  });
  await page.goto("http://127.0.0.1:"+port+"/markets.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelectorAll("#marketRows tr").length===1&&document.querySelector("#marketRows")?.textContent?.includes("ORBT"),{timeout:15000});
  assert((await page.locator("#marketRows").innerText()).includes("ORBT"),"Real provider tokens are shown");
  assert((await page.locator("#marketRows").innerText()).includes("-12.5%"),"Provider price-change number is respected");
  assert.equal(await page.locator('#marketRows a[href*="type=address"]').count(),1,"Token navigates back to BEXENTRA");
  assert.equal(await page.locator('#marketRows script').count(),0,"Untrusted token data is never injected as HTML");
  const bound=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(bound.scroll<=bound.w+3,"No horizontal viewport overflow at "+width+": "+JSON.stringify(bound));
  await page.locator("#marketQuery").fill("Nonexistent Token");
  await page.locator("#marketSearch button[type=submit]").click();
  assert((await page.locator("#marketRows").innerText()).includes(width? "ما لقيناش":"No"),"Filter should explain zero matches");
  await page.locator("#marketQuery").fill("");
  await page.locator("#marketSearch button[type=submit]").click();
  await page.locator('[data-period="h1"]').click();
  assert((await page.locator("#marketRows").innerText()).includes("+2.4%"),"Switching timeframe updates real change");
  await page.locator("#marketChain").selectOption("bsc");
  await page.waitForFunction(()=>document.querySelector('#marketRows a[href*="chain=bnb"]')!==null,{timeout:12000});
  await page.locator("#marketLang").selectOption("en");
  assert.equal(await page.locator("#marketTitle").innerText(),"Token discovery board");
  assert.equal(await page.evaluate(()=>document.documentElement.dir),"ltr");
  await page.screenshot({path:path.join(root,"ui-test-shots","markets-"+width+".png"),fullPage:true});
  assert.deepEqual(errors,[],"No JS errors on real browser at "+width+": "+errors.join("; "));
  console.log("PASS responsive markets UI",width,bound,count);
  await context.close();
 }
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
