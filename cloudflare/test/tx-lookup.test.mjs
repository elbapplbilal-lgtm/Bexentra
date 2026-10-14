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

test('returns actual BNB value, gas usage, nonce, call selector and verified block time',async()=>{
 const tx={...block.transactions[0],blockHash:BLOCK,value:'0x2386f26fc10000',
  gas:'0x186a0',nonce:'0x5',transactionIndex:'0x2',input:'0xa9059cbb'+'0'.repeat(128)};
 const verifiedBlock={number:'0x'+height.toString(16),hash:BLOCK,timestamp:'0x67000000'};
 const m=rpcMock({eth_getTransactionByHash:tx,eth_getTransactionReceipt:receipt,
  eth_getBlockByNumber:verifiedBlock});
 const res=await lookupBnb(H,height,{},m.fetcher);
 assert.equal(res.status,200);
 assert.equal(res.data.native_value_wei,'10000000000000000');
 assert.equal(res.data.gas_used,'21000');
 assert.equal(res.data.gas_limit,'100000');
 assert.equal(res.data.gas_price_wei,'1000000000');
 assert.equal(res.data.nonce,5);
 assert.equal(res.data.transaction_index,2);
 assert.equal(res.data.method_id,'0xa9059cbb');
 assert.equal(res.data.block_time,new Date(0x67000000*1000).toISOString());
});
test('missing value or receipt does not display invented native value or gas',async()=>{
 const tx={...block.transactions[0],input:'0x',value:undefined,gas:undefined};
 const m=rpcMock({eth_getTransactionByHash:tx,eth_getTransactionReceipt:null,
  eth_getBlockByNumber:{number:'0x'+height.toString(16),hash:BLOCK,timestamp:'0x67000000'}});
 const res=await lookupBnb(H,height,{},m.fetcher);
 assert.equal(res.status,200);
 assert.equal(res.data.native_value_wei,null);
 assert.equal(res.data.gas_used,null);
 assert.equal(res.data.gas_price_wei,null);
 assert.equal(res.data.status,null);
 assert.equal(res.data.method_id,null);
});
test('block hash mismatch withholds unverified timestamp and receipt status',async()=>{
 const tx={...block.transactions[0],blockHash:BLOCK,value:'0x0'};
 const m=rpcMock({eth_getTransactionByHash:tx,
  eth_getTransactionReceipt:{...receipt,blockHash:'0x'+'f'.repeat(64)},
  eth_getBlockByNumber:{number:'0x'+height.toString(16),hash:'0x'+'f'.repeat(64),timestamp:'0x67000000'}});
 const res=await lookupBnb(H,height,{},m.fetcher);
 assert.equal(res.data.status,null);
 assert.equal(res.data.fee_native,null);
 assert.equal(res.data.block_time,null);
 assert.equal(res.data.native_value_wei,'0');
});
test('verified Solana timestamp and compute unit count are returned without inferred transfers',async()=>{
 const m=rpcMock({getTransaction:{slot:1234,blockTime:1720000000,
  transaction:{message:{accountKeys:[SOL]}},
  meta:{err:null,fee:5000,computeUnitsConsumed:24500}}});
 const res=await lookupSolana(SOL,{},m.fetcher);
 assert.equal(res.status,200);
 assert.equal(res.data.block_time,new Date(1720000000*1000).toISOString());
 assert.equal(res.data.compute_units,24500);
 assert.equal(Object.hasOwn(res.data,'native_value_wei'),false);
});
