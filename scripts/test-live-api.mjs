// Realistic offline tests for Neon Function's public live RPC handlers.
// No tokens, network requests or live chain calls are used in this test.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const source=(await readFile(new URL("../neon/functions/bexentra-api.ts",import.meta.url),"utf8"))
 .replace(/^import pg from "pg";\n/,"")
 .replace("export default async function handler","async function handler");

const receiptHash="0x"+"a".repeat(64);
const addressFrom="0x"+"b".repeat(40),addressTo="0x"+"c".repeat(40);
const block={
 hash:"0x"+"d".repeat(64),number:"0x1312d00",timestamp:"0x69100000",
 transactions:[{hash:receiptHash,from:addressFrom,to:addressTo}]
};
const exampleTx={hash:receiptHash,from:addressFrom,to:addressTo,blockNumber:block.number};
const receipt={
 transactionHash:receiptHash,blockNumber:block.number,status:"0x1",
 gasUsed:"0x5208",effectiveGasPrice:"0x3b9aca00"
};
const solSignature="3".repeat(88);
const solBlock={blockhash:"G".repeat(32),blockTime:1790960000,signatures:[solSignature]};

function makeHandler({rpc,dbRows={}}){
 const rpcCalls=[],queries=[];
 const fetch=async(url,init)=>{
  const body=JSON.parse(init.body);
  rpcCalls.push({method:body.method,chain:String(url).includes("solana")?"solana":"bnb"});
  if(rpc.fail)throw Error("Mock provider unavailable");
  const result=rpc[body.method];
  if(result===undefined)throw Error("Mock lacks "+body.method);
  return new Response(JSON.stringify({jsonrpc:"2.0",id:1,result}),{
   status:200,headers:{"content-type":"application/json"}
  });
 };
 const pg={Pool:class{async query(sql,args){
  queries.push({sql,args});
  if(sql.includes("FROM indexed_blocks"))return {rows:dbRows.blocks||[],rowCount:(dbRows.blocks||[]).length};
  if(sql.includes("FROM indexed_transactions"))return {rows:dbRows.transactions||[],rowCount:(dbRows.transactions||[]).length};
  if(sql.includes("FROM indexed_token_transfers"))return {rows:[],rowCount:0};
  return {rows:[],rowCount:0};
 }}};
 const factory=new Function("pg","process","Response","URL","fetch","AbortController","setTimeout","clearTimeout","console",
  source+"\nreturn handler;");
 const handler=factory(pg,{env:{DATABASE_URL:"postgres://mock.invalid/test"}},Response,URL,fetch,AbortController,setTimeout,clearTimeout,{error(){},warn(){}});
 const request=async(path)=>{
  const res=await handler({method:"GET",url:"https://bexentra.test"+path});
  return {status:res.status,data:await res.json()};
 };
 return {request,rpcCalls,queries};
}

let passed=0;
async function scenario(name,fn){
 await fn();
 passed++;
 console.log("PASS",name);
}

await scenario("BNB latest live block delivers real hashes with unverified status",async()=>{
 const h=makeHandler({rpc:{eth_getBlockByNumber:block}});
 const res=await h.request("/live?chain=bnb&limit=8");
 assert.equal(res.status,200);
 assert.equal(res.data.source,"rpc_live");
 assert.equal(res.data.coverage,"latest_block_sample");
 assert.equal(res.data.blocks[0].transaction_count,1);
 assert.equal(res.data.transactions[0].tx_hash,receiptHash);
 assert.equal(res.data.transactions[0].status,null);
 assert.equal(res.data.transactions[0].fee_native,null);
 assert.equal(res.data.transactions[0].source,"rpc_live");
 const again=await h.request("/live?chain=bnb&limit=8");
 assert.equal(again.data.source,"rpc_live");
 assert.equal(h.rpcCalls.length,1,"in-flight cached RPC response should be reused");
});

