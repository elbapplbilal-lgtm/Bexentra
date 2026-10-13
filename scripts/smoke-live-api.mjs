// Executed on GitHub Actions AFTER deployment. A green build must really
// confirm on-chain data, not just an indexed fallback response.
const base=process.env.BEXENTRA_API_BASE||
 "https://br-old-sun-b5txcoym-bexentraapi.compute.c-7.us-east-2.aws.neon.tech";
let last="";
for(let attempt=1;attempt<=4;attempt++){
 try{
  const url=base+"/live?chain=bnb&limit=3";
  const response=await fetch(url,{
   headers:{Accept:"application/json"},
   signal:AbortSignal.timeout(15000)
  });
  const data=await response.json();
  last=JSON.stringify({status:response.status,source:data.source,
   height:data.blocks?.[0]?.height,transactions:data.transactions?.length});
  console.log("Live RPC deployment check "+attempt+": "+last);
  if(response.ok&&data.source==="rpc_live"&&
   Number.isSafeInteger(Number(data.blocks?.[0]?.height))&&
   Array.isArray(data.transactions)&&data.transactions.length>0){
   console.log("SUCCESS: actual BNB transactions served live by the deployed Neon Function");
   process.exit(0);
  }
 }catch(e){last=String(e.message||e);console.log("Live RPC check "+attempt+": "+last)}
 if(attempt<4)await new Promise(resolve=>setTimeout(resolve,6500));
}
throw Error("Live BNB RPC route not verified after deployment: "+last);
