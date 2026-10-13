// Independently probe the actual Cloudflare Production deployment.
// Verifies read-only /tx route is deployed, not whether every RPC stays online.
const base='https://bexentra.elbapplbilal.workers.dev';
const opts={signal:AbortSignal.timeout(18000),headers:{Accept:'application/json',Origin:'https://elbapplbilal-lgtm.github.io'}};
async function check(path){
 const res=await fetch(base+path,opts);
 let json={};try{json=await res.json()}catch{}
 console.log('CHECK',path,'HTTP',res.status,'BODY',JSON.stringify(json).slice(0,1100));
 return {status:res.status,data:json};
}
const health=await check('/health');
if(health.status!==200||health.data.app!=='BEXENTRA')
 throw Error('Production Worker health unavailable');
const invalid=await check('/tx?chain=bnb&hash=invalid');
if(invalid.status!==400||!String(invalid.data.error).includes('Invalid transaction hash'))
 throw Error('New Worker /tx is NOT deployed yet (or invalid-hash validation failed)');
console.log('VERIFIED: public Production /tx route deployed and validates hashes');
// Check the user's screenshot hash as a best-effort real-network example. We
// cannot assert 200 without an authentic canonical receipt response.
const hash='0x02e1b2a68b23976eed4a118436a369253bbc9f8176d03b447ae4525dafdd0465';
const real=await check('/tx?chain=bnb&hash='+hash+'&height=127481196');
if(real.status===200){
 if(real.data.tx_hash?.toLowerCase()!==hash||real.data.chain!=='bnb'
    ||Number(real.data.block_height)!==127481196
    ||!['rpc_live','rpc_block_verified'].includes(real.data.source))
    throw Error('Worker returned mismatching or unverified transaction');
 console.log('REAL_TRANSACTION_VERIFIED',JSON.stringify({height:real.data.block_height,
  status:real.data.status,source:real.data.source,fee:real.data.fee_native}));
}else{
 console.log('NOTE: screenshot hash not confirmed by public RPC, HTTP',real.status,
  'reason',real.data.reason||real.data.error||'unavailable');
}
console.log('PRODUCTION_TX_ENDPOINT_READY');

// Now take an actual fresh on-chain hash from BEXENTRA's own live BNB feed
// and confirm the /tx route opens exactly that verified transaction.
const ac=new AbortController(), timeout=setTimeout(()=>ac.abort(),25000);
let observed=null;
try{
 const stream=await fetch(base+'/stream?chain=bnb',{
  headers:{Accept:'text/event-stream',Origin:'https://elbapplbilal-lgtm.github.io'},
  signal:ac.signal
 });
 if(!stream.ok||!stream.headers.get('content-type')?.includes('text/event-stream'))
  throw Error('Production SSE stream unavailable');
 const reader=stream.body.getReader(),decoder=new TextDecoder();
 let pending='',events=0;
 while(events<23&&!observed){
  const chunk=await reader.read();
  if(chunk.done)break;
  pending+=decoder.decode(chunk.value,{stream:true});
  let split;
  while((split=pending.indexOf('\n\n'))>=0){
   const data=pending.slice(0,split);
   pending=pending.slice(split+2);
   if(!data.startsWith('event: snapshot'))continue;
   const raw=data.split('\n').find(x=>x.startsWith('data: '));
   if(!raw)continue;
   events++;
   const sample=JSON.parse(raw.slice(6));
   if(sample.source==='ws_live'&&sample.stream_connected&&sample.transactions?.[0]?.tx_hash
       &&Number.isSafeInteger(Number(sample.transactions[0]?.block_height))){
    observed={hash:sample.transactions[0].tx_hash,height:Number(sample.transactions[0].block_height)};
    break;
   }
  }
 }
 console.log('FRESH_OBSERVED_SAMPLE',JSON.stringify(observed));
}catch(e){console.warn('Could not get new transaction from SSE:',String(e?.message||e))}
finally{clearTimeout(timeout);ac.abort()}
if(!observed)throw Error('Unable to prove live tx click: no real transaction arrived from SSE');
const opened=await check('/tx?chain=bnb&hash='+encodeURIComponent(observed.hash)+'&height='+observed.height);
if(opened.status!==200||opened.data.tx_hash?.toLowerCase()!==observed.hash.toLowerCase()
  ||Number(opened.data.block_height)!==observed.height
  ||!['rpc_block_verified','rpc_live'].includes(opened.data.source))
 throw Error('Fresh live BNB hash cannot open verified detail: HTTP '+opened.status);
console.log('SUCCESS: a just-observed LIVE BNB TRANSACTION opens verified details!',
 JSON.stringify({block:opened.data.block_height,hash:opened.data.tx_hash,
 status:opened.data.status,source:opened.data.source}));
