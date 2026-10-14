// BEXENTRA production smoke / low-concurrency resilience probe.
// At most three simultaneous requests, no brute force, no credentials.
const api="https://br-old-sun-b5txcoym-bexentraapi.compute.c-7.us-east-2.aws.neon.tech";
const worker="https://bexentra.elbapplbilal.workers.dev";
const scenarios=[
 [{label:"Neon health",url:api+"/health",status:200},
  {label:"BNB latest sample",url:api+"/live?chain=bnb&limit=2",status:200,needs:"transactions"},
  {label:"Solana latest sample",url:api+"/live?chain=solana&limit=2",status:200,needs:"transactions"}],
 [{label:"Neon invalid address",url:api+"/address?chain=bnb&address=invalid",status:400},
  {label:"Neon invalid tx",url:api+"/tx?chain=bnb&hash=invalid",status:400},
  {label:"Worker health",url:worker+"/health",status:200}],
 [{label:"Worker rejects malformed hash",url:worker+"/tx?chain=bnb&hash=invalid",status:400},
  {label:"Neon oversized limit",url:api+"/transactions?chain=bnb&limit=9999",status:400},
  {label:"Neon invalid Solana address",url:api+"/address?chain=solana&address=invalid***",status:400}]
];
async function probe(x){
 const start=Date.now(),res=await fetch(x.url,{
  headers:{Accept:"application/json",Origin:"https://elbapplbilal-lgtm.github.io"},
  signal:AbortSignal.timeout(19000)
 });
 let json={};try{json=await res.json()}catch{}
 const ms=Date.now()-start,ok=res.status===x.status&&
   (!x.needs||Array.isArray(json[x.needs]));
 const result={label:x.label,http:res.status,ms,ok,
  source:x.needs?json.source??"unknown":undefined};
 console.log("RESILIENCE",JSON.stringify(result));
 if(!ok)throw Error(x.label+" unexpectedly returned HTTP "+res.status);
 return {ms,source:result.source};
}
let durations=[];
for(const group of scenarios){
 const results=await Promise.allSettled(group.map(probe));
 const failures=results.filter(r=>r.status==="rejected");
 if(failures.length)throw Error(failures.map(x=>String(x.reason)).join("; "));
 durations.push(...results.map(x=>x.value.ms));
}
durations.sort((a,b)=>a-b);
const p95=durations[Math.ceil(.95*durations.length)-1];
console.log("RESILIENCE_SUMMARY",JSON.stringify({requests:durations.length,
 concurrency_max:3,p95_ms:p95,max_ms:Math.max(...durations),
 workload:"bounded smoke, NOT a high-volume load test"}));
