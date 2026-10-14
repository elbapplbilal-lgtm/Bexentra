import test from "node:test";
import assert from "node:assert/strict";
import {parseTransfer,TRANSFER_TOPIC,transferBatches} from "../src/token-transfer-batch.js";
const addrA="0x"+"a".repeat(40),addrB="0x"+"b".repeat(40);
const topicAddress=a=>"0x"+"0".repeat(24)+a.slice(2);
function log(index=1,amt=100n){
 return {
  address:"0x"+"C".repeat(40),
  transactionHash:"0x"+"F".repeat(64),
  logIndex:"0x"+index.toString(16),
  topics:[TRANSFER_TOPIC,topicAddress(addrA),topicAddress(addrB)],
  data:"0x"+amt.toString(16).padStart(64,"0"),
  removed:false
 };
}
test("parse real ERC-20 Transfer into exact decimal raw units",()=>{
 const row=parseTransfer(log(42,10n**25n+3n));
 assert.deepEqual(row,{
  tx_hash:"0x"+"f".repeat(64),log_index:42,
  token_address:"0x"+"c".repeat(40),
  sender:addrA,recipient:addrB,amount_raw:"10000000000000000000000003"
 });
});
test("reject removed logs, bad topics, malformed amount and bad addresses",()=>{
 assert.equal(parseTransfer({...log(),removed:true}),null);
 assert.equal(parseTransfer({...log(),topics:["0x"+"1".repeat(64),...log().topics.slice(1)]}),null);
 assert.equal(parseTransfer({...log(),data:"0x1"}),null);
 assert.equal(parseTransfer({...log(),transactionHash:"0x1"}),null);
 assert.equal(parseTransfer({...log(),address:"0x0"}),null);
 assert.equal(parseTransfer({...log(),logIndex:"nan"}),null);
 assert.equal(parseTransfer({...log(),logIndex:"0x100000000"}),null);
});
test("batch hundreds of Transfer records into bounded groups",()=>{
 const logs=Array.from({length:1205},(_,i)=>log(i));
 const batches=transferBatches(logs);
 assert.deepEqual(batches.map(x=>x.length),[500,500,205]);
 assert.equal(batches.flat().length,1205);
 assert.equal(batches[0][0].log_index,0);
 assert.equal(batches[2][204].log_index,1204);
});
test("ignore non-transfer events without corrupting valid results",()=>{
 const unrelated={...log(),topics:[TRANSFER_TOPIC]};
 const batches=transferBatches([unrelated,log(3),{...log(),removed:true},log(4)]);
 assert.equal(batches.length,1);
 assert.deepEqual(batches[0].map(x=>x.log_index),[3,4]);
 assert.deepEqual(transferBatches([]),[]);
 assert.deepEqual(transferBatches([unrelated]),[]);
});
test("reject bad batch sizes and invalid RPC responses",()=>{
 assert.throws(()=>transferBatches("not array"));
 assert.throws(()=>transferBatches([],0));
 assert.throws(()=>transferBatches([],5001));
});
