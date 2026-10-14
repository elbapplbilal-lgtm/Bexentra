/* Incremental historical backfill, read-only chain data.
   Extends the OLDEST indexed edge, never advances the live indexer cursor,
   never fabricates skipped slots, and never overwrites existing records. */
import {db,rpc,safeNumber} from "./common.js";
import {selectPreviousSlots,boundedBackfillLimit} from "./gap-planner.js";

const LIMIT=boundedBackfillLimit(process.env.BACKFILL_BLOCK_LIMIT);
const PAUSE_MS=550, MAX_MS=85000;
const until=Date.now()+MAX_MS;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hexNum=x=>{try{const n=safeNumber(x);return Number.isSafeInteger(n)&&n>=0?n:null}catch{return null}};
const HASH=/^0x[0-9a-fA-F]{64}$/;
const stopped=()=>Date.now()>=until;
async function oldest(chain){
 const r=await db.query("SELECT MIN(height) AS oldest FROM indexed_blocks WHERE chain=$1 AND block_hash IS NOT NULL",[chain]);
 const n=Number(r.rows[0]?.oldest);
 return Number.isSafeInteger(n)&&n>1?n:null;
}
async function persist(chain,height,hash,time,txs){
 if(!Number.isSafeInteger(height)||height<1||typeof hash!=="string"||!hash)return false;
 const client=await db.connect();
 try{
  await client.query("BEGIN");
  await client.query(`INSERT INTO indexed_blocks(chain,height,block_hash,block_time,transaction_count)
   VALUES($1,$2,$3,$4,$5) ON CONFLICT(chain,height) DO NOTHING`,
   [chain,height,hash,time,txs.length]);
  if(txs.length)await client.query(`INSERT INTO indexed_transactions(chain,tx_hash,block_height,sender,recipient)
   SELECT $1,x.hash,$2,x.sender,x.recipient
   FROM jsonb_to_recordset($3::jsonb) AS x(hash text,sender text,recipient text)
   ON CONFLICT(chain,tx_hash) DO NOTHING`,[chain,height,JSON.stringify(txs)]);
  await client.query("COMMIT");return true;
 }catch(e){await client.query("ROLLBACK");throw e}
 finally{client.release()}
}
async function bnb(height){
 const number="0x"+height.toString(16);
 let block;
 try{block=await rpc("bnb","eth_getBlockByNumber",[number,true])}
 catch{block=await rpc("bnb","eth_getBlockByNumber",[number,false])}
 if(!block||hexNum(block.number)!==height||!HASH.test(block.hash||"")
  ||!Array.isArray(block.transactions))throw Error("Block unavailable or mismatched");
 const time=hexNum(block.timestamp),when=time&&time<1e11?new Date(time*1000):null;
 const txs=block.transactions.map(item=>typeof item==="string"
  ?{hash:item,sender:null,recipient:null}
  :{hash:item?.hash,sender:item?.from||null,recipient:item?.to||null})
  .filter(item=>HASH.test(item.hash||""));
 if(txs.length!==block.transactions.length)throw Error("Invalid BNB transaction list");
 return persist("bnb",height,block.hash,when,txs);
}
async function solana(slot){
 const block=await rpc("solana","getBlock",[slot,{
  encoding:"json",transactionDetails:"signatures",rewards:false,
  maxSupportedTransactionVersion:0,commitment:"finalized"
 }]);
 if(!block||typeof block.blockhash!=="string"||!Array.isArray(block.signatures))
  throw Error("Solana block unavailable");
 const timestamp=hexNum(block.blockTime),when=timestamp&&timestamp<1e11
  ?new Date(timestamp*1000):null;
 const txs=block.signatures.filter(sig=>typeof sig==="string"&&
  /^[1-9A-HJ-NP-Za-km-z]{70,100}$/.test(sig))
  .map(hash=>({hash,sender:null,recipient:null}));
 if(txs.length!==block.signatures.length)throw Error("Invalid Solana signature list");
 return persist("solana",slot,block.blockhash,when,txs);
}
async function runBnb(){
 const edge=await oldest("bnb");
 if(edge===null){console.log("BNB: no known oldest block; skip");return}
 let count=0;
 for(let height=edge-1;height>=Math.max(1,edge-LIMIT)&&!stopped();height--){
  try{if(await bnb(height))count++}
  catch(e){console.warn("BNB backfill paused at",height,String(e?.message||e).slice(0,100));break}
  await sleep(PAUSE_MS);
 }
 console.log("BNB historical blocks added",count,"max",LIMIT);
}
async function runSolana(){
 if(!process.env.SOLANA_RPC_URL){
  console.log("Solana: private archival RPC not configured; skipping optional historical backfill");return
 }
 const edge=await oldest("solana");
 if(edge===null){console.log("Solana: no known oldest slot; skip");return}
 const high=edge-1,low=Math.max(1,high-160);
 let slots;
 try{slots=await rpc("solana","getBlocks",[low,high,{commitment:"finalized"}])}
 catch(e){console.warn("Solana history unavailable",String(e?.message||e).slice(0,100));return}
 const chosen=selectPreviousSlots(slots,edge,LIMIT);
 let count=0;
 for(const slot of chosen){
  if(stopped())break;
  try{if(await solana(slot))count++}
  catch(e){console.warn("Solana backfill paused",slot,String(e?.message||e).slice(0,100));break}
  await sleep(PAUSE_MS);
 }
 console.log("Solana historical slots added",count,"max",LIMIT);
}
if(!process.env.DATABASE_URL)throw Error("DATABASE_URL required");
try{
 await runBnb();
 if(!stopped())await runSolana();
}finally{await db.end()}
