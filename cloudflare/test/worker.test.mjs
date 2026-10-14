import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {observe, snapshot, freshState, getBnbBlock, openStream, configure,withTxCapacity} from '../src/worker.js';

const H='0x'+'a'.repeat(64), BH='0x'+'b'.repeat(64), S='3'.repeat(88);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
class FakeSocket{
 static all=[];
 constructor(url){this.url=url;this.listeners=new Map();this.sent=[];this.closed=false;FakeSocket.all.push(this)}
 addEventListener(kind,fn){this.listeners.set(kind,[...(this.listeners.get(kind)||[]),fn])}
 send(s){this.sent.push(JSON.parse(s))}
 close(){this.closed=true;this.emit('close',{})}
 emit(kind,data){for(const fn of this.listeners.get(kind)||[])fn(data)}
 message(value){this.emit('message',{data:JSON.stringify(value)})}
}
test('health is accurate and never fabricates 24/7 availability',async()=>{
 const r=await worker.fetch(new Request('https://stream.example/health'),{});
 const j=await r.json();
 assert.equal(r.status,200);
 assert.equal(j.mode,'per_viewer_live_sample');
 assert.equal(j.coverage,'NOT_COMPLETE_HISTORY');
});
test('origin and chain controls protect cross-origin browsing',async()=>{
 const bad=new Request('https://stream.example/stream?chain=bnb',{headers:{Origin:'https://untrusted.example'}});
 assert.equal((await worker.fetch(bad,{})).status,403);
 assert.equal((await worker.fetch(new Request('https://stream.example/stream?chain=eth'),{})).status,400);
 assert.equal((await worker.fetch(new Request('https://stream.example/unknown'),{})).status,404);
 const cors=await worker.fetch(new Request('https://stream.example/stream',{method:'OPTIONS'}),{});
 assert.equal(cors.headers.get('access-control-allow-origin'),'https://elbapplbilal-lgtm.github.io');
});
test('observed data is validated, deduplicated and never gets invented fees',()=>{
 const state=freshState('bnb');
 assert.equal(observe(state,{tx_hash:'not-a-tx',block_height:2}),false);
 assert.equal(observe(state,{tx_hash:H,block_height:2}),true);
 assert.equal(observe(state,{tx_hash:H.toUpperCase().replace('0X','0x'),block_height:2}),false);
 assert.equal(snapshot(state).source,'stream_offline');
 assert.equal(snapshot(state).transactions[0].fee_native,null);
 assert.equal(snapshot(state).transactions[0].status,null);
 assert.equal(state.total_observed,1);
});
test('bounded sample does not claim to hold every seen transaction',()=>{
 const state=freshState('bnb');
 for(let n=1;n<=50;n++)observe(state,{tx_hash:'0x'+n.toString(16).padStart(64,'0'),block_height:n});
 state.connected=true;
 const shot=snapshot(state,true);
 assert.equal(shot.source,'ws_live');
 assert.equal(shot.coverage,'recent_stream_sample');
 assert.equal(shot.transactions.length,12);
 assert.equal(shot.dropped_from_memory,18);
 assert.equal(shot.observed_since_last_tick,50);
 assert.equal(snapshot(state).observed_since_last_tick,0);
});
test('no private RPC token needed; optional endpoints must be secure',()=>{
 assert.match(configure({},'bnb').ws,/^wss:/);
 assert.match(configure({},'solana').ws,/^wss:/);
 assert.equal(configure({BNB_WS_URL:'http://unsafe'},'bnb').ws,configure({},'bnb').ws);
 assert.equal(configure({BNB_RPC_URL:'https://private.example'},'bnb').http,'https://private.example');
});
test('BNB block must be checked against exact announced hash and height',async()=>{
 const fake=async(_url,options)=>{
  const body=JSON.parse(options.body);
  assert.equal(body.method,'eth_getBlockByHash');
  assert.equal(body.params[0],BH);
  return {ok:true,json:async()=>({result:{number:'0x64',hash:BH,timestamp:'0x70000000',transactions:[H]}})};
 };
 const block=await getBnbBlock('https://rpc.example',{number:'0x64',hash:BH},fake);
 assert.equal(block.height,100);
 assert.equal(block.count,1);
 assert.deepEqual(block.hashes,[H]);
 await assert.rejects(()=>getBnbBlock('https://rpc.example',{number:'0x65',hash:BH},fake),/mismatch/);
});
test('real upstream BNB newHeads produce actual SSE on 1-second tick',async()=>{
 FakeSocket.all=[];
 const http=async()=>({ok:true,json:async()=>({result:{number:'0x64',hash:BH,timestamp:'0x70000000',transactions:[H]}})});
 const stream=openStream('bnb',{}, {WebSocket:FakeSocket,fetch:http});
 const ws=FakeSocket.all[0];
 const reader=stream.body.getReader();
 ws.emit('open',{});
 assert.deepEqual(ws.sent[0].params,['newHeads']);
 ws.message({id:1,result:'bnb-sub'});
 ws.message({method:'eth_subscription',params:{subscription:'bnb-sub',result:{number:'0x64',hash:BH}}});
 await sleep(35);
 assert.equal(stream.state.recent[0].tx_hash,H);
 assert.equal(stream.state.last_block.height,100);
 const packets=[];
 for(let i=0;i<3;i++){const p=await reader.read();packets.push(new TextDecoder().decode(p.value))}
 assert.ok(packets.join('').includes('"source":"ws_live"'));
 assert.ok(packets.join('').includes('"tx_hash":"'+H+'"'));
 await reader.cancel();
 assert.equal(ws.closed,true);
});
test('Solana confirmed logs are sampled honestly without fake fees',()=>{
 FakeSocket.all=[];
 const stream=openStream('solana',{}, {WebSocket:FakeSocket});
 const ws=FakeSocket.all[0];
 ws.emit('open',{});
 assert.equal(ws.sent[0].method,'logsSubscribe');
 assert.equal(ws.sent[0].params[0],'all');
 ws.message({id:1,result:7});
 ws.message({method:'logsNotification',params:{subscription:7,result:{context:{slot:300},value:{signature:S,err:null,logs:[]}}}});
 assert.equal(stream.state.recent[0].status,'success');
 assert.equal(stream.state.recent[0].fee_native,null);
 assert.equal(stream.state.last_block.height,300);
 stream.close();
});
test('upstream RPC rejection cannot be falsely labeled as a live feed',()=>{
 FakeSocket.all=[];
 const stream=openStream('bnb',{}, {WebSocket:FakeSocket});
 const ws=FakeSocket.all[0];
 ws.emit('open',{});
 ws.message({id:1,error:{code:-32000,message:'rate limit'}});
 assert.equal(stream.state.connected,false);
 assert.equal(ws.closed,true);
});

test('RPC transaction lookup has bounded per-isolate capacity and releases slots after completion',async()=>{
 let finish;
 const blocked=new Promise(resolve=>{finish=resolve});
 const active=Array.from({length:4},()=>withTxCapacity(()=>blocked));
 const busy=await withTxCapacity(async()=>new Response("unexpected"));
 assert.equal(busy.status,429);
 assert.equal((await busy.json()).reason,'rate_limited');
 finish(new Response('ok',{status:200}));
 const completed=await Promise.all(active);
 assert(completed.every(x=>x.status===200));
 const recovered=await withTxCapacity(async()=>new Response('recovered',{status:200}));
 assert.equal(recovered.status,200);
});
test('a failed transaction lookup does not permanently occupy capacity',async()=>{
 await assert.rejects(()=>withTxCapacity(async()=>{throw Error('upstream outage')}),/upstream outage/);
 assert.equal((await withTxCapacity(async()=>new Response('ok'))).status,200);
});
