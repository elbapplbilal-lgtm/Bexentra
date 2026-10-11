"use strict";
const $=id=>document.getElementById(id);
const API="https://ep-little-frog-b530n23k.apirest.c-7.us-east-2.aws.neon.tech/neondb/rest/v1";
const network=$("network");
const esc=s=>String(s??"");
function short(s,n=12){s=esc(s);return s.length>n*2?s.slice(0,n)+"…"+s.slice(-n):s}
function ago(v){if(!v)return"—";const d=Math.max(0,(Date.now()-new Date(v).getTime())/1000);if(d<60)return Math.floor(d)+"s ago";if(d<3600)return Math.floor(d/60)+"m ago";return Math.floor(d/3600)+"h ago"}
function detail(label,value){const d=document.createElement("div");d.className="detail";const s=document.createElement("span");s.textContent=label;const b=document.createElement("b");b.textContent=esc(value);d.append(s,b);return d}
function fail(target,msg){target.replaceChildren();const p=document.createElement("p");p.className="error";p.textContent=msg;target.append(p)}
async function api(table,query){const url=API+"/"+table+"?"+query;const r=await fetch(url,{method:"GET",mode:"cors",credentials:"omit",headers:{Accept:"application/json"}});if(!r.ok){const body=await r.text().catch(()=>"");throw Error("API "+r.status+" "+body.slice(0,120))}return r.json()}
async function blocks(chain,limit=8){return api("indexed_blocks","select=chain,height,block_hash,block_time,transaction_count,indexed_at&chain=eq."+chain+"&order=height.desc&limit="+limit)}
async function txs(chain,limit=8){return api("indexed_transactions","select=chain,tx_hash,block_height,sender,recipient,status,fee_native,indexed_at&chain=eq."+chain+"&order=block_height.desc&limit="+limit)}
function explorer(chain,type,id){if(chain==="bnb")return "https://bscscan.com/"+(type==="tx"?"tx/":"block/")+id;return "https://solscan.io/"+(type==="tx"?"tx/":"block/")+id}
async function loadDashboard(){
 const chain=network.value; $("metricNetwork").textContent=chain==="bnb"?"BNB Chain":"Solana";$("recentBlocks").textContent="جاري التحميل...";$("recentTransactions").textContent="جاري التحميل...";
 try{
  const [bs,ts]=await Promise.all([blocks(chain),txs(chain)]);
  if(network.value!==chain)return;
  $("summaryNetwork").textContent=chain==="bnb"?"BNB Smart Chain":"Solana";$("summaryHeight").textContent=bs[0]?Number(bs[0].height).toLocaleString("en-US"):"—";$("summaryTx").textContent=ts.length?ts.length+"+":"—";
  $("metricHeight").textContent=bs[0]?Number(bs[0].height).toLocaleString("en-US"):"—";$("metricBlocks").textContent=bs.length?bs.length+"+":"—";$("metricUpdated").textContent=bs[0]?ago(bs[0].indexed_at):"—";
  const rb=$("recentBlocks");rb.replaceChildren();if(!bs.length)rb.textContent="لا توجد بلوكات مفهرسة لهذه الشبكة بعد.";
  bs.slice(0,6).forEach(b=>{const r=document.createElement("div");r.className="feed-row";const i=document.createElement("span");i.className="feed-icon";i.textContent="BK";const m=document.createElement("div");m.className="feed-main";const a=document.createElement("a");a.href=explorer(chain,"block",b.height);a.target="_blank";a.rel="noopener";a.textContent=(chain==="bnb"?"Block ":"Slot ")+Number(b.height).toLocaleString("en-US");const s=document.createElement("small");s.textContent=(b.transaction_count??0)+" معاملات";m.append(a,s);const side=document.createElement("span");side.className="feed-side";side.textContent=ago(b.indexed_at);r.append(i,m,side);rb.append(r)});
  const rt=$("recentTransactions");rt.replaceChildren();if(!ts.length)rt.textContent="لا توجد معاملات مفهرسة لهذه الشبكة بعد.";
  ts.slice(0,6).forEach(t=>{const r=document.createElement("div");r.className="feed-row";const i=document.createElement("span");i.className="feed-icon";i.textContent="TX";const m=document.createElement("div");m.className="feed-main";const a=document.createElement("a");a.href=explorer(chain,"tx",t.tx_hash);a.target="_blank";a.rel="noopener";a.textContent=short(t.tx_hash,10);const s=document.createElement("small");s.textContent="Block "+Number(t.block_height).toLocaleString("en-US");m.append(a,s);const side=document.createElement("span");side.className="feed-side";side.textContent=t.status||"indexed";r.append(i,m,side);rt.append(r)});
 }catch(e){fail($("recentBlocks"),"تعذر قراءة فهرس BEXENTRA.");fail($("recentTransactions"),"تعذر قراءة المعاملات.");}
}
async function findTx(hash,target){
 const chain=network.value;target.textContent="جاري البحث في فهرس BEXENTRA...";
 try{const rows=await api("indexed_transactions","select=*&chain=eq."+chain+"&tx_hash=eq."+encodeURIComponent(hash)+"&limit=1");target.replaceChildren();if(!rows.length){fail(target,"المعاملة غير موجودة في الجزء المفهرس حالياً.");return}const t=rows[0];const h=document.createElement("p");h.className="result-title";h.textContent="Transaction";target.append(h,detail("Hash",t.tx_hash),detail("Block",t.block_height),detail("From",t.sender||"—"),detail("To",t.recipient||"—"),detail("Status",t.status||"—"),detail("Fee",t.fee_native||"—"))}catch(e){fail(target,"تعذر البحث حالياً.")}
}
$("txForm").addEventListener("submit",e=>{e.preventDefault();findTx($("txInput").value.trim(),$("txResult"))});
$("globalSearch").addEventListener("submit",async e=>{e.preventDefault();const q=$("globalInput").value.trim(),type=$("searchType").value,target=$("globalResult");if(!q)return;if(type==="block"||(/^\d+$/.test(q)&&type==="auto")){try{const rows=await api("indexed_blocks","select=*&chain=eq."+network.value+"&height=eq."+q+"&limit=1");target.replaceChildren();if(!rows.length){fail(target,"البلوك غير موجود في الفهرس الحالي.");return}const b=rows[0];target.append(detail("Block / Slot",b.height),detail("Hash",b.block_hash),detail("Transactions",b.transaction_count),detail("Indexed",b.indexed_at))}catch{fail(target,"تعذر البحث.")}return}if(type==="tx"||type==="auto"){findTx(q,target);return}fail(target,"بحث العناوين الكامل سيتم تفعيله مع توسيع الفهرس.")});
$("refreshBlocks").addEventListener("click",loadDashboard);$("refreshTx").addEventListener("click",loadDashboard);network.addEventListener("change",()=>{$("globalResult").replaceChildren();$("txResult").replaceChildren();loadDashboard()});
const theme=$("themeToggle");let light=false;try{light=localStorage.getItem("bexentra-theme")==="light"}catch{}function paint(){document.body.classList.toggle("light-mode",light);theme.textContent=light?"☀":"☾"}paint();theme.addEventListener("click",()=>{light=!light;paint();try{localStorage.setItem("bexentra-theme",light?"light":"dark")}catch{}});
loadDashboard();
$("mobileSearch").addEventListener("submit",e=>{e.preventDefault();const q=$("mobileInput").value.trim();if(!q)return;$("globalInput").value=q;if(/^\d+$/.test(q))$("searchType").value="block";else $("searchType").value="auto";$("globalSearch").requestSubmit();$("globalResult").scrollIntoView({behavior:"smooth",block:"center"})});
