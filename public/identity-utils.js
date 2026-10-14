"use strict";
/* Strict, dependency-free Web3.bio adapter. Labels are social metadata, not
   blockchain attestation. Never use it to validate transactions or balances. */
(()=>{
 const evm=/^0x[0-9a-fA-F]{40}$/;
 const sol=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
 function validAddress(chain,address){
  return chain==="bnb"&&evm.test(address)||chain==="solana"&&sol.test(address);
 }
 function endpoint(chain,address){
  if(!validAddress(chain,address))return null;
  const platform=chain==="bnb"?"ens":"solana";
  return "https://api.web3.bio/profile/"+platform+"/"+encodeURIComponent(address);
 }
 function safeHttps(input){
  if(typeof input!=="string"||input.length>1200)return null;
  try{
   const url=new URL(input);
   return url.protocol==="https:"&&url.hostname&&url.username===""&&url.password===""
    ?url.href:null;
  }catch{return null}
 }
 function cleanText(value,limit=120){
  return typeof value==="string"?value.trim().replace(/[\u0000-\u001f\u007f]/g," ").slice(0,limit):"";
 }
 function normalize(payload,chain,address){
  if(!validAddress(chain,address)||!payload||typeof payload!=="object"||Array.isArray(payload))return null;
  if(typeof payload.address!=="string"||
     (chain==="bnb"
      ?payload.address.toLowerCase()!==address.toLowerCase()
      :payload.address!==address))return null;
  if(chain==="bnb"?payload.platform!=="ens":!["solana","sns"].includes(payload.platform))return null;
  const identity=cleanText(payload.identity,100);
  // A raw address echoed by the service is not a discovered ENS/SNS name.
  const hasName=Boolean(identity&&identity!==address&&identity.toLowerCase()!==address.toLowerCase()&&
   (chain==="bnb"?/^[^\s/]+\.[a-z0-9-]{2,}$/i.test(identity):/^[^\s/]+\.(?:sns|sol)$/i.test(identity)));
  const name=hasName?identity:null;
  const avatar=safeHttps(payload.avatar);
  const description=cleanText(payload.description,240);
  const allow={
   website:"Website",github:"GitHub",twitter:"X / Twitter",farcaster:"Farcaster",
   lens:"Lens",instagram:"Instagram"
  };
  const links=[];
  if(payload.links&&typeof payload.links==="object"&&!Array.isArray(payload.links)){
   for(const [key,label] of Object.entries(allow)){
    const link=safeHttps(payload.links[key]?.link);
    if(link){links.push({label,url:link});if(links.length===5)break}
   }
  }
  if(!name&&!avatar&&!links.length)return null;
  return {name,avatar,description,links,
   service:chain==="bnb"?"ENS (Ethereum)":"Solana / SNS",
   source:"web3.bio",address};
 }
 window.BexentraIdentityUtils=Object.freeze({validAddress,endpoint,safeHttps,normalize});
})();
