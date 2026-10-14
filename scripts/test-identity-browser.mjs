// Browser-level test with fixtures; does NOT assume external API uptime/CORS.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createServer} from "node:http";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {chromium} from "playwright";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",
 ".svg":"image/svg+xml",".png":"image/png",".json":"application/json",".webmanifest":"application/manifest+json"};
const server=createServer(async(req,res)=>{
 const pathname=new URL(req.url,"http://127.0.0.1").pathname;
 const full=path.resolve(root,"."+pathname);
 if(full!==root&&!full.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{
  const body=await readFile(pathname==="/"?path.join(root,"index.html"):full);
  res.writeHead(200,{"content-type":mime[path.extname(full)]||"application/octet-stream"}).end(body);
 }catch{res.writeHead(404).end("Missing")}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const port=server.address().port;
const bnb="0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
const sol="HKKp49qGWXd639QsuH7JiLijfVW5UtCVY4s1n2HANwEA";
let browser;
try{
 browser=await chromium.launch({channel:"chrome",headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 for(const [chain,address,identity] of [["bnb",bnb,"vitalik.eth"],["solana",sol,"bonfida.sns"]]){
  const ctx=await browser.newContext({viewport:{width:390,height:850},locale:"ar-MA",isMobile:true,hasTouch:true});
  const page=await ctx.newPage();
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  let calls=0,mismatch=false,shouldFail=false;
  await page.route("**/*",async route=>{
   const url=route.request().url();
   if(url.startsWith("https://api.web3.bio/profile/")){
    calls++;
    if(shouldFail)return route.fulfill({status:429,headers:{"access-control-allow-origin":"*"},body:'{"error":"rate limited"}'});
    const data={address:mismatch?(chain==="bnb"?"0x"+"f".repeat(40):"9".repeat(42)):address,
     platform:chain==="bnb"?"ens":"sns",identity,displayName:identity,
     description:"A public wallet label",avatar:null,
     links:{website:{link:"https://example.org/ok"},
      github:{link:"javascript:alert('x')"}},email:"private@example.com"};
    return route.fulfill({status:200,headers:{"access-control-allow-origin":"*",
      "content-type":"application/json"},body:JSON.stringify(data)});
   }
   if(url.includes("br-old-sun-b5txcoym-bexentraapi.compute.c-7.us-east-2.aws.neon.tech")){
    const u=new URL(url);
    if(u.pathname==="/address")
     return route.fulfill({status:200,headers:{"access-control-allow-origin":"*","content-type":"application/json"},
      body:JSON.stringify({chain,address,transactions:[],has_more:false,next_cursor:null})});
    if(u.pathname==="/balance")
     return route.fulfill({status:200,headers:{"access-control-allow-origin":"*","content-type":"application/json"},
      body:JSON.stringify({chain,address,native_balance:"42000000000000000",source:"rpc_live",observed_at:new Date().toISOString()})});
    return route.fulfill({status:503,headers:{"access-control-allow-origin":"*"},body:'{"error":"unavailable"}'});
   }
   if(url.includes("fonts.googleapis.com")||url.includes("fonts.gstatic.com"))
    return route.abort("failed");
   return route.continue();
  });
  const dest="http://127.0.0.1:"+port+"/explorer.html?chain="+chain+"&type=address&q="+encodeURIComponent(address);
  await page.goto(dest,{waitUntil:"domcontentloaded"});
  await page.waitForSelector("#walletIdentity:not([hidden])",{timeout:12000});
  assert.equal(calls,0,"Identity lookup must be opt-in");
  await page.locator("#identityLookup").click();
  await page.waitForFunction(expected=>document.querySelector("#identityResult")?.textContent?.includes(expected),identity,{timeout:12000});
  assert.equal(calls,1,"One remote provider lookup only");
  assert((await page.locator("#identityResult").innerText()).includes(identity));
  assert(!(await page.locator("#identityResult").innerText()).includes("private@example.com"));
  assert.equal(await page.locator("#identityResult .identity-links a").count(),1,"Unsafe javascript URL omitted");
  const href=await page.locator("#identityResult .identity-links a").first().getAttribute("href");
  assert.equal(href,"https://example.org/ok");
  const visibleWidth=await page.evaluate(()=>({screen:innerWidth,doc:document.documentElement.scrollWidth}));
  assert(visibleWidth.doc<=visibleWidth.screen+2,"Card cannot create horizontal overflow");
  assert.equal(errors.length,0,"No browser JavaScript errors: "+errors.join("; "));
  console.log("PASS",chain,identity,"identity card on 390px mobile; independent native balance and safe links");
  await ctx.close();
 }
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
