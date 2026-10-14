"use strict";
const $=id=>document.getElementById(id);
const API="https://br-old-sun-b5txcoym-bexentraapi.compute.c-7.us-east-2.aws.neon.tech";
const network=$("network");
const heroNetwork=$("heroNetwork");
const networkIcon=$("networkIcon"),summaryChainLabel=$("summaryChainLabel");
const indexStatus=$("indexStatus"),indexStatusNote=$("indexStatusNote");
const esc=s=>String(s??"");
const tr=k=>window.BexentraPrefs?.t(k)??k;
const viewParam=new URLSearchParams(location.search).get("view");
const pageView=viewParam==="blocks"||viewParam==="transactions"?viewParam:"home";
function applyPageNavigation(){
 if(pageView!=="home"){
  document.body.classList.add("category-view","category-"+pageView);
  const intro=$("categoryIntro"),heading=$("categoryHeading");
  if(intro)intro.hidden=false;
  const subtitle=$("categorySubtitle");if(subtitle)subtitle.textContent=tr(pageView==="blocks"?"category.blocksHelp":"category.transactionsHelp");
  if(heading){
   const key=pageView==="blocks"?"nav.blocks":"nav.transactions";
   heading.dataset.i18n=key;heading.textContent=tr(key);
  }
  document.title=tr(pageView==="blocks"?"nav.blocks":"nav.transactions")+" | BEXENTRA";
 }
 document.querySelectorAll(".bottom-nav a").forEach(link=>{
  const url=new URL(link.getAttribute("href"),location.href);
  const candidate=url.searchParams.get("view");
  const destination=candidate==="blocks"||candidate==="transactions"?candidate
   :url.pathname.endsWith("/explorer.html")?"explorer":"home";
  const active=destination===pageView;
  link.classList.toggle("active",active);
  if(active)link.setAttribute("aria-current","page");
  else link.removeAttribute("aria-current");
 });
}
applyPageNavigation();

