// Conservative, deterministic lookback bounds. Not a complete archival index.
export function historicalRange(earliest,count,maxPerRun=25){
 const n=Number(earliest),requested=Number(count);
 if(!Number.isSafeInteger(n)||n<1)return [];
 if(!Number.isSafeInteger(requested)||requested<1)return [];
 const capped=Math.min(requested,maxPerRun,n),out=[];
 for(let k=1;k<=capped;k++)out.push(n-k);
 return out;
}
export function safeBlockTxs(transactions,chain){
 const bnb=/^0x[0-9a-fA-F]{64}$/;
 const sol=/^[1-9A-HJ-NP-Za-km-z]{70,100}$/;
 const valid=chain==="bnb"?bnb:sol;
 if(!Array.isArray(transactions))return [];
 return transactions.map(t=>{
  const hash=typeof t==="string"?t:t?.hash;
  return typeof hash==="string"&&valid.test(hash)
   ?{hash,sender:chain==="bnb"&&/^0x[0-9a-fA-F]{40}$/.test(t?.from||"")?t.from:null,
    recipient:chain==="bnb"&&/^0x[0-9a-fA-F]{40}$/.test(t?.to||"")?t.to:null}:null;
 }).filter(Boolean);
}
