import http from "node:http";
import {db} from "./common.js";
const port=Number(process.env.PORT||8080);
const allowed=new Set(["bnb","solana"]);
function reply(res,status,data){res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":"*","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});res.end(JSON.stringify(data))}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,"http://localhost");if(req.method!=="GET")return reply(res,405,{error:"Method not allowed"});
  if(url.pathname==="/health"){await db.query("SELECT 1");return reply(res,200,{ok:true,service:"bexentra-indexer-api"})}
  const chain=url.searchParams.get("chain")||"bnb";if(!allowed.has(chain))return reply(res,400,{error:"Unsupported chain"});
  const limit=Math.min(50,Math.max(1,Number(url.searchParams.get("limit"))||20));
  if(url.pathname==="/api/blocks"){const r=await db.query("SELECT chain,height,block_hash,block_time,transaction_count,indexed_at FROM indexed_blocks WHERE chain=$1 ORDER BY height DESC LIMIT $2",[chain,limit]);return reply(res,200,{chain,blocks:r.rows})}
  if(url.pathname==="/api/transactions"){const r=await db.query("SELECT chain,tx_hash,block_height,sender,recipient,status,fee_native,indexed_at FROM indexed_transactions WHERE chain=$1 ORDER BY block_height DESC LIMIT $2",[chain,limit]);return reply(res,200,{chain,transactions:r.rows})}
  if(url.pathname==="/api/tx"){const hash=url.searchParams.get("hash")||"";if(hash.length>128)return reply(res,400,{error:"Invalid hash"});const r=await db.query("SELECT * FROM indexed_transactions WHERE chain=$1 AND tx_hash=$2",[chain,hash]);return reply(res,r.rowCount?200:404,r.rows[0]||{error:"Not indexed"})}
  if(url.pathname==="/api/status"){const r=await db.query("SELECT chain,last_height,updated_at FROM indexer_state ORDER BY chain");return reply(res,200,{indexers:r.rows})}
  reply(res,404,{error:"Not found"});
 }catch(error){console.error(error);reply(res,503,{error:"Service unavailable"})}
});server.listen(port,"0.0.0.0",()=>console.log("BEXENTRA API listening on",port));
