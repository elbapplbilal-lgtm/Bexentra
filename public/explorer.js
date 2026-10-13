"use strict";
const API="https://br-old-sun-b5txcoym-bexentraapi.compute.c-7.us-east-2.aws.neon.tech";
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
let chain=params.get("chain")==="solana"?"solana":"bnb";
let type=params.get("type")||"auto";
if(!["auto","block","tx","address"].includes(type))type="auto";
let query=params.get("q")||"";
const esc=v=>String(v??"—");
const tr=k=>window.BexentraPrefs?.t(k)??k;
function formatNativeFee(baseUnits,chain){
 if(baseUnits===null||baseUnits===undefined||baseUnits==="")return tr("details.unavailable");
 try{
  // pg NUMERIC serializes as an integer string of wei or lamports.
  // Keep all base-unit precision instead of using lossy IEEE-754 Number.
  const original=String(baseUnits);
  if(!/^\d+$/.test(original))return tr("details.unavailable");
  const amount=BigInt(original);
  const decimals=chain==="bnb"?18:9;
  const unit=chain==="bnb"?"BNB":"SOL";
  const scale=10n**BigInt(decimals);
  const whole=(amount/scale).toString();
  const fraction=(amount%scale).toString().padStart(decimals,"0").replace(/0+$/,"");
  return whole+(fraction?"."+fraction:"")+" "+unit;
 }catch{return tr("details.unavailable")}
}

