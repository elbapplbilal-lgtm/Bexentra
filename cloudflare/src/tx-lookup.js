// BEXENTRA read-only transaction detail fallback for hashes observed live.
// Reads actual chain RPC data. A result is returned only if its hash was
// independently verified by the RPC. Never infer success, value or gas fees.
const BNB_HASH=/^0x[0-9a-fA-F]{64}$/;
const SOL_HASH=/^[1-9A-HJ-NP-Za-km-z]{70,100}$/;
const CORS={
 'access-control-allow-origin':'https://elbapplbilal-lgtm.github.io',
 'content-type':'application/json; charset=utf-8',
 'cache-control':'no-store',
 'x-content-type-options':'nosniff'
};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:CORS});
const endpoints=(env,chain)=>{
 const configured=chain==='bnb'?env?.BNB_RPC_URL:env?.SOLANA_RPC_URL;
 const fallback=chain==='bnb'
  ?['https://bsc-rpc.publicnode.com','https://bsc-dataseed.bnbchain.org','https://bsc-dataseed-public.bnbchain.org']
  :['https://solana-rpc.publicnode.com','https://api.mainnet-beta.solana.com'];
 return [...new Set([
  ...(typeof configured==='string'&&configured.startsWith('https://')&&configured.length<900?[configured]:[]),
  ...fallback
 ])];
};
function safeNumber(value){
 try{
  const n=Number(BigInt(value));
  return Number.isSafeInteger(n)&&n>=0?n:null;
 }catch{return null}
}
function fee(gas,price){
 try{
  const a=BigInt(gas),b=BigInt(price);
  return a>=0n&&b>=0n?String(a*b):null;
 }catch{return null}
}
async function rpc(chain,method,params,env,fetcher=fetch){
 let unavailable=false,seenNull=false;
 for(const endpoint of endpoints(env,chain)){
  try{
   const res=await fetcher(endpoint,{
    method:'POST',
    headers:{'content-type':'application/json','accept':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),
    signal:AbortSignal.timeout(4600)
   });
   if(!res.ok){unavailable=true;continue}
   const json=await res.json();
   if(json.error||!Object.prototype.hasOwnProperty.call(json,'result')){unavailable=true;continue}
   if(json.result===null){seenNull=true;continue}
   return {result:json.result,unavailable:false};
  }catch{unavailable=true}
 }
 return {result:null,unavailable:unavailable&&!seenNull};
}

function baseUnits(value){
 try{
  if(typeof value!=='string'||!/^0x[0-9a-fA-F]+$/.test(value))return null;
  const v=BigInt(value);
  return v>=0n&&v<=(2n**256n-1n)?v.toString():null;
 }catch{return null}
}
function txMethod(input){
 if(typeof input!=='string'||!/^0x(?:[0-9a-fA-F]{2})*$/.test(input))return null;
 return input.length>=10?input.slice(0,10).toLowerCase():null;
}
function blockchainTime(block,height,hash){
 if(!block||safeNumber(block.number)!==height||
   (hash&&String(block.hash||'').toLowerCase()!==hash.toLowerCase()))return null;
 const t=safeNumber(block.timestamp);
 return t!==null&&t>0&&t<1e11?new Date(t*1000).toISOString():null;
}
function verifiedGas(receipt,hash,height,blockHash){
 const valid=receipt&&String(receipt.transactionHash||'').toLowerCase()===hash.toLowerCase()&&
  safeNumber(receipt.blockNumber)===height&&
  (!blockHash||!receipt.blockHash||String(receipt.blockHash).toLowerCase()===blockHash.toLowerCase());
 return valid?receipt:null;
}

