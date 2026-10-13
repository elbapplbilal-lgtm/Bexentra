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
 const handler=factory(pg,{env:{}},Response,URL,fetch,AbortController,setTimeout,clearTimeout,{error(){},warn(){}});
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
 assert.equal(h.rpcCalls.length,2,"public BNB RPC providers should both be attempted");
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

console.log("BEXENTRA live API:",passed,"scenarios passed");
