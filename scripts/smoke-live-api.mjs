// Deployment must prove two things on real mainnet: live hashes are actually
// displayed AND a visitor can open the very same hashes in BEXENTRA detail.
// No fabricated data or private tokens are used.
const base=process.env.BEXENTRA_API_BASE||
 "https://br-old-sun-b5txcoym-bexentraapi.compute.c-7.us-east-2.aws.neon.tech";
let last="";
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
for(let attempt=1;attempt<=4;attempt++){
 try{
  const response=await fetch(base+"/live?chain=bnb&limit=8",{
   headers:{Accept:"application/json"},signal:AbortSignal.timeout(15000)
  });
  const live=await response.json();
  const height=Number(live.blocks?.[0]?.height);
  if(!response.ok||live.source!=="rpc_live"||
   !Number.isSafeInteger(height)||!Array.isArray(live.transactions)||
   !live.transactions.length)throw Error("No real BNB live sample: "+JSON.stringify({status:response.status,source:live.source,height}));
  const tx=live.transactions[0];
  if(typeof tx.tx_hash!=="string"||!/^0x[0-9a-fA-F]{64}$/.test(tx.tx_hash)||Number(tx.block_height)!==height)
   throw Error("Live transaction hash/height malformed");
  const url=new URL(base+"/tx");
  url.searchParams.set("chain","bnb");url.searchParams.set("hash",tx.tx_hash);
  url.searchParams.set("height",String(height));
  const detailResponse=await fetch(url,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(20000)});
  const detail=await detailResponse.json();
  last=JSON.stringify({attempt,liveHeight:height,source:live.source,
   detailStatus:detailResponse.status,detailSource:detail.source,
   detailHeight:detail.block_height,hashMatch:detail.tx_hash?.toLowerCase()===tx.tx_hash.toLowerCase()});
  console.log("BNB live-to-detail production test:",last);
  if(detailResponse.ok&&detail.tx_hash?.toLowerCase()===tx.tx_hash.toLowerCase()&&
   Number(detail.block_height)===height&&
   ["rpc_live","rpc_block_verified","indexed_plus_rpc"].includes(detail.source)){
    console.log("SUCCESS: User can open a genuinely observed new BNB transaction with correct block provenance; no synthetic status/fees");
    process.exit(0);
  }
  throw Error("Live BNB hash cannot be opened in deployed BEXENTRA API");
 }catch(e){last=String(e?.message||e);console.log("Production live→detail check attempt "+attempt+": "+last)}
 if(attempt<4)await pause(6000);
}
throw Error("Live BNB transaction details not verified after deploy: "+last);
