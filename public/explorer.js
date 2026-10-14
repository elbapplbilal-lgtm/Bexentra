"use strict";
const API="https://br-old-sun-b5txcoym-bexentraapi.compute.c-7.us-east-2.aws.neon.tech";
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
let chain=params.get("chain")==="solana"?"solana":"bnb";
let type=params.get("type")||"auto";
if(!["auto","block","tx","address"].includes(type))type="auto";
let query=params.get("q")||"";
// The optional height is only a HINT from a real BNB live block; the API verifies
// transaction membership on the blockchain independently before showing data.
const observedHeight=/^\d{1,16}$/.test(params.get("height")||"")?params.get("height"):null;
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
async function request(path,p){const u=new URL(API+path);Object.entries(p).forEach(([k,v])=>u.searchParams.set(k,v));const r=await fetch(u,{credentials:"omit",headers:{Accept:"application/json"}});if(!r.ok){let b={};try{b=await r.json()}catch{}const error=new Error(b.error||("API "+r.status));error.status=r.status;error.reason=b.reason||null;throw error}return r.json()}
// A fresh hash from the SSE feed may not be indexed in Neon yet.
// Retry only read-only /tx against the verified Cloudflare RPC Worker; never
// present a guessed success, fee or other unauthenticated transaction.
async function verifiedTransaction(chain,hash,observedHeight){
 const params={chain,hash,...(chain==="bnb"&&observedHeight?{height:observedHeight}:{})};
 let original;
 try{return await request("/tx",params)}
 catch(error){
  original=error;
  if(error.status&&error.status!==404&&error.status!==503)throw error;
 }
 const endpoint=String(window.BEXENTRA_STREAM_BASE||"").replace(/\/+$/,"");
 if(!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/i.test(endpoint))throw original;
 const url=new URL(endpoint+"/tx");
 Object.entries(params).forEach(([key,value])=>url.searchParams.set(key,String(value)));
 let response;
 try{response=await fetch(url,{mode:"cors",credentials:"omit",headers:{Accept:"application/json"}})}
 catch{throw original}
 if(!response.ok){
  if(response.status===503){
   const unavailable=new Error("Both RPC sources are temporarily unavailable");
   unavailable.status=503;
   throw unavailable;
  }
  if(response.status===404&&original?.status===404)throw original;
  throw original;
 }
 let tx;
 try{tx=await response.json()}catch{throw original}
 const verified=tx&&tx.chain===chain&&typeof tx.tx_hash==="string"&&
  (chain==="bnb"?tx.tx_hash.toLowerCase()===hash.toLowerCase():tx.tx_hash===hash)&&
  ["rpc_live","rpc_block_verified"].includes(tx.source)&&
  Number.isSafeInteger(Number(tx.block_height))&&Number(tx.block_height)>=0&&
  (!observedHeight||Number(tx.block_height)===Number(observedHeight));
 if(!verified)throw original;
 return tx;
}

/* Optional live detail enhancement. BEXENTRA only accepts results from the
   configured read-only Worker, with matching chain/hash/height. */