function short(s,n=12){s=esc(s);return s.length>n*2?s.slice(0,n)+"…"+s.slice(-n):s}
function ago(v){
 if(!v)return"—";
 const d=Math.max(0,(Date.now()-new Date(v).getTime())/1000);
 const unit=d<60?"time.seconds":d<3600?"time.minutes":d<86400?"time.hours":"time.days";
 const value=d<60?Math.floor(d):d<3600?Math.floor(d/60):d<86400?Math.floor(d/3600):Math.floor(d/86400);
 return window.BexentraPrefs?.get("language")==="en"?value+" "+tr(unit)+" "+tr("time.ago"):tr("time.ago")+" "+value+" "+tr(unit);
}
function syncNetworkUI(){const chain=network.value;if(networkIcon){networkIcon.src=chain==="bnb"?"public/bnb-mark.svg?v=2":"public/solana-mark.svg";networkIcon.alt=chain==="bnb"?"BNB Chain":"Solana"}if(summaryChainLabel)summaryChainLabel.textContent=chain==="bnb"?"BNB Chain":"Solana"}
function paintIndexSignal(mode){
 for(const id of ["heroSignal"]){
  const el=$(id);if(!el)continue;
  el.classList.toggle("is-recent",mode==="recent");
  el.classList.toggle("is-stale",mode==="stale");
 }
 const el=document.querySelector(".network-live");
 if(el){el.classList.toggle("is-recent",mode==="recent");el.classList.toggle("is-stale",mode==="stale")}
}
function makeIcon(name){
 const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
 svg.setAttribute("class","ui-icon");svg.setAttribute("aria-hidden","true");
 const use=document.createElementNS("http://www.w3.org/2000/svg","use");
 use.setAttribute("href","public/neon-icons.svg#"+name);
 svg.append(use);return svg;
}
function rowNavigation(el,url){
 el.classList.add("feed-row-link");
 el.tabIndex=0;el.setAttribute("role","link");
 el.addEventListener("click",e=>{if(e.target.closest("a,button"))return;location.href=url});
 el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();location.href=url}});
}
function setIndexStatus(v){
 if(!indexStatus||!indexStatusNote)return;
 if(!v || !Number.isFinite(new Date(v).getTime()) || new Date(v).getTime()>Date.now()+60000){paintIndexSignal("off");indexStatus.textContent="● "+tr("stats.noData");indexStatus.className="status-stale";indexStatusNote.textContent=tr("stats.noTimestamp");const live=$("statsLive");if(live)live.textContent=tr("stats.offline");return}
 const mins=Math.max(0,(Date.now()-new Date(v).getTime())/60000);const live=$("statsLive");
 if(mins<10){paintIndexSignal("recent");indexStatus.textContent="● "+tr("stats.updated");indexStatus.className="status-good";indexStatusNote.textContent=tr("stats.agePrefix")+" "+ago(v);if(live)live.textContent="● "+tr("stats.live")}
 else if(mins<45){paintIndexSignal("stale");indexStatus.textContent="● "+tr("stats.recent");indexStatus.className="status-wait";indexStatusNote.textContent=tr("stats.agePrefix")+" "+ago(v);if(live)live.textContent="● "+tr("stats.nearLive")}
 else{paintIndexSignal("stale");indexStatus.textContent="● "+tr("stats.stale");indexStatus.className="status-stale";indexStatusNote.textContent=tr("stats.agePrefix")+" "+ago(v);if(live)live.textContent="● "+tr("stats.needsUpdate")}
}
// A green "Live" status is only shown for a recent, actually observed RPC block.
function setOnchainStatus(block,observedAt){
 const timestamp=block?.block_time||observedAt;const elapsed=timestamp?Date.now()-new Date(timestamp).getTime():Infinity;
 const recent=Number.isFinite(elapsed)&&elapsed>=-30000&&elapsed<180000;
 paintIndexSignal(recent?"recent":"stale");
 if(indexStatus){
  indexStatus.textContent="● "+tr(recent?"stats.onchain":"stats.onchainSlow");
  indexStatus.className=recent?"status-good":"status-stale";
 }
 if(indexStatusNote)indexStatusNote.textContent=tr("stats.onchainAge")+" "+(timestamp?ago(timestamp):"—");
 const label=$("statsLive");
 if(label)label.textContent="● "+tr(recent?"stats.onchain":"stats.onchainSlow");
}
function detail(label,value){const d=document.createElement("div");d.className="detail";const s=document.createElement("span");s.textContent=label;const b=document.createElement("b");b.textContent=esc(value);d.append(s,b);return d}
function fail(target,msg){target.replaceChildren();const p=document.createElement("p");p.className="error";p.textContent=msg;target.append(p)}
// Public read-only API. Never send a database password or JWT to the browser.
async function request(path,params){
 const url=new URL(API+path);
 for(const [key,value] of Object.entries(params))url.searchParams.set(key,String(value));
 let response;
 try{response=await fetch(url,{method:"GET",mode:"cors",credentials:"omit",headers:{Accept:"application/json"}})}
 catch(e){throw Error(tr("api.error")+" "+e.message)}
 if(!response.ok){let body={};try{body=await response.json()}catch{}throw Error("API "+response.status+": "+(body.error||response.statusText))}
 return response.json();
}
async function blocks(chain,limit=8){const data=await request("/blocks",{chain,limit});return data.blocks||[]}
async function txs(chain,limit=8){const data=await request("/transactions",{chain,limit});return data.transactions||[]}
async function api(table,query){
 const q=new URLSearchParams(query),chain=(q.get("chain")||"eq.bnb").replace(/^eq\\./,"");
 if(table==="indexed_blocks"){
  const height=q.get("height");
  if(height){try{return [await request("/block",{chain,height:height.replace(/^eq\\./,"")})]}catch(e){if(e.message.includes("404"))return [];throw e}}
  return blocks(chain,Number(q.get("limit"))||8);
 }
 if(table==="indexed_transactions"){
  const hash=q.get("tx_hash");
  if(hash){try{return [await request("/tx",{chain,hash:hash.replace(/^eq\\./,"")})]}catch(e){if(e.message.includes("404"))return [];throw e}}
  const address=(q.get("sender")||q.get("recipient")||"").replace(/^eq\\./,"");
  if(address){const data=await request("/address",{chain,address,limit:Number(q.get("limit"))||20});return data.transactions||[]}
  return txs(chain,Number(q.get("limit"))||8);
 }
 throw Error("Unsupported resource");
}
function externalExplorer(chain,type,id){if(chain==="bnb")return "https://bscscan.com/"+(type==="tx"?"tx/":"block/")+id;return "https://solscan.io/"+(type==="tx"?"tx/":"block/")+id}
function internalExplorer(chain,type,id,height){
 const link="explorer.html?chain="+encodeURIComponent(chain)+"&type="+encodeURIComponent(type)+"&q="+encodeURIComponent(id);
 // Pass ONLY the real block height reported by API/SSE, not a claim about status or fees.
 // The detail API will independently verify the hash inside that chain block.
 return type==="tx"&&chain==="bnb"&&height!=null&&Number.isSafeInteger(Number(height))&&Number(height)>=0
  ?link+"&height="+encodeURIComponent(String(height)):link;
}
function detectType(q,forced="auto"){
 if(forced!=="auto")return forced;
 if(/^\d+$/.test(q))return "block";
 if(network.value==="bnb"&&/^(?:0x)?[a-fA-F0-9]{40}$/.test(q))return "address";
 if(network.value==="solana"&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q))return "address";
 return "tx";
}
// Keep a short, real observed-block history only while the browser is active.
// No numbers, confirmations, transfers, or blocks are invented for design purposes.
const observedBlocks={bnb:[],solana:[]};
// Indexed blocks are an optional, explicitly labeled supplement when live RPC
// has returned fewer blocks. No heights, hashes, or transaction counts are generated.
const indexedSamples={bnb:[],solana:[]};
const indexedSampleRequestedAt={bnb:0,solana:0};
async function refreshIndexedBlockSample(chain){
 if(pageView!=="blocks"||!(chain in indexedSamples))return;
 const now=Date.now();
 if(now-indexedSampleRequestedAt[chain]<60000)return;
 indexedSampleRequestedAt[chain]=now;
 try{
  const data=await blocks(chain,12);
  if(!Array.isArray(data))return;
  indexedSamples[chain]=data.filter(block=>
   block&&Number.isSafeInteger(Number(block.height))&&Number(block.height)>=0&&
   (block.chain==null||block.chain===chain))
   .map(block=>({...block,_indexed_sample:true})).slice(0,12);
  if(lastDashboardView?.chain===chain&&network.value===chain)
   renderDashboardView(lastDashboardView.view,chain);
 }catch(err){console.warn("BEXENTRA indexed sample unavailable",err?.message||err)}
}
let expandedBlocks=pageView==="blocks",expandedTx=pageView==="transactions",lastDashboardView=null;
function displayFeedButtons(){
 for(const [id,expanded] of [["refreshBlocks",expandedBlocks],["refreshTx",expandedTx]]){
  const button=$(id);if(!button)continue;
  button.textContent=tr(expanded?"data.showLess":"data.showAll");
  button.setAttribute("aria-expanded",String(expanded));
 }
}
function visibleBlocksFor(view,chain){
 const incoming=Array.isArray(view.blocks)?view.blocks:[];
 const live=view.source==="rpc_live"||view.source==="ws_live";
 let verified=incoming;
 if(live){
  const previous=observedBlocks[chain]||[];
  for(const block of incoming){
   const height=Number(block?.height);
   if(!Number.isSafeInteger(height)||height<0)continue;
   const old=previous.find(v=>Number(v.height)===height);
   const next={...old,...block,observed_at:old?.observed_at||new Date().toISOString()};
   const at=previous.findIndex(v=>Number(v.height)===height);
   if(at>=0)previous[at]=next;else previous.push(next);
  }
  previous.sort((a,b)=>Number(b.height)-Number(a.height));
  previous.splice(12);
  verified=previous;
 }
 if(pageView!=="blocks")return verified;
 const heights=new Map();
 for(const block of [...verified,...(indexedSamples[chain]||[])]){
  const height=Number(block?.height);
  if(!Number.isSafeInteger(height)||height<0||heights.has(height))continue;
  heights.set(height,block);
 }
 return [...heights.values()].sort((a,b)=>Number(b.height)-Number(a.height)).slice(0,12);
}
function renderDashboardView(view,chain){
 if(network.value!==chain)return;
 lastDashboardView={view,chain};
 const bs=visibleBlocksFor(view,chain);
 const ts=Array.isArray(view.transactions)?view.transactions:[];
 const onchain=view.source==="rpc_live"||view.source==="ws_live";
 const meta=$("categoryMeta");
 if(meta&&pageView!=="home"){
  const count=pageView==="blocks"?bs.length:ts.length;
  const label=tr(pageView==="blocks"?"nav.blocks":"nav.transactions");
  const mixed=onchain&&bs.some(b=>b._indexed_sample);
  const source=mixed?(document.documentElement.lang==="en"?"Network + partial index":"الشبكة + فهرس جزئي"):
   onchain?(document.documentElement.lang==="en"?"Network sample":"عينة من الشبكة"):
   (document.documentElement.lang==="en"?"Indexed data":"بيانات مفهرسة");
  meta.textContent=count+" "+label+" · "+source;
 }
 displayFeedButtons();
  $("summaryNetwork").textContent=chain==="bnb"?"BNB Smart Chain":"Solana";$("summaryHeight").textContent=bs[0]?Number(bs[0].height).toLocaleString("en-US"):"—";$("summaryTx").textContent=ts.length?String(ts.length):"—";
  $("metricHeight").textContent=bs[0]?Number(bs[0].height).toLocaleString("en-US"):"—";$("metricBlocks").textContent=bs.length?String(bs.length):"—";$("metricUpdated").textContent=bs[0]?ago(onchain?bs[0].block_time||view.last_event_at:bs[0].indexed_at):"—";if(onchain)setOnchainStatus(bs[0],view.source==="ws_live"?view.last_event_at:null);else{setIndexStatus(bs[0]?.indexed_at);const src=$("statsLive");if(src)src.textContent="◌ "+tr("stats.indexedOnly")};const blockLabel=$("summaryBlockLabel");if(blockLabel)blockLabel.textContent=tr(onchain?"stats.lastBlockOnchain":"stats.lastBlock");
  const rb=$("recentBlocks");rb.replaceChildren();if(!bs.length)rb.textContent=tr("api.emptyBlocks");
  bs.slice(0,expandedBlocks?12:3).forEach(block=>{
   const url=internalExplorer(chain,"block",block.height);
   const r=document.createElement("div");r.className="feed-row reference-row";
   const symbol=document.createElement("span");symbol.className="feed-icon";symbol.append(makeIcon("blocks"));
   const main=document.createElement("div");main.className="feed-main";
   const link=document.createElement("a");link.href=url;link.textContent=Number(block.height).toLocaleString("en-US");
   const age=document.createElement("small");
   age.textContent=block._indexed_sample
    ?(document.documentElement.lang==="en"?"Indexed · ":"مفهرس · ")+
      (block.block_time?ago(block.block_time):document.documentElement.lang==="en"?"block time unavailable":"وقت البلوك غير متوفر")
    :ago(block.block_time||block.observed_at||block.indexed_at);
   main.append(link,age);
   const count=document.createElement("span");count.className="feed-side";
   count.textContent=String(block.transaction_count??"—")+" "+tr("api.transactionsUnit");
   const more=document.createElement("span");more.className="feed-chevron";more.append(makeIcon("chevron"));
   r.append(symbol,main,count,more);rowNavigation(r,url);rb.append(r);
  });
  const rt=$("recentTransactions");rt.replaceChildren();
  if(!ts.length)rt.textContent=tr("api.emptyTx");
  ts.slice(0,expandedTx?12:3).forEach(tx=>{
   const url=internalExplorer(chain,"tx",tx.tx_hash,tx.block_height);
   const r=document.createElement("div");r.className="feed-row reference-row";
   const symbol=document.createElement("span");symbol.className="feed-icon";symbol.append(makeIcon("transactions"));
   const main=document.createElement("div");main.className="feed-main";
   const link=document.createElement("a");link.href=url;link.textContent=short(tx.tx_hash,10);
   const detail=document.createElement("small");detail.textContent=tx.block_height!=null?"Block "+Number(tx.block_height).toLocaleString("en-US"):short(tx.sender||tx.recipient||"—",10);
   main.append(link,detail);
   const status=document.createElement("span");status.className="feed-side";
   const isLiveTx=tx.source==="rpc_live"||tx.source==="ws_live"||onchain;
   status.textContent=tx.status==="failed"?tr("api.failed"):tx.status==="success"?tr("api.confirmed"):isLiveTx?tr("api.onchain"):tr("api.indexed");
   if(tx.status==="failed")status.classList.add("feed-failed");
   else if(isLiveTx)status.classList.add("feed-live");
   else status.classList.add("feed-unconfirmed");
   const more=document.createElement("span");more.className="feed-chevron";more.append(makeIcon("chevron"));
   r.append(symbol,main,status,more);rowNavigation(r,url);rt.append(r);
  });

}
async function loadDashboard(){
 const chain=network.value;
 if(pageView==="blocks")void refreshIndexedBlockSample(chain);
 if(window.BexentraStreamIsActive?.(chain))return;
 syncNetworkUI();$("metricNetwork").textContent=chain==="bnb"?"BNB Chain":"Solana";
 if(heroNetwork)heroNetwork.textContent=chain==="bnb"?"BNB CHAIN":"SOLANA";
 $("recentBlocks").textContent=tr("api.loading");
 $("recentTransactions").textContent=tr("api.loading");
 try{
  let view;
  try{view=await request("/live",{chain,limit:8})}
  catch(e){
   const [oldBlocks,oldTxs]=await Promise.all([blocks(chain),txs(chain)]);
   view={source:"indexed_snapshot",blocks:oldBlocks,transactions:oldTxs};
  }
  if(window.BexentraStreamIsActive?.(chain))return;
  renderDashboardView(view,chain);
 }catch(e){const msg=tr("api.error")+" "+(e&&e.message?e.message:"Unknown error");console.error("BEXENTRA API",e);setIndexStatus(null);$("summaryHeight").textContent="—";$("summaryTx").textContent="—";$("metricHeight").textContent="—";$("metricBlocks").textContent="—";$("metricUpdated").textContent="—";fail($("recentBlocks"),msg);fail($("recentTransactions"),msg);}
}
window.BexentraLive={
 render(view,chain){
  if(!view||view.source!=="ws_live"||!view.stream_connected)return;
  if(chain!==network.value)return;
  renderDashboardView(view,chain);
 },
 refresh:loadDashboard,
 chain:()=>network.value
};
async function findTx(hash,target){
 const chain=network.value;target.textContent=tr("api.finding");
 try{const rows=await api("indexed_transactions","select=*&chain=eq."+chain+"&tx_hash=eq."+encodeURIComponent(hash)+"&limit=1");target.replaceChildren();if(!rows.length){fail(target,tr("api.txMissing"));return}const t=rows[0];const h=document.createElement("p");h.className="result-title";h.textContent="Transaction";target.append(h,detail("Hash",t.tx_hash),detail("Block",t.block_height),detail("From",t.sender||"—"),detail("To",t.recipient||"—"),detail("Status",t.status||"—"),detail("Fee",t.fee_native||"—"))}catch(e){fail(target,tr("api.txError"))}
}
const txForm=$("txForm");if(txForm)txForm.addEventListener("submit",e=>{e.preventDefault();const q=$("txInput").value.trim();if(q)location.href=internalExplorer(network.value,"tx",q)});
function navigateSearch(raw,forced="auto",resultId="globalResult"){
 const parsed=window.BexentraSearch?.normalize(raw,network.value,forced);
 if(!parsed||parsed.error){
  const message=tr("search."+(parsed?.error||"invalid"));
  const target=$(resultId);
  if(target)target.textContent=message;
  return;
 }
 location.href=internalExplorer(network.value,parsed.type,parsed.value);
}
$("globalSearch").addEventListener("submit",e=>{
 e.preventDefault();navigateSearch($("globalInput").value,$("searchType").value);
});
function toggleFeed(which){
 if(which==="blocks")expandedBlocks=!expandedBlocks;
 else expandedTx=!expandedTx;
 displayFeedButtons();
 if(lastDashboardView?.chain===network.value)
  renderDashboardView(lastDashboardView.view,network.value);
 else loadDashboard();
}
$("refreshBlocks").addEventListener("click",()=>toggleFeed("blocks"));
$("refreshTx").addEventListener("click",()=>toggleFeed("transactions"));
network.addEventListener("change",()=>{expandedBlocks=false;expandedTx=false;displayFeedButtons();try{localStorage.setItem("bexentra-network",network.value)}catch{}syncNetworkUI();const gr=$("globalResult");if(gr)gr.replaceChildren();const tr=$("txResult");if(tr)tr.replaceChildren();loadDashboard()});
try{const savedNetwork=localStorage.getItem("bexentra-network");if(savedNetwork==="bnb"||savedNetwork==="solana")network.value=savedNetwork}catch{}
syncNetworkUI();
// Theme and language are managed centrally by public/preferences.js.
loadDashboard();
const mobileSearch=$("mobileSearch");
if(mobileSearch)mobileSearch.addEventListener("submit",e=>{e.preventDefault();navigateSearch($("mobileInput").value,"auto","globalResult")});