function short(v,n=12){v=esc(v);return v.length>n*2?v.slice(0,n)+"…"+v.slice(-n):v}
function detect(q,t="auto"){if(t!=="auto")return t;if(/^\d+$/.test(q))return"block";if(chain==="bnb"&&/^(?:0x)?[a-fA-F0-9]{40}$/.test(q))return"address";if(chain==="solana"&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q))return"address";return"tx"}
function ext(t,id){if(chain==="bnb")return"https://bscscan.com/"+(t==="tx"?"tx/":t==="address"?"address/":"block/")+id;return"https://solscan.io/"+(t==="tx"?"tx/":t==="address"?"account/":"block/")+id}
async function request(path,p){const u=new URL(API+path);Object.entries(p).forEach(([k,v])=>u.searchParams.set(k,v));const r=await fetch(u,{credentials:"omit",headers:{Accept:"application/json"}});if(!r.ok){let b={};try{b=await r.json()}catch{}throw Error(b.error||("API "+r.status))}return r.json()}
function row(label,value,copy=false){const d=document.createElement("div");d.className="explorer-field";const l=document.createElement("span");l.textContent=label;const wrap=document.createElement("div");const b=document.createElement("b");b.textContent=esc(value);wrap.append(b);if(copy&&value){const c=document.createElement("button");c.type="button";c.className="mini-copy";c.textContent=tr("details.copy");c.onclick=()=>copyText(value,c);wrap.append(c)}d.append(l,wrap);return d}
async function copyText(value,button){try{await navigator.clipboard.writeText(String(value));button.textContent=tr("details.copyDone");setTimeout(()=>button.textContent=tr("details.copy"),1200)}catch{}}
function showError(msg,title){
 $("detailLoading").hidden=true;
 $("detailOverview").hidden=true;
 $("addressActivity").hidden=true;
 $("tokenActivity").hidden=true;
 $("detailError").hidden=false;
 $("detailTitle").textContent=title||tr("details.lookupErrorTitle");
 $("detailSubtitle").textContent=tr("details.subtitle");
 $("detailNetwork").textContent=chain==="bnb"?"BNB CHAIN":"SOLANA";
 $("detailError").textContent=msg;
}
function start(title){showProvenance("indexed");$("detailLoading").hidden=false;$("detailError").hidden=true;$("detailOverview").hidden=true;$("addressActivity").hidden=true;$("tokenActivity").hidden=true;$("detailTitle").textContent=title;$("detailNetwork").textContent=chain==="bnb"?"BNB CHAIN":"SOLANA"}
function showProvenance(source){
 const live=source==="rpc_live"||source==="indexed_plus_rpc";
 const title=$("detailSideTitle"),message=$("detailSideText");
 if(title)title.textContent=tr(live?"details.liveSideTitle":"details.sideTitle");
 if(message)message.textContent=tr(live?"details.liveSideText":"details.sideText");
}
function finish(title,subtitle,fields,primary,externalType){$("detailLoading").hidden=true;$("detailOverview").hidden=false;$("detailTitle").textContent=title;$("detailSubtitle").textContent=subtitle;$("overviewTitle").textContent=title;$("detailFields").replaceChildren(...fields);$("externalLink").href=ext(externalType,primary);$("copyPrimary").onclick=()=>copyText(primary,$("copyPrimary"))}
async function loadBlock(){
 start(chain==="bnb"?tr("details.loadBlock"):tr("details.loadSlot"));
 const b=await request("/block",{chain,height:query});
 const fromRpc=b.source==="rpc_live";
 const fields=[row("Height / Slot",b.height,true),row("Block Hash",b.block_hash,true),
  row("Transactions",b.transaction_count),row("Block Time",b.block_time)];
 if(b.indexed_at)fields.push(row("Indexed At",b.indexed_at));
 fields.push(row(tr("details.source"),tr(fromRpc?"details.sourceLive":"details.sourceIndexed")));
 finish((chain==="bnb"?"Block ":"Slot ")+Number(b.height).toLocaleString("en-US"),
  tr(fromRpc?"details.liveBlockSource":"details.subtitle"),fields,b.height,"block");
 showProvenance(b.source);
}
async function loadTx(){
 start(tr("details.loadTx"));
 const t=await request("/tx",{chain,hash:query});
 if(t.source==="token_transfers_only"){
  const transfers=Array.isArray(t.token_transfers)?t.token_transfers:[];
  finish(tr("details.txTitle"),tr("details.tokenOnlySubtitle"),[
   row(tr("details.txHash"),t.tx_hash,true),
   row(tr("details.block"),t.block_height,true),
   row(tr("details.transferCount"),transfers.length),
   row(tr("details.detailsLabel"),tr("details.tokenOnlyLabel")),
   row("Status / Fee",tr("details.noNativeStatus"))
  ],t.tx_hash,"tx");
  $("tokenActivity").hidden=false;
  $("tokenCount").textContent=transfers.length+" EVENTS";
  renderTokenEvents(transfers,"");
  return;
 }
 finish(tr("details.txTitle"),t.source==="rpc_live"?tr("details.liveTxSource"):t.source==="indexed_plus_rpc"?tr("details.augmentedSource"):short(t.tx_hash,18),[
  row(tr("details.txHash"),t.tx_hash,true),
  row("Block / Slot",t.block_height,true),
  row(tr("details.from"),t.sender||"—",!!t.sender),
  row(tr("details.to"),t.recipient||"—",!!t.recipient),
  row("Status",t.status==="success"?tr("details.confirmed"):t.status==="failed"?tr("details.failed"):t.status==="indexed"?tr("details.indexed"):(t.status||tr("details.unavailable"))),
  row("Fee",formatNativeFee(t.fee_native,chain)),
  ...(t.indexed_at?[row("Indexed At",t.indexed_at)]:[]),
  row(tr("details.source"),tr(t.source==="rpc_live"||t.source==="indexed_plus_rpc"?"details.sourceLive":"details.sourceIndexed"))
 ],t.tx_hash,"tx");
 showProvenance(t.source);
}
// Read only the BEP-20 transfers indexed so far; amounts are raw base units.
function renderTokenEvents(transfers,address){
 const feed=$("tokenFeed");
 feed.replaceChildren();
 if(!transfers.length){feed.textContent=tr("details.tokenEmpty");return}
 const own=String(address||"").toLowerCase();
  transfers.forEach(t=>{
   const from=String(t.sender||""),to=String(t.recipient||"");
   const outgoing=from.toLowerCase()===own,incoming=to.toLowerCase()===own;
   const direction=outgoing&&incoming?"IN / OUT":outgoing?"OUT":incoming?"IN":"EVENT";
   // Native expandable details keep users on BEXENTRA; external verification is optional.
   const item=document.createElement("details");
   item.className="token-transfer";
   const summary=document.createElement("summary");
   summary.className="feed-row clickable";
   summary.setAttribute("aria-label",tr("details.viewTransfer"));
   const symbol=document.createElement("span");
   symbol.className="feed-icon";
   symbol.textContent=direction==="IN"?"↓":direction==="OUT"?"↑":"⇄";
   const main=document.createElement("div");
   main.className="feed-main";
   const hash=document.createElement("b");
   hash.textContent=short(t.tx_hash,12);
   const token=document.createElement("small");
   token.textContent="Token: "+short(t.token_address,10)+" · Block "+esc(t.block_height);
   const amount=document.createElement("small");
   amount.textContent="Raw amount: "+esc(t.amount_raw);
   const side=document.createElement("span");
   side.className="feed-side";
   side.textContent=direction+" · "+tr("details.detailsLabel");
   main.append(hash,token,amount);
   summary.append(symbol,main,side);
   const details=document.createElement("div");
   details.className="token-transfer-details";
   function field(label,value,isAddress=false){
    const line=document.createElement("div");line.className="token-detail-field";
    const name=document.createElement("span");name.textContent=label;
    const val=document.createElement(isAddress?"a":"span");
    val.textContent=String(value??"—");
    if(isAddress){
     val.href="explorer.html?chain=bnb&type=address&q="+encodeURIComponent(String(value));
     val.title=tr("details.viewAddress");
    }
    line.append(name,val);
    details.append(line);
   }
   field(tr("details.txHash"),t.tx_hash);
   field("Block",t.block_height);
   field(tr("details.logIndex"),t.log_index);
   field(tr("details.tokenContract"),t.token_address,true);
   field(tr("details.from"),from,true);
   field(tr("details.to"),to,true);
   field(tr("details.rawAmount")+" (base units)",t.amount_raw);
   const note=document.createElement("p");
   note.className="token-transfer-note";
   note.textContent=tr("details.tokenNote");
   const verify=document.createElement("a");
   verify.className="token-verify-link";
   verify.href=ext("tx",t.tx_hash);
   verify.target="_blank";
   verify.rel="noopener noreferrer";
   verify.textContent=tr("details.tokenVerify");
   details.append(note,verify);
   item.append(summary,details);
   feed.append(item);
  });
}
async function loadTokenTransfers(address){
 if(chain!=="bnb")return;
 const section=$("tokenActivity"),feed=$("tokenFeed"),count=$("tokenCount");
 section.hidden=false;
 feed.textContent=tr("details.tokenLoading");
 count.textContent="…";
 try{
  const data=await request("/token-transfers",{chain:"bnb",address,limit:"30"});
  const transfers=Array.isArray(data.transfers)?data.transfers:[];
  count.textContent=transfers.length+" EVENTS";
  renderTokenEvents(transfers,address);
 }catch(e){count.textContent="—";feed.textContent=tr("details.tokenFailed")+" "+e.message}
}
async function loadAddress(){start(tr("details.loadAddress"));if(chain==="bnb"&&!query.startsWith("0x")&&/^[a-fA-F0-9]{40}$/.test(query))query="0x"+query;const data=await request("/address",{chain,address:query,limit:"40"});const txs=data.transactions||[];finish(tr("details.addressTitle"),short(query,18),txs.length+" "+tr("details.indexedTxSummary"),[row(tr("details.address"),query,true),row(tr("details.indexedTx"),txs.length),row(tr("details.network"),chain==="bnb"?"BNB Smart Chain":"Solana")],query,"address");$("addressActivity").hidden=false;$("addressCount").textContent=txs.length+" TX";const feed=$("addressFeed");feed.replaceChildren();if(chain==="bnb")await loadTokenTransfers(query);if(!txs.length){feed.textContent=tr("details.noActivity");return}txs.forEach(t=>{const r=document.createElement("a");r.className="feed-row clickable";r.href="explorer.html?chain="+encodeURIComponent(chain)+"&type=tx&q="+encodeURIComponent(t.tx_hash);const from=String(t.sender||"");const to=String(t.recipient||"");const own=String(query).toLowerCase();const outgoing=from.toLowerCase()===own;const incoming=to.toLowerCase()===own;const direction=outgoing&&incoming?"IN / OUT":outgoing?"OUT":incoming?"IN":"غير محدد";const i=document.createElement("span");i.className="feed-icon";i.textContent=direction==="IN"?"↓":direction==="OUT"?"↑":"⇄";const m=document.createElement("div");m.className="feed-main";const b=document.createElement("b");b.textContent=short(t.tx_hash,12);const info=document.createElement("small");info.textContent=direction+" · "+(outgoing?"إلى: "+short(to||"—",8):incoming?"من: "+short(from||"—",8):"Block "+esc(t.block_height));const meta=document.createElement("small");meta.textContent="Block "+esc(t.block_height)+" · "+(t.status==="success"?tr("details.confirmed"):t.status==="failed"?tr("details.failed"):t.status==="indexed"?tr("details.indexed"):esc(t.status));m.append(b,info,meta);const side=document.createElement("span");side.className="feed-side";side.textContent=direction;r.append(i,m,side);feed.append(r)})}
function showSearchError(error){
 const message=tr("search."+error);
 showError(message,tr("details.lookupErrorTitle"));
}
async function load(){
 const parsed=window.BexentraSearch?.normalize(query,chain,type);
 if(!parsed){showSearchError("invalid");return}
 if(parsed.error){showSearchError(parsed.error);return}
 query=parsed.value;
 type=parsed.type;
 $("detailInput").value=query;
 $("detailKicker").replaceChildren(document.createElement("i"),document.createTextNode(" "+type.toUpperCase()+" · BEXENTRA"));
 try{
  if(type==="block")await loadBlock();
  else if(type==="address")await loadAddress();
  else await loadTx();
 }catch(e){
  const msg=String(e?.message||"Unknown error");
  const absent=msg.includes("Not indexed")||msg.includes("404");
  if(absent)showError(tr("details.notIndexedText"),tr("details.notIndexedTitle"));
  else showError(tr("details.notFound")+" "+msg,tr("details.lookupErrorTitle"));
 }
}
$("detailSearch").addEventListener("submit",e=>{
 e.preventDefault();
 const parsed=window.BexentraSearch?.normalize($("detailInput").value,chain,$("detailType").value);
 if(!parsed||parsed.error){showSearchError(parsed?.error||"invalid");return}
 location.href="explorer.html?chain="+encodeURIComponent(chain)+"&type="+encodeURIComponent(parsed.type)+"&q="+encodeURIComponent(parsed.value);
});
$("detailInput").value=query;
load();
document.addEventListener("bexentra:preferenceschange",e=>{if(e.detail?.key==="language"||e.detail?.key==="reset")load()});
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