const isDecimal=v=>typeof v==="string"&&/^\d{1,78}$/.test(v);
const hasBlockTime=v=>typeof v==="string"&&Number.isFinite(Date.parse(v));
function nativeAmount(value,unit="BNB",places=18){
 if(!isDecimal(value))return easy("غير متوفر","Unavailable");
 try{
  const x=BigInt(value),base=10n**BigInt(places);
  const whole=(x/base).toString(),decimal=(x%base).toString()
   .padStart(places,"0").replace(/0+$/,"");
  return whole+(decimal?"."+decimal:"")+" "+unit;
 }catch{return easy("غير متوفر","Unavailable")}
}
function validatedCount(v){
 if(typeof v==="string"&&/^\d{1,32}$/.test(v))return v;
 return typeof v==="number"&&Number.isSafeInteger(v)&&v>=0?String(v):null;
}
function txLiveFields(base,live){
 if(!base||!live||base.chain!==live.chain||typeof base.tx_hash!=="string"
  ||typeof live.tx_hash!=="string"||
  (base.chain==="bnb"
   ?base.tx_hash.toLowerCase()!==live.tx_hash.toLowerCase()
   :base.tx_hash!==live.tx_hash)||
  Number(base.block_height)!==Number(live.block_height)||
  !["rpc_live","rpc_block_verified"].includes(live.source))return base;
 if(base.sender&&live.sender&&base.sender.toLowerCase()!==live.sender.toLowerCase())return base;
 if(base.recipient&&live.recipient&&base.recipient.toLowerCase()!==live.recipient.toLowerCase())return base;
 const add={
  sender:live.sender||base.sender,recipient:live.recipient||base.recipient,
  // A newer receipt-confirmed outcome supersedes an older indexed status.
  status:["success","failed"].includes(live.status)?live.status:base.status,
  fee_native:isDecimal(live.fee_native)?live.fee_native:base.fee_native,
  source:live.source
 };
 for(const field of ["native_value_wei","gas_used","gas_limit","gas_price_wei"]){
  if(isDecimal(live[field]))add[field]=live[field];
 }
 for(const field of ["nonce","transaction_index","compute_units"]){
  const valid=validatedCount(live[field]);
  if(valid!==null)add[field]=valid;
 }
 if(hasBlockTime(live.block_time))add.block_time=live.block_time;
 if(/^0x[0-9a-fA-F]{64}$/.test(live.block_hash||""))add.block_hash=live.block_hash;
 if(/^0x[0-9a-fA-F]{8}$/.test(live.method_id||""))add.method_id=live.method_id;
 if(live.contract_creation===true)add.contract_creation=true;
 return {...base,...add};
}
async function liveWorkerDetails(hash,height){
 const endpoint=String(window.BEXENTRA_STREAM_BASE||"").replace(/\/+$/,"");
 if(!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/i.test(endpoint))return null;
 const url=new URL(endpoint+"/tx");
 url.searchParams.set("chain",chain);url.searchParams.set("hash",hash);
 if(chain==="bnb"&&Number.isSafeInteger(Number(height))&&Number(height)>=0)
  url.searchParams.set("height",String(height));
 try{
  const controller=new AbortController();
  const kill=setTimeout(()=>controller.abort(),12000);
  let response;
  try{response=await fetch(url,{credentials:"omit",mode:"cors",
   headers:{Accept:"application/json"},signal:controller.signal})}
  finally{clearTimeout(kill)}
  return response.ok?await response.json():null;
 }catch{return null}
}
async function extraBlockTime(height){
 if(!Number.isSafeInteger(Number(height))||Number(height)<0)return null;
 try{
  const block=await request("/block",{chain,height});
  return block&&block.chain===chain&&Number(block.height)===Number(height)&&
   hasBlockTime(block.block_time)?block:null;
 }catch{return null}
}
function kindOfTx(t){
 if(chain!=="bnb")return easy("معاملة على Solana","Solana transaction");
 if(t.contract_creation===true)return easy("إنشاء عقد ذكي","Contract deployment");
 if(t.method_id)return easy("معاملة تحتوي استدعاء / بيانات","Transaction with call data");
 if(t.native_value_wei!=null)
  return easy("عملية بدون بيانات استدعاء معروفة","Transaction with no known call data");
 return easy("نوع العملية غير متوفر","Type unavailable");
}
function txMetrics(t){
 const result=[
  [easy("الحالة","Execution status"),t.status==="success"?easy("ناجحة","Successful")
   :t.status==="failed"?easy("فاشلة","Failed"):easy("غير مؤكدة","Unverified")],
  [easy("رقم البلوك","Block / slot"),easyCount(t.block_height)],
  [easy("الشبكة","Network"),chain==="bnb"?"BNB Chain":"Solana"],
  [easy("وقت البلوك","Block time"),localWhen(t.block_time)],
  [easy("المرسل","Sender"),t.sender?short(t.sender,8):easy("غير متوفر","Unavailable")],
  [easy("المستقبل","Recipient"),t.recipient?short(t.recipient,8):
   t.contract_creation===true?easy("إنشاء عقد","Contract creation"):easy("غير متوفر","Unavailable")],
  [easy("رسوم الشبكة","Network fee"),formatNativeFee(t.fee_native,chain)]
 ];
 if(chain==="bnb"){
  result.splice(3,0,[easy("قيمة BNB في المعاملة","BNB transaction value"),
   nativeAmount(t.native_value_wei)]);
  result.push([easy("الغاز المستعمل","Gas used"),t.gas_used!=null?easyCount(t.gas_used):easy("غير متوفر","Unavailable")]);
  result.push([easy("سعر الغاز","Gas price"),t.gas_price_wei!=null
    ?nativeAmount(t.gas_price_wei,"Gwei",9):easy("غير متوفر","Unavailable")]);
  result.push([easy("نوع العملية","Operation type"),kindOfTx(t)]);
 }else if(t.compute_units!=null)result.push([easy("الوحدات الحسابية","Compute units"),easyCount(t.compute_units)]);
 return result;
}
function txNote(t){
 const source=["rpc_live","rpc_block_verified","indexed_plus_rpc"].includes(t.source)
 ?easy("المعلومات مأخوذة من بيانات شبكة أو من فهرس مع تحقق مباشر.","Data originates from RPC or from indexed data enhanced with live verification.")
 :easy("بعض البيانات من فهرس BEXENTRA الجزئي وقد لا تكون جميع التفاصيل متوفرة.","Some data comes from the partial BEXENTRA index.");
 if(chain!=="bnb")return source;
 if(t.status==="failed"&&isDecimal(t.native_value_wei))return easy(
  "المعاملة فشلت؛ قيمة BNB المرفقة بطلب المعاملة لا تعني حدوث تحويل ناجح. ",
  "Execution failed: the BNB value specified in the transaction is not a successful transfer. ")+source;
 if(t.native_value_wei===null||t.native_value_wei===undefined)return easy(
  "القيمة المحوّلة غير متاحة من المصدر الحالي. لا يمكن اعتبارها صفرًا. ",
  "Transfer value is unavailable; this must not be treated as zero. ")+source;
 return t.native_value_wei==="0"
 ?easy("قيمة BNB المباشرة تساوي صفراً، لكن قد تتضمن العملية تحويل توكنات أو تفاعلاً مع عقد ذكي. ",
       "Direct BNB value is zero, but token transfers or smart-contract interactions may still be present. ")+source
 :easy("القيمة المذكورة هي قيمة BNB المرفقة بالمعاملة، ولا تشمل تحويلات التوكنات أو صافي الرصيد النهائي. ",
        "This is the BNB amount attached to the transaction, not the net balance change or token transfers. ")+source;
}
function paintTx(t){
 finish(tr("details.txTitle"),t.source==="rpc_block_verified"?tr("details.blockVerifiedSource"):
  t.source==="rpc_live"?tr("details.liveTxSource"):
  t.source==="indexed_plus_rpc"?tr("details.augmentedSource"):short(t.tx_hash,18),[
  row(tr("details.txHash"),t.tx_hash,true),
  row(easy("رقم البلوك / Slot","Block / Slot"),t.block_height,true),
  row(easy("معرّف البلوك","Block hash"),t.block_hash||easy("غير متوفر","Unavailable"),!!t.block_hash),
  row(easy("وقت البلوك","Block time"),hasBlockTime(t.block_time)?localWhen(t.block_time):easy("غير متوفر","Unavailable")),
  row(tr("details.from"),t.sender||"—",!!t.sender),
  row(tr("details.to"),t.recipient||"—",!!t.recipient),
  ...(chain==="bnb"?[
   row(easy("قيمة BNB في المعاملة","BNB transaction value"),nativeAmount(t.native_value_wei)),
   row(easy("الغاز المستعمل","Gas used"),t.gas_used??easy("غير متوفر","Unavailable")),
   row(easy("حد الغاز","Gas limit"),t.gas_limit??easy("غير متوفر","Unavailable")),
   row(easy("سعر الغاز","Gas price"),t.gas_price_wei!=null?nativeAmount(t.gas_price_wei,"Gwei",9):easy("غير متوفر","Unavailable")),
   row(easy("نوع العملية","Operation type"),kindOfTx(t)),
   row(easy("معرّف الوظيفة","Method ID"),t.method_id??easy("غير متوفر","Unavailable")),
   row(easy("رقم المعاملة للحساب","Nonce"),t.nonce??easy("غير متوفر","Unavailable")),
   row(easy("ترتيب المعاملة في البلوك","Transaction index"),t.transaction_index??easy("غير متوفر","Unavailable"))
  ]:t.compute_units!=null?[row(easy("الوحدات الحسابية","Compute units"),t.compute_units)]:[]),
  row(easy("حالة التنفيذ","Execution status"),["success","failed"].includes(t.status)
   ?tr(t.status==="success"?"details.confirmed":"details.failed"):tr("details.unavailable")),
  row(easy("رسوم الشبكة","Network fee"),formatNativeFee(t.fee_native,chain)),
  ...(t.indexed_at?[row(easy("وقت الفهرسة","Indexed at"),t.indexed_at)]:[]),
  row(tr("details.source"),tr(["rpc_live","indexed_plus_rpc","rpc_block_verified"].includes(t.source)
    ?"details.sourceLive":"details.sourceIndexed"))
 ],t.tx_hash,"tx");
 showProvenance(t.source);
 renderTxSummary(t);
 const guide=$("detailEducation");if(guide)guide.hidden=false;
}