await scenario("Provider outage explicitly yields indexed-only snapshot",async()=>{
 const indexed={chain:"bnb",height:127281003,block_time:"2026-10-12T00:00:00Z"};
 const tx={chain:"bnb",tx_hash:receiptHash,block_height:127281003};
 const h=makeHandler({rpc:{fail:true},dbRows:{blocks:[indexed],transactions:[tx]}});
 const res=await h.request("/live?chain=bnb&limit=8");
 assert.equal(res.status,200);
 assert.equal(res.data.source,"indexed_snapshot");
 assert.equal(res.data.reason,"rpc_unavailable");
 assert.equal(res.data.blocks[0].height,127281003);
 assert.equal(h.rpcCalls.length,3,"all available public BNB RPC providers should be attempted");
});

await scenario("On-demand BNB tx includes receipt-verified status and exact wei fee",async()=>{
 const h=makeHandler({rpc:{eth_getTransactionByHash:exampleTx,eth_getTransactionReceipt:receipt}});
 const res=await h.request("/tx?chain=bnb&hash="+receiptHash);
 assert.equal(res.status,200);
 assert.equal(res.data.source,"rpc_live");
 assert.equal(res.data.status,"success");
 assert.equal(res.data.fee_native,"21000000000000");
 assert.equal(res.data.sender,addressFrom);
 assert.equal(res.data.block_height,Number(BigInt(block.number)));
});

await scenario("A real BNB hash seen in a live block opens even when all by-hash RPCs return null",async()=>{
 const h=makeHandler({rpc:{
  eth_getTransactionByHash:null,
  eth_getBlockByNumber:block,
  eth_getTransactionReceipt:null
 }});
 const height=Number(BigInt(block.number));
 const res=await h.request("/tx?chain=bnb&hash="+receiptHash+"&height="+height);
 assert.equal(res.status,200);
 assert.equal(res.data.source,"rpc_block_verified");
 assert.equal(res.data.coverage,"on_demand_block");
 assert.equal(res.data.tx_hash,receiptHash);
 assert.equal(res.data.block_height,height);
 assert.equal(res.data.sender,addressFrom);
 assert.equal(res.data.recipient,addressTo);
 assert.equal(res.data.status,null,"Unverified receipt must not imply success");
 assert.equal(res.data.fee_native,null,"Never invent a fee");
 assert.equal(h.rpcCalls.filter(x=>x.method==="eth_getTransactionByHash").length,3);
 assert.equal(h.rpcCalls.filter(x=>x.method==="eth_getBlockByNumber").length,1);
});
await scenario("Wrong hash cannot be passed off as a real transaction from a supplied height",async()=>{
 const fakeHash="0x"+"7".repeat(64);
 const h=makeHandler({rpc:{eth_getTransactionByHash:null,eth_getBlockByNumber:block}});
 const res=await h.request("/tx?chain=bnb&hash="+fakeHash+"&height="+Number(BigInt(block.number)));
 assert.equal(res.status,404);
 assert.equal(res.data.reason,"not_verified");
});
await scenario("A missing by-hash lookup without a height is honestly unverified",async()=>{
 const h=makeHandler({rpc:{eth_getTransactionByHash:null}});
 const res=await h.request("/tx?chain=bnb&hash="+receiptHash);
 assert.equal(res.status,404);
 assert.equal(res.data.reason,"not_verified");
});
await scenario("RPC outages are not mistaken for a hash not existing on chain",async()=>{
 const h=makeHandler({rpc:{fail:true}});
 const res=await h.request("/tx?chain=bnb&hash="+receiptHash+"&height="+Number(BigInt(block.number)));
 assert.equal(res.status,503);
 assert.equal(res.data.reason,"rpc_unavailable");
});
await scenario("Malformed observed block hint is rejected",async()=>{
 const h=makeHandler({rpc:{}});
 const res=await h.request("/tx?chain=bnb&hash="+receiptHash+"&height=bad");
 assert.equal(res.status,400);
 assert.equal(h.rpcCalls.length,0);
});
await scenario("A matching receipt on the canonical observed block verifies status and exact fee",async()=>{
 const h=makeHandler({rpc:{
  eth_getTransactionByHash:null,eth_getBlockByNumber:block,eth_getTransactionReceipt:receipt
 }});
 const res=await h.request("/tx?chain=bnb&hash="+receiptHash+"&height="+Number(BigInt(block.number)));
 assert.equal(res.status,200);
 assert.equal(res.data.status,"success");
 assert.equal(res.data.fee_native,"21000000000000");
});

