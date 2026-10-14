import pg from "pg";
import {createRpcClient} from "./rpc-client.js";
export const db = new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL?.includes("localhost")?false:{rejectUnauthorized:true},max:5});
export const endpoints={bnb:process.env.BNB_RPC_URL||"https://bsc-dataseed.binance.org/",solana:process.env.SOLANA_RPC_URL||"https://api.mainnet-beta.solana.com"};
const requestRpc=createRpcClient();
export async function rpc(chain,method,params=[]){
 if(!Object.hasOwn(endpoints,chain))throw Error("Unsupported RPC chain");
 return requestRpc(endpoints[chain],method,params);
}
export function safeNumber(n){return Number(BigInt(n))}
