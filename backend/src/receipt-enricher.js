import {db, rpc} from "./common.js";
import {parseBnbReceipt, parseSolanaTransaction} from "./receipt-utils.js";

// Bounded metadata enrichment, independent from block/token indexers.
// Fees are BASE-UNIT integers (BNB wei / Solana lamports), never estimates.
const clamp=(raw, fallback, max)=>{
 const n=Number(raw);
 return Number.isSafeInteger(n)&&n>=0?Math.min(n,max):fallback;
};
const budgets={
 bnbNew:clamp(process.env.DETAIL_BNB_NEWEST,12,40),
 bnbOld:clamp(process.env.DETAIL_BNB_OLDEST,6,20),
 bnbToken:clamp(process.env.DETAIL_BNB_TOKEN_ONLY,12,40),
 solNew:clamp(process.env.DETAIL_SOL_NEWEST,8,25),
 solOld:clamp(process.env.DETAIL_SOL_OLDEST,4,15)
};
const pauseMs=clamp(process.env.DETAIL_RPC_PAUSE_MS,400,5000);
const deadline=Date.now()+clamp(process.env.DETAIL_RUN_BUDGET_MS,130000,180000);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const canonical=(chain,hash)=>chain==="bnb"?String(hash).toLowerCase():String(hash);
const validHash=(chain,hash)=>chain==="bnb"?/^0x[0-9a-f]{64}$/.test(hash):/^[1-9A-HJ-NP-Za-km-z]{70,100}$/.test(hash);
const validHeight=n=>Number.isSafeInteger(Number(n))&&Number(n)>=0;
let stopping=false;
process.on("SIGTERM",()=>{stopping=true});
process.on("SIGINT",()=>{stopping=true});

