// Verify the exact Production domain the user found in their Cloudflare account.
// This is a public, read-only check. It never touches Cloudflare credentials.
const base='https://bexentra.elbapplbilal.workers.dev';
const url=base+'/health';
console.log('Checking:',url);
let response;
try{
 response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(14000)});
}catch(e){
 console.error('PRODUCTION_UNREACHABLE:',String(e?.message||e));
 process.exitCode=1;
}
if(response){
 console.log('HTTP:',response.status);
 console.log('Content-Type:',response.headers.get('content-type'));
 const content=await response.text();
 console.log('Response preview:',content.slice(0,440));
 let data;
 try{data=JSON.parse(content)}catch{}
 if(response.ok&&data?.app==='BEXENTRA'&&data?.service==='cloudflare-worker'&&
  data?.mode==='per_viewer_live_sample'){
  console.log('VERIFIED: BEXENTRA Cloudflare Worker code is serving the Production domain.');
 }else{
  console.error('PRODUCTION_NOT_READY: Public hostname is not serving the expected Cloudflare Worker /health response.');
  process.exitCode=1;
 }
}
