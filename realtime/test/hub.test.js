import test from "node:test";
import assert from "node:assert/strict";
import {RealtimeHub} from "../src/hub.js";

const bnbHash="0x"+"a".repeat(64);
const solHash="3".repeat(88);

test("A real BNB transaction appears in live snapshots, without invented receipt data",()=>{
 const hub=new RealtimeHub({history:12,shown:5});
 hub.connected("bnb");
 hub.setBlock("bnb",{height:123,hash:"0x"+"b".repeat(64),
  blockTime:"2026-10-13T00:00:00Z",transactionCount:2});
 assert.equal(hub.observe("bnb",{tx_hash:bnbHash,block_height:123}),true);
 const value=hub.snapshot("bnb",{consume:true});
 assert.equal(value.source,"ws_live");
 assert.equal(value.blocks[0].height,123);
 assert.equal(value.transactions[0].tx_hash,bnbHash);
 assert.equal(value.transactions[0].fee_native,null);
 assert.equal(value.transactions[0].status,null);
 assert.equal(value.observed_since_last_tick,1);
 assert.equal(hub.snapshot("bnb").observed_since_last_tick,0);
});

test("Solana confirmed logs can carry a real execution result, not a made-up fee",()=>{
 const hub=new RealtimeHub();
 hub.connected("solana");
 assert.equal(hub.observe("solana",{tx_hash:solHash,block_height:456,status:"failed"}),true);
 const event=hub.snapshot("solana").transactions[0];
 assert.equal(event.status,"failed");
 assert.equal(event.fee_native,null);
 assert.equal(event.block_height,456);
 assert.equal(event.source,"ws_live");
});

test("Re-sent notifications dedupe even across mixed-case BNB hashes",()=>{
 const hub=new RealtimeHub();
 assert.equal(hub.observe("bnb",{tx_hash:bnbHash,block_height:1}),true);
 assert.equal(hub.observe("bnb",{tx_hash:bnbHash.toUpperCase().replace("0X","0x"),block_height:1}),false);
 assert.equal(hub.snapshot("bnb").transactions.length,1);
});

test("Invalid hashes and heights are not presented as transactions",()=>{
 const hub=new RealtimeHub();
 assert.equal(hub.observe("bnb",{tx_hash:"0x12",block_height:1}),false);
 assert.equal(hub.observe("solana",{tx_hash:"not-a-solana-tx",block_height:1}),false);
 assert.equal(hub.setBlock("bnb",{height:-2}),false);
 assert.equal(hub.snapshot("bnb").transactions.length,0);
});

test("When upstream disconnects the snapshot explicitly says stream_offline",()=>{
 const hub=new RealtimeHub();
 hub.connected("bnb");
 hub.observe("bnb",{tx_hash:bnbHash,block_height:1});
 hub.disconnected("bnb","network offline");
 const result=hub.snapshot("bnb");
 assert.equal(result.source,"stream_offline");
 assert.equal(result.stream_connected,false);
 assert.equal(result.last_error,"network offline");
});

test("History is bounded and reports how many visible samples were evicted",()=>{
 const hub=new RealtimeHub({history:12,shown:4});
 for(let i=0;i<25;i++)hub.observe("bnb",{
  tx_hash:"0x"+BigInt(i+1).toString(16).padStart(64,"0"),block_height:100
 });
 const result=hub.snapshot("bnb");
 assert.equal(result.transactions.length,4);
 assert.equal(result.observed_since_start,25);
 assert.equal(result.dropped_from_memory,13);
});
