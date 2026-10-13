const url="https://br-old-sun-b5txcoym-bexentraapi.compute.c-7.us-east-2.aws.neon.tech/live?chain=solana&limit=3";
let last="";
for(let i=1;i<=3;i++){
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(17000)});
  const data=await response.json();
  last=JSON.stringify({status:response.status,source:data.source,block:data.blocks?.[0]?.height,
   signatures:data.transactions?.length,reason:data.reason});
  console.log("Solana deployed API attempt "+i+": "+last);
  if(response.ok&&data.source==="rpc_live"&&Number.isSafeInteger(Number(data.blocks?.[0]?.height))&&
   Array.isArray(data.transactions)&&data.transactions.length>0){
   console.log("SUCCESS: Solana real finalized transactions from RPC");
   process.exit(0);
  }
 }catch(e){last=String(e.message||e);console.log("Solana attempt "+i+": "+last)}
 if(i<3)await new Promise(r=>setTimeout(r,7000));
}
throw Error("Solana live feed not confirmed: "+last);
