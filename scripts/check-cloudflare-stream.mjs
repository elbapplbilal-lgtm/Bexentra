// Check the deployed Worker receives real upstream blockchain notifications.
// Read-only, no Cloudflare credentials. Do not call this proof of full historical indexing.
const BASE='https://bexentra.elbapplbilal.workers.dev';
const chains=['bnb','solana'];
const results=await Promise.all(chains.map(async chain=>{
 const url=BASE+'/stream?chain='+chain;
 console.log('Opening live stream for',chain);
 let res;
 const abort=new AbortController();
 const timer=setTimeout(()=>abort.abort(),30000);
 try{
  res=await fetch(url,{headers:{Accept:'text/event-stream',Origin:'https://elbapplbilal-lgtm.github.io'},signal:abort.signal});
  console.log(chain,'status',res.status,'type',res.headers.get('content-type'));
  if(!res.ok||!res.headers.get('content-type')?.includes('text/event-stream'))
   return {chain,ok:false,reason:'HTTP '+res.status};
  const reader=res.body.getReader();
  let count=0,last=null,notLive=null,raw='';
  while(count<26){
   let step;
   try{step=await reader.read()}catch(e){console.log(chain,'reading:',String(e.message||e));break}
   if(step.done)break;
   raw+=new TextDecoder().decode(step.value,{stream:true});
   if(raw.length>400000)return {chain,ok:false,reason:'Oversized stream payload'};
   let pos;
   while((pos=raw.indexOf('\n\n'))>=0){
    const packet=raw.slice(0,pos);
    raw=raw.slice(pos+2);
    if(!packet.startsWith('event: snapshot'))continue;
    const data=packet.split('\n').find(x=>x.startsWith('data: '));
    if(!data)continue;
    let json;try{json=JSON.parse(data.slice(6))}catch{continue}
    count++;
    if(json.stream_connected&&json.source==='ws_live'&&Array.isArray(json.transactions)&&json.transactions.length){
     const tx=json.transactions[0];
     const valid=chain==='bnb'?/^0x[0-9a-fA-F]{64}$/.test(tx.tx_hash):/^[1-9A-HJ-NP-Za-km-z]{70,100}$/.test(tx.tx_hash);
     if(valid){
      console.log(chain,'LIVE_TRANSACTION_CONFIRMED',JSON.stringify({
       block:tx.block_height,hash:tx.tx_hash,observed:json.last_event_at,source:json.source,
       total:json.observed_since_start}));
      return {chain,ok:true,block:tx.block_height,hash:tx.tx_hash};
     }
    }
    last={source:json.source,connected:json.stream_connected,txs:json.transactions?.length,
      reason:json.last_error,observed:json.last_event_at};
    if(last.source==='stream_offline'&&last.reason)notLive=last.reason;
    if(count<=2||count%10===0)console.log(chain,'waiting event',count,JSON.stringify(last));
   }
  }
  return {chain,ok:false,events:count,last,notLive};
 }catch(e){return {chain,ok:false,error:String(e.message||e)}}
 finally{clearTimeout(timer);abort.abort();try{await res?.body?.cancel()}catch{}}
}));
for(const r of results)console.log('RESULT',JSON.stringify(r));
if(results.some(x=>!x.ok)){console.error('LIVE_UPSTREAM_UNVERIFIED: one or both networks have no confirmed transactions from the deployed stream');process.exitCode=1}
else console.log('SUCCESS: both Cloudflare Production streams emitted real blockchain transaction signatures');