function row(label,value,copy=false){const d=document.createElement("div");d.className="explorer-field";const l=document.createElement("span");l.textContent=label;const wrap=document.createElement("div");const b=document.createElement("b");b.textContent=esc(value);wrap.append(b);if(copy&&value){const c=document.createElement("button");c.type="button";c.className="mini-copy";c.textContent=tr("details.copy");c.onclick=()=>copyText(value,c);wrap.append(c)}d.append(l,wrap);return d}
async function copyText(value,button){try{await navigator.clipboard.writeText(String(value));button.textContent=tr("details.copyDone");setTimeout(()=>button.textContent=tr("details.copy"),1200)}catch{}}

/* Human-readable, read-only explanations derived only from returned chain/index data. */
const easy=(ar,en)=>document.documentElement.lang==="en"?en:ar;
function easyCount(v){
 const n=Number(v);
 return v!==null&&v!==undefined&&v!==""&&Number.isSafeInteger(n)&&n>=0
  ?n.toLocaleString("en-US"):easy("غير متوفر","Unavailable");
}
function localWhen(value){
 if(!value)return easy("غير متوفر","Unavailable");
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return easy("غير متوفر","Unavailable");
 try{
  return new Intl.DateTimeFormat(document.documentElement.lang==="en"?"en-GB":"ar-MA-u-nu-latn",
   {dateStyle:"medium",timeStyle:"short"}).format(date);
 }catch{return date.toLocaleString()}
}
function plainSummary(heading,description,metrics,note,tone="normal"){
 const section=$("simpleResult");
 if(!section)return;
 section.replaceChildren();
 section.hidden=false;
 section.dataset.tone=tone;
 const tag=(name,cls,value)=>{
  const el=document.createElement(name);el.className=cls;el.textContent=value;return el;
 };
 const head=document.createElement("div");head.className="simple-result-head";
 head.append(tag("span","simple-result-mark","BEXENTRA · "+easy("ملخص النتيجة","Result overview")),
  tag("h2","simple-result-title",heading),tag("p","simple-result-desc",description));
 section.append(head);
 if(metrics.length){
  const grid=document.createElement("div");grid.className="simple-result-grid";
  for(const [label,value] of metrics){
   const item=document.createElement("div");item.className="simple-result-metric";
   item.append(tag("small","simple-result-label",label),tag("strong","simple-result-value",String(value??"—")));
   grid.append(item);
  }
  section.append(grid);
 }
 if(note)section.append(tag("p","simple-result-note",note));
}
function renderBlockSummary(b){
 const count=easyCount(b.transaction_count),num=easyCount(b.height),date=localWhen(b.block_time);
 plainSummary(
  easy("تم العثور على البلوك","Block found"),
  easy("البلوك سجل يضم مجموعة من معاملات الشبكة. عدد المعاملات لا يمثل رصيد محفظة أو مبلغاً مالياً.",
       "A block records a group of network transactions. The count below is not a wallet balance."),
  [
   [easy("رقم البلوك","Block number"),num],
   [easy("عدد المعاملات في البلوك","Transactions in block"),count],
   [easy("وقت تسجيل البلوك (توقيت جهازك)","Block time (your device)"),date],
   [easy("الشبكة","Network"),chain==="bnb"?"BNB Chain":"Solana"]
  ],
  b.source==="rpc_live"
   ?easy("المصدر: معلومات قراها التطبيق من الشبكة مباشرة. هادشي ما كيعنيش أن جميع المعاملات مفهرسة عندنا.",
         "Source: read directly from the blockchain. This does not mean all transactions are indexed by BEXENTRA.")
   :easy("المصدر: معلومات من فهرس BEXENTRA، وقد تكون متأخرة عن آخر بلوك.",
         "Source: BEXENTRA's partial index, which may lag behind the latest block."));
}
function renderTxSummary(t){
 const st=t.status==="success"?easy("نجح تنفيذ المعاملة","Transaction execution succeeded"):
   t.status==="failed"?easy("فشل تنفيذ المعاملة","Transaction execution failed"):
   easy("تم العثور على المعاملة — حالة التنفيذ غير مؤكدة","Transaction found — execution status unverified");
 plainSummary(
  st,easy("يتم عرض البيانات الفعلية المتوفرة عن هذه المعاملة دون افتراض مبالغ أو نتائج غير مؤكدة.",
    "Only available transaction data is shown. Unverified amounts or outcomes are never assumed."),
  txMetrics(t),txNote(t),t.status==="success"?"success":t.status==="failed"?"failed":"normal");
}

