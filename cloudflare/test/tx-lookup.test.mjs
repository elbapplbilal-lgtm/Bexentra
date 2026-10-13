import test from 'node:test';
import assert from 'node:assert/strict';
import {lookupBnb,lookupSolana,transactionRoute} from '../src/tx-lookup.js';

const H='0x'+'a'.repeat(64),BLOCK='0x'+'b'.repeat(64),FROM='0x'+'c'.repeat(40),TO='0x'+'d'.repeat(40);
const SOL='3'.repeat(88),height=127481196;
const block={number:'0x'+height.toString(16),hash:BLOCK,
 transactions:[{hash:H,blockNumber:'0x'+height.toString(16),from:FROM,to:TO}]};
const receipt={transactionHash:H,blockNumber:'0x'+height.toString(16),
 blockHash:BLOCK,status:'0x1',gasUsed:'0x5208',effectiveGasPrice:'0x3b9aca00'};
function rpcMock(values){
 const called=[];
 return {called,fetcher:async(_url,init)=>{
  const {method}=JSON.parse(init.body);
  called.push(method);
  const result=values[method];
  if(result instanceof Error)throw result;
  return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:result??null}),{
   status:200,headers:{'content-type':'application/json'}
  });
 }};
}
test('known BNB transaction verifies exact hash, receipt status, and bigint wei fee',async()=>{
 const m=rpcMock({eth_getTransactionByHash:block.transactions[0],eth_getTransactionReceipt:receipt});
 const res=await lookupBnb(H,height,{},m.fetcher);
 assert.equal(res.status,200);
 assert.equal(res.data.source,'rpc_live');
 assert.equal(res.data.block_height,height);
 assert.equal(res.data.status,'success');
 assert.equal(res.data.fee_native,'21000000000000');
 assert.equal(res.data.sender,FROM);
});
test('new BNB transaction missing by-hash recovers by verified block membership',async()=>{
 const m=rpcMock({eth_getTransactionByHash:null,eth_getBlockByNumber:block,eth_getTransactionReceipt:receipt});
 const res=await lookupBnb(H,height,{},m.fetcher);
 assert.equal(res.status,200);
 assert.equal(res.data.source,'rpc_block_verified');
 assert.equal(res.data.status,'success');
 assert.equal(res.data.fee_native,'21000000000000');
 assert(m.called.includes('eth_getBlockByNumber'));
});
test('BNB hash missing in canonical block gives honest 404',async()=>{
 const m=rpcMock({eth_getTransactionByHash:null,eth_getBlockByNumber:{...block,transactions:[]}});
 const res=await lookupBnb(H,height,{},m.fetcher);
 assert.equal(res.status,404);
 assert.equal(res.reason,'not_verified');
});
test('RPC network outage gives honest 503, not a fabricated status',async()=>{
 const m=rpcMock({eth_getTransactionByHash:new Error('offline'),eth_getBlockByNumber:new Error('offline')});
 const res=await lookupBnb(H,height,{},m.fetcher);
 assert.equal(res.status,503);
 assert.equal(res.reason,'rpc_unavailable');
});
test('receipt mismatch never invents status or fee',async()=>{
 const m=rpcMock({eth_getTransactionByHash:block.transactions[0],
  eth_getTransactionReceipt:{...receipt,transactionHash:'0x'+'f'.repeat(64)}});
 const res=await lookupBnb(H,height,{},m.fetcher);
 assert.equal(res.status,200);
 assert.equal(res.data.status,null);
 assert.equal(res.data.fee_native,null);
});
test('live Solana signature resolves real slot, failed status and lamport fee',async()=>{
 const m=rpcMock({getTransaction:{slot:1234,transaction:{message:{accountKeys:[SOL]}},
  meta:{err:{InstructionError:[0,'Custom']},fee:5000}}});
 const res=await lookupSolana(SOL,{},m.fetcher);
 assert.equal(res.status,200);
 assert.equal(res.data.status,'failed');
 assert.equal(res.data.fee_native,'5000');
 assert.equal(res.data.source,'rpc_live');
});
test('route validates hash and block hint, never returns fictional transactions',async()=>{
 const res=await transactionRoute(new Request('https://stream.test/tx?chain=bnb&hash=garbage'),{});
 assert.equal(res.status,400);
 const badHeight=await transactionRoute(new Request('https://stream.test/tx?chain=bnb&hash='+H+'&height=oops'),{});
 assert.equal(badHeight.status,400);
 const m=rpcMock({eth_getTransactionByHash:null,eth_getBlockByNumber:block,eth_getTransactionReceipt:receipt});
 const ok=await transactionRoute(new Request('https://stream.test/tx?chain=bnb&hash='+H+'&height='+height),{},m.fetcher);
 assert.equal(ok.status,200);
 assert.equal(ok.headers.get('access-control-allow-origin'),'https://elbapplbilal-lgtm.github.io');
 const data=await ok.json();
 assert.equal(data.tx_hash,H);
 assert.equal(data.source,'rpc_block_verified');
});
