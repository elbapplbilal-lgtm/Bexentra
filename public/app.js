"use strict";
const $=id=>document.getElementById(id);
const API="https://br-old-sun-b5txcoym-bexentraapi.compute.c-7.us-east-2.aws.neon.tech";
const network=$("network");
const heroNetwork=$("heroNetwork");
const networkIcon=$("networkIcon"),summaryChainLabel=$("summaryChainLabel");
const indexStatus=$("indexStatus"),indexStatusNote=$("indexStatusNote");
const esc=s=>String(s??"");
const tr=k=>window.BexentraPrefs?.t(k)??k;
function short(s,n=12){s=esc(s);return s.length>n*2?s.slice(0,n)+"…"+s.slice(-n):s}
function ago(v){
 if(!v)return"—";
 const d=Math.max(0,(Date.now()-new Date(v).getTime())/1000);
 const unit=d<60?"time.seconds":d<3600?"time.minutes":d<86400?"time.hours":"time.days";
 const value=d<60?Math.floor(d):d<3600?Math.floor(d/60):d<86400?Math.floor(d/3600):Math.floor(d/86400);
 return window.BexentraPrefs?.get("language")==="en"?value+" "+tr(unit)+" "+tr("time.ago"):tr("time.ago")+" "+value+" "+tr(unit);
}
function syncNetworkUI(){const chain=network.value;if(networkIcon){networkIcon.src=chain==="bnb"?"public/bnb-mark.svg":"public/solana-mark.svg";networkIcon.alt=chain==="bnb"?"BNB Chain":"Solana"}if(summaryChainLabel)summaryChainLabel.textContent=chain==="bnb"?"BNB Chain":"Solana"}
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
function internalExplorer(chain,type,id){return "explorer.html?chain="+encodeURIComponent(chain)+"&type="+encodeURIComponent(type)+"&q="+encodeURIComponent(id)}
function detectType(q,forced="auto"){
 if(forced!=="auto")return forced;
 if(/^\d+$/.test(q))return "block";
 if(network.value==="bnb"&&/^(?:0x)?[a-fA-F0-9]{40}$/.test(q))return "address";
 if(network.value==="solana"&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q))return "address";
 return "tx";
}
async function loadDashboard(){
 const chain=network.value;syncNetworkUI(); $("metricNetwork").textContent=chain==="bnb"?"BNB Chain":"Solana";if(heroNetwork)heroNetwork.textContent=chain==="bnb"?"BNB CHAIN":"SOLANA";$("recentBlocks").textContent=tr("api.loading");$("recentTransactions").textContent=tr("api.loading");
 try{
  const [bs,ts]=await Promise.all([blocks(chain),txs(chain)]);
  if(network.value!==chain)return;
  $("summaryNetwork").textContent=chain==="bnb"?"BNB Smart Chain":"Solana";$("summaryHeight").textContent=bs[0]?Number(bs[0].height).toLocaleString("en-US"):"—";$("summaryTx").textContent=ts.length?String(ts.length):"—";
  $("metricHeight").textContent=bs[0]?Number(bs[0].height).toLocaleString("en-US"):"—";$("metricBlocks").textContent=bs.length?String(bs.length):"—";$("metricUpdated").textContent=bs[0]?ago(bs[0].indexed_at):"—";setIndexStatus(bs[0]?.indexed_at);
  const rb=$("recentBlocks");rb.replaceChildren();if(!bs.length)rb.textContent=tr("api.emptyBlocks");
  bs.slice(0,3).forEach(b=>{const r=document.createElement("div");r.className="feed-row";const i=document.createElement("span");i.className="feed-icon";i.append(makeIcon("blocks"));const m=document.createElement("div");m.className="feed-main";const a=document.createElement("a");a.href=internalExplorer(chain,"block",b.height);a.textContent=Number(b.height).toLocaleString("en-US");const s=document.createElement("small");s.textContent=(b.transaction_count??0)+" "+tr("api.transactionsUnit");m.append(a,s);const side=document.createElement("span");side.className="feed-side";side.textContent=ago(b.block_time||b.indexed_at);r.append(i,m,side);rowNavigation(r,a.href);rb.append(r)});
  const rt=$("recentTransactions");rt.replaceChildren();if(!ts.length)rt.textContent=tr("api.emptyTx");
  ts.slice(0,3).forEach(t=>{const r=document.createElement("div");r.className="feed-row";const i=document.createElement("span");i.className="feed-icon";i.append(makeIcon("transactions"));const m=document.createElement("div");m.className="feed-main";const a=document.createElement("a");a.href=internalExplorer(chain,"tx",t.tx_hash);a.textContent=short(t.tx_hash,10);const s=document.createElement("small");s.textContent=t.sender||t.recipient?(short(t.sender||"—",6)+" → "+short(t.recipient||"—",6)):"Block "+Number(t.block_height).toLocaleString("en-US");m.append(a,s);const side=document.createElement("span");side.className="feed-side";side.textContent=t.status==="failed"?tr("api.failed"):t.status==="success"?tr("api.confirmed"):tr("api.indexed");r.append(i,m,side);rowNavigation(r,a.href);rt.append(r)});
 }catch(e){const msg=tr("api.error")+" "+(e&&e.message?e.message:"Unknown error");console.error("BEXENTRA API",e);setIndexStatus(null);$("summaryHeight").textContent="—";$("summaryTx").textContent="—";$("metricHeight").textContent="—";$("metricBlocks").textContent="—";$("metricUpdated").textContent="—";fail($("recentBlocks"),msg);fail($("recentTransactions"),msg);}
}
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
$("refreshBlocks").addEventListener("click",loadDashboard);$("refreshTx").addEventListener("click",loadDashboard);
network.addEventListener("change",()=>{try{localStorage.setItem("bexentra-network",network.value)}catch{}syncNetworkUI();const gr=$("globalResult");if(gr)gr.replaceChildren();const tr=$("txResult");if(tr)tr.replaceChildren();loadDashboard()});
try{const savedNetwork=localStorage.getItem("bexentra-network");if(savedNetwork==="bnb"||savedNetwork==="solana")network.value=savedNetwork}catch{}
syncNetworkUI();
// Theme and language are managed centrally by public/preferences.js.
loadDashboard();
const mobileSearch=$("mobileSearch");
if(mobileSearch)mobileSearch.addEventListener("submit",e=>{e.preventDefault();navigateSearch($("mobileInput").value,"auto","globalResult")});

const quickRefresh=$("quickRefresh");if(quickRefresh)quickRefresh.addEventListener("click",loadDashboard);
const menu=$("mobileMenu"),backdrop=$("menuBackdrop"),menuToggle=$("menuToggle"),menuClose=$("menuClose");
function setMenu(open){if(!menu||!backdrop)return;menu.classList.toggle("open",open);backdrop.classList.toggle("show",open);menu.setAttribute("aria-hidden",String(!open));}
if(menuToggle)menuToggle.addEventListener("click",()=>setMenu(true));
if(menuClose)menuClose.addEventListener("click",()=>setMenu(false));
if(backdrop)backdrop.addEventListener("click",()=>setMenu(false));
if(menu)menu.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>setMenu(false)));

let refreshTimer=setInterval(()=>{if(!document.hidden && window.BexentraPrefs?.get("refresh")!=="off")loadDashboard()},15000);
document.addEventListener("bexentra:preferenceschange",e=>{if(e.detail?.key==="language"||e.detail?.key==="reset")loadDashboard()});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)loadDashboard()});
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
