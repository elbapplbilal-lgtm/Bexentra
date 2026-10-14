// Browser adapter for the BEXENTRA optional server-side 1-second SSE feed.
// If the always-on service is missing or the upstream disconnects, the existing
// Neon /live API remains the honest fallback (never fabricate new transactions).
(()=>{
 const endpoint=String(window.BEXENTRA_STREAM_BASE||"").replace(/\/+$/,"");
 const network=document.getElementById("network");
 const meta=document.getElementById("streamMeta");
 const rate=document.getElementById("streamRate");
 let stream=null,chain=null,active=false,lastMessage=0;
 const refreshEnabled=()=>window.BexentraPrefs?.get("refresh")!=="off";
 window.BexentraStreamIsActive=target=>active&&chain===target&&
  !document.hidden&&Date.now()-lastMessage<8000;
 const stop=()=>{
  const wasActive=active;
  active=false;chain=null;lastMessage=0;
  if(stream){stream.close();stream=null}
  if(meta)meta.hidden=true;
  return wasActive;
 };
 const show=payload=>{
  if(!meta||!rate)return;
  meta.hidden=false;
  const isEnglish=document.documentElement.lang==="en";
  rate.textContent=isEnglish
   ?"Updates received in the last second: "+payload.observed_since_last_tick
   :"التحديثات التي وصلتنا خلال آخر ثانية: "+payload.observed_since_last_tick;
  rate.title=isEnglish
   ?"Shows updates received by BEXENTRA, not all transactions on the network."
   :"هذا عدد التحديثات التي وصلت للمستكشف، وليس مجموع معاملات الشبكة.";
 };
 const connect=()=>{
  stop();
  if(!/^https:\/\//i.test(endpoint)||!network||!window.EventSource||
    !refreshEnabled()||document.hidden)return;
  const selected=network.value;
  if(selected!=="bnb"&&selected!=="solana")return;
  chain=selected;
  let current;
  try{current=new EventSource(endpoint+"/stream?chain="+encodeURIComponent(chain))}
  catch{chain=null;return}
  stream=current;
  current.addEventListener("snapshot",e=>{
   if(stream!==current||chain!==network.value)return;
   let value;
   try{value=JSON.parse(e.data)}catch{return}
   if(value.chain!==chain)return;
   lastMessage=Date.now();
   const observed=Date.parse(value.last_event_at||"");
   const fresh=Number.isFinite(observed)&&Date.now()-observed<45000;
   if(value.source!=="ws_live"||!value.stream_connected||!fresh){
    const was=active;
    active=false;
    if(meta)meta.hidden=true;
    if(was)window.BexentraLive?.refresh();
    return;
   }
   active=true;
   show(value);
   window.BexentraLive?.render(value,chain);
  });
  current.onerror=()=>{
   if(stream!==current)return;
   const was=active;
   active=false;
   if(meta)meta.hidden=true;
   if(was)window.BexentraLive?.refresh();
   // EventSource automatically reconnects. The UI remains on indexed/RPC fallback.
  };
 };
 if(network)network.addEventListener("change",()=>queueMicrotask(connect));
 document.addEventListener("visibilitychange",()=>{
  if(document.hidden)stop();else connect();
 });
 document.addEventListener("bexentra:preferenceschange",e=>{
  if(e.detail?.key==="refresh"||e.detail?.key==="reset")connect();
  else if(e.detail?.key==="language"&&active)show({
   observed_since_last_tick:0
  });
 });
 const staleCheck=setInterval(()=>{
  if(active&&Date.now()-lastMessage>8000){
   active=false;
   if(meta)meta.hidden=true;
   window.BexentraLive?.refresh();
  }
 },4000);
 window.addEventListener("pagehide",()=>{clearInterval(staleCheck);stop()});
 connect();
})();
