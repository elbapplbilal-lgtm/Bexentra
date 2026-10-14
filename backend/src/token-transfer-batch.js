// Pure BEP-20 Transfer parser and deterministic batches for the BNB indexer.
// No fake balances or amounts: input must be a real eth_getLogs event.
export const TRANSFER_TOPIC="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const hex64=/^0x[0-9a-fA-F]{64}$/;
const hex40=/^0x[0-9a-fA-F]{40}$/;
export function parseTransfer(log){
 if(!log||log.removed||!Array.isArray(log.topics)||log.topics.length!==3)return null;
 if(String(log.topics[0]).toLowerCase()!==TRANSFER_TOPIC||
    !hex64.test(log.topics[1])||!hex64.test(log.topics[2])||
    !hex64.test(log.data)||!hex64.test(log.transactionHash)||
    !hex40.test(log.address))return null;
 let index,amount;
 try{
  const raw=log.logIndex;
  if(typeof raw!=="string"||!/^0x[0-9a-f]+$/i.test(raw))return null;
  const n=BigInt(raw);
  if(n>2147483647n)return null;
  index=Number(n);
  amount=BigInt(log.data).toString();
 }catch{return null}
 return {
  tx_hash:log.transactionHash.toLowerCase(),
  log_index:index,
  token_address:log.address.toLowerCase(),
  sender:"0x"+log.topics[1].slice(-40).toLowerCase(),
  recipient:"0x"+log.topics[2].slice(-40).toLowerCase(),
  amount_raw:amount
 };
}
export function transferBatches(logs,size=500){
 if(!Array.isArray(logs)||!Number.isSafeInteger(size)||size<1||size>5000)
  throw Error("Invalid Transfer log batch");
 const results=[];
 let batch=[];
 for(const log of logs){
  const value=parseTransfer(log);
  if(value===null)continue;
  batch.push(value);
  if(batch.length===size){results.push(batch);batch=[]}
 }
 if(batch.length)results.push(batch);
 return results;
}
