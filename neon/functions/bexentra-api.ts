import pg from "pg";
const { Pool } = pg;
let pool;
function db(){if(!pool){const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is not configured");pool=new Pool({connectionString:url,ssl:{rejectUnauthorized:false},max:2})}return pool}
const cors={"Access-Control-Allow-Origin":"https://elbapplbilal-lgtm.github.io","Access-Control-Allow-Methods":"GET,OPTIONS","Access-Control-Allow-Headers":"Content-Type","Cache-Control":"public, max-age=10","Content-Type":"application/json; charset=utf-8"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
const chains=new Set(["bnb","solana"]);
export default async function handler(req){
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="GET")return json({error:"Method not allowed"},405);
 try{
  const u=new URL(req.url), chain=u.searchParams.get("chain")||"bnb";
  if(!chains.has(chain))return json({error:"Unsupported chain"},400);
  const limit=Math.min(50,Math.max(1,Number(u.searchParams.get("limit"))||8));
  if(u.pathname.endsWith("/health")){await db().query("SELECT 1");return json({ok:true,service:"bexentra-public-api"})}
  if(u.pathname.endsWith("/blocks")){const r=await db().query("SELECT chain,height,block_hash,block_time,transaction_count,indexed_at FROM indexed_blocks WHERE chain=$1 ORDER BY height DESC LIMIT $2",[chain,limit]);return json({chain,blocks:r.rows})}
  if(u.pathname.endsWith("/transactions")){const r=await db().query("SELECT chain,tx_hash,block_height,sender,recipient,status,fee_native,indexed_at FROM indexed_transactions WHERE chain=$1 ORDER BY block_height DESC LIMIT $2",[chain,limit]);return json({chain,transactions:r.rows})}
  if(u.pathname.endsWith("/tx")){const hash=u.searchParams.get("hash")||"";if(!hash||hash.length>128)return json({error:"Invalid hash"},400);const r=await db().query("SELECT * FROM indexed_transactions WHERE chain=$1 AND tx_hash=$2",[chain,hash]);return json(r.rows[0]||{error:"Not indexed"},r.rowCount?200:404)}
  if(u.pathname.endsWith("/block")){const height=u.searchParams.get("height")||"";if(!/^\\d+$/.test(height))return json({error:"Invalid height"},400);const r=await db().query("SELECT * FROM indexed_blocks WHERE chain=$1 AND height=$2",[chain,height]);return json(r.rows[0]||{error:"Not indexed"},r.rowCount?200:404)}
  if(u.pathname.endsWith("/address")){
   let address=u.searchParams.get("address")||"";
   if(!address||address.length>128)return json({error:"Invalid address"},400);
   if(chain==="bnb"&&!address.startsWith("0x")&&/^[a-fA-F0-9]{40}$/.test(address))address="0x"+address;
   const sql=chain==="bnb"
    ?"SELECT chain,tx_hash,block_height,sender,recipient,status,fee_native,indexed_at FROM indexed_transactions WHERE chain=$1 AND (lower(sender)=lower($2) OR lower(recipient)=lower($2)) ORDER BY block_height DESC LIMIT $3"
    :"SELECT chain,tx_hash,block_height,sender,recipient,status,fee_native,indexed_at FROM indexed_transactions WHERE chain=$1 AND (sender=$2 OR recipient=$2) ORDER BY block_height DESC LIMIT $3";
   const r=await db().query(sql,[chain,address,limit]);
   return json({chain,address,transactions:r.rows});
  }
  return json({error:"Not found"},404);
 }catch(e){console.error(e);return json({error:"Service unavailable"},503)}
}