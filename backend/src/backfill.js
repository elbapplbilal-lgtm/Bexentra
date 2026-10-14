import {db,rpc,safeNumber} from "./common.js";
import {historicalRange,safeBlockTxs} from "./backfill-helpers.js";
// Bounded, idempotent historical expansion. Does not advance the live indexer cursor,
// overwrite receipt-verified statuses, or claim full-history coverage.
const LIMIT_BNB=Math.min(12,Math.max(1,Number(process.env.BACKFILL_BNB_BLOCKS)||6));
const LIMIT_SOL=Math.min(8,Math.max(1,Number(process.env.BACKFILL_SOL_BLOCKS)||3));
const pause=ms=>new Promise(ok=>setTimeout(ok,ms));
const isSafe=x=>Number.isSafeInteger(x)&&x>=0;
async function fetchOld(chain,height){
 if(chain==="bnb"){
  const block=await rpc("bnb","eth_getBlockByNumber",["0x"+height.toString(16),true]);
  if(!block||safeNumber(block.number)!==height||!/^0x[0-9a-fA-F]{64}$/.test(block.hash||"")||
     !Array.isArray(block.transactions))throw Error("BNB verified block unavailable");
  const seconds=safeNumber(block.timestamp);
  return {hash:block.hash,time:isSafe(seconds)?new Date(seconds*1000):null,
   txs:safeBlockTxs(block.transactions,"bnb")};
 }
 const block=await rpc("solana","getBlock",[height,{
  encoding:"json",transactionDetails:"signatures",rewards:false,
  maxSupportedTransactionVersion:0,commitment:"finalized"
 }]);
 // Null from a finalized slot can indicate an intentionally skipped Solana slot.
 if(block===null)return {skipped:true,hash:null,time:null,txs:[]};
 if(!block||!Array.isArray(block.signatures)||!block.blockhash)throw Error("Solana block missing");
 const seconds=block.blockTime==null?null:Number(block.blockTime);
 return {hash:block.blockhash,time:isSafe(seconds)?new Date(seconds*1000):null,
  txs:safeBlockTxs(block.signatures,"solana")};
}
async function persist(chain,height,data){
 const client=await db.connect();
 try{
  await client.query("BEGIN");
  await client.query(`INSERT INTO indexed_blocks(chain,height,block_hash,block_time,transaction_count)
   VALUES($1,$2,$3,$4,$5) ON CONFLICT(chain,height) DO NOTHING`,
   [chain,height,data.hash,data.time,data.txs.length]);
  if(data.txs.length){
   await client.query(`INSERT INTO indexed_transactions(chain,tx_hash,block_height,sender,recipient)
    SELECT $1,t.hash,$2,t.sender,t.recipient FROM
    jsonb_to_recordset($3::jsonb) AS t(hash text,sender text,recipient text)
    ON CONFLICT(chain,tx_hash) DO NOTHING`,
    [chain,height,JSON.stringify(data.txs)]);
  }
  await client.query("COMMIT");
 }catch(e){await client.query("ROLLBACK");throw e}
 finally{client.release()}
}
async function expand(chain,count){
 const result=await db.query("SELECT MIN(height) AS oldest FROM indexed_blocks WHERE chain=$1",[chain]);
 const earliest=result.rows[0]?.oldest;
 const heights=historicalRange(earliest,count);
 if(!heights.length){console.log("BACKFILL",chain,"no existing historical anchor; skipped");return}
 let saved=0;
 for(const height of heights){
  try{
   const block=await fetchOld(chain,height);
   await persist(chain,height,block);
   saved++;
   await pause(300);
  }catch(e){console.warn("BACKFILL",chain,"stopped at",height,"RPC or DB unavailable:",e.message);break}
 }
 console.log("BACKFILL",chain,"stored or skipped",saved,"of",heights.length,"older blocks; partial history only");
}
if(!process.env.DATABASE_URL)throw Error("DATABASE_URL required");
try{
 await expand("bnb",LIMIT_BNB);
 if(process.env.SOLANA_RPC_URL)await expand("solana",LIMIT_SOL);
 else console.log("BACKFILL solana skipped: dedicated SOLANA_RPC_URL not configured");
}finally{await db.end()}
