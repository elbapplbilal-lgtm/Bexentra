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
  if(u.pathname.endsWith("/tx")){
   const hash=(u.searchParams.get("hash")||"").trim();
   if(!hash||hash.length>128)return json({error:"Invalid hash"},400);
   if(chain==="bnb"&&!/^0x[0-9a-fA-F]{64}$/.test(hash))return json({error:"Invalid BNB transaction hash"},400);
   const normalized=chain==="bnb"?hash.toLowerCase():hash;
   const r=await db().query("SELECT * FROM indexed_transactions WHERE chain=$1 AND "+(chain==="bnb"?"lower(tx_hash)=lower($2)":"tx_hash=$2"),[chain,normalized]);
   if(r.rowCount)return json(r.rows[0]);
   // A BEP-20 Transfer event may be indexed even when the native transaction summary is not.
   // Return only observed on-chain logs, never invent native status, fees, or values.
   if(chain==="bnb"){
    const events=await db().query(
     "SELECT chain,tx_hash,log_index,block_height,token_address,sender,recipient,amount_raw::text AS amount_raw,indexed_at FROM indexed_token_transfers WHERE chain='bnb' AND lower(tx_hash)=lower($1) ORDER BY log_index ASC LIMIT 50",
     [normalized]
    );
    if(events.rowCount){
     return json({chain:"bnb",tx_hash:events.rows[0].tx_hash,block_height:events.rows[0].block_height,
      source:"token_transfers_only",coverage:"indexed_only",status:null,fee_native:null,
      indexed_at:events.rows[0].indexed_at,token_transfers:events.rows});
    }
   }
   return json({error:"Not indexed in BEXENTRA's current coverage"},404);
  }
  if(u.pathname.endsWith("/block")){const height=u.searchParams.get("height")||"";if(!/^\d+$/.test(height))return json({error:"Invalid height"},400);const r=await db().query("SELECT * FROM indexed_blocks WHERE chain=$1 AND height=$2",[chain,height]);return json(r.rows[0]||{error:"Not indexed"},r.rowCount?200:404)}
  // Read-only, indexed BEP-20 Transfer events. This is partial coverage, not full wallet history.
  if(u.pathname.endsWith("/token-transfers")){
   if(chain!=="bnb")return json({error:"BEP-20 transfers are available for BNB Chain only"},400);
   const address=(u.searchParams.get("address")||"").trim();
   if(!/^0x[a-fA-F0-9]{40}$/.test(address))return json({error:"Invalid BNB address"},400);
   const r=await db().query(
    "SELECT chain,tx_hash,log_index,block_height,token_address,sender,recipient,amount_raw::text AS amount_raw,indexed_at FROM indexed_token_transfers WHERE chain='bnb' AND (lower(sender)=lower($1) OR lower(recipient)=lower($1)) ORDER BY block_height DESC,log_index DESC LIMIT $2",
    [address,limit]
   );
   return json({chain,address,transfers:r.rows,coverage:"indexed_only"});
  }
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