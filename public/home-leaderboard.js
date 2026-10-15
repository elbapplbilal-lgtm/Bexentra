"use strict";
/* Small first-screen controls. Data comes ONLY from Neon /price and /live.
   No invented market price, chain fees, transaction totals or token ranks. */
(()=>{
 const $=id=>document.getElementById(id);
 const services="https://br-old-sun-b5txcoym-bexentraapi.compute.c-7.us-east-2.aws.neon.tech";
 const text={
  ar:{price:"سعر الشبكة",block:"آخر بلوك",source:"مصدر البيانات",menu:"القائمة"},
  en:{price:"Native price",block:"Latest block",source:"Data source",menu:"Menu"},
  fr:{price:"Prix natif",block:"Dernier bloc",source:"Source",menu:"Menu"},
  de:{price:"Coin-Preis",block:"Letzter Block",source:"Datenquelle",menu:"Menü"},
  es:{price:"Precio nativo",block:"Último bloque",source:"Fuente",menu:"Menú"},
  it:{price:"Prezzo nativo",block:"Ultimo blocco",source:"Fonte dati",menu:"Menu"}
 };
 const chainCode=()=>$("marketChain").value==="bsc"?"bnb":"solana";
 let running=null,version=0;
 function localized(){
  const lang=$("marketLang").value,dict=text[lang]||text.ar;
  $("homePriceLabel").textContent=dict.price;
  $("homeBlockLabel").textContent=dict.block;
  $("homeSourceLabel").textContent=dict.source;
 }
 function setMenu(open){
  $("homeMenu").hidden=!open;$("homeMenuOverlay").hidden=!open;
  $("homeMenuToggle").setAttribute("aria-expanded",String(open));
  document.body.style.overflow=open?"hidden":"";
 }
 function setSettings(open){
  $("homeSettings").hidden=!open;
  $("homeSettingsToggle").setAttribute("aria-expanded",String(open));
 }
 function setTheme(dark){
  document.body.classList.toggle("home-dark",dark);
  $("homeThemeToggle").setAttribute("aria-pressed",String(dark));
  try{localStorage.setItem("bexentra-home-theme",dark?"dark":"light")}catch{}
 }
 async function loadNetworkMetrics(){
  if(running)running.abort();
  const myVersion=++version,network=chainCode();
  $("homeNetworkIcon").src=network==="bnb"?"public/bnb-mark.svg?v=2":"public/solana-mark.svg";
  $("homeNetworkIcon").alt=network==="bnb"?"BNB Chain":"Solana";
  $("homeNativePrice").textContent="—";
  $("homeHeight").textContent="—";
  const ac=new AbortController();running=ac;
  const timeout=setTimeout(()=>ac.abort(),9000);
  const params="?chain="+encodeURIComponent(network);
  try{
   const [priceResult,liveResult]=await Promise.allSettled([
    fetch(services+"/price"+params,{signal:ac.signal,cache:"no-store",credentials:"omit"}).then(r=>{if(!r.ok)throw Error("price");return r.json()}),
    fetch(services+"/live"+params+"&limit=3",{signal:ac.signal,cache:"no-store",credentials:"omit"}).then(r=>{if(!r.ok)throw Error("live");return r.json()})
   ]);
   if(version!==myVersion)return;
   if(priceResult.status==="fulfilled"){
    const v=priceResult.value;
    const t=Date.parse(v?.price_updated_at||"");
    if(v?.chain===network&&v?.quote_currency==="USD"&&v?.source==="coingecko"&&
       typeof v.usd_price==="number"&&Number.isFinite(v.usd_price)&&v.usd_price>0&&
       Number.isFinite(t)&&t<=Date.now()+60000&&Date.now()-t<600000){
      $("homeNativePrice").textContent=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:3}).format(v.usd_price);
    }
   }
   if(liveResult.status==="fulfilled"){
    const v=liveResult.value;
    const height=v?.blocks?.[0]?.height;
    if(v?.chain===network&&(typeof height==="number"||typeof height==="string")&&/^\d{1,16}$/.test(String(height)))
      $("homeHeight").textContent=new Intl.NumberFormat("en-US").format(Number(height));
   }
  }finally{
   clearTimeout(timeout);
   if(version===myVersion)running=null;
  }
 }
 function routeGlobalSearch(event){
  const input=$("marketQuery").value.trim(),chain=chainCode();
  if(!input)return;
  let type=null;
  if(/^\d{1,16}$/.test(input))type="block";
  else if(chain==="bnb"&&/^0x[0-9a-fA-F]{64}$/.test(input))type="tx";
  else if(chain==="solana"&&/^[1-9A-HJ-NP-Za-km-z]{70,100}$/.test(input))type="tx";
  else if(chain==="bnb"&&/^(?:0x)?[0-9a-fA-F]{40}$/.test(input))type="address";
  else if(chain==="solana"&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input))type="address";
  if(!type)return; // The market script filters token/pool symbols.
  event.preventDefault();event.stopImmediatePropagation();
  location.href="explorer.html?chain="+encodeURIComponent(chain)+"&type="+type+"&q="+encodeURIComponent(input);
 }
 function init(){
  $("homeMenuToggle").addEventListener("click",()=>{setSettings(false);setMenu($("homeMenu").hidden)});
  $("homeMenuClose").addEventListener("click",()=>setMenu(false));
  $("homeMenuOverlay").addEventListener("click",()=>setMenu(false));
  $("homeSettingsToggle").addEventListener("click",()=>{setMenu(false);setSettings($("homeSettings").hidden)});
  document.addEventListener("pointerdown",event=>{
   if(!$("homeSettings").hidden&&!$("homeSettings").contains(event.target)&&!$("homeSettingsToggle").contains(event.target))setSettings(false);
  });
  document.addEventListener("keydown",event=>{if(event.key==="Escape"){setMenu(false);setSettings(false)}});
  $("homeThemeToggle").addEventListener("click",()=>setTheme(!document.body.classList.contains("home-dark")));
  let dark=false;try{dark=localStorage.getItem("bexentra-home-theme")==="dark"}catch{}
  setTheme(dark);
  $("marketSearch").addEventListener("submit",routeGlobalSearch,true);
  $("marketChain").addEventListener("change",()=>loadNetworkMetrics());
  $("marketLang").addEventListener("change",localized);
  localized();
  void loadNetworkMetrics().catch(()=>{});
 }
 init();
})();