await scenario("Invalid hash is rejected before any upstream call",async()=>{
 const h=makeHandler({rpc:{eth_getTransactionByHash:exampleTx}});
 const res=await h.request("/tx?chain=bnb&hash=not-a-hash");
 assert.equal(res.status,400);
 assert.equal(h.rpcCalls.length,0);
});

await scenario("On-demand BNB block opens even before Neon indexes it",async()=>{
 const h=makeHandler({rpc:{eth_getBlockByNumber:block}});
 const res=await h.request("/block?chain=bnb&height="+Number(BigInt(block.number)));
 assert.equal(res.status,200);
 assert.equal(res.data.source,"rpc_live");
 assert.equal(res.data.height,Number(BigInt(block.number)));
});

await scenario("Solana uses finalized slot and real block signatures",async()=>{
 const h=makeHandler({rpc:{getSlot:123456,getBlocks:[123454,123455],getBlock:solBlock}});
 const res=await h.request("/live?chain=solana&limit=8");
 assert.equal(res.status,200);
 assert.equal(res.data.source,"rpc_live");
 assert.equal(res.data.blocks[0].height,123455);
 assert.equal(res.data.transactions[0].tx_hash,solSignature);
 assert.equal(res.data.transactions[0].status,null);
 assert.deepEqual(h.rpcCalls.map(x=>x.method),["getSlot","getBlocks","getBlock"]);
});

await scenario("Solana on-demand tx verifies fee and status",async()=>{
 const h=makeHandler({rpc:{getTransaction:{slot:123455,meta:{err:null,fee:5000},
  transaction:{message:{accountKeys:["Payer11111111111111111111111111111111"]}}
 }}});
 const res=await h.request("/tx?chain=solana&hash="+solSignature);
 assert.equal(res.status,200);
 assert.equal(res.data.source,"rpc_live");
 assert.equal(res.data.status,"success");
 assert.equal(res.data.fee_native,"5000");
});


await scenario("BNB RPC returns real value, timestamp, gas, method and nonce",async()=>{
 const tx={...exampleTx,blockHash:block.hash,value:"0x2386f26fc10000",
  gas:"0x186a0",nonce:"0x3",transactionIndex:"0x2",input:"0xa9059cbb"};
 const h=makeHandler({rpc:{eth_getTransactionByHash:tx,
  eth_getTransactionReceipt:{...receipt,blockHash:block.hash},
  eth_getBlockByNumber:block}});
 const res=await h.request("/tx?chain=bnb&hash="+receiptHash);
 assert.equal(res.data.native_value_wei,"10000000000000000");
 assert.equal(res.data.gas_used,"21000");
 assert.equal(res.data.gas_price_wei,"1000000000");
 assert.equal(res.data.method_id,"0xa9059cbb");
 assert.equal(res.data.nonce,3);
 assert.equal(res.data.block_time,new Date(Number(BigInt(block.timestamp))*1000).toISOString());
});
await scenario("Missing value and mismatched receipt leave fields unverified",async()=>{
 const tx={...exampleTx,blockHash:block.hash,value:undefined};
 const mismatch={...receipt,blockHash:"0x"+"9".repeat(64)};
 const h=makeHandler({rpc:{eth_getTransactionByHash:tx,
  eth_getTransactionReceipt:mismatch,eth_getBlockByNumber:{...block,hash:mismatch.blockHash}}});
 const res=await h.request("/tx?chain=bnb&hash="+receiptHash);
 assert.equal(res.data.status,null);
 assert.equal(res.data.gas_used,null);
 assert.equal(res.data.block_time,null);
 assert.equal(res.data.native_value_wei,null);
});
await scenario("Invalid BNB/Solana hash address and limits avoid RPC",async()=>{
 const h=makeHandler({rpc:{}});
 for(const url of [
  "/tx?chain=solana&hash=invalid",
  "/address?chain=bnb&address=0x123",
  "/address?chain=solana&address=invalid***",
  "/block?chain=bnb&height=999999999999999999",
  "/live?chain=bnb&limit=9999",
  "/transactions?chain=bnb&limit=-1"
 ])assert.equal((await h.request(url)).status,400,url);
 assert.equal(h.rpcCalls.length,0);
});


