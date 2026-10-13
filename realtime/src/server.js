import http from "node:http";
import {RealtimeHub} from "./hub.js";
import {ChainSubscriptions} from "./streamer.js";

const hub=new RealtimeHub({shown:12,history:140});
const sources=new ChainSubscriptions(hub);
const origin=process.env.ALLOWED_ORIGIN||"https://elbapplbilal-lgtm.github.io";
const port=Number(process.env.PORT||10000);
const clients=new Set();
const MAX_CLIENTS=80;

const writeJson=(res,status,data)=>{
 res.writeHead(status,{"content-type":"application/json; charset=utf-8",
  "cache-control":"no-store","access-control-allow-origin":origin,
  "vary":"Origin","x-content-type-options":"nosniff"});
 res.end(JSON.stringify(data));
};

const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url||"/","http://localhost").pathname;
 const params=new URL(req.url||"/","http://localhost").searchParams;
 if(req.method==="OPTIONS"){
  res.writeHead(204,{"access-control-allow-origin":origin,
   "access-control-allow-methods":"GET,OPTIONS","vary":"Origin"});
  res.end();return;
 }
 if(req.method!=="GET"){writeJson(res,405,{error:"GET only"});return}
 if(pathname==="/health"){
  const info=Object.fromEntries(["bnb","solana"].map(chain=>{
   const s=hub.get(chain);
   return [chain,{upstream_connected:s.connected,events_seen:s.total_observed,
    last_event_at:s.last_event_at,last_block:s.last_block?.height??null,
    configured:chain==="bnb"?Boolean(process.env.BNB_WS_URL&&process.env.BNB_RPC_URL):Boolean(process.env.SOLANA_WS_URL)}]
  }));
  writeJson(res,200,{app:"BEXENTRA",type:"realtime-sample",uptime_seconds:Math.round(process.uptime()),
   active_clients:clients.size,chains:info});
  return;
 }
 if(pathname==="/snapshot"){
  const chain=params.get("chain");
  if(chain!=="bnb"&&chain!=="solana"){writeJson(res,400,{error:"Unsupported chain"});return}
  writeJson(res,200,hub.snapshot(chain));
  return;
 }
 if(pathname==="/stream"){
  const chain=params.get("chain");
  if(chain!=="bnb"&&chain!=="solana"){writeJson(res,400,{error:"Unsupported chain"});return}
  if(clients.size>=MAX_CLIENTS){writeJson(res,503,{error:"Streaming service at capacity"});return}
  // Browser CORS protection; no wallet credentials or blockchain API keys leave this service.
  const browserOrigin=req.headers.origin;
  if(browserOrigin&&browserOrigin!==origin){writeJson(res,403,{error:"Origin not allowed"});return}
  res.writeHead(200,{"content-type":"text/event-stream; charset=utf-8",
   "cache-control":"no-cache,no-transform","connection":"keep-alive",
   "x-accel-buffering":"no","access-control-allow-origin":origin,
   "vary":"Origin","x-content-type-options":"nosniff"});
  const client={res,chain};clients.add(client);
  res.write("retry: 2500\n\n");
  const send=(value)=>{
   if(res.destroyed||res.writableEnded)return false;
   if(res.writableLength>120000){res.end();return false}
   res.write("event: snapshot\ndata: "+JSON.stringify(value)+"\n\n");
   return true;
  };
  send(hub.snapshot(chain));
  req.on("close",()=>clients.delete(client));
  res.on("close",()=>clients.delete(client));
  return;
 }
 writeJson(res,404,{error:"Not found",available:["/health","/snapshot?chain=bnb","/stream?chain=bnb"]});
});

const timer=setInterval(()=>{
 // One snapshot per chain per second, shared by ALL connected users.
 const snapshots={bnb:hub.snapshot("bnb",{consume:true}),
  solana:hub.snapshot("solana",{consume:true})};
 for(const client of clients){
  const {res,chain}=client;
  if(res.destroyed||res.writableEnded){clients.delete(client);continue}
  if(res.writableLength>120000){res.end();clients.delete(client);continue}
  try{res.write("event: snapshot\ndata: "+JSON.stringify(snapshots[chain])+"\n\n")}
  catch{clients.delete(client)}
 }
},1000);

server.listen(port,"0.0.0.0",()=>{
 console.log("BEXENTRA realtime listening on port",port);
 sources.start();
});

function shutdown(){
 console.log("BEXENTRA realtime shutting down");
 clearInterval(timer);
 sources.stop();
 for(const client of clients){try{client.res.end()}catch{}}
 server.close(()=>process.exit(0));
 setTimeout(()=>process.exit(0),4500).unref();
}
process.once("SIGTERM",shutdown);
process.once("SIGINT",shutdown);
