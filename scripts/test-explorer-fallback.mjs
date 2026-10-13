// No browser engine needed: exercise the exact frontend fallback function with
// scripted real-world Neon errors and verified Cloudflare RPC responses.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const js=await readFile(new URL('../public/explorer.js',import.meta.url),'utf8');
const start=js.indexOf('async function verifiedTransaction('),end=js.indexOf('function row(',start);
assert(start>0&&end>start,'Find the real explorer fallback implementation');
const source=js.slice(start,end);
const H='0x'+'a'.repeat(64),BLOCK=127481196;
function bind({neon,cloudflare}){
 const calls=[];
 const window={BEXENTRA_STREAM_BASE:'https://bexentra.elbapplbilal.workers.dev'};
 const request=async(path,params)=>{
  calls.push({type:'neon',path,params});
  if(neon instanceof Error)throw neon;
  return neon;
 };
 const fetch=async(url)=>{
  calls.push({type:'worker',url:String(url)});
  if(cloudflare instanceof Error)throw cloudflare;
  return new Response(JSON.stringify(cloudflare.value),{status:cloudflare.status,headers:{'content-type':'application/json'}});
 };
 const fn=new Function('window','request','fetch','URL',source+'\nreturn verifiedTransaction')(window,request,fetch,URL);
 return {fn,calls};
}
const error=(status)=>Object.assign(new Error('Neon '+status),{status});
const valid={chain:'bnb',tx_hash:H,block_height:BLOCK,source:'rpc_block_verified',fee_native:null,status:null};
{
 const t=bind({neon:valid,cloudflare:{status:200,value:valid}});
 assert.deepEqual(await t.fn('bnb',H,BLOCK),valid);
 assert.equal(t.calls.length,1,'Prefer successfully indexed real Neon data');
 console.log('PASS indexed Neon transactions continue working');
}
{
 const t=bind({neon:error(404),cloudflare:{status:200,value:valid}});
 assert.deepEqual(await t.fn('bnb',H,BLOCK),valid);
 assert.equal(t.calls[1].type,'worker');
 assert(new URL(t.calls[1].url).searchParams.get('height')===String(BLOCK));
 console.log('PASS fresh live BNB transaction opens using verified Cloudflare fallback');
}
{
 const t=bind({neon:error(503),cloudflare:{status:200,value:valid}});
 assert.equal((await t.fn('bnb',H,BLOCK)).source,'rpc_block_verified');
 console.log('PASS Neon outage can recover using real BNB RPC');
}
{
 const t=bind({neon:error(404),cloudflare:{status:200,
  value:{...valid,tx_hash:'0x'+'f'.repeat(64)}}});
 await assert.rejects(()=>t.fn('bnb',H,BLOCK),/Neon 404/);
 console.log('PASS a mismatched blockchain hash is never accepted');
}
{
 const t=bind({neon:error(404),cloudflare:{status:200,
  value:{...valid,block_height:999}}});
 await assert.rejects(()=>t.fn('bnb',H,BLOCK),/Neon 404/);
 console.log('PASS unverified block height is never accepted');
}
{
 const t=bind({neon:error(503),cloudflare:{status:503,value:{reason:'rpc_unavailable'}}});
 await assert.rejects(()=>t.fn('bnb',H,BLOCK),e=>e.status===503);
 console.log('PASS genuine provider outage is shown as unavailable');
}
{
 const t=bind({neon:error(400),cloudflare:{status:200,value:valid}});
 await assert.rejects(()=>t.fn('bnb',H,BLOCK),e=>e.status===400);
 assert.equal(t.calls.length,1);
 console.log('PASS malformed requests do not attempt upstream RPC');
}
console.log('PASS 7 browser-script fallback scenarios');
