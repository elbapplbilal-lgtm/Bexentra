import {db,rpc,safeNumber} from "./common.js";

// keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const delay=Math.max(500,Number(process.env.TOKEN_INDEXER_POLL_MS||2500));
let stopped=false;
process.on("SIGTERM",()=>{stopped=true});
process.on("SIGINT",()=>{stopped=true});

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

function parseTransfer(log,height){
 if(!log||log.removed||!Array.isArray(log.topics)||log.topics.length!==3)return null;
 if(String(log.topics[0]).toLowerCase()!==TRANSFER_TOPIC)return null;
 if(!/^0x[0-9a-fA-F]{64}$/.test(log.topics[1])||!/^0x[0-9a-fA-F]{64}$/.test(log.topics[2]))return null;
 if(!/^0x[0-9a-fA-F]{64}$/.test(log.data||""))return null;
 const from="0x"+log.topics[1].slice(-40).toLowerCase();
 const to="0x"+log.topics[2].slice(-40).toLowerCase();
 return [log.transactionHash,safeNumber(log.logIndex),height,String(log.address).toLowerCase(),from,to,BigInt(log.data).toString()];
}

async function processBlock(height){
 const hex="0x"+height.toString(16);
 const logs=await rpc("bnb","eth_getLogs",[{fromBlock:hex,toBlock:hex,topics:[TRANSFER_TOPIC]}]);
 if(!Array.isArray(logs))throw Error("Invalid eth_getLogs response");
 const client=await db.connect();
 try{
  await client.query("BEGIN");
  for(const log of logs){
   const item=parseTransfer(log,height);
   if(!item)continue;
   await client.query(`INSERT INTO indexed_token_transfers(chain,tx_hash,log_index,block_height,token_address,sender,recipient,amount_raw)
    VALUES('bnb',$1,$2,$3,$4,$5,$6,$7) ON CONFLICT(chain,tx_hash,log_index) DO UPDATE SET
    block_height=EXCLUDED.block_height,token_address=EXCLUDED.token_address,sender=EXCLUDED.sender,
    recipient=EXCLUDED.recipient,amount_raw=EXCLUDED.amount_raw,indexed_at=NOW()`,item);
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
  }catch(e){console.error("token indexer:",e.message);await sleep(Math.max(delay,5000))}
 }
}finally{await db.end()}
