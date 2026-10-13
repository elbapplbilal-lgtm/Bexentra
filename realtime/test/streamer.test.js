import test from "node:test";
import assert from "node:assert/strict";
import {RealtimeHub} from "../src/hub.js";
import {ChainSubscriptions} from "../src/streamer.js";

class MockSocket{
 static instances=[];
 constructor(url){this.url=url;this.readyState=0;this.listeners=new Map();this.sent=[];MockSocket.instances.push(this)}
 addEventListener(name,fn){const old=this.listeners.get(name)||[];old.push(fn);this.listeners.set(name,old)}
 emit(name,ev){for(const fn of this.listeners.get(name)||[])fn(ev)}
 open(){this.readyState=1;this.emit("open",{})}
 message(value){this.emit("message",{data:JSON.stringify(value)})}
 send(s){this.sent.push(JSON.parse(s))}
 close(){this.readyState=3;this.emit("close",{})}
}
const bnb="0x"+"a".repeat(64),blockHash="0x"+"b".repeat(64);
const sol="4".repeat(87);
const quiet={warn(){},log(){}};
const env={BNB_WS_URL:"wss://bnb.example",BNB_RPC_URL:"https://bnb.example",
 SOLANA_WS_URL:"wss://sol.example"};

test("BNB newHeads creates only authentic hash rows and full block count",async()=>{
 MockSocket.instances=[];
 const hub=new RealtimeHub(),calls=[];
 const subscriptions=new ChainSubscriptions(hub,{env,Socket:MockSocket,log:quiet,
  httpFetch:async(url,req)=>{
   calls.push({url,request:JSON.parse(req.body)});
   return {ok:true,json:async()=>({result:{number:"0x64",hash:blockHash,
    timestamp:"0x67000000",transactions:[bnb]}})};
  }
 });
 try{
  subscriptions.start();
  assert.equal(MockSocket.instances.length,2);
  const socket=MockSocket.instances[0];
  socket.open();
  assert.equal(socket.sent[0].method,"eth_subscribe");
  assert.deepEqual(socket.sent[0].params,["newHeads"]);
  socket.message({id:1,result:"sub-bnb"});
  socket.message({method:"eth_subscription",params:{
   subscription:"sub-bnb",result:{number:"0x64",hash:blockHash}
  }});
  await new Promise(r=>setTimeout(r,30));
  const snap=hub.snapshot("bnb");
  assert.equal(snap.stream_connected,true);
  assert.equal(snap.blocks[0].height,100);
  assert.equal(snap.transactions[0].tx_hash,bnb);
  assert.equal(snap.transactions[0].status,null);
  assert.equal(calls[0].request.method,"eth_getBlockByHash");
 }finally{subscriptions.stop()}
});

test("Solana logsSubscribe(all) records observed confirmed non-vote signatures",()=>{
 MockSocket.instances=[];
 const hub=new RealtimeHub();
 const subscriptions=new ChainSubscriptions(hub,{env,Socket:MockSocket,log:quiet});
 try{
  subscriptions.start();
  const socket=MockSocket.instances[1];
  socket.open();
  assert.equal(socket.sent[0].method,"logsSubscribe");
  assert.deepEqual(socket.sent[0].params[0],"all");
  socket.message({id:1,result:12});
  socket.message({method:"logsNotification",params:{subscription:12,result:{
   context:{slot:123456},value:{signature:sol,err:null,logs:[]}
  }}});
  const snapshot=hub.snapshot("solana");
  assert.equal(snapshot.transactions.length,1);
  assert.equal(snapshot.blocks[0].height,123456);
  assert.equal(snapshot.transactions[0].status,"success");
  assert.equal(snapshot.transactions[0].fee_native,null);
 }finally{subscriptions.stop()}
});

test("Missing private upstream URL is not disguised as live",()=>{
 MockSocket.instances=[];
 const hub=new RealtimeHub();
 const subscriptions=new ChainSubscriptions(hub,{env:{},Socket:MockSocket,log:quiet});
 subscriptions.start();
 assert.equal(MockSocket.instances.length,0);
 assert.equal(hub.snapshot("bnb").source,"stream_offline");
 assert.equal(hub.snapshot("solana").source,"stream_offline");
 subscriptions.stop();
});
