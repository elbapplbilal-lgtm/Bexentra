// Independent browser-facing verification using *deployed* BEXENTRA endpoints.
// This script never claims the system archives every transaction 24/7.
const API="https://br-old-sun-b5txcoym-bexentraapi.compute.c-7.us-east-2.aws.neon.tech";
const SITE="https://elbapplbilal-lgtm.github.io/Bexentra/";
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const fail=(message)=>{throw Error(message)};
async function fetchLive(chain){
 const res=await fetch(API+"/live?chain="+chain+"&limit=5",{signal:AbortSignal.timeout(17000),headers:{Accept:"application/json"}});
 const body=await res.json();
 if(!res.ok)fail(chain+": API HTTP "+res.status);
 if(body.source!=="rpc_live")fail(chain+": NOT LIVE, source="+String(body.source)+" reason="+String(body.reason));
 if(body.coverage!=="latest_block_sample")fail(chain+": unexpected coverage "+body.coverage);
 const block=body.blocks?.[0];
 if(!block||!Number.isSafeInteger(Number(block.height)))fail(chain+": invalid latest block");
 if(!Array.isArray(body.transactions)||!body.transactions.length)fail(chain+": no current transactions");
 for(const tx of body.transactions){
  const hash=tx.tx_hash;
  if(typeof hash!=="string" || (chain==="bnb" ? !/^0x[a-fA-F0-9]{64}$/.test(hash) : !/^[1-9A-HJ-NP-Za-km-z]{70,100}$/.test(hash)))
   fail(chain+": bad on-chain transaction ID");
  if(Number(tx.block_height)!==Number(block.height))fail(chain+": transaction height mismatch");
  if(tx.status!==null||tx.fee_native!==null)fail(chain+": unverified latest-block status/fee was presented as verified");
 }
 const ts=Date.parse(block.block_time);
 const age=Date.now()-ts;
 if(!Number.isFinite(age)||age < -60000 || age > (chain==="bnb" ? 180000 : 360000))
   fail(chain+": blockchain block time is stale/invalid; age_seconds="+Math.round(age/1000));
 const result={chain,source:body.source,height:Number(block.height),time:block.block_time,
  age_seconds:Math.round(age/1000),tx_hash:body.transactions[0].tx_hash,tx_count:body.transactions.length};
 console.log(JSON.stringify(result));
 return result;
}
const site=await fetch(SITE,{signal:AbortSignal.timeout(18000)});
const html=await site.text();
if(!site.ok||!html.includes("public/app.js?v=37"))fail("GitHub Pages is not serving the current live dashboard HTML");
const script=await fetch(SITE+"public/app.js?v=37",{signal:AbortSignal.timeout(12000)});
const js=await script.text();
if(!script.ok||!js.includes('request("/live",{chain,limit:8})'))
 fail("Deployed front-end does not request live blockchain transactions");
console.log("SUCCESS: GitHub Pages serves the live-API enabled dashboard and JavaScript");
const first=await Promise.all([fetchLive("bnb"),fetchLive("solana")]);
await wait(18000);
const second=await Promise.all([fetchLive("bnb"),fetchLive("solana")]);
for(let i=0;i<2;i++){
 const x=first[i],y=second[i];
 console.log("CHAIN ADVANCE",x.chain,"height",x.height,"->",y.height,"difference",y.height-x.height);
 if(y.height<x.height)fail(x.chain+": chain RPC went backwards");
 if(y.height===x.height)console.log("NOTE:",x.chain,"latest block did not change in 18s; endpoint still returns recent on-chain transactions, but continual advancement remains unverified.");
}
if(second.every((v,i)=>v.height===first[i].height))fail("Neither chain advanced in 18s: cannot verify actual ongoing live updates");
console.log("VERIFIED: independently fetched on-chain transactions twice after 18s; at least one chain advanced.");