function renderTokenOnlySummary(t,transfers){
 plainSummary(
  easy("لقينا سجلات تحويل توكنات","Indexed token transfer records found"),
  easy("عندنا سجلات BEP-20 مرتبطة بهاد الرمز، ولكن ما تأكدناش من حالة المعاملة الأصلية أو رسومها.",
       "We found indexed BEP-20 events but cannot confirm native execution status or fee."),
  [[easy("عدد سجلات التحويل","Transfer events"),easyCount(transfers.length)],
   [easy("البلوك","Block"),easyCount(t.block_height)],
   [easy("حالة المعاملة","Transaction status"),easy("غير متأكدة","Unverified")]],
  easy("الكمية الخام ماشي بالضرورة عدد التوكنات الحقيقي؛ خاص decimals ديال التوكن.",
       "Raw amount must be adjusted by token decimals before interpreting the token quantity."));
}
function renderAddressSummary(address,count,balance=null){
 const items=[
 [easy("الشبكة","Network"),chain==="bnb"?"BNB Chain":"Solana"],
 [easy("المعاملات المعروضة من الفهرس","Transactions shown from index"),easyCount(count)],
 [easy("العنوان","Address"),short(address,8)]
 ];
 if(balance&&balance.source==="rpc_live"&&balance.chain===chain&&
  balance.address.toLowerCase()===address.toLowerCase()&&isDecimal(balance.native_balance))
  items.unshift([easy("رصيد العملة الأساسية (RPC)","Native balance (live RPC)"),
   nativeAmount(balance.native_balance,chain==="bnb"?"BNB":"SOL",chain==="bnb"?18:9)]);
 plainSummary(easy("نتائج البحث عن العنوان","Address search results"),
  easy("المعاملات الظاهرة متاحة في فهرس BEXENTRA. الرصيد عند توفره يُقرأ مباشرة من الشبكة.",
    "Transactions shown are indexed by BEXENTRA. Native balance, when available, comes from live network RPC."),
  items,
  easy("الفهرس جزئي وليس السجل الكامل. رصيد العملة الأساسية قراءة لحظية قد تتغير، ولا يشمل أرصدة التوكنات.",
    "Index coverage is partial, not a full history. Native balance is a point-in-time reading and excludes token balances."));
}
function showSearchWelcome(){
 $("detailLoading").hidden=true;$("detailError").hidden=true;$("detailOverview").hidden=true;
 $("addressActivity").hidden=true;$("tokenActivity").hidden=true;
 $("detailTitle").textContent=easy("استكشف البلوكتشين","Explore the blockchain");
 $("detailSubtitle").textContent=easy("لسّق رقم بلوك، رمز معاملة، أو عنوان محفظة.","Enter a block number, transaction hash, or wallet address.");
 $("detailNetwork").textContent=chain==="bnb"?"BNB CHAIN":"SOLANA";
 plainSummary(easy("دليل قراءة نتائج البحث","How to understand results"),
 easy("تُعرض خلاصة واضحة للبيانات المتاحة قبل التفاصيل التقنية، مع توضيح مصدر المعلومات.",
      "Choose what you're searching for. You'll see a simple summary before technical details."),
 [[easy("رقم بحال 127556204","A number such as 127556204"),easy("بلوك","Block")],
  [easy("رمز معاملة طويل","Long transaction hash"),easy("معاملة واحدة","One transaction")],
  [easy("عنوان محفظة","Wallet address"),easy("نشاط مفهرس فقط","Indexed activity only")]],
 easy("BEXENTRA ما كيطلبش كلمات استرجاع المحفظة أو مفاتيحها الخاصة.",
      "BEXENTRA never asks for wallet recovery words or private keys."));
 const g=$("detailEducation");if(g)g.hidden=false;
}

