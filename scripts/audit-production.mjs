// Read-only production audit. Uses publicly available blockchain data; no credentials.
const api="https://br-old-sun-b5txcoym-bexentraapi.compute.c-7.us-east-2.aws.neon.tech";
const worker="https://bexentra.elbapplbilal.workers.dev";
const origin="https://elbapplbilal-lgtm.github.io";
async function get(base,path,timeout=16000){
 const t=AbortSignal.timeout(timeout),started=Date.now();
 try{
  const r=await fetch(base+path,{signal:t,headers:{Accept:"application/json",Origin:origin}});
  const raw=await r.text(),body=(()=>{try{return JSON.parse(raw)}catch{return {}}})();
  return {status:r.status,ms:Date.now()-started,body,headers:r.headers};
 }catch(e){return {status:0,ms:Date.now()-started,error:String(e?.message||e),body:{}}}
}
const reports=[],errors=[];
function mark(name,x,expected){
 const item={name,http:x.status,ms:x.ms,expected,pass:typeof expected==="function"?expected(x):x.status===expected,
  note:x.error||x.body?.reason||null};reports.push(item);
 if(!item.pass)errors.push(item);
 console.log("AUDIT",JSON.stringify(item));
}
mark("Neon BNB live",await get(api,"/live?chain=bnb&limit=3"),x=>x.status===200&&
 Array.isArray(x.body.blocks)&&Array.isArray(x.body.transactions));
mark("Neon Solana live",await get(api,"/live?chain=solana&limit=3",23000),x=>x.status===200&&
 Array.isArray(x.body.blocks)&&Array.isArray(x.body.transactions));
mark("Neon malformed tx",await get(api,"/tx?chain=bnb&hash=invalid"),400);
mark("Neon unsupported chain",await get(api,"/live?chain=wrong"),400);
mark("Neon invalid address",await get(api,"/address?chain=bnb&address=invalid"),400);
mark("Cloudflare public health",await get(worker,"/health"),x=>x.status===200&&x.body.app==="BEXENTRA");
mark("Cloudflare malformed hash",await get(worker,"/tx?chain=bnb&hash=invalid"),400);
mark("Worker foreign origin blocked",await (async()=>{const url=worker+"/tx?chain=bnb&hash="+"0".repeat(64);
 try{const r=await fetch(url,{headers:{Origin:"https://untrusted.invalid"},signal:AbortSignal.timeout(6500)});
 return {status:r.status,ms:0,body:{}}}catch(e){return {status:0,ms:0,error:String(e),body:{}}}})(),403);
for(const chain of ["bnb","solana"]){
 const sample=await get(api,"/live?chain="+chain+"&limit=4",chain==="bnb"?14000:24000);
 const t=sample.body?.transactions?.find(t=>typeof t.tx_hash==="string");
 if(!t){console.log("COVERAGE",chain,"no-live-transaction; skipping direct detail check");continue}
 const r=await get(api,"/tx?chain="+chain+"&hash="+encodeURIComponent(t.tx_hash)+
  (chain==="bnb"?"&height="+encodeURIComponent(t.block_height):""),21000);
 const matching=r.status===200&&r.body.chain===chain&&r.body.tx_hash?.toLowerCase()===t.tx_hash.toLowerCase();
 // Depending on provider indexing delay, an observed hash may not be queryable immediately.
 console.log("ONCHAIN_SAMPLE",JSON.stringify({chain,detail_http:r.status,ms:r.ms,verified:matching,
  source:r.body.source||null,has_status:["success","failed"].includes(r.body.status),
  has_fee:r.body.fee_native!==undefined&&r.body.fee_native!==null,
  has_time:typeof r.body.block_time==="string",
  has_value:typeof r.body.native_value_wei==="string",
  reason:r.body.reason||null}));
 const address=t.sender||r.body.sender;
 if(address){
  const a=await get(api,"/address?chain="+chain+"&address="+encodeURIComponent(address)+"&limit=5",14000);
  mark(chain+" address lookup",a,x=>x.status===200&&Array.isArray(x.body.transactions));
  console.log("ADDRESS_COVERAGE",JSON.stringify({chain,rows:a.body.transactions?.length??null,
   indexed_only:a.body.coverage??"not-labeled",balance_present:a.body.native_balance!==undefined&&a.body.native_balance!==null}));
 }
}
console.log("SUMMARY",JSON.stringify({passed:reports.filter(x=>x.pass).length,total:reports.length,errors:errors.length}));
if(errors.length)process.exitCode=1;
