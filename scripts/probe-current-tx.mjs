// Public read-only diagnostic for a transaction that BEXENTRA showed as "not indexed".
// Never logs RPC API keys; these endpoints are public by design.
const hash="0x02e1b2a68b23976eed4a118436a369253bbc9f8176d03b447ae4525dafdd0465";
const api="https://br-old-sun-b5txcoym-bexentraapi.compute.c-7.us-east-2.aws.neon.tech";
const providers=[
  "https://bsc-dataseed.bnbchain.org",
  "https://bsc-dataseed-public.bnbchain.org",
  "https://bsc-rpc.publicnode.com",
  "https://binance.llamarpc.com"
];
async function getAPI() {
 const u=new URL(api+"/tx");u.searchParams.set("chain","bnb");u.searchParams.set("hash",hash);
 try {
  const response=await fetch(u,{signal:AbortSignal.timeout(12000)});
  console.log("DEPLOYED_API",response.status,(await response.text()).slice(0,900));
 }catch(e){console.log("DEPLOYED_API_ERROR",String(e.message||e))}
}
async function rpc(endpoint,method,params) {
 try {
  const r=await fetch(endpoint,{method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({jsonrpc:"2.0",id:1,method,params}),
   signal:AbortSignal.timeout(14000)});
  const body=await r.text();
  let v={};try{v=JSON.parse(body)}catch{}
  let result=v.result;
  if(result && typeof result==="object"){
   result=method==="eth_getTransactionByHash"?{hash:result.hash,blockNumber:result.blockNumber,from:result.from,to:result.to}:method==="eth_getTransactionReceipt"?{transactionHash:result.transactionHash,blockNumber:result.blockNumber,status:result.status,gasUsed:result.gasUsed,effectiveGasPrice:result.effectiveGasPrice}:
   {number:result.number,txs:result.transactions?.length,hash:result.hash};
  }
  console.log("RPC",endpoint,method,{http:r.status,err:v.error||null,result:result??null,textExcerpt:body.slice(0,130)});
  return v.result;
 }catch(e){console.log("RPC_ERROR",endpoint,method,String(e.message||e));return null}
}
await getAPI();
await Promise.all(providers.map(async endpoint=>{
 const tx=await rpc(endpoint,"eth_getTransactionByHash",[hash]);
 if(tx?.blockNumber)await Promise.all([
  rpc(endpoint,"eth_getTransactionReceipt",[hash]),
  rpc(endpoint,"eth_getBlockByNumber",[tx.blockNumber,false])
 ]);
}));

try {
 const liveUrl=api+"/live?chain=bnb&limit=8";
 const liveResp=await fetch(liveUrl,{signal:AbortSignal.timeout(14000)});
 const liveData=await liveResp.json();
 console.log("RECENT_LIVE_SAMPLE",{
  source:liveData.source,height:liveData.blocks?.[0]?.height,
  sample:liveData.transactions?.[0]?.tx_hash});
 if(liveData.source==="rpc_live"&&liveData.transactions?.length&&liveData.blocks?.[0]?.height){
  const tx=liveData.transactions[0];
  const detailURL=new URL(api+"/tx");
  detailURL.searchParams.set("chain","bnb");detailURL.searchParams.set("hash",tx.tx_hash);
  const detail=await fetch(detailURL,{signal:AbortSignal.timeout(15000)});
  console.log("RECENT_SAMPLE_DETAIL",detail.status,(await detail.text()).slice(0,600));
  const blockHeight="0x"+Number(tx.block_height).toString(16);
  const sourceBlock=await rpc("https://bsc-rpc.publicnode.com","eth_getBlockByNumber",[blockHeight,false]);
  console.log("RECENT_SAMPLE_IN_CANONICAL_BLOCK",Array.isArray(sourceBlock?.transactions)&&sourceBlock.transactions.some(t=>typeof t==="string"&&t.toLowerCase()===tx.tx_hash.toLowerCase()));
 }
}catch(e){console.log("RECENT_SAMPLE_PROBE_ERROR",String(e?.message||e));}

console.log("READ_ONLY_PROBE_COMPLETE");