async function ensureAttemptTable(){
 await db.query("CREATE TABLE IF NOT EXISTS indexed_tx_detail_attempts ("+
  "chain TEXT NOT NULL CHECK(chain IN ('bnb','solana')),"+
  "tx_hash TEXT NOT NULL,attempt_count INTEGER NOT NULL DEFAULT 0,"+
  "last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),"+
  "next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),"+
  "PRIMARY KEY(chain,tx_hash))");
}
async function indexedCandidates(chain,sort,limit){
 if(!limit)return [];
 const sql="SELECT t.chain,t.tx_hash,t.block_height FROM indexed_transactions t "+
  "LEFT JOIN indexed_tx_detail_attempts a ON a.chain=t.chain "+
  "AND a.tx_hash=(CASE WHEN t.chain='bnb' THEN lower(t.tx_hash) ELSE t.tx_hash END) "+
  "WHERE t.chain=$1 AND (t.status IS NULL OR t.status='indexed' OR t.fee_native IS NULL) "+
  "AND (a.next_retry_at IS NULL OR a.next_retry_at<=NOW()) "+
  "ORDER BY t.block_height "+sort+",t.tx_hash ASC LIMIT $2";
 const r=await db.query(sql,[chain,limit]);
 return r.rows;
}
async function tokenOnlyCandidates(limit){
 if(!limit)return [];
 const sql="SELECT DISTINCT t.tx_hash,t.block_height,'bnb'::text AS chain "+
  "FROM indexed_token_transfers t "+
  "LEFT JOIN indexed_transactions i ON i.chain='bnb' AND lower(i.tx_hash)=lower(t.tx_hash) "+
  "LEFT JOIN indexed_tx_detail_attempts a ON a.chain='bnb' AND a.tx_hash=lower(t.tx_hash) "+
  "WHERE t.chain='bnb' AND i.tx_hash IS NULL "+
  "AND (a.next_retry_at IS NULL OR a.next_retry_at<=NOW()) "+
  "ORDER BY t.block_height DESC,t.tx_hash ASC LIMIT $1";
 const r=await db.query(sql,[limit]);
 return r.rows;
}
async function recordAttempt(client,chain,hash,retrySeconds){
 const sql="INSERT INTO indexed_tx_detail_attempts "+
  "(chain,tx_hash,attempt_count,last_attempt_at,next_retry_at) "+
  "VALUES($1,$2,1,NOW(),NOW()+($3::int * INTERVAL '1 second')) "+
  "ON CONFLICT(chain,tx_hash) DO UPDATE SET "+
  "attempt_count=indexed_tx_detail_attempts.attempt_count+1,"+
  "last_attempt_at=NOW(),next_retry_at=NOW()+($3::int * INTERVAL '1 second')";
 await client.query(sql,[chain,hash,retrySeconds]);
}
async function markAttempt(chain,hash,retrySeconds){
 await recordAttempt(db,chain,hash,retrySeconds);
}
async function saveVerified(chain,hash,details){
 const client=await db.connect();
 try{
  await client.query("BEGIN");
  const args=[chain,hash,details.block_height,details.sender,details.recipient,
   details.status,details.fee_native];
  const lookup=chain==="bnb"?"lower(tx_hash)=lower($2)":"tx_hash=$2";
  const updated=await client.query("UPDATE indexed_transactions SET "+
   "status=COALESCE($6,status),fee_native=COALESCE($7::numeric,fee_native),"+
   "sender=COALESCE(indexed_transactions.sender,$4),"+
   "recipient=COALESCE(indexed_transactions.recipient,$5) "+
   "WHERE chain=$1 AND "+lookup,args);
  if(!updated.rowCount){
   await client.query("INSERT INTO indexed_transactions "+
    "(chain,tx_hash,block_height,sender,recipient,status,fee_native) "+
    "VALUES($1,$2,$3,$4,$5,$6,$7::numeric) "+
    "ON CONFLICT(chain,tx_hash) DO UPDATE SET "+
    "status=COALESCE(EXCLUDED.status,indexed_transactions.status),"+
    "fee_native=COALESCE(EXCLUDED.fee_native,indexed_transactions.fee_native),"+
    "sender=COALESCE(indexed_transactions.sender,EXCLUDED.sender),"+
    "recipient=COALESCE(indexed_transactions.recipient,EXCLUDED.recipient)",args);
  }
  // Completed rows fall out of the pending query; partial rows retry later.
  await recordAttempt(client,chain,hash,
   details.status!==null&&details.fee_native!==null?86400:21600);
  await client.query("COMMIT");
 }catch(e){await client.query("ROLLBACK");throw e}
 finally{client.release()}
}
function rateLimited(e){
 return /(?:429|rate.limit|limit exceeded|too many requests|quota|resource exhausted)/i.test(String(e?.message||e));
}
async function enrichOne(item){
 const chain=item.chain,hash=canonical(chain,item.tx_hash);
 if(!validHash(chain,hash)||!validHeight(item.block_height)){
  console.warn("Invalid indexed hash/height skipped",chain,hash.slice(0,24));
  return {result:"invalid",stop:false};
 }
 try{
  const raw=chain==="bnb"
   ?await rpc("bnb","eth_getTransactionReceipt",[hash])
   :await rpc("solana","getTransaction",[hash,{
     encoding:"json",commitment:"finalized",maxSupportedTransactionVersion:0
    }]);
  const details=chain==="bnb"?parseBnbReceipt(raw,hash):parseSolanaTransaction(raw);
  if(!details){
   await markAttempt(chain,hash,14400);
   return {result:"not_available",stop:false};
  }
  if(details.block_height!==Number(item.block_height)){
   console.warn("Block/slot mismatch; not writing",chain,hash,details.block_height,item.block_height);
   await markAttempt(chain,hash,21600);
   return {result:"mismatch",stop:false};
  }
  await saveVerified(chain,hash,details);
  return {result:"saved",stop:false};
 }catch(e){
  const limited=rateLimited(e);
  console.warn("Receipt unavailable",chain,hash,String(e.message||e).slice(0,160));
  try{await markAttempt(chain,hash,limited?1800:3600)}
  catch(err){console.error("Enrichment DB error",err.message);return {result:"db_error",stop:true}}
  return {result:"error",stop:limited};
 }
}
async function enrichChain(chain){
 const configured=chain==="bnb"?Boolean(process.env.BNB_RPC_URL):Boolean(process.env.SOLANA_RPC_URL);
 if(!configured){console.log(chain,"skipped: configure a private RPC URL first");return}
 const [recent,older,tokens]=await Promise.all([
  indexedCandidates(chain,"DESC",chain==="bnb"?budgets.bnbNew:budgets.solNew),
  indexedCandidates(chain,"ASC",chain==="bnb"?budgets.bnbOld:budgets.solOld),
  chain==="bnb"?tokenOnlyCandidates(budgets.bnbToken):Promise.resolve([])
 ]);
 const unique=new Map();
 for(const tx of [...recent,...tokens,...older])unique.set(canonical(chain,tx.tx_hash),tx);
 const counts={attempted:0,saved:0,not_available:0,mismatch:0,error:0,invalid:0,db_error:0};
 for(const tx of unique.values()){
  if(stopping||Date.now()>=deadline)break;
  const result=await enrichOne(tx);
  counts.attempted++;counts[result.result]++;
  if(result.stop)break;
  if(pauseMs&&Date.now()<deadline)await sleep(pauseMs);
 }
 console.log("BEXENTRA verified details",chain,JSON.stringify(counts));
}
if(!process.env.DATABASE_URL)throw Error("DATABASE_URL required");
try{
 await ensureAttemptTable();
 await enrichChain("bnb");
 if(!stopping&&Date.now()<deadline)await enrichChain("solana");
}finally{await db.end()}
