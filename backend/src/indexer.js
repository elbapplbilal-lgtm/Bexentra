import {db,rpc,safeNumber} from "./common.js";
const poll=Math.max(3000,Number(process.env.INDEXER_POLL_MS||12000));
async function state(chain,tip){
 const res=await db.query("SELECT last_height FROM indexer_state WHERE chain=$1",[chain]);
 if(res.rowCount)return Number(res.rows[0].last_height);
 const override=process.env[chain==="bnb"?"INDEXER_START_BNB":"INDEXER_START_SOLANA"];
 return override!==undefined&&override!==""?Number(override)-1:tip-1;
}
async function persist(chain,height,hash,time,transactions){
 const client=await db.connect();
 try{await client.query("BEGIN");
 await client.query("INSERT INTO indexed_blocks(chain,height,block_hash,block_time,transaction_count) VALUES($1,$2,$3,$4,$5) ON CONFLICT(chain,height) DO UPDATE SET block_hash=EXCLUDED.block_hash,block_time=EXCLUDED.block_time,transaction_count=EXCLUDED.transaction_count,indexed_at=NOW()",[chain,height,hash,time,transactions.length]);
 for(const tx of transactions)await client.query("INSERT INTO indexed_transactions(chain,tx_hash,block_height,sender,recipient,status,fee_native) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(chain,tx_hash) DO UPDATE SET block_height=EXCLUDED.block_height,sender=EXCLUDED.sender,recipient=EXCLUDED.recipient,status=EXCLUDED.status,fee_native=EXCLUDED.fee_native,indexed_at=NOW()",[chain,tx.hash,height,tx.sender,tx.recipient,tx.status,tx.fee]);
 await client.query("INSERT INTO indexer_state(chain,last_height) VALUES($1,$2) ON CONFLICT(chain) DO UPDATE SET last_height=EXCLUDED.last_height,updated_at=NOW()",[chain,height]);
 await client.query("COMMIT")}catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
}
async function bnbBlock(height){
 const b=await rpc("bnb","eth_getBlockByNumber",["0x"+height.toString(16),true]);if(!b)throw Error("BNB block unavailable");
 // Receipts are fetched to capture execution status and actual gas paid.
 const txs=[];for(const tx of b.transactions){const receipt=await rpc("bnb","eth_getTransactionReceipt",[tx.hash]);txs.push({hash:tx.hash,sender:tx.from,recipient:tx.to,status:receipt?.status==="0x1"?"success":receipt?.status==="0x0"?"failed":null,fee:receipt?.gasUsed&&receipt?.effectiveGasPrice?(BigInt(receipt.gasUsed)*BigInt(receipt.effectiveGasPrice)).toString():null})}
 // BNB fees are stored as wei; API converts to BNB.
 await persist("bnb",height,b.hash,new Date(safeNumber(b.timestamp)*1000),txs)
}
async function solanaBlock(slot){
 const b=await rpc("solana","getBlock",[slot,{encoding:"json",transactionDetails:"full",rewards:false,maxSupportedTransactionVersion:0,commitment:"finalized"}]);
 if(!b){ // Skipped slots have no block, but still advance the cursor.
  await persist("solana",slot,null,null,[]);return;
 }
 const txs=b.transactions.map(t=>({hash:t.transaction.signatures[0],sender:t.transaction.message.accountKeys?.[0]?.pubkey||t.transaction.message.accountKeys?.[0]||null,recipient:null,status:t.meta?.err?"failed":"success",fee:t.meta?.fee??null}));
 await persist("solana",slot,b.blockhash,b.blockTime?new Date(b.blockTime*1000):null,txs)
}
async function cycle(chain){
 const tip=chain==="bnb"?safeNumber(await rpc("bnb","eth_blockNumber"))-3:await rpc("solana","getSlot",[{commitment:"finalized"}]);
 const previous=await state(chain,tip);const next=previous+1;if(next>tip)return;
 if(chain==="bnb")await bnbBlock(next);else await solanaBlock(next);
 console.log(chain,"indexed",next,"tip",tip)
}
if(!process.env.DATABASE_URL)throw Error("DATABASE_URL required");
let stopped=false;process.on("SIGTERM",()=>{stopped=true});process.on("SIGINT",()=>{stopped=true});
while(!stopped){for(const chain of ["bnb","solana"]){try{await cycle(chain)}catch(error){console.error(chain,error.message)}}await new Promise(resolve=>setTimeout(resolve,poll))}
await db.end();
