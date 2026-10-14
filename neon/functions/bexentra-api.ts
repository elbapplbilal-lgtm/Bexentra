import pg from "pg";
const { Pool } = pg;
let pool;
function db(){if(!pool){const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is not configured");pool=new Pool({connectionString:url,ssl:{rejectUnauthorized:false},max:2})}return pool}
const cors={"Access-Control-Allow-Origin":"https://elbapplbilal-lgtm.github.io","Access-Control-Allow-Methods":"GET,OPTIONS","Access-Control-Allow-Headers":"Content-Type","Cache-Control":"public, max-age=10","Content-Type":"application/json; charset=utf-8"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
const chains=new Set(["bnb","solana"]);

// Real on-demand blockchain reads. The browser never receives a private RPC URL
// or API key. Cache one small block sample per chain for 8 seconds per instance.
const LIVE_CACHE_MS=8000;
const liveCache=new Map();
const bnbPublic=[
 "https://bsc-dataseed.bnbchain.org",
 "https://bsc-dataseed-public.bnbchain.org",
 "https://bsc-rpc.publicnode.com"
];
const solPublic=["https://api.mainnet-beta.solana.com","https://solana-rpc.publicnode.com"];
const rpcEndpoints=chain=>{
 const configured=chain==="bnb"?process.env.BNB_RPC_URL:process.env.SOLANA_RPC_URL;
 return [...new Set([...(configured?[configured]:[]),...(chain==="bnb"?bnbPublic:solPublic)])];
};
const hexNum=x=>{
 try{
  const n=typeof x==="number"?x:Number(BigInt(x));
  return Number.isSafeInteger(n)&&n>=0?n:null;
 }catch{return null}
};
const isoSeconds=x=>{
 const n=hexNum(x);
 return n!==null&&n>0&&n<1e11?new Date(n*1000).toISOString():null;
};
const BNB_HASH=/^0x[0-9a-fA-F]{64}$/;
const SOL_SIGNATURE=/^[1-9A-HJ-NP-Za-km-z]{70,100}$/;
const BNB_ADDRESS=/^0x[0-9a-fA-F]{40}$/;
const SOL_ADDRESS=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const baseWei=x=>{
 try{return typeof x==="string"&&/^0x[0-9a-fA-F]+$/.test(x)?BigInt(x).toString():null}
 catch{return null}
};
const txInputMethod=x=>typeof x==="string"&&/^0x[0-9a-fA-F]{8}/.test(x)
 ?x.slice(0,10).toLowerCase():null;
const matchingReceipt=(receipt,tx,hash,height)=>
 receipt&&String(receipt.transactionHash||"").toLowerCase()===hash.toLowerCase()&&
 hexNum(receipt.blockNumber)===height&&
 (!tx.blockHash||!receipt.blockHash||String(receipt.blockHash).toLowerCase()===String(tx.blockHash).toLowerCase());
const blockTimestamp=(block,tx,height)=>{
 if(!block||hexNum(block.number)!==height||
   (tx.blockHash&&String(tx.blockHash).toLowerCase()!==String(block.hash||"").toLowerCase()))
   return null;
 return isoSeconds(block.timestamp);
};
const weiAmount=(gas,price)=>{
 try{
  const g=BigInt(gas),p=BigInt(price);
  return g>=0n&&p>=0n?(g*p).toString():null;
 }catch{return null}
};
async function chainRpc(chain,method,params,{retryNull=false}={}){
 let reason,sawNull=false;
 for(const endpoint of rpcEndpoints(chain)){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),6500);
  try{
   const response=await fetch(endpoint,{
    method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},
    body:JSON.stringify({jsonrpc:"2.0",id:1,method,params}),signal:controller.signal
   });
   if(!response.ok)throw Error("RPC HTTP "+response.status);
   const data=await response.json();
   if(data.error)throw Error("RPC code "+String(data.error.code||"unknown"));
   if(!Object.prototype.hasOwnProperty.call(data,"result"))throw Error("RPC missing result");
   // Hash lookups can temporarily return null on a lagging provider.
   // Try other real RPC nodes instead of treating the first null as definitive.
   if(data.result===null&&retryNull){sawNull=true;continue}
   return data.result;
  }catch(e){
   reason=e;
  }finally{clearTimeout(timer)}
 }
 if(sawNull)return null;
 throw Error("Network RPC temporarily unavailable: "+String(reason?.message||"unknown"));
}
function liveBlockRecord(chain,result,height){
 return {
  chain,height,
  block_hash:chain==="bnb"?result.hash:result.blockhash,
  block_time:isoSeconds(chain==="bnb"?result.timestamp:result.blockTime),
  transaction_count:chain==="bnb"
   ?(Array.isArray(result.transactions)?result.transactions.length:0)
   :(Array.isArray(result.signatures)?result.signatures.length:0),
  indexed_at:null,source:"rpc_live"
 };
}
async function rpcBlock(chain,heightOrLatest,includeFull=false){
 if(chain==="bnb"){
  const selector=heightOrLatest==="latest"?"latest":"0x"+Number(heightOrLatest).toString(16);
  const block=await chainRpc("bnb","eth_getBlockByNumber",[selector,includeFull]);
  if(!block||!Array.isArray(block.transactions))return null;
  const height=hexNum(block.number);
  return height===null?null:{block,record:liveBlockRecord("bnb",block,height)};
 }
 const slot=Number(heightOrLatest);
 if(!Number.isSafeInteger(slot)||slot<0)return null;
 const block=await chainRpc("solana","getBlock",[slot,{
  encoding:"json",transactionDetails:"signatures",
  rewards:false,maxSupportedTransactionVersion:0,commitment:"finalized"
 }]);
 if(!block||!Array.isArray(block.signatures))return null;
 return {block,record:liveBlockRecord("solana",block,slot)};
}
async function freshLive(chain,limit){
 let current;
 if(chain==="bnb"){
  current=await rpcBlock("bnb","latest",true);
 }else{
  const slot=hexNum(await chainRpc("solana","getSlot",[{commitment:"finalized"}]));
  if(slot===null)throw Error("No finalized slot returned");
  const slots=await chainRpc("solana","getBlocks",[
   Math.max(0,slot-18),slot,{commitment:"finalized"}
  ]);
  if(!Array.isArray(slots)||!slots.length)throw Error("No finalized Solana blocks");
  current=await rpcBlock("solana",slots[slots.length-1]);
 }
 if(!current)throw Error("Recent block not available");
 const {block,record}=current;
 const txs=(chain==="bnb"?block.transactions:block.signatures)
  .slice(-limit).reverse()
  .map(tx=>{
   const hash=chain==="bnb"?(typeof tx==="string"?tx:tx?.hash):tx;
   if(typeof hash!=="string"||!hash)return null;
   return {
    chain,tx_hash:hash,block_height:record.height,
    sender:chain==="bnb"&&typeof tx==="object"?(tx.from||null):null,
    recipient:chain==="bnb"&&typeof tx==="object"?(tx.to||null):null,
    status:null,fee_native:null,indexed_at:null,source:"rpc_live"
   };
  }).filter(Boolean);
 return {chain,source:"rpc_live",coverage:"latest_block_sample",
  observed_at:new Date().toISOString(),blocks:[record],transactions:txs};
}
async function liveSample(chain,limit){
 const key=chain+":"+limit,now=Date.now(),existing=liveCache.get(key);
 if(existing&&existing.until>now)return existing.promise;
 const promise=freshLive(chain,limit);
 liveCache.set(key,{promise,until:now+LIVE_CACHE_MS});
 try{return await promise}catch(e){
  if(liveCache.get(key)?.promise===promise)liveCache.delete(key);
  throw e;
 }
}
async function indexedFallback(chain,limit){
 const [blocks,transactions]=await Promise.all([
  db().query("SELECT chain,height,block_hash,block_time,transaction_count,indexed_at FROM indexed_blocks WHERE chain=$1 ORDER BY height DESC LIMIT $2",[chain,Math.min(limit,3)]),
  db().query("SELECT chain,tx_hash,block_height,sender,recipient,status,fee_native,indexed_at FROM indexed_transactions WHERE chain=$1 ORDER BY block_height DESC LIMIT $2",[chain,limit])
 ]);
 return {chain,source:"indexed_snapshot",reason:"rpc_unavailable",coverage:"indexed_only",
  observed_at:new Date().toISOString(),blocks:blocks.rows,transactions:transactions.rows};
}
async function networkTransaction(chain,hash){
 if(chain==="bnb"){
  const tx=await chainRpc("bnb","eth_getTransactionByHash",[hash],{retryNull:true});
  if(!tx||!BNB_HASH.test(tx.hash||"")||tx.hash.toLowerCase()!==hash.toLowerCase())return null;
  const height=tx.blockNumber===null?null:hexNum(tx.blockNumber);
  if(height===null)return null;
  const receipt=await chainRpc("bnb","eth_getTransactionReceipt",[hash],{retryNull:true}).catch(()=>null);
  const verified=matchingReceipt(receipt,tx,hash,height);
  const status=verified&&receipt.status!==undefined
   ?(hexNum(receipt.status)===1?"success":hexNum(receipt.status)===0?"failed":null):null;
  const fee=verified&&receipt.gasUsed!==undefined&&receipt.effectiveGasPrice!==undefined
   ?weiAmount(receipt.gasUsed,receipt.effectiveGasPrice):null;
  const block=await chainRpc("bnb","eth_getBlockByNumber",["0x"+height.toString(16),false],
   {retryNull:true}).catch(()=>null);
  return {chain,tx_hash:tx.hash,block_height:height,block_time:blockTimestamp(block,tx,height),
   block_hash:BNB_HASH.test(tx.blockHash||"")?tx.blockHash:null,
   sender:BNB_ADDRESS.test(tx.from||"")?tx.from:null,
   recipient:BNB_ADDRESS.test(tx.to||"")?tx.to:null,
   status,fee_native:fee,native_value_wei:baseWei(tx.value),
   gas_used:verified?baseWei(receipt.gasUsed):null,gas_limit:baseWei(tx.gas),
   gas_price_wei:verified?baseWei(receipt.effectiveGasPrice):null,
   method_id:txInputMethod(tx.input),nonce:hexNum(tx.nonce),
   transaction_index:hexNum(tx.transactionIndex),contract_creation:tx.to===null,
   indexed_at:null,source:"rpc_live",coverage:"on_demand"};
 }
 const tx=await chainRpc("solana","getTransaction",[hash,{
  encoding:"json",commitment:"finalized",maxSupportedTransactionVersion:0
 }],{retryNull:true});
 if(!tx)return null;
 const height=hexNum(tx.slot);
 if(height===null||!tx.transaction)return null;
 const status=tx.meta&&Object.prototype.hasOwnProperty.call(tx.meta,"err")
  ?(tx.meta.err===null?"success":"failed"):null;
 const fee=tx.meta?.fee===undefined?null:hexNum(tx.meta.fee);
 const first=tx.transaction?.message?.accountKeys?.[0];
 const sender=typeof first==="string"?first:typeof first?.pubkey==="string"?first.pubkey:null;
 return {chain,tx_hash:hash,block_height:height,block_time:isoSeconds(tx.blockTime),
  compute_units:hexNum(tx.meta?.computeUnitsConsumed),
  sender,recipient:null,status,fee_native:fee===null?null:String(fee),
  indexed_at:null,source:"rpc_live",coverage:"on_demand"};
}
// When a browser opens a hash seen in a live block, it sends the observed height.
// If by-hash lookup isn't available yet, verify the actual transaction INSIDE that
// canonical chain block. Never manufacture a successful status, fee or transfer value.
async function bnbTransactionFromObservedBlock(hash,height){
 const result=await rpcBlock("bnb",height,true);
 if(!result||!result.block||result.record.height!==height)return null;
 const transaction=result.block.transactions.find(item=>
  item&&typeof item==="object"&&typeof item.hash==="string"&&
  item.hash.toLowerCase()===hash.toLowerCase());
 if(!transaction)return null;
 const receipt=await chainRpc("bnb","eth_getTransactionReceipt",[hash],{retryNull:true}).catch(()=>null);
 const verified=receipt&&String(receipt.transactionHash||"").toLowerCase()===hash.toLowerCase()&&
  hexNum(receipt.blockNumber)===height&&
  (!receipt.blockHash||String(receipt.blockHash).toLowerCase()===String(result.block.hash).toLowerCase());
 const status=verified?(hexNum(receipt.status)===1?"success":hexNum(receipt.status)===0?"failed":null):null;
 const fee=verified&&receipt.gasUsed!==undefined&&receipt.effectiveGasPrice!==undefined
  ?weiAmount(receipt.gasUsed,receipt.effectiveGasPrice):null;
 return {
  chain:"bnb",tx_hash:transaction.hash,block_height:height,
  block_hash:result.record.block_hash,block_time:result.record.block_time,
  sender:transaction.from||null,recipient:transaction.to||null,
  status,fee_native:fee,native_value_wei:baseWei(transaction.value),
  gas_used:verified?baseWei(receipt.gasUsed):null,gas_limit:baseWei(transaction.gas),
  gas_price_wei:verified?baseWei(receipt.effectiveGasPrice):null,
  method_id:txInputMethod(transaction.input),nonce:hexNum(transaction.nonce),
  transaction_index:hexNum(transaction.transactionIndex),
  contract_creation:transaction.to===null,
  indexed_at:null,source:"rpc_block_verified",coverage:"on_demand_block"
 };
}
export default async function handler(req){
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="GET")return json({error:"Method not allowed"},405);
 try{
  const u=new URL(req.url), chain=u.searchParams.get("chain")||"bnb";
  if(!chains.has(chain))return json({error:"Unsupported chain"},400);
  const rawLimit=u.searchParams.get("limit");
  if(rawLimit!==null&&(!/^\d{1,3}$/.test(rawLimit)||Number(rawLimit)<1||
     Number(rawLimit)>50))return json({error:"Invalid limit (1-50)"},400);
  const limit=rawLimit===null?8:Number(rawLimit);
  if(u.pathname.endsWith("/health")){await db().query("SELECT 1");return json({ok:true,service:"bexentra-public-api"})}
  if(u.pathname.endsWith("/live")){
   try{return json(await liveSample(chain,limit),200)}
   catch(e){
    console.warn("Live RPC unavailable",chain,String(e?.message||"unknown").slice(0,100));
    const snapshot=await indexedFallback(chain,limit);
    return json(snapshot,200);
   }
  }
  if(u.pathname.endsWith("/blocks")){const r=await db().query("SELECT chain,height,block_hash,block_time,transaction_count,indexed_at FROM indexed_blocks WHERE chain=$1 ORDER BY height DESC LIMIT $2",[chain,limit]);return json({chain,blocks:r.rows})}
  if(u.pathname.endsWith("/transactions")){const r=await db().query("SELECT chain,tx_hash,block_height,sender,recipient,status,fee_native,indexed_at FROM indexed_transactions WHERE chain=$1 ORDER BY block_height DESC LIMIT $2",[chain,limit]);return json({chain,transactions:r.rows})}
  if(u.pathname.endsWith("/tx")){
   const hash=(u.searchParams.get("hash")||"").trim();
   if(!hash||hash.length>128)return json({error:"Invalid hash"},400);
   if(!(chain==="bnb"?BNB_HASH:SOL_SIGNATURE).test(hash))
    return json({error:"Invalid transaction hash for selected chain"},400);
   const normalized=chain==="bnb"?hash.toLowerCase():hash;
   const observedHeightRaw=u.searchParams.get("height");
   if(observedHeightRaw!==null&&(chain!=="bnb"||!/^\d{1,16}$/.test(observedHeightRaw)||
      !Number.isSafeInteger(Number(observedHeightRaw))))return json({error:"Invalid observed block height"},400);
   const observedHeight=observedHeightRaw===null?null:Number(observedHeightRaw);
   const r=await db().query("SELECT * FROM indexed_transactions WHERE chain=$1 AND "+(chain==="bnb"?"lower(tx_hash)=lower($2)":"tx_hash=$2"),[chain,normalized]);
   if(r.rowCount){
    const indexed=r.rows[0];
    // An indexed status/fee must not prevent on-demand enrichment with exact value,
    // gas and block time. On failure, the existing indexed record is returned.
    try{
     const live=await networkTransaction(chain,normalized);
     if(live&&live.block_height===Number(indexed.block_height)){
      return json({...indexed,...live,
       status:live.status??indexed.status,fee_native:live.fee_native??indexed.fee_native,
       sender:live.sender||indexed.sender,recipient:live.recipient||indexed.recipient,
       source:"indexed_plus_rpc"});
     }
    }catch(e){console.warn("On-demand tx data unavailable",chain);}
    return json(indexed);
   }
   let lookupUnavailable=false;
   try{
    const live=await networkTransaction(chain,normalized);
    if(live)return json(live);
   }catch(e){lookupUnavailable=true;console.warn("On-demand network tx unavailable",chain);}
   if(chain==="bnb"&&observedHeight!==null){
    try{
     const inBlock=await bnbTransactionFromObservedBlock(normalized,observedHeight);
     if(inBlock)return json(inBlock);
     // The block was available, but this hash was not present in it.
     lookupUnavailable=false;
    }catch(e){lookupUnavailable=true;console.warn("On-demand observed block lookup unavailable",chain);}
   }

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
   if(lookupUnavailable)return json({error:"Blockchain RPC temporarily unavailable",reason:"rpc_unavailable"},503);
   return json({error:"Transaction not verified on the selected network",reason:"not_verified"},404);
  }
  if(u.pathname.endsWith("/block")){
   const height=u.searchParams.get("height")||"";
   if(!/^\d{1,16}$/.test(height)||!Number.isSafeInteger(Number(height)))return json({error:"Invalid height"},400);
   const r=await db().query("SELECT * FROM indexed_blocks WHERE chain=$1 AND height=$2",[chain,height]);
   if(r.rowCount)return json(r.rows[0]);
   try{
    const live=await rpcBlock(chain,Number(height),false);
    if(live&&live.record.height===Number(height))return json(live.record);
   }catch(e){console.warn("On-demand block unavailable",chain);}
   return json({error:"Block not available in the current index or RPC"},404);
  }
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
  // Current native balance is independent of the partial indexed transaction history.
  if(u.pathname.endsWith("/balance")){
   let address=u.searchParams.get("address")||"";
   if(chain==="bnb"&&!address.startsWith("0x")&&/^[0-9a-fA-F]{40}$/.test(address))address="0x"+address;
   if(!(chain==="bnb"?BNB_ADDRESS:SOL_ADDRESS).test(address))return json({error:"Invalid address"},400);
   try{
    const raw=chain==="bnb"
     ?await chainRpc("bnb","eth_getBalance",[address,"latest"],{retryNull:true})
     :await chainRpc("solana","getBalance",[address,{commitment:"finalized"}],{retryNull:true});
    const value=chain==="bnb"?baseWei(raw):hexNum(raw?.value);
    if(value===null||value===undefined)throw Error("Balance unavailable");
    return json({chain,address,native_balance:String(value),native_unit:chain==="bnb"?"BNB":"SOL",
     observed_at:new Date().toISOString(),source:"rpc_live",coverage:"current_native_balance_only"});
   }catch{return json({error:"Balance RPC unavailable",reason:"rpc_unavailable"},503)}
  }
  // Stable keyset pagination, bounded and explicitly limited to indexed records.
  if(u.pathname.endsWith("/address")){
   let address=u.searchParams.get("address")||"";
   if(chain==="bnb"&&!address.startsWith("0x")&&/^[0-9a-fA-F]{40}$/.test(address))address="0x"+address;
   if(!(chain==="bnb"?BNB_ADDRESS:SOL_ADDRESS).test(address))
    return json({error:"Invalid address for selected chain"},400);
   const height=u.searchParams.get("before_height");
   const hash=u.searchParams.get("before_hash");
   if((height===null)!==(hash===null))return json({error:"Incomplete cursor"},400);
   if(height!==null&&(!/^\d{1,16}$/.test(height)||!Number.isSafeInteger(Number(height))||
      !(chain==="bnb"?BNB_HASH:SOL_SIGNATURE).test(hash||"")))
    return json({error:"Invalid cursor"},400);
   const key=chain==="bnb"?"lower(tx_hash)":"tx_hash";
   const addr=chain==="bnb"?"(lower(sender)=lower($2) OR lower(recipient)=lower($2))"
     :"(sender=$2 OR recipient=$2)";
   const cursor=height!==null;
   const sql="SELECT chain,tx_hash,block_height,sender,recipient,status,fee_native,indexed_at "+
    "FROM indexed_transactions WHERE chain=$1 AND "+addr+" "+
    (cursor?"AND (block_height<$3 OR (block_height=$3 AND "+key+"<$4)) ":"")+
    "ORDER BY block_height DESC, "+key+" DESC LIMIT $"+(cursor?"5":"3");
   const args=cursor?[chain,address,Number(height),chain==="bnb"?hash.toLowerCase():hash,limit+1]
     :[chain,address,limit+1];
   const data=await db().query(sql,args);
   const rows=data.rows.slice(0,limit),hasMore=data.rows.length>limit;
   const last=rows.at(-1);
   return json({chain,address,transactions:rows,coverage:"indexed_only",
     has_more:hasMore,next_cursor:hasMore&&last?{before_height:Number(last.block_height),
      before_hash:last.tx_hash}:null});
  }
  return json({error:"Not found"},404);
 }catch(e){console.error(e);return json({error:"Service unavailable"},503)}
}