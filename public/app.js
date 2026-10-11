"use strict";
const $=id=>document.getElementById(id);
const network=$("network"),input=$("searchInput"),result=$("result");
const RPC={solana:"https://api.mainnet-beta.solana.com",bnb:"https://bsc-dataseed.binance.org/"};
function row(label,value){const d=document.createElement("div");d.className="detail";const a=document.createElement("span");a.textContent=label;const b=document.createElement("b");b.textContent=String(value);d.append(a,b);return d}
function showError(message){result.replaceChildren();const p=document.createElement("p");p.className="error";p.textContent=message;result.append(p)}
async function rpc(chain,method,params){const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);try{const response=await fetch(RPC[chain],{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params}),signal:controller.signal});if(!response.ok)throw Error("HTTP "+response.status);const json=await response.json();if(json.error)throw Error(json.error.message||"RPC error");return json.result}finally{clearTimeout(timeout)}}
function isValid(address,chain){return chain==="bnb"?/^0x[a-fA-F0-9]{40}$/.test(address):/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)}
network.addEventListener("change",()=>{input.placeholder=network.value==="solana"?"أدخل عنوان محفظة Solana":"أدخل عنوان محفظة BNB يبدأ بـ 0x";result.replaceChildren()});
$("searchForm").addEventListener("submit",async e=>{e.preventDefault();const chain=network.value,address=input.value.trim();if(!isValid(address,chain)){showError("صيغة العنوان غير صحيحة للشبكة المختارة.");return}result.textContent="جاري الاتصال بالشبكة...";try{let balance,height;if(chain==="bnb"){const values=await Promise.all([rpc(chain,"eth_getBalance",[address,"latest"]),rpc(chain,"eth_blockNumber",[])]);balance=(Number(BigInt(values[0]))/1e18).toLocaleString("en-US",{maximumFractionDigits:8});height=Number(BigInt(values[1])).toLocaleString("en-US")}else{const values=await Promise.all([rpc(chain,"getBalance",[address]),rpc(chain,"getSlot",[])]);balance=(values[0].value/1e9).toLocaleString("en-US",{maximumFractionDigits:9});height=values[1].toLocaleString("en-US")}result.replaceChildren();const h=document.createElement("p");h.className="result-title";h.textContent="نتيجة البحث";result.append(h,row("الشبكة",chain==="bnb"?"BNB Smart Chain":"Solana"),row("العنوان",address),row("الرصيد",balance+(chain==="bnb"?" BNB":" SOL")),row(chain==="bnb"?"آخر بلوك":"آخر Slot",height));}catch(err){showError("تعذر الاتصال بمزوّد بيانات الشبكة من المتصفح. حاول لاحقاً؛ بعض خدمات RPC تمنع الطلبات المباشرة.")}});
const coins=[["bitcoin","BTC","Bitcoin"],["ethereum","ETH","Ethereum"],["solana","SOL","Solana"],["binancecoin","BNB","BNB"]];
async function prices(){const box=$("prices");box.textContent="جاري تحميل الأسعار...";try{const response=await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin&vs_currencies=usd",{headers:{accept:"application/json"}});if(!response.ok)throw Error("Unavailable");const data=await response.json();box.replaceChildren();for(const [id,symbol,name] of coins){const line=document.createElement("div");line.className="price-line";const label=document.createElement("span");label.textContent=name+" ("+symbol+")";const value=document.createElement("strong");value.className="usd";value.textContent=typeof data[id]?.usd==="number"?"$"+data[id].usd.toLocaleString("en-US",{maximumFractionDigits:4}):"غير متوفر";line.append(label,value);box.append(line)}}catch{box.textContent="الأسعار غير متاحة حالياً. اضغط تحديث للمحاولة مرة أخرى."}}
$("refreshPrices").addEventListener("click",prices);prices();

/* Explorer extensions: transaction lookup, chain status and local theme. */
const txResult=$("txResult"),txInput=$("txInput"),networkStatus=$("networkStatus");
function renderDetails(target,title,items,externalUrl){
 target.replaceChildren();const heading=document.createElement("p");heading.className="result-title";heading.textContent=title;target.append(heading);
 for(const [label,value] of items)target.append(row(label,value));
 if(externalUrl){const link=document.createElement("a");link.href=externalUrl;link.target="_blank";link.rel="noopener noreferrer";link.className="explorer-link";link.textContent="عرض في المستكشف المرجعي ↗";target.append(link)}
}
function failAt(target,message){target.replaceChildren();const p=document.createElement("p");p.className="error";p.textContent=message;target.append(p)}
function shortNum(n){return typeof n==="number"?n.toLocaleString("en-US"):"غير متوفر"}
function hexNum(v){return v==null?null:Number(BigInt(v))}
$("txForm").addEventListener("submit",async event=>{
 event.preventDefault();const chain=network.value,id=txInput.value.trim();
 const valid=chain==="bnb"?/^0x[a-fA-F0-9]{64}$/.test(id):/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(id);
 if(!valid){failAt(txResult,"معرّف المعاملة غير صالح للشبكة المختارة.");return}
 txResult.textContent="جاري فحص المعاملة على الشبكة...";
 try{
  if(chain==="bnb"){
   const [tx,receipt]=await Promise.all([rpc("bnb","eth_getTransactionByHash",[id]),rpc("bnb","eth_getTransactionReceipt",[id])]);
   if(!tx){failAt(txResult,"المعاملة غير موجودة لدى مزوّد البيانات الحالي.");return}
   const fee=receipt?.gasUsed&&receipt?.effectiveGasPrice?(Number(BigInt(receipt.gasUsed)*BigInt(receipt.effectiveGasPrice))/1e18).toFixed(8)+" BNB":"غير متوفر";
   renderDetails(txResult,"تفاصيل معاملة BNB Chain",[["الحالة",!receipt?"قيد الانتظار":receipt.status==="0x1"?"ناجحة":"فاشلة"],["المعرّف",id],["البلوك",tx.blockNumber?shortNum(hexNum(tx.blockNumber)):"قيد الانتظار"],["من",tx.from||"غير متوفر"],["إلى",tx.to||"إنشاء عقد"],["القيمة",(Number(BigInt(tx.value||"0x0"))/1e18).toLocaleString("en-US",{maximumFractionDigits:8})+" BNB"],["رسوم المعاملة",fee]],"https://bscscan.com/tx/"+id);
  }else{
   const tx=await rpc("solana","getTransaction",[id,{encoding:"json",maxSupportedTransactionVersion:0,commitment:"confirmed"}]);
   if(!tx){failAt(txResult,"المعاملة غير موجودة لدى مزوّد البيانات الحالي، أو ما زالت قيد المعالجة.");return}
   renderDetails(txResult,"تفاصيل معاملة Solana",[["الحالة",tx.meta?.err?"فاشلة":"ناجحة"],["التوقيع",id],["Slot",shortNum(tx.slot)],["الوقت",tx.blockTime?new Date(tx.blockTime*1000).toLocaleString("ar-MA"):"غير متوفر"],["الرسوم",tx.meta?.fee!=null?(tx.meta.fee/1e9).toFixed(9)+" SOL":"غير متوفر"]],"https://solscan.io/tx/"+id);
  }
 }catch(e){failAt(txResult,"تعذر جلب تفاصيل المعاملة. قد يمنع مزوّد RPC الطلبات من المتصفح أو يفرض حداً للاستخدام.")}
});
async function loadNetwork(){
 networkStatus.textContent="جاري جلب بيانات الشبكة...";
 try{
  const chain=network.value;
  if(chain==="bnb"){
   const [height,gas]=await Promise.all([rpc("bnb","eth_blockNumber",[]),rpc("bnb","eth_gasPrice",[])]);
   renderDetails(networkStatus,"BNB Smart Chain",[["آخر بلوك",shortNum(hexNum(height))],["سعر الغاز",(Number(BigInt(gas))/1e9).toFixed(3)+" Gwei"],["مصدر البيانات","RPC عام — قد يتأخر"]]);
  }else{
   const [slot,epoch]=await Promise.all([rpc("solana","getSlot",[]),rpc("solana","getEpochInfo",[])]);
   renderDetails(networkStatus,"Solana Mainnet",[["آخر Slot",shortNum(slot)],["Epoch",shortNum(epoch.epoch)],["مصدر البيانات","RPC عام — قد يتأخر"]]);
  }
 }catch(e){failAt(networkStatus,"تعذر الاتصال حالياً. جرّب التحديث لاحقاً؛ مزوّدو RPC العموميون قد يحظرون طلبات المتصفح.")}
}
$("refreshNetwork").addEventListener("click",loadNetwork);
network.addEventListener("change",()=>{txResult.replaceChildren();networkStatus.textContent="اضغط تحديث لجلب معلومات الشبكة المختارة."});
const themeToggle=$("themeToggle");
function applyTheme(dark){document.body.classList.toggle("dark-mode",dark);themeToggle.textContent=dark?"☀ الوضع النهاري":"☾ الوضع الليلي";themeToggle.setAttribute("aria-pressed",String(dark))}
let dark=false;try{dark=localStorage.getItem("bexentra-dark")==="1"}catch{}
applyTheme(dark);
themeToggle.addEventListener("click",()=>{dark=!dark;applyTheme(dark);try{localStorage.setItem("bexentra-dark",dark?"1":"0")}catch{}});

/* Recent blocks from BEXENTRA's read-only Neon Data API. */
const recentBlocks=$("recentBlocks");
const DATA_API="https://ep-little-frog-b530n23k.apirest.c-7.us-east-2.aws.neon.tech/neondb/rest/v1";
async function indexedBlocks(chain){
 const url=DATA_API+"/indexed_blocks?select=chain,height,block_hash,block_time,transaction_count,indexed_at&chain=eq."+encodeURIComponent(chain)+"&order=height.desc&limit=8";
 const response=await fetch(url,{headers:{Accept:"application/json"}});
 if(!response.ok)throw Error("Data API HTTP "+response.status);
 return response.json();
}
async function loadRecentBlocks(){
 const chain=network.value;recentBlocks.textContent="جاري جلب أحدث البلوكات من فهرس BEXENTRA...";
 try{
  const rows=await indexedBlocks(chain);if(network.value!==chain)return;recentBlocks.replaceChildren();
  if(!rows.length){recentBlocks.textContent="لا توجد بلوكات مفهرسة لهذه الشبكة حالياً.";return}
  for(const block of rows.slice(0,4)){const line=document.createElement("div");line.className="block-line";const a=document.createElement("a");a.href=chain==="bnb"?"https://bscscan.com/block/"+block.height:"https://solscan.io/block/"+block.height;a.target="_blank";a.rel="noopener noreferrer";a.textContent=(chain==="bnb"?"Block #":"Slot #")+Number(block.height).toLocaleString("en-US");const detail=document.createElement("span");detail.textContent=(block.transaction_count??0)+" معاملة · BEXENTRA Index";line.append(a,detail);recentBlocks.append(line)}
 }catch(error){if(network.value===chain)failAt(recentBlocks,"تعذر قراءة فهرس BEXENTRA حالياً. حاول التحديث بعد قليل.")}
}
$("refreshBlocks").addEventListener("click",loadRecentBlocks);
network.addEventListener("change",()=>{recentBlocks.textContent="اضغط تحديث لعرض بلوكات الشبكة المختارة."});
loadRecentBlocks();