await scenario("Reject invalid wallet addresses and tampered pagination cursors",async()=>{
 const h=makeHandler({rpc:{}});
 for(const path of [
  "/address?chain=bnb&address=not-wallet",
  "/balance?chain=solana&address=invalid!",
  "/address?chain=bnb&address="+addressFrom+"&before_height=42",
  "/address?chain=bnb&address="+addressFrom+"&before_height=42&before_hash=bad"
 ])assert.equal((await h.request(path)).status,400,path);
 assert.equal(h.rpcCalls.length,0);
 assert.equal(h.queries.length,0);
});
await scenario("Current BNB balance uses exact RPC wei and never infers indexed totals",async()=>{
 const h=makeHandler({rpc:{eth_getBalance:"0xde0b6b3a7640000"}});
 const r=await h.request("/balance?chain=bnb&address="+addressFrom);
 assert.equal(r.status,200);
 assert.equal(r.data.native_balance,"1000000000000000000");
 assert.equal(r.data.native_unit,"BNB");
 assert.equal(r.data.coverage,"current_native_balance_only");
});
await scenario("Current SOL balance comes from confirmed RPC lamports",async()=>{
 const h=makeHandler({rpc:{getBalance:{context:{slot:123},value:10000000}}});
 const r=await h.request("/balance?chain=solana&address="+solSignature.slice(0,44));
 assert.equal(r.status,200);
 assert.equal(r.data.native_balance,"10000000");
 assert.equal(r.data.native_unit,"SOL");
});
await scenario("Balance RPC outage does not fabricate a zero balance",async()=>{
 const h=makeHandler({rpc:{fail:true}});
 const r=await h.request("/balance?chain=bnb&address="+addressFrom);
 assert.equal(r.status,503);
 assert.equal(r.data.reason,"rpc_unavailable");
});
await scenario("Indexed address cursor remains stable across same-height transactions",async()=>{
 const rows=Array.from({length:3},(_,i)=>({chain:"bnb",
  tx_hash:"0x"+String(i+1).padStart(64,"0"),block_height:100-i,
  sender:addressFrom,recipient:addressTo}));
 const h=makeHandler({rpc:{},dbRows:{transactions:rows}});
 const p=await h.request("/address?chain=bnb&address="+addressFrom+"&limit=2");
 assert.equal(p.status,200);
 assert.equal(p.data.transactions.length,2);
 assert.equal(p.data.has_more,true);
 assert.equal(p.data.coverage,"indexed_only");
 assert.equal(p.data.next_cursor.before_height,99);
 const q=await h.request("/address?chain=bnb&address="+addressFrom+
  "&limit=2&before_height=99&before_hash="+rows[1].tx_hash);
 assert.equal(q.status,200);
 const sql=h.queries.at(-1);
 assert(sql.sql.includes("block_height<$3"));
 assert(sql.sql.includes("lower(tx_hash)<$4"));
 assert.equal(sql.args[4],3);
});

console.log("BEXENTRA live API:",passed,"scenarios passed");