function receiptDetails(receipt,hash,txBlock,blockHash){
 const matching=receipt&&
  String(receipt.transactionHash||'').toLowerCase()===hash.toLowerCase()&&
  safeNumber(receipt.blockNumber)===txBlock&&
  (!blockHash||!receipt.blockHash||receipt.blockHash.toLowerCase()===blockHash.toLowerCase());
 if(!matching)return {status:null,fee_native:null};
 const n=safeNumber(receipt.status);
 return {
  status:n===1?'success':n===0?'failed':null,
  fee_native:receipt.gasUsed===undefined||receipt.effectiveGasPrice===undefined
   ?null:fee(receipt.gasUsed,receipt.effectiveGasPrice)
 };
}
export async function lookupBnb(hash,height,env,fetcher=fetch){
 // Best effort by-hash RPC and by-number canonical membership verification.
 // Some providers don't index a new tx by hash immediately after a block event.
 let tx=null,blockHash=null,verifiedInBlock=false,unavailable=false;
 const direct=await rpc('bnb','eth_getTransactionByHash',[hash],env,fetcher);
 tx=direct.result;
 unavailable ||=direct.unavailable;
 if(tx && (typeof tx.hash!=='string'||tx.hash.toLowerCase()!==hash.toLowerCase()))
  tx=null;
 if(tx && height!==null && safeNumber(tx.blockNumber)!==height)tx=null;
 if(!tx && height!==null){
  const block=await rpc('bnb','eth_getBlockByNumber',['0x'+height.toString(16),true],env,fetcher);
  unavailable ||=block.unavailable;
  if(block.result&&safeNumber(block.result.number)===height
    &&Array.isArray(block.result.transactions)&&BNB_HASH.test(block.result.hash||'')){
   const candidate=block.result.transactions.find(x=>x&&typeof x==='object'&&
    typeof x.hash==='string'&&x.hash.toLowerCase()===hash.toLowerCase());
   if(candidate){tx=candidate;blockHash=block.result.hash;verifiedInBlock=true}
   else return {status:404,error:'Transaction not in the verified block',reason:'not_verified'};
  }
 }
 if(!tx)return {status:unavailable?503:404,
  error:unavailable?'Blockchain RPC temporarily unavailable':'Transaction not verified on BNB Chain',
  reason:unavailable?'rpc_unavailable':'not_verified'};
 const txHeight=tx.blockNumber==null?height:safeNumber(tx.blockNumber);
 if(txHeight===null || (height!==null&&txHeight!==height))return {
  status:404,error:'Transaction height not verified',reason:'not_verified'};
 const receipt=await rpc('bnb','eth_getTransactionReceipt',[hash],env,fetcher);
 const txBlockHash=BNB_HASH.test(tx.blockHash||'')?tx.blockHash
  :BNB_HASH.test(blockHash||'')?blockHash:null;
 const checkedReceipt=verifiedGas(receipt.result,hash,txHeight,txBlockHash);
 const evidence=receiptDetails(checkedReceipt,hash,txHeight,txBlockHash);
 // Block timestamp is displayed only after matching the transaction's actual block.
 // A failed provider lookup leaves the timestamp unavailable, never inferred.
 const blockResult=await rpc('bnb','eth_getBlockByNumber',['0x'+txHeight.toString(16),false],env,fetcher);
 const timestamp=blockchainTime(blockResult.result,txHeight,txBlockHash);
 const value=baseUnits(tx.value);
 const gasLimit=baseUnits(tx.gas);
 const gasUsed=checkedReceipt?baseUnits(checkedReceipt.gasUsed):null;
 const price=checkedReceipt?baseUnits(checkedReceipt.effectiveGasPrice):null;
 const nonce=safeNumber(tx.nonce);
 const txIndex=safeNumber(tx.transactionIndex);
 return {status:200,data:{
  chain:'bnb',tx_hash:tx.hash,block_height:txHeight,
  block_hash:txBlockHash,block_time:timestamp,
  sender:tx.from||null,recipient:tx.to||null,
  status:evidence.status,fee_native:evidence.fee_native,
  native_value_wei:value,gas_used:gasUsed,gas_limit:gasLimit,
  gas_price_wei:price,nonce,transaction_index:txIndex,
  method_id:txMethod(tx.input),contract_creation:tx.to===null,
  indexed_at:null,source:verifiedInBlock?'rpc_block_verified':'rpc_live',
  coverage:verifiedInBlock?'on_demand_block':'on_demand'
 }};
}
export async function lookupSolana(hash,env,fetcher=fetch){
 const tx=await rpc('solana','getTransaction',[hash,{
  encoding:'json',commitment:'finalized',maxSupportedTransactionVersion:0
 }],env,fetcher);
 if(!tx.result)return {status:tx.unavailable?503:404,error:'Solana transaction not verified',
  reason:tx.unavailable?'rpc_unavailable':'not_verified'};
 const value=tx.result,slot=safeNumber(value.slot);
 if(slot===null||!value.transaction)return {status:404,error:'Solana transaction not verified',reason:'not_verified'};
 // getTransaction keyed by signature is independently checked with RPC.
 const first=value.transaction.message?.accountKeys?.[0];
 const sender=typeof first==='string'?first:typeof first?.pubkey==='string'?first.pubkey:null;
 const execution=value.meta&&Object.prototype.hasOwnProperty.call(value.meta,'err')
  ?(value.meta.err===null?'success':'failed'):null;
 const lamports=value.meta?.fee;
 const blockTime=safeNumber(value.blockTime);
 const time=blockTime!==null&&blockTime>0&&blockTime<1e11
  ?new Date(blockTime*1000).toISOString():null;
 const compute=safeNumber(value.meta?.computeUnitsConsumed);
 return {status:200,data:{chain:'solana',tx_hash:hash,block_height:slot,
  block_time:time,compute_units:compute,
  sender,recipient:null,status:execution,fee_native:safeNumber(lamports)===null?null:String(lamports),
  indexed_at:null,source:'rpc_live',coverage:'on_demand'}};
}
export async function transactionRoute(request,env,fetcher=fetch){
 const url=new URL(request.url),chain=url.searchParams.get('chain'),hash=url.searchParams.get('hash')||'';
 if(chain!=='bnb'&&chain!=='solana')return reply({error:'Unsupported chain'},400);
 if(!(chain==='bnb'?BNB_HASH:SOL_HASH).test(hash))return reply({error:'Invalid transaction hash'},400);
 const rawHeight=url.searchParams.get('height');
 if(rawHeight!==null&&(chain!=='bnb'||!/^\d{1,16}$/.test(rawHeight)
   ||!Number.isSafeInteger(Number(rawHeight))))return reply({error:'Invalid height'},400);
 const height=rawHeight===null?null:Number(rawHeight);
 const result=chain==='bnb'
  ?await lookupBnb(hash,height,env,fetcher)
  :await lookupSolana(hash,env,fetcher);
 return result.status===200?reply(result.data):reply({error:result.error,reason:result.reason},result.status);
}
