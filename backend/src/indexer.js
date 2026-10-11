import {db,rpc,safeNumber} from "./common.js";

const idlePoll=Math.max(1000,Number(process.env.INDEXER_IDLE_MS||3000));
const activeDelay=Math.max(0,Number(process.env.INDEXER_ACTIVE_MS||100));
const batchSize=Math.min(24,Math.max(1,Number(process.env.INDEXER_BATCH_SIZE||8)));
const maxBacklog=Math.max(batchSize,Number(process.env.INDEXER_MAX_BACKLOG||400));

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function state(chain,tip){
 const res=await db.query("SELECT last_height FROM indexer_state WHERE chain=$1",[chain]);
 if(res.rowCount)return Number(res.rows[0].last_height);
 const override=process.env[chain==="bnb"?"INDEXER_START_BNB":"INDEXER_START_SOLANA"];
 return override!==undefined&&override!==""?Number(override)-1:tip-1;
}

async function moveCursor(chain,height){
 await db.query(
  "INSERT INTO indexer_state(chain,last_height) VALUES($1,$2) ON CONFLICT(chain) DO UPDATE SET last_height=EXCLUDED.last_height,updated_at=NOW()",
  [chain,height]
 );
}

async function persist(chain,height,hash,time,txHashes){
 const hashes=Array.isArray(txHashes)?txHashes.filter(Boolean):[];
 const client=await db.connect();
 try{
  await client.query("BEGIN");
  await client.query(
   "INSERT INTO indexed_blocks(chain,height,block_hash,block_time,transaction_count) VALUES($1,$2,$3,$4,$5) ON CONFLICT(chain,height) DO UPDATE SET block_hash=EXCLUDED.block_hash,block_time=EXCLUDED.block_time,transaction_count=EXCLUDED.transaction_count,indexed_at=NOW()",
   [chain,height,hash,time,txs.length]
  );
  if(txs.length){
   await client.query(
    "INSERT INTO indexed_transactions(chain,tx_hash,block_height,sender,recipient) SELECT $1,x.hash,$2,x.sender,x.recipient FROM jsonb_to_recordset($3::jsonb) AS x(hash text,sender text,recipient text) ON CONFLICT(chain,tx_hash) DO UPDATE SET block_height=EXCLUDED.block_height,sender=COALESCE(EXCLUDED.sender,indexed_transactions.sender),recipient=COALESCE(EXCLUDED.recipient,indexed_transactions.recipient),indexed_at=NOW()",
    [chain,height,JSON.stringify(txs)]
   );
  }
  await client.query(
   "INSERT INTO indexer_state(chain,last_height) VALUES($1,$2) ON CONFLICT(chain) DO UPDATE SET last_height=EXCLUDED.last_height,updated_at=NOW()",
   [chain,height]
  );
  await client.query("COMMIT");
 }catch(error){
  await client.query("ROLLBACK");
  throw error;
 }finally{
  client.release();
 }
}

async function fetchBnbBlock(height){
 const b=await rpc("bnb","eth_getBlockByNumber",["0x"+height.toString(16),true]);
 if(!b)throw Error("BNB block unavailable");
 return {
  height,
  hash:b.hash,
  time:new Date(safeNumber(b.timestamp)*1000),
  transactions:Array.isArray(b.transactions)?b.transactions.map(tx=>({hash:tx.hash,sender:tx.from||null,recipient:tx.to||null})):[]
 };
}

async function fetchSolanaBlock(slot){
 const b=await rpc("solana","getBlock",[slot,{
  encoding:"json",
  transactionDetails:"signatures",
  rewards:false,
  maxSupportedTransactionVersion:0,
  commitment:"finalized"
 }]);
 if(!b)return {height:slot,hash:null,time:null,txHashes:[]};
 return {
  height:slot,
  hash:b.blockhash,
  time:b.blockTime?new Date(b.blockTime*1000):null,
  transactions:Array.isArray(b.signatures)?b.signatures.map(hash=>({hash,sender:null,recipient:null})):[]
 };
}

async function tipFor(chain){
 return chain==="bnb"
  ? safeNumber(await rpc("bnb","eth_blockNumber"))-3
  : await rpc("solana","getSlot",[{commitment:"finalized"}]);
}

async function cycleBatch(chain){
 const tip=await tipFor(chain);
 let previous=await state(chain,tip);

 // BEXENTRA is an incremental live index, not a full archive. If a runner was
 // offline for a long time, skip the old backlog so the public explorer can
 // return close to the network tip quickly instead of remaining hours behind.
 if(tip-previous>maxBacklog){
  previous=tip-maxBacklog;
  await moveCursor(chain,previous);
  console.log(chain,"fast-forwarded cursor to",previous,"tip",tip);
 }

 const start=previous+1;
 if(start>tip)return 0;
 const end=Math.min(tip,start+batchSize-1);
 const heights=Array.from({length:end-start+1},(_,i)=>start+i);
 const fetcher=chain==="bnb"?fetchBnbBlock:fetchSolanaBlock;
 const fetched=await Promise.all(heights.map(fetcher));

 // Persist in order so indexer_state is always a contiguous cursor.
 for(const block of fetched){
  await persist(chain,block.height,block.hash,block.time,block.transactions);
 }
 console.log(chain,"indexed",start,"..",end,"tip",tip);
 return fetched.length;
}

if(!process.env.DATABASE_URL)throw Error("DATABASE_URL required");

let stopped=false;
process.on("SIGTERM",()=>{stopped=true});
process.on("SIGINT",()=>{stopped=true});

while(!stopped){
 let work=0;
 for(const chain of ["bnb","solana"]){
  try{work+=await cycleBatch(chain)}
  catch(error){console.error(chain,error.message)}
 }
 await sleep(work?activeDelay:idlePoll);
}

await db.end();