const quickRefresh=$("quickRefresh");if(quickRefresh)quickRefresh.addEventListener("click",loadDashboard);
const menu=$("mobileMenu"),backdrop=$("menuBackdrop"),menuToggle=$("menuToggle"),menuClose=$("menuClose");
function setMenu(open){
 if(!menu||!backdrop)return;
 menu.classList.toggle("open",open);backdrop.classList.toggle("show",open);
 menu.setAttribute("aria-hidden",String(!open));
 menuToggle?.setAttribute("aria-expanded",String(open));
 if(open)menuClose?.focus();
 else if(menu.contains(document.activeElement))menuToggle?.focus();
}
if(menuToggle)menuToggle.addEventListener("click",()=>setMenu(true));
if(menuClose)menuClose.addEventListener("click",()=>setMenu(false));
if(backdrop)backdrop.addEventListener("click",()=>setMenu(false));
if(menu)menu.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>setMenu(false)));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&menu?.classList.contains("open"))setMenu(false)});

let refreshTimer=setInterval(()=>{if(!document.hidden && window.BexentraPrefs?.get("refresh")!=="off")loadDashboard()},15000);
document.addEventListener("bexentra:preferenceschange",e=>{if(e.detail?.key==="language"||e.detail?.key==="reset"){applyPageNavigation();displayFeedButtons();loadDashboard()}});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)loadDashboard()});
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
