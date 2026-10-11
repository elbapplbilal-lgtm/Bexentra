import pg from "pg";
export const db = new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL?.includes("localhost")?false:{rejectUnauthorized:true},max:5});
export const endpoints={bnb:process.env.BNB_RPC_URL||"https://bsc-dataseed.binance.org/",solana:process.env.SOLANA_RPC_URL||"https://api.mainnet-beta.solana.com"};
export async function rpc(chain,method,params=[]){
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
 try{const response=await fetch(endpoints[chain],{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params}),signal:controller.signal});if(!response.ok)throw Error("RPC HTTP "+response.status);const json=await response.json();if(json.error)throw Error(json.error.message||"RPC error");return json.result}finally{clearTimeout(timeout)}
}
export function safeNumber(n){return Number(BigInt(n))}
