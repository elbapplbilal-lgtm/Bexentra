import {db,rpc,safeNumber} from "./common.js";
import {TRANSFER_TOPIC,transferBatches} from "./token-transfer-batch.js";

const delay=Math.max(500,Number(process.env.TOKEN_INDEXER_POLL_MS||2500));
let stopped=false;
let consecutiveFailures=0;
const MAX_RETRY_DELAY_MS=120000;
// SIGTERM from GitHub timeout interrupts backoff/idle sleeps immediately.
const sleepers=new Set();
function sleep(ms){
 return new Promise(resolve=>{
  let timer;
  const complete=()=>{clearTimeout(timer);sleepers.delete(complete);resolve()};
  timer=setTimeout(complete,ms);sleepers.add(complete);
 });
}
function retryDelayMs(){
 return Math.min(MAX_RETRY_DELAY_MS,15000*2**Math.min(consecutiveFailures-1,3));
}
function stop(){stopped=true;for(const wake of [...sleepers])wake()}
process.on("SIGTERM",stop);
process.on("SIGINT",stop);

async function getCursor(tip){
 const r=await db.query("SELECT last_height FROM token_indexer_state WHERE chain='bnb'");
 if(r.rowCount)return Number(r.rows[0].last_height);
 const start=process.env.TOKEN_INDEXER_START_BNB;
 if(start!==undefined&&start!==""){
  const n=Number(start);
  if(!Number.isSafeInteger(n)||n<0)throw Error("Invalid TOKEN_INDEXER_START_BNB");
  return n-1;
 }
 // Initial deployment indexes forward only. Explicit backfill needs a start height.
 return tip-1;
}

async function processBlock(height){
 const hex="0x"+height.toString(16);
 const logs=await rpc("bnb","eth_getLogs",[{fromBlock:hex,toBlock:hex,topics:[TRANSFER_TOPIC]}]);
 if(!Array.isArray(logs))throw Error("Invalid eth_getLogs response");
 const client=await db.connect();
 try{
  await client.query("BEGIN");
  // Bulk write: old code made a network DB round-trip for every Transfer
  // event (hundreds per BNB block). JSONB batches preserve conflict handling
  // while reducing that to one query per <=500 validated events.
  for(const batch of transferBatches(logs)){
   await client.query(`INSERT INTO indexed_token_transfers
    (chain,tx_hash,log_index,block_height,token_address,sender,recipient,amount_raw)
    SELECT 'bnb',x.tx_hash,x.log_index,$2,x.token_address,x.sender,x.recipient,x.amount_raw
    FROM jsonb_to_recordset($1::jsonb)
      AS x(tx_hash text,log_index integer,token_address text,sender text,recipient text,amount_raw text)
    ON CONFLICT(chain,tx_hash,log_index) DO UPDATE SET
      block_height=EXCLUDED.block_height,
      token_address=EXCLUDED.token_address,
      sender=EXCLUDED.sender,
      recipient=EXCLUDED.recipient,
      amount_raw=EXCLUDED.amount_raw,
      indexed_at=NOW()`,[JSON.stringify(batch),height]);
  }
  await client.query(`INSERT INTO token_indexer_state(chain,last_height) VALUES('bnb',$1)
   ON CONFLICT(chain) DO UPDATE SET last_height=EXCLUDED.last_height,updated_at=NOW()`,[height]);
  await client.query("COMMIT");
  console.log("BEP20 indexed block",height,"logs",logs.length);
 }catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
}

if(!process.env.DATABASE_URL)throw Error("DATABASE_URL required");
try{
 while(!stopped){
  try{
   const tip=safeNumber(await rpc("bnb","eth_blockNumber"))-3;
   const last=await getCursor(tip);
   if(last<tip)await processBlock(last+1);
   else await sleep(delay);
   consecutiveFailures=0;
  }catch(e){
   consecutiveFailures++;
   const wait=retryDelayMs();
   console.error("token indexer:",e.message,"— retry in",Math.round(wait/1000),"seconds");
   await sleep(wait);
  }
 }
}finally{await db.end()}
