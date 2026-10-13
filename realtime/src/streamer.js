// Mainnet subscriptions stay on the SERVER. Never send RPC credentials to browsers.
// BNB: newHeads -> fetch that precise block's transaction hashes via HTTP RPC.
// Solana: logsSubscribe("all") -> recent non-vote confirmed transaction signatures.
// Both streams can lose events during outages; neither is a full archival index.

const isWs=x=>typeof x==="string"&&/^wss:\/\//i.test(x);
const isHttp=x=>typeof x==="string"&&/^https:\/\//i.test(x);
const integer=x=>{try{const n=Number(BigInt(x));return Number.isSafeInteger(n)&&n>=0?n:null}catch{return null}};
const pause=ms=>new Promise(r=>setTimeout(r,ms));

export class ChainSubscriptions {
 constructor(hub,{env=process.env,Socket=globalThis.WebSocket,httpFetch=globalThis.fetch,
  log=console}={}){
  this.hub=hub;this.env=env;this.Socket=Socket;this.fetch=httpFetch;this.log=log;
  this.closed=false;this.workers=new Map();
  this.bnbQueue=[];this.bnbBusy=false;this.bnbLastQueued=null;
 }
 start(){
  this.connect("bnb",this.env.BNB_WS_URL);
  this.connect("solana",this.env.SOLANA_WS_URL);
 }
 connect(chain,url){
  if(!isWs(url)){
   this.hub.disconnected(chain,"WebSocket URL not configured");
   this.log.warn("Realtime",chain,"paused: configure a private wss:// endpoint");
   return;
  }
  const state={chain,url,socket:null,attempt:0,heartbeat:null,retry:null,
   lastReceived:Date.now(),subscriptionId:null,connectedAt:null};
  this.workers.set(chain,state);
  this.open(state);
 }
 open(state){
  if(this.closed)return;
  const {chain}=state;
  let ws;
  try{ws=new this.Socket(state.url)}catch(e){this.scheduleReconnect(state,String(e?.message||e));return}
  state.socket=ws;
  state.lastReceived=Date.now();
  const opening=setTimeout(()=>{
   if(ws.readyState!==1){try{ws.close()}catch{}}
  },16000);
  const method=chain==="bnb"?"eth_subscribe":"logsSubscribe";
  const params=chain==="bnb"?["newHeads"]:["all",{commitment:"confirmed"}];
  ws.addEventListener("open",()=>{
   if(this.closed)return;
   ws.send(JSON.stringify({jsonrpc:"2.0",id:1,method,params}));
  });
  ws.addEventListener("message",event=>{
   state.lastReceived=Date.now();
   let message;
   try{message=JSON.parse(typeof event.data==="string"?event.data:String(event.data))}
   catch{return}
   if(message.id===1){
    if(message.error||!message.result){
     this.hub.disconnected(chain,"RPC subscription refused");
     this.log.warn("Realtime subscription refused",chain,Number(message.error?.code)||"unknown");
     try{ws.close()}catch{}
     return;
    }
    state.subscriptionId=message.result;
    state.attempt=0;state.connectedAt=Date.now();
    this.hub.connected(chain);
    this.log.log("Realtime subscribed",chain);
    return;
   }
   if(chain==="bnb"&&message.method==="eth_subscription"&&
      message.params?.subscription===state.subscriptionId){
    this.receiveBnbHeader(message.params.result);
   }else if(chain==="solana"&&message.method==="logsNotification"&&
      message.params?.subscription===state.subscriptionId){
    this.receiveSolanaLog(message.params.result);
   }
  });
  ws.addEventListener("error",()=>{/* close triggers reconnect; never log credentials */});
  ws.addEventListener("close",()=>{
   clearTimeout(opening);
   if(state.heartbeat)clearInterval(state.heartbeat);
   state.heartbeat=null;
   state.socket=null;
   this.hub.disconnected(chain,"Upstream WebSocket disconnected");
   this.scheduleReconnect(state,"connection closed");
  });
  // Detect silent half-open connections, even if the provider never sends close.
  state.heartbeat=setInterval(()=>{
   if(this.closed)return;
   if(Date.now()-state.lastReceived>80000){try{ws.close()}catch{}}
  },20000);
 }
 scheduleReconnect(state,reason){
  if(this.closed||state.retry)return;
  this.hub.disconnected(state.chain,reason);
  const wait=Math.min(60000,1000*2**Math.min(6,state.attempt++));
  state.retry=setTimeout(()=>{state.retry=null;this.open(state)},wait);
 }
 receiveBnbHeader(header){
  const height=integer(header?.number);
  const hash=header?.hash;
  if(height===null||typeof hash!=="string"||!/^0x[0-9a-fA-F]{64}$/.test(hash))return;
  // A small ordered queue prevents fan-out into hundreds of simultaneous RPC calls.
  if(this.bnbQueue.some(x=>x.hash===hash))return;
  if(this.bnbQueue.length>=12){
   this.bnbQueue.shift();
   this.hub.get("bnb").last_error="Block samples skipped during RPC backlog";
  }
  this.bnbQueue.push({height,hash});
  this.flushBnb().catch(e=>this.log.warn("BNB ingest delayed",String(e?.message||e).slice(0,80)));
 }
 async callBnb(method,params){
  const endpoint=this.env.BNB_RPC_URL;
  if(!isHttp(endpoint))throw Error("BNB_RPC_URL (https://) not configured");
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try{
   const response=await this.fetch(endpoint,{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({jsonrpc:"2.0",id:1,method,params}),signal:controller.signal
   });
   if(!response.ok)throw Error("BNB RPC HTTP "+response.status);
   const json=await response.json();
   if(json.error)throw Error("BNB RPC error "+String(json.error.code||"unknown"));
   return json.result;
  }finally{clearTimeout(timer)}
 }
 async flushBnb(){
  if(this.bnbBusy||this.closed)return;
  this.bnbBusy=true;
  try{
   while(!this.closed&&this.bnbQueue.length){
    const item=this.bnbQueue.shift();
    let block;
    try{block=await this.callBnb("eth_getBlockByHash",[item.hash,false])}
    catch(e){
     this.hub.get("bnb").last_error=String(e?.message||e).slice(0,100);
     this.log.warn("BNB block RPC failed",String(e?.message||e).slice(0,90));
     await pause(250);
     continue;
    }
    if(!block||!Array.isArray(block.transactions)||
      integer(block.number)!==item.height||String(block.hash).toLowerCase()!==item.hash.toLowerCase())continue;
    const timestamp=integer(block.timestamp);
    this.hub.setBlock("bnb",{height:item.height,hash:item.hash,
     blockTime:timestamp===null?null:new Date(timestamp*1000).toISOString(),
     transactionCount:block.transactions.length});
    for(const hash of block.transactions){
     if(typeof hash==="string")this.hub.observe("bnb",{tx_hash:hash,block_height:item.height});
    }
   }
  }finally{this.bnbBusy=false}
 }
 receiveSolanaLog(payload){
  const slot=integer(payload?.context?.slot);
  const value=payload?.value;
  if(slot===null||!value||typeof value.signature!=="string")return;
  // logsSubscribe(all) excludes vote transactions; do not label as all-chain history.
  this.hub.setBlock("solana",{height:slot,hash:null,blockTime:null,
   transactionCount:null});
  const status=Object.prototype.hasOwnProperty.call(value,"err")
   ?(value.err===null?"success":"failed"):null;
  this.hub.observe("solana",{tx_hash:value.signature,block_height:slot,status});
 }
 stop(){
  this.closed=true;
  for(const worker of this.workers.values()){
   if(worker.retry)clearTimeout(worker.retry);
   if(worker.heartbeat)clearInterval(worker.heartbeat);
   try{worker.socket?.close()}catch{}
  }
  this.bnbQueue.length=0;
 }
}
