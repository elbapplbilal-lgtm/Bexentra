// Smoke-check the PUBLIC provider. Not used for generating fake market data.
// Separate from fixture tests because public API rate limits/outages are transient.
const origin="https://elbapplbilal-lgtm.github.io";
for(const chain of ["solana","bsc"]){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const url="https://api.geckoterminal.com/api/v2/networks/"+chain+"/trending_pools?include=base_token,quote_token,dex&page=1";
  const r=await fetch(url,{headers:{Origin:origin,Accept:"application/json;version=20230203"},signal:controller.signal});
  const allow=r.headers.get("access-control-allow-origin");
  const validCors=allow==="*"||allow===origin;
  const body=r.ok?await r.json():null;
  console.log(chain,JSON.stringify({status:r.status,cors:allow,validCors,pools:Array.isArray(body?.data)?body.data.length:null}));
  if(!r.ok||!validCors||!Array.isArray(body?.data))process.exitCode=1;
 }catch(e){console.error(chain,String(e.message));process.exitCode=1}
 finally{clearTimeout(timeout)}
}
