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
