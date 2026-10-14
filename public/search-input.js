"use strict";
/* Shared explorer input parsing. No external navigation or network calls. */
(()=>{
 const bnbTx=/^0x[a-fA-F0-9]{64}$/;
 const bnbAddr=/^(?:0x)?[a-fA-F0-9]{40}$/;
 const solAddr=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
 const solTx=/^[1-9A-HJ-NP-Za-km-z]{70,100}$/;
 function normalize(raw,chain,forced="auto"){
  if(!["bnb","solana"].includes(chain))return {error:"wrongNetwork"};
  let q=String(raw??"").trim(),type=forced;
  if(!q)return {error:"empty"};
  if(q.length>500)return {error:"invalid"};
  if(/^https?:\/\//i.test(q)){
   let u;
   try{u=new URL(q)}catch{return {error:"invalid"}}
   const host=u.hostname.toLowerCase().replace(/^www\./,"");
   if(!["bscscan.com","solscan.io"].includes(host))return {error:"unsupportedUrl"};
   if((host==="bscscan.com"&&chain!=="bnb")||(host==="solscan.io"&&chain!=="solana"))return {error:"wrongNetwork"};
   const parts=u.pathname.split("/").filter(Boolean);
   if(parts.length!==2)return {error:"invalid"};
   const [section,id]=parts;
   type=section==="tx"?"tx":section==="address"||section==="account"?"address":section==="block"?"block":"unknown";
   if(type==="unknown")return {error:"invalid"};
   q=id;
  }
  if(!["auto","tx","address","block"].includes(type))type="auto";
  if(type==="auto"){
   if(chain==="solana"&&solTx.test(q))type="tx";
   else if(chain==="solana"&&solAddr.test(q))type="address";
   else if(/^[0-9]+$/.test(q))type="block";
   else if(chain==="bnb"&&bnbAddr.test(q))type="address";
   else if(chain==="solana"&&solAddr.test(q))type="address";
   else type="tx";
  }
  if(type==="block"&&(!/^[0-9]{1,16}$/.test(q)||
      !Number.isSafeInteger(Number(q))))return {error:"invalid"};
  if(chain==="bnb"){
   if(type==="address"&&!bnbAddr.test(q))return {error:"invalid"};
   if(type==="tx"&&!bnbTx.test(q))return {error:"invalid"};
   if((type==="address"||type==="tx")&&!q.startsWith("0x"))q="0x"+q;
   if(type==="address"||type==="tx")q=q.toLowerCase();
  }else{
   if(type==="address"&&!solAddr.test(q))return {error:"invalid"};
   if(type==="tx"&&!solTx.test(q))return {error:"invalid"};
  }
  return {value:q,type};
 }
 window.BexentraSearch={normalize};
})();