// PWA regression tests: transaction and wallet URLs never silently return home.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../sw.js', import.meta.url),'utf8');
const origin='https://example.org';
const root=origin+'/Bexentra/';
function harness(fetchResult=()=>Promise.reject(Error('offline'))){
 const listeners={},saved=new Map([
  ['/Bexentra/index.html',{page:'home'}],
  ['/Bexentra/explorer.html',{page:'explorer'}],
  ['/Bexentra/watchlist.html',{page:'watchlist'}]
 ]);
 let puts=0;
 const pathOf=x=>new URL(typeof x==='string'?x:x.url,root).pathname;
 const caches={
  match:async req=>saved.get(pathOf(req))||null,
  open:async()=>({
   addAll:async()=>{},
   put:async(req,res)=>{puts++;saved.set(pathOf(req),res)}
  }),
  keys:async()=>[],
  delete:async()=>true
 };
 const self={
  addEventListener:(name,callback)=>{listeners[name]=callback},
  skipWaiting:()=>{},
  clients:{claim:async()=>{}}
 };
 const Response={error:()=>({page:'network-error',status:0})};
 runInNewContext(source,{self,caches,fetch:fetchResult,location:{origin},URL,Response});
 async function request(uri,mode='navigate',method='GET'){
  let response,used=false;const waits=[];
  const event={request:{url:root+uri,mode,method},
   respondWith:p=>{used=true;response=p},
   waitUntil:p=>waits.push(p)};
  listeners.fetch(event);
  if(!used)return {intercepted:false,puts};
  const value=await response;
  await Promise.all(waits);
  return {intercepted:true,value,puts};
 }
 return {request};
}
test('offline transaction URL preserves the actual explorer detail page',async()=>{
 const result=await harness().request('explorer.html?chain=bnb&type=tx&q=0x123');
 assert.equal(result.value.page,'explorer');
});
test('offline address search also returns detail app, not homepage',async()=>{
 const result=await harness().request('explorer.html?chain=solana&type=address&q=abc');
 assert.equal(result.value.page,'explorer');
});
test('wallet watchlist navigates back to its own cached page',async()=>{
 const result=await harness().request('watchlist.html');
 assert.equal(result.value.page,'watchlist');
});
test('homepage category route remains a homepage navigation',async()=>{
 const result=await harness().request('?view=transactions');
 assert.equal(result.value.page,'home');
});
test('unknown page and uncached script never receive homepage HTML',async()=>{
 const unknown=await harness().request('not-real.html');
 const js=await harness().request('public/not-real.js','no-cors');
 assert.equal(unknown.value.page,'network-error');
 assert.equal(js.value.page,'network-error');
});
test('cross-origin and POST are not handled by static app shell',async()=>{
 const h=harness();
 assert.equal((await h.request('anything','navigate','POST')).intercepted,false);
});
test('network response is preferred and only successful responses cached',async()=>{
 let code=200;
 const h=harness(async()=>({ok:code===200,page:'online',clone(){return {...this}}}));
 const a=await h.request('watchlist.html');
 assert.equal(a.value.page,'online');assert.equal(a.puts,1);
 code=404;
 const b=await h.request('missing.html');
 assert.equal(b.puts,1);
});
