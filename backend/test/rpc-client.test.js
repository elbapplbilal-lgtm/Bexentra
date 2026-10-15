import test from 'node:test';
import assert from 'node:assert/strict';
import {createRpcClient} from '../src/rpc-client.js';

const ok = result => ({ok:true, status:200, headers:{get:()=>null}, json:async()=>({jsonrpc:'2.0',id:1,result})});
const httpError = (status, retryAfter=null) => ({ok:false,status,headers:{get:name=>name==='retry-after'?retryAfter:null}});
const base = {random:()=>0, timeoutMs:300, wait:async()=>{}};

test('sends POST JSON-RPC and returns genuine result',async()=>{
 let seen;
 const rpc=createRpcClient({...base,fetchImpl:async(url,opts)=>{seen={url,opts};return ok('0x42')}});
 assert.equal(await rpc('https://rpc.example','eth_blockNumber'), '0x42');
 assert.equal(seen.url,'https://rpc.example');
 assert.equal(seen.opts.method,'POST');
 assert.equal(JSON.parse(seen.opts.body).method,'eth_blockNumber');
});

test('backs off on HTTP 429 with bounded Retry-After then succeeds',async()=>{
 let n=0;const sleeps=[];
 const rpc=createRpcClient({...base,wait:async ms=>sleeps.push(ms),fetchImpl:async()=>++n===1?httpError(429,'1'):ok(12)});
 assert.equal(await rpc('http://unused','getSlot'),12);
 assert.deepEqual(sleeps,[1000]);
 assert.equal(n,2);
});

test('backs off on temporary 5xx with capped retry count',async()=>{
 let n=0;const sleeps=[];
 const rpc=createRpcClient({...base,wait:async ms=>sleeps.push(ms),fetchImpl:async()=>{n++;return httpError(503)}});
 await assert.rejects(rpc('http://unused','x'),/RPC HTTP 503/);
 assert.equal(n,3);assert.deepEqual(sleeps,[500,1000]);
});

test('does not retry invalid request 400',async()=>{
 let n=0;
 const rpc=createRpcClient({...base,fetchImpl:async()=>{n++;return httpError(400)}});
 await assert.rejects(rpc('http://unused','x'),/RPC HTTP 400/);assert.equal(n,1);
});

test('retries JSON-RPC rate limit error -32005',async()=>{
 let n=0;
 const rpc=createRpcClient({...base,fetchImpl:async()=>++n===1?{...ok(),json:async()=>({error:{code:-32005,message:'provider rate limited'}})}:ok(3)});
 assert.equal(await rpc('http://unused','x'),3);assert.equal(n,2);
});

test('does not retry JSON-RPC invalid params',async()=>{
 let n=0;
 const rpc=createRpcClient({...base,fetchImpl:async()=>{n++;return {...ok(),json:async()=>({error:{code:-32602,message:'Invalid params'}})}}});
 await assert.rejects(rpc('http://unused','x'),/Invalid params/);assert.equal(n,1);
});

test('preserves legitimate null result',async()=>{
 const rpc=createRpcClient({...base,fetchImpl:async()=>ok(null)});
 assert.equal(await rpc('http://unused','getBlock'),null);
});

test('retries temporary network TypeError',async()=>{
 let n=0;
 const rpc=createRpcClient({...base,fetchImpl:async()=>{if(++n===1)throw new TypeError('network unavailable');return ok('recovered')}});
 assert.equal(await rpc('http://unused','x'),'recovered');assert.equal(n,2);
});
