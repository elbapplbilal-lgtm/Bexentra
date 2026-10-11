"use strict";
const $=id=>document.getElementById(id);
const API="https://br-old-sun-b5txcoym-bexentraapi.compute.c-7.us-east-2.aws.neon.tech";
const network=$("network");
const heroNetwork=$("heroNetwork");
const indexStatus=$("indexStatus"),indexStatusNote=$("indexStatusNote");
const esc=s=>String(s??"");
function short(s,n=12){s=esc(s);return s.length>n*2?s.slice(0,n)+"…"+s.slice(-n):s}
function ago(v){if(!v)return"—";const d=Math.max(0,(Date.now()-new Date(v).getTime())/1000);if(d<60)return Math.floor(d)+"s ago";if(d<3600)return Math.floor(d/60)+"m ago";if(d<86400)return Math.floor(d/3600)+"h ago";return Math.floor(d/86400)+"d ago"}
function setIndexStatus(v){
 if(!indexStatus||!indexStatusNote)return;
 if(!v){indexStatus.textContent="● لا بيانات";indexStatus.className="status-stale";indexStatusNote.textContent="No indexed timestamp";return}
 const mins=Math.max(0,(Date.now()-new Date(v).getTime())/60000);
 if(mins<10){indexStatus.textContent="● حديث";indexStatus.className="status-good";indexStatusNote.textContent="Updated "+ago(v)}
 else if(mins<45){indexStatus.textContent="● بانتظار دورة";indexStatus.className="status-wait";indexStatusNote.textContent="Updated "+ago(v)}
 else{indexStatus.textContent="● قديم";indexStatus.className="status-stale";indexStatusNote.textContent="Updated "+ago(v)}
}
function detail(label,value){const d=document.createElement("div");d.className="detail";const s=document.createElement("span");s.textContent=label;const b=document.createElement("b");b.textContent=esc(value);d.append(s,b);return d}
function fail(target,msg){target.replaceChildren();const p=document.createElement("p");p.className="error";p.textContent=msg;target.append(p)}
// Public read-only API. Never send a database password or JWT to the browser.
async function request(path,params){
 const url=new URL(API+path);
 for(const [key,value] of Object.entries(params))url.searchParams.set(key,String(value));
 let response;
 try{response=await fetch(url,{method:"GET",mode:"cors",credentials:"omit",headers:{Accept:"application/json"}})}
 catch(e){throw Error("تعذر الاتصال بالخادم: "+e.message)}
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
 const chain=network.value; $("metricNetwork").textContent=chain==="bnb"?"BNB Chain":"Solana";if(heroNetwork)heroNetwork.textContent=chain==="bnb"?"BNB CHAIN":"SOLANA";$("recentBlocks").textContent="جاري التحميل...";$("recentTransactions").textContent="جاري التحميل...";
 try{
  const [bs,ts]=await Promise.all([blocks(chain),txs(chain)]);
  if(network.value!==chain)return;
  $("summaryNetwork").textContent=chain==="bnb"?"BNB Smart Chain":"Solana";$("summaryHeight").textContent=bs[0]?Number(bs[0].height).toLocaleString("en-US"):"—";$("summaryTx").textContent=ts.length?ts.length+"+":"—";
  $("metricHeight").textContent=bs[0]?Number(bs[0].height).toLocaleString("en-US"):"—";$("metricBlocks").textContent=bs.length?String(bs.length):"—";$("metricUpdated").textContent=bs[0]?ago(bs[0].indexed_at):"—";setIndexStatus(bs[0]?.indexed_at);
  const rb=$("recentBlocks");rb.replaceChildren();if(!bs.length)rb.textContent="لا توجد بلوكات مفهرسة لهذه الشبكة بعد.";
  bs.slice(0,6).forEach(b=>{const r=document.createElement("div");r.className="feed-row";const i=document.createElement("span");i.className="feed-icon";i.textContent="BK";const m=document.createElement("div");m.className="feed-main";const a=document.createElement("a");a.href=internalExplorer(chain,"block",b.height);a.textContent=(chain==="bnb"?"Block ":"Slot ")+Number(b.height).toLocaleString("en-US");const s=document.createElement("small");s.textContent=(b.transaction_count??0)+" معاملات";m.append(a,s);const side=document.createElement("span");side.className="feed-side";side.textContent=ago(b.indexed_at);r.append(i,m,side);rb.append(r)});
  const rt=$("recentTransactions");rt.replaceChildren();if(!ts.length)rt.textContent="لا توجد معاملات مفهرسة لهذه الشبكة بعد.";
  ts.slice(0,6).forEach(t=>{const r=document.createElement("div");r.className="feed-row";const i=document.createElement("span");i.className="feed-icon";i.textContent="TX";const m=document.createElement("div");m.className="feed-main";const a=document.createElement("a");a.href=internalExplorer(chain,"tx",t.tx_hash);a.textContent=short(t.tx_hash,10);const s=document.createElement("small");s.textContent="Block "+Number(t.block_height).toLocaleString("en-US");m.append(a,s);const side=document.createElement("span");side.className="feed-side";side.textContent=t.status||"indexed";r.append(i,m,side);rt.append(r)});
 }catch(e){const msg="خطأ الاتصال: "+(e&&e.message?e.message:"Unknown error");console.error("BEXENTRA API",e);setIndexStatus(null);fail($("recentBlocks"),msg);fail($("recentTransactions"),msg);}
}
async function findTx(hash,target){
 const chain=network.value;target.textContent="جاري البحث في فهرس BEXENTRA...";
 try{const rows=await api("indexed_transactions","select=*&chain=eq."+chain+"&tx_hash=eq."+encodeURIComponent(hash)+"&limit=1");target.replaceChildren();if(!rows.length){fail(target,"المعاملة غير موجودة في الجزء المفهرس حالياً.");return}const t=rows[0];const h=document.createElement("p");h.className="result-title";h.textContent="Transaction";target.append(h,detail("Hash",t.tx_hash),detail("Block",t.block_height),detail("From",t.sender||"—"),detail("To",t.recipient||"—"),detail("Status",t.status||"—"),detail("Fee",t.fee_native||"—"))}catch(e){fail(target,"تعذر البحث حالياً.")}
}
$("txForm").addEventListener("submit",e=>{e.preventDefault();const q=$("txInput").value.trim();if(q)location.href=internalExplorer(network.value,"tx",q)});
$("globalSearch").addEventListener("submit",e=>{e.preventDefault();const q=$("globalInput").value.trim();if(!q)return;location.href=internalExplorer(network.value,detectType(q,$("searchType").value),q)});
$("refreshBlocks").addEventListener("click",loadDashboard);$("refreshTx").addEventListener("click",loadDashboard);
network.addEventListener("change",()=>{try{localStorage.setItem("bexentra-network",network.value)}catch{}$("globalResult").replaceChildren();$("txResult").replaceChildren();loadDashboard()});
try{const savedNetwork=localStorage.getItem("bexentra-network");if(savedNetwork==="bnb"||savedNetwork==="solana")network.value=savedNetwork}catch{}
const theme=$("themeToggle");let light=false;try{light=localStorage.getItem("bexentra-theme")==="light"}catch{}function paint(){document.body.classList.toggle("light-mode",light);theme.textContent=light?"☀":"☾"}paint();theme.addEventListener("click",()=>{light=!light;paint();try{localStorage.setItem("bexentra-theme",light?"light":"dark")}catch{}});
loadDashboard();
$("mobileSearch").addEventListener("submit",e=>{e.preventDefault();const q=$("mobileInput").value.trim();if(!q)return;$("globalInput").value=q;if(/^\d+$/.test(q))$("searchType").value="block";else $("searchType").value="auto";$("globalSearch").requestSubmit();$("globalResult").scrollIntoView({behavior:"smooth",block:"center"})});

const quickRefresh=$("quickRefresh");if(quickRefresh)quickRefresh.addEventListener("click",loadDashboard);
const menu=$("mobileMenu"),backdrop=$("menuBackdrop"),menuToggle=$("menuToggle"),menuClose=$("menuClose");
function setMenu(open){if(!menu||!backdrop)return;menu.classList.toggle("open",open);backdrop.classList.toggle("show",open);menu.setAttribute("aria-hidden",String(!open));}
if(menuToggle)menuToggle.addEventListener("click",()=>setMenu(true));
if(menuClose)menuClose.addEventListener("click",()=>setMenu(false));
if(backdrop)backdrop.addEventListener("click",()=>setMenu(false));
if(menu)menu.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>setMenu(false)));

let refreshTimer=setInterval(()=>{if(!document.hidden)loadDashboard()},15000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)loadDashboard()});
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