function showError(msg,title){
 $("simpleResult").hidden=true;
 const g=$("detailEducation");if(g)g.hidden=true;
 $("detailLoading").hidden=true;
 $("detailOverview").hidden=true;
 $("addressActivity").hidden=true;
 $("tokenActivity").hidden=true;
 $("detailError").hidden=false;
 $("detailTitle").textContent=title||tr("details.lookupErrorTitle");
 $("detailSubtitle").textContent=tr("details.subtitle");
 $("detailNetwork").textContent=chain==="bnb"?"BNB CHAIN":"SOLANA";
 $("detailError").textContent=msg;
 if(type==="tx"&&query&&
  (chain==="bnb"?/^0x[0-9a-fA-F]{64}$/.test(query):/^[1-9A-HJ-NP-Za-km-z]{70,100}$/.test(query))){
  const actions=document.createElement("div");actions.className="error-actions";
  const retry=document.createElement("button");retry.type="button";retry.textContent=tr("details.retry");retry.onclick=()=>load();
  const verify=document.createElement("a");verify.href=ext("tx",query);verify.target="_blank";
  verify.rel="noopener noreferrer";verify.textContent=tr("details.verify");
  actions.append(retry,verify);$("detailError").append(actions);
 }
}
function start(title){$("simpleResult").hidden=true;const g=$("detailEducation");if(g)g.hidden=true;showProvenance("indexed");$("detailLoading").hidden=false;$("detailError").hidden=true;$("detailOverview").hidden=true;$("addressActivity").hidden=true;$("tokenActivity").hidden=true;$("detailTitle").textContent=title;$("detailNetwork").textContent=chain==="bnb"?"BNB CHAIN":"SOLANA"}
function showProvenance(source){
 const live=source==="rpc_live"||source==="indexed_plus_rpc"||source==="rpc_block_verified";
 const title=$("detailSideTitle"),message=$("detailSideText");
 if(title)title.textContent=tr(live?"details.liveSideTitle":"details.sideTitle");
 if(message)message.textContent=tr(live?"details.liveSideText":"details.sideText");
}
function finish(title,subtitle,fields,primary,externalType){$("detailLoading").hidden=true;$("detailOverview").hidden=false;$("detailTitle").textContent=title;$("detailSubtitle").textContent=subtitle;$("overviewTitle").textContent=title;$("detailFields").replaceChildren(...fields);$("externalLink").href=ext(externalType,primary);$("copyPrimary").onclick=()=>copyText(primary,$("copyPrimary"))}
async function loadBlock(){
 start(chain==="bnb"?tr("details.loadBlock"):tr("details.loadSlot"));
 const b=await request("/block",{chain,height:query});
 const fromRpc=b.source==="rpc_live";
 const fields=[row(easy("رقم البلوك / Slot","Block / Slot"),b.height,true),row(easy("المعرّف الكامل للبلوك (Block Hash)","Full block hash"),b.block_hash,true),
  row(easy("عدد المعاملات داخل البلوك","Transactions inside the block"),b.transaction_count),row(easy("توقيت البلوك الأصلي UTC","Original block time (UTC)"),b.block_time)];
 if(b.indexed_at)fields.push(row(easy("وقت الفهرسة","Indexed at"),b.indexed_at));
 fields.push(row(tr("details.source"),tr(fromRpc?"details.sourceLive":"details.sourceIndexed")));
 finish((chain==="bnb"?"Block ":"Slot ")+Number(b.height).toLocaleString("en-US"),
  tr(fromRpc?"details.liveBlockSource":"details.subtitle"),fields,b.height,"block");
 showProvenance(b.source);
 renderBlockSummary(b);
 const g=$("detailEducation");if(g)g.hidden=false;
}
async function loadTx(){
 start(tr("details.loadTx"));
 const t=await verifiedTransaction(chain,query,observedHeight);
 if(t.source==="token_transfers_only"){
  const transfers=Array.isArray(t.token_transfers)?t.token_transfers:[];
  finish(tr("details.txTitle"),tr("details.tokenOnlySubtitle"),[
   row(tr("details.txHash"),t.tx_hash,true),
   row(tr("details.block"),t.block_height,true),
   row(tr("details.transferCount"),transfers.length),
   row(tr("details.detailsLabel"),tr("details.tokenOnlyLabel")),
   row(easy("الحالة والرسوم","Status and fee"),tr("details.noNativeStatus"))
  ],t.tx_hash,"tx");
  $("tokenActivity").hidden=false;
  $("tokenCount").textContent=transfers.length+" EVENTS";
  renderTokenEvents(transfers,"");
  renderTokenOnlySummary(t,transfers);
  const guide=$("detailEducation");if(guide)guide.hidden=false;
  return;
 }
 paintTx(t);
 // Progressive enrichment: show the existing verified result immediately, then
 // request independently verified RPC fields without blocking the interface.
 const originalQuery=query,originalChain=chain;
 void Promise.allSettled([liveWorkerDetails(t.tx_hash,t.block_height),
   t.block_time?Promise.resolve(null):extraBlockTime(t.block_height)])
  .then(([live,block])=>{
    if(query!==originalQuery||chain!==originalChain)return;
    let enriched=t;
    if(live.status==="fulfilled"&&live.value)enriched=txLiveFields(enriched,live.value);
    if(!hasBlockTime(enriched.block_time)&&block.status==="fulfilled"&&block.value){
      enriched={...enriched,block_time:block.value.block_time};
      // BNB block hash from the index is still explicitly labeled as block data.
      if(/^0x[0-9a-fA-F]{64}$/.test(block.value.block_hash||""))
       enriched.block_hash=block.value.block_hash;
    }
    paintTx(enriched);
  }).catch(()=>{});
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
let walletCount=0,walletBalance=null,walletCursor=null;
const seenWalletTransactions=new Set();
function addAddressRow(t,address){
 const row=document.createElement("a");row.className="feed-row clickable";
 row.href="explorer.html?chain="+encodeURIComponent(chain)+"&type=tx&q="+encodeURIComponent(t.tx_hash);
 const sender=String(t.sender||""),recipient=String(t.recipient||"");
 const own=address.toLowerCase(),sent=sender.toLowerCase()===own,received=recipient.toLowerCase()===own;
 const direction=sent&&received?"IN / OUT":sent?"OUT":received?"IN":"—";
 const icon=document.createElement("span");icon.className="feed-icon";
 icon.textContent=sent?"↑":received?"↓":"⇄";
 const main=document.createElement("div");main.className="feed-main";
 const hash=document.createElement("b");hash.textContent=short(t.tx_hash,12);
 const info=document.createElement("small");
 info.textContent=direction+" · "+(sent?easy("إلى: ","To: ")+short(recipient,8):
  received?easy("من: ","From: ")+short(sender,8):"Block "+esc(t.block_height));
 const meta=document.createElement("small");meta.textContent="Block "+esc(t.block_height)+" · "+
  (t.status==="success"?tr("details.confirmed"):t.status==="failed"?tr("details.failed"):
  easy("غير مؤكدة","Unverified"));
 const side=document.createElement("span");side.className="feed-side";side.textContent=direction;
 main.append(hash,info,meta);row.append(icon,main,side);return row;
}
function insertWalletPage(data,address){
 const feed=$("addressFeed");
 for(const tx of Array.isArray(data.transactions)?data.transactions:[]){
  if(typeof tx?.tx_hash!=="string")continue;
  const key=chain==="bnb"?tx.tx_hash.toLowerCase():tx.tx_hash;
  if(seenWalletTransactions.has(key))continue;
  seenWalletTransactions.add(key);feed.append(addAddressRow(tx,address));walletCount++;
 }
 $("addressCount").textContent=walletCount+" TX";
 walletCursor=data.has_more&&data.next_cursor?data.next_cursor:null;
 renderAddressSummary(address,walletCount,walletBalance);
}
function offerMoreWallet(address){
 $("walletLoadMore")?.remove();
 if(!walletCursor)return;
 const btn=document.createElement("button");btn.id="walletLoadMore";
 btn.type="button";btn.className="wallet-load-more";
 btn.textContent=easy("عرض معاملات مفهرسة أقدم","Load older indexed transactions");
 btn.onclick=async()=>{
  const previous=walletCursor;if(!previous)return;
  btn.disabled=true;btn.textContent=easy("جاري التحميل…","Loading…");
  try{
   const result=await request("/address",{chain,address,limit:"40",
    before_height:previous.before_height,before_hash:previous.before_hash});
   btn.remove();insertWalletPage(result,address);
   if(walletCursor&&walletCursor.before_hash===previous.before_hash&&
      walletCursor.before_height===previous.before_height)walletCursor=null;
   offerMoreWallet(address);
  }catch{
   btn.disabled=false;
   btn.textContent=easy("تعذّر التحميل — إعادة المحاولة","Load failed — retry");
  }
 };
 $("addressFeed").append(btn);
}
async function loadAddress(){
 start(tr("details.loadAddress"));
 if(chain==="bnb"&&!query.startsWith("0x")&&/^[a-fA-F0-9]{40}$/.test(query))query="0x"+query;
 const data=await request("/address",{chain,address:query,limit:"40"});
 walletCount=0;walletBalance=null;walletCursor=null;seenWalletTransactions.clear();
 finish(tr("details.addressTitle"),short(query,18)+" · "+(data.transactions?.length||0)+" "+
  tr("details.indexedTxSummary"),[
  row(tr("details.address"),query,true),
  row(tr("details.network"),chain==="bnb"?"BNB Smart Chain":"Solana"),
  row(easy("التغطية","Coverage"),easy("فهرس جزئي","Partial index"))
 ],query,"address");
 $("addressActivity").hidden=false;$("addressFeed").replaceChildren();
 insertWalletPage(data,query);
 if(!walletCount)$("addressFeed").textContent=tr("details.noActivity");
 offerMoreWallet(query);
 const address=query,network=chain;
 void request("/balance",{chain:network,address}).then(b=>{
  if(query!==address||chain!==network||b.chain!==network||b.source!=="rpc_live")return;
  walletBalance=b;renderAddressSummary(address,walletCount,b);
 }).catch(()=>{});
 if(chain==="bnb")void loadTokenTransfers(address);
}
function showSearchError(error){
 const message=tr("search."+error);
 showError(message,tr("details.lookupErrorTitle"));
}
async function load(){
 if(!query.trim()){showSearchWelcome();return}
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
  if(e?.status===404){
   showError(tr("details.unverifiedText"),tr("details.unverifiedTitle"));
  }else if(e?.status===503){
   showError(tr("details.networkUnavailableText"),tr("details.networkUnavailableTitle"));
  }else{
   showError(tr("details.notFound")+" "+msg,tr("details.lookupErrorTitle"));
  }
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
