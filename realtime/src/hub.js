// A bounded, auditable in-memory view of ACTUAL blockchain event notifications.
// This is a live SAMPLE. It is not a complete historical index or transaction ledger.
const VALID_BNB=/^0x[0-9a-fA-F]{64}$/;
const VALID_SOL=/^[1-9A-HJ-NP-Za-km-z]{70,100}$/;

export class RealtimeHub {
 constructor({history=120,shown=12,seenLimit=2400}={}){
  this.history=Math.max(12,Math.min(history,300));
  this.shown=Math.max(1,Math.min(shown,30));
  this.seenLimit=Math.max(200,seenLimit);
  this.state=new Map(["bnb","solana"].map(chain=>[chain,{
   chain,connected:false,subscription:false,last_event_at:null,last_block:null,
   last_error:null,recent:[],seen:new Set(),seenQueue:[],
   total_observed:0,dropped_from_history:0,previous_count:0
  }]));
 }
 get(chain){const value=this.state.get(chain);if(!value)throw Error("Unsupported chain");return value}
 connected(chain){const s=this.get(chain);s.connected=true;s.subscription=true;s.last_error=null}
 disconnected(chain,why="disconnected"){const s=this.get(chain);s.connected=false;s.subscription=false;s.last_error=String(why).slice(0,120)}
 setBlock(chain,{height,hash=null,blockTime=null,transactionCount=null}){
  const s=this.get(chain),n=Number(height);
  if(!Number.isSafeInteger(n)||n<0)return false;
  s.last_block={chain,height:n,block_hash:hash||null,block_time:blockTime||null,
   transaction_count:Number.isSafeInteger(transactionCount)?transactionCount:null,
   indexed_at:null,source:"ws_live"};
  s.last_event_at=new Date().toISOString();
  return true;
 }
 observe(chain,tx){
  const s=this.get(chain),hash=tx?.tx_hash;
  if(typeof hash!=="string" || !(chain==="bnb"?VALID_BNB:VALID_SOL).test(hash))return false;
  const key=chain==="bnb"?hash.toLowerCase():hash;
  if(s.seen.has(key))return false;
  s.seen.add(key);s.seenQueue.push(key);
  while(s.seenQueue.length>this.seenLimit)s.seen.delete(s.seenQueue.shift());
  const height=Number(tx.block_height);
  const row={
   chain,tx_hash:hash,block_height:Number.isSafeInteger(height)&&height>=0?height:null,
   sender:chain==="bnb"&&typeof tx.sender==="string"?tx.sender:null,
   recipient:chain==="bnb"&&typeof tx.recipient==="string"?tx.recipient:null,
   status:tx.status==="success"||tx.status==="failed"?tx.status:null,
   fee_native:null,
   source:"ws_live",
   observed_at:new Date().toISOString(),
   indexed_at:null
  };
  s.recent.unshift(row);
  while(s.recent.length>this.history){s.recent.pop();s.dropped_from_history++}
  s.total_observed++;s.last_event_at=row.observed_at;
  return true;
 }
 snapshot(chain,{consume=false}={}){
  const s=this.get(chain),now=new Date().toISOString();
  const tick=s.total_observed-s.previous_count;
  if(consume)s.previous_count=s.total_observed;
  return {
   chain,
   source:s.connected?"ws_live":"stream_offline",
   coverage:"recent_stream_sample",
   stream_connected:s.connected,
   last_event_at:s.last_event_at,
   observed_at:now,
   last_error:s.connected?null:s.last_error,
   observed_since_start:s.total_observed,
   observed_since_last_tick:tick,
   dropped_from_memory:s.dropped_from_history,
   blocks:s.last_block?[s.last_block]:[],
   transactions:s.recent.slice(0,this.shown)
  };
 }
}
