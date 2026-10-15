"use strict";
/* BEXENTRA market discovery: real external DEX pool values only.
   Provider popularity != token verification or investment recommendation. */
(()=>{
 const $=id=>document.getElementById(id);
 const translations={
 ar:{title:"لوحة استكشاف الرموز",description:"اكتشف مجمعات التداول الرائجة على Solana وBNB Chain، وشاهد الأسعار والسيولة وحجم التداول من مصدر خارجي حقيقي.",trending:"الأكثر رواجاً",new:"الجديد",top:"الأكثر تداولاً",resultsTitle:"مجمعات التداول",loading:"جاري جلب بيانات الأسواق الحقيقية...",error:"تعذّر جلب بيانات GeckoTerminal حالياً. لن نعرض أسعاراً وهمية.",limited:"بلغنا حد طلبات المصدر المجاني. حاول بعد دقيقة.",noData:"لا توجد مجمعات مطابقة حالياً.",searchNo:"ما لقيناش رموز مطابقة للبحث.",updated:"آخر طلب",cached:"بيانات محفوظة",results:"نتيجة",invalid:"عنوان البحث غير صالح.",footnote:"بيانات DEX قد تكون متأخرة أو ناقصة. ظهور رمز هنا لا يعني أنه آمن.",providerDisclaimer:"ترتيب مجمعات التداول من GeckoTerminal، وليس توثيقاً للعملات أو توصية استثمارية.",searchPlaceholder:"ابحث عن رمز أو عنوان محفظة أو معاملة...",network:"الشبكة",refresh:"تحديث",home:"الرئيسية",blocks:"البلوكات",transactions:"المعاملات",wallets:"محافظي",token:"الرمز / المجمع",price:"السعر",volume:"حجم التداول 24H",liquidity:"السيولة",sortBy:"ترتيب",sourceOrder:"ترتيب المصدر",volumeSort:"حجم التداول",liquiditySort:"السيولة",changeSort:"التغير",explore:"استكشاف الأسواق",api:"واجهة API",strip:"بيانات أسواق البلوكتشين العامة",dataSource:"عرض مصدر بيانات الأسواق",solExplorer:"مستكشف Solana",solSub:"ابحث عن المحافظ والمعاملات",bnbExplorer:"مستكشف BNB",bnbSub:"البلوكات والعقود والمحافظ",footer:"بيانات للقراءة فقط · Beta",searchLabel:"البحث في الرموز والمحافظ"},
 en:{title:"Token discovery board",description:"Explore trending Solana and BNB Chain DEX pools with real prices, liquidity and trading volume.",trending:"Trending",new:"New pools",top:"Top volume",resultsTitle:"DEX pools",loading:"Loading real market data...",error:"GeckoTerminal is unavailable. We will not show fake prices.",limited:"Public API rate limit. Try again later.",noData:"No pools are available.",searchNo:"No matching tokens found.",updated:"Requested",cached:"Cached",results:"results",invalid:"Invalid search address.",footnote:"DEX data can be delayed or incomplete. Being listed is not proof of safety.",providerDisclaimer:"Pool rankings from GeckoTerminal are not token verification or investment advice.",searchPlaceholder:"Search token, wallet or transaction...",network:"Network",refresh:"Refresh",home:"Home",blocks:"Blocks",transactions:"Transactions",wallets:"Watchlist",token:"Token / pool",price:"Price",volume:"24H volume",liquidity:"Liquidity",sortBy:"Sort",sourceOrder:"Source order",volumeSort:"Volume",liquiditySort:"Liquidity",changeSort:"Price change",explore:"Markets",api:"API docs",strip:"Public on-chain market data",dataSource:"Open source data",solExplorer:"Solana explorer",solSub:"Wallets and transactions",bnbExplorer:"BNB explorer",bnbSub:"Blocks and wallets",footer:"Read-only data · Beta",searchLabel:"Search tokens and wallets"},
 fr:{title:"Découverte des jetons",description:"Découvrez les pools DEX Solana et BNB avec de vraies données externes.",trending:"Tendances",new:"Nouveaux",top:"Top volume",resultsTitle:"Pools DEX",loading:"Chargement des données...",error:"GeckoTerminal indisponible. Aucun prix inventé.",limited:"Limite API atteinte.",noData:"Aucun pool trouvé.",searchNo:"Aucun jeton trouvé.",updated:"Consulté",cached:"En cache",results:"résultats",invalid:"Adresse invalide.",footnote:"Les données DEX peuvent être incomplètes. Liste ≠ sécurité.",providerDisclaimer:"Classement GeckoTerminal, sans vérification de sécurité.",searchPlaceholder:"Rechercher un jeton ou une adresse...",network:"Réseau",refresh:"Actualiser",home:"Accueil",blocks:"Blocs",transactions:"Transactions",wallets:"Favoris",token:"Jeton / pool",price:"Prix",volume:"Volume 24H",liquidity:"Liquidité",sortBy:"Trier",sourceOrder:"Ordre source",volumeSort:"Volume",liquiditySort:"Liquidité",changeSort:"Variation",explore:"Marchés",api:"Docs API",strip:"Données de marché publiques",dataSource:"Voir la source",solExplorer:"Explorer Solana",solSub:"Portefeuilles et transactions",bnbExplorer:"Explorer BNB",bnbSub:"Blocs et adresses",footer:"Lecture seule · Bêta",searchLabel:"Rechercher"},
 de:{title:"Token-Entdeckung",description:"Entdecken Sie Solana- und BNB-DEX-Pools mit echten Marktdaten.",trending:"Trend",new:"Neu",top:"Top Volumen",resultsTitle:"DEX-Pools",loading:"Marktdaten laden...",error:"GeckoTerminal ist nicht erreichbar. Keine erfundenen Preise.",limited:"API-Limit erreicht.",noData:"Keine Pools gefunden.",searchNo:"Keine Treffer.",updated:"Abgerufen",cached:"Cache",results:"Ergebnisse",invalid:"Ungültige Adresse.",footnote:"DEX-Daten können unvollständig sein. Ein Eintrag bedeutet keine Sicherheit.",providerDisclaimer:"GeckoTerminal-Rangfolge; keine Token-Verifizierung.",searchPlaceholder:"Token oder Adresse suchen...",network:"Netzwerk",refresh:"Aktualisieren",home:"Start",blocks:"Blöcke",transactions:"Transaktionen",wallets:"Watchlist",token:"Token / Pool",price:"Preis",volume:"24H-Volumen",liquidity:"Liquidität",sortBy:"Sortieren",sourceOrder:"Quellenreihenfolge",volumeSort:"Volumen",liquiditySort:"Liquidität",changeSort:"Änderung",explore:"Märkte",api:"API-Doku",strip:"Öffentliche Marktdaten",dataSource:"Datenquelle",solExplorer:"Solana Explorer",solSub:"Wallets und Transaktionen",bnbExplorer:"BNB Explorer",bnbSub:"Blöcke und Wallets",footer:"Nur lesen · Beta",searchLabel:"Suche"},
 es:{title:"Descubrir tokens",description:"Explora pools DEX de Solana y BNB con datos reales.",trending:"Tendencias",new:"Nuevos",top:"Top volumen",resultsTitle:"Pools DEX",loading:"Cargando datos...",error:"GeckoTerminal no está disponible. No mostramos precios ficticios.",limited:"Límite API alcanzado.",noData:"No hay pools.",searchNo:"Sin resultados.",updated:"Consultado",cached:"En caché",results:"resultados",invalid:"Dirección inválida.",footnote:"Los datos DEX pueden estar incompletos; listado no significa seguridad.",providerDisclaimer:"Ranking de GeckoTerminal, no verificación de tokens.",searchPlaceholder:"Token o dirección...",network:"Red",refresh:"Actualizar",home:"Inicio",blocks:"Bloques",transactions:"Transacciones",wallets:"Favoritos",token:"Token / pool",price:"Precio",volume:"Volumen 24H",liquidity:"Liquidez",sortBy:"Ordenar",sourceOrder:"Orden de origen",volumeSort:"Volumen",liquiditySort:"Liquidez",changeSort:"Variación",explore:"Mercados",api:"API",strip:"Datos de mercado públicos",dataSource:"Abrir fuente",solExplorer:"Explorar Solana",solSub:"Carteras y transacciones",bnbExplorer:"Explorar BNB",bnbSub:"Bloques y carteras",footer:"Solo lectura · Beta",searchLabel:"Buscar"},
 it:{title:"Scopri i token",description:"Esplora pool DEX su Solana e BNB con dati reali.",trending:"Tendenze",new:"Nuovi",top:"Volume alto",resultsTitle:"Pool DEX",loading:"Caricamento dati...",error:"GeckoTerminal non disponibile. Nessun prezzo fittizio.",limited:"Limite API raggiunto.",noData:"Nessun pool disponibile.",searchNo:"Nessun risultato.",updated:"Richiesta",cached:"Cache",results:"risultati",invalid:"Indirizzo non valido.",footnote:"I dati DEX possono essere incompleti. La presenza non implica sicurezza.",providerDisclaimer:"Classifica GeckoTerminal; non verifica i token.",searchPlaceholder:"Token o indirizzo...",network:"Rete",refresh:"Aggiorna",home:"Home",blocks:"Blocchi",transactions:"Transazioni",wallets:"Preferiti",token:"Token / pool",price:"Prezzo",volume:"Volume 24H",liquidity:"Liquidità",sortBy:"Ordina",sourceOrder:"Ordine fonte",volumeSort:"Volume",liquiditySort:"Liquidità",changeSort:"Variazione",explore:"Mercati",api:"Docs API",strip:"Dati di mercato pubblici",dataSource:"Apri fonte",solExplorer:"Esplora Solana",solSub:"Wallet e transazioni",bnbExplorer:"Esplora BNB",bnbSub:"Blocchi e wallet",footer:"Sola lettura · Beta",searchLabel:"Cerca"}
 };
 const S={chain:"solana",mode:"trending",period:"h24",sort:"source",search:"",rows:[],updated:0};
 const cache=new Map();let controller=null,generation=0;
 const t=k=>(translations[$("marketLang").value]||translations.ar)[k]||translations.en[k]||k;
 const validAddr=(c,a)=>c==="bsc"?/^0x[a-fA-F0-9]{40}$/.test(a):c==="solana"?/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a):false;
 const number=v=>(typeof v==="number"||typeof v==="string")&&v!==""&&v!==null&&Number.isFinite(Number(v))?Number(v):null;
 const nonnegative=v=>{const n=number(v);return n!==null&&n>=0?n:null};
 const usd=n=>n===null?"—":n===0?"$0":n<.000001?"$"+n.toExponential(2):n<.01?"$"+Number(n.toPrecision(4)):new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:n<1?3:2,maximumFractionDigits:n<1?5:2}).format(n);
 const compact=n=>n===null?"—":"$"+new Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:2}).format(n);
 const change=n=>n===null?"—":(n>0?"+":"")+new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(n)+"%";
 function endpoint(){
  const kind=S.mode==="trending"?"trending_pools":S.mode==="new"?"new_pools":"pools";
  const url=new URL("https://api.geckoterminal.com/api/v2/networks/"+S.chain+"/"+kind);
  url.searchParams.set("include","base_token,quote_token,dex");url.searchParams.set("page","1");return url.href;
 }
 function normalize(json,chain){
  if(!json||!Array.isArray(json.data))throw Error("Invalid GeckoTerminal data");
  const include=new Map((Array.isArray(json.included)?json.included:[]).filter(i=>i&&typeof i.id==="string").map(i=>[i.id,i]));
  return json.data.filter(p=>p?.type==="pool"&&p.attributes).slice(0,40).map(p=>{
   const a=p.attributes,base=include.get(p.relationships?.base_token?.data?.id)?.attributes||{};
   const pool=typeof a.address==="string"&&validAddr(chain,a.address)?a.address:null;
   const mint=typeof base.address==="string"&&validAddr(chain,base.address)?base.address:null;
   return {name:String(base.name||a.name||"DEX pool").slice(0,70),
    symbol:String(base.symbol||"").slice(0,20),mint,pool,
    price:nonnegative(a.base_token_price_usd),volume:nonnegative(a.volume_usd?.h24),
    liquidity:nonnegative(a.reserve_in_usd),
    h1:number(a.price_change_percentage?.h1),h6:number(a.price_change_percentage?.h6),h24:number(a.price_change_percentage?.h24)};
  });
 }
 const el=(tag,cl,content)=>{const x=document.createElement(tag);if(cl)x.className=cl;if(content!==undefined)x.textContent=content;return x};
 function showError(message){const x=$("marketError");x.textContent=message;x.hidden=false}
 function clearError(){const x=$("marketError");x.textContent="";x.hidden=true}
 function updateMeta(isCached=false){$("marketUpdated").textContent=S.updated?(isCached?t("cached"):t("updated"))+": "+new Date(S.updated).toLocaleTimeString($("marketLang").value,{hour:"2-digit",minute:"2-digit"}):"—"}
 function paint(){
  const box=$("marketRows");box.replaceChildren();let values=S.rows.filter(p=>(p.name+" "+p.symbol+" "+(p.mint||"")+" "+(p.pool||"")).toLocaleLowerCase().includes(S.search.toLocaleLowerCase()));
  const metric=S.sort==="volume"?"volume":S.sort==="liquidity"?"liquidity":S.sort==="change"?S.period:null;
  if(metric)values=values.slice().sort((a,b)=>(b[metric]??-Infinity)-(a[metric]??-Infinity));
  $("resultCount").textContent=S.updated?values.length+" "+t("results"):"";
  if(values.length===0){const tr=el("tr"),td=el("td","placeholder-row",S.updated?(S.search?t("searchNo"):t("noData")):t("loading"));td.colSpan=5;tr.append(td);box.append(tr);return}
  const fragment=document.createDocumentFragment();
  for(const p of values){
   const tr=el("tr"),first=el("td"),wrap=el("div","coin-cell"),symbol=el("div","coin-badge",(p.symbol||p.name).slice(0,1).toUpperCase()),info=el("div","coin-name");
   const ext=p.pool?"https://www.geckoterminal.com/"+S.chain+"/pools/"+encodeURIComponent(p.pool):"https://www.geckoterminal.com/";
   const detail="explorer.html?chain="+(S.chain==="bsc"?"bnb":"solana")+"&type=address&q="+encodeURIComponent(p.mint||"");
   const a=el("a","",p.symbol||p.name);a.href=p.mint?detail:ext;
   if(!p.mint){a.target="_blank";a.rel="noopener noreferrer"}
   info.append(a,el("small","",p.symbol&&p.name!==p.symbol?p.name:(p.pool?p.pool.slice(0,11)+"…":"DEX")));
   wrap.append(symbol,info);first.append(wrap);
   const price=el("td"),n=el("span",p.price===null?"coin-number missing":"coin-number",usd(p.price));price.append(n);
   const diff=el("td"),c=p[S.period];diff.append(el("span","coin-change "+(c===null?"flat":c>0?"up":c<0?"down":"flat"),change(c)));
   const vol=el("td"),v=el("span",p.volume===null?"coin-number missing":"coin-number",compact(p.volume));vol.append(v);
   const liq=el("td"),l=el("span",p.liquidity===null?"coin-number missing":"coin-number",compact(p.liquidity));liq.append(l);
   if(p.pool){const poolLink=el("a","open-pool","↗");poolLink.href=ext;poolLink.rel="noopener noreferrer";poolLink.target="_blank";poolLink.setAttribute("aria-label","GeckoTerminal pool "+p.name);liq.append(poolLink)}
   tr.append(first,price,diff,vol,liq);fragment.append(tr);
  }
  box.append(fragment);
 }
 function labels(){
  const lang=$("marketLang").value,d=translations[lang]||translations.ar;
  document.documentElement.lang=lang;document.documentElement.dir=lang==="ar"?"rtl":"ltr";
  document.querySelectorAll("[data-t]").forEach(x=>x.textContent=d[x.dataset.t]||translations.en[x.dataset.t]||"");
  document.querySelectorAll("[data-placeholder]").forEach(x=>x.placeholder=d[x.dataset.placeholder]||"");
  $("changeColumn").textContent=S.period==="h1"?"1H %":S.period==="h6"?"6H %":"24H %";paint();updateMeta();
 }
 async function load(){
  const id=++generation;if(controller)controller.abort();
  S.rows=[];S.updated=0;clearError();updateMeta();paint();
  const url=endpoint(),old=cache.get(url);
  if(old&&Date.now()-old.updated<75000){S.rows=old.rows;S.updated=old.updated;paint();updateMeta(true);return}
  const req=new AbortController();controller=req;$("marketRefresh").disabled=true;
  const timeout=setTimeout(()=>req.abort(),14000);
  try{
   const res=await fetch(url,{method:"GET",mode:"cors",credentials:"omit",headers:{Accept:"application/json;version=20230203"},cache:"no-store",signal:req.signal});
   if(!res.ok){const err=new Error("GeckoTerminal "+res.status);err.rate=res.status===429;throw err}
   const rows=normalize(await res.json(),S.chain);
   if(id!==generation)return;
   S.rows=rows;S.updated=Date.now();cache.set(url,{rows,updated:S.updated});
   paint();updateMeta();
  }catch(e){if(id===generation){showError(e.rate?t("limited"):t("error"));S.rows=[];S.updated=0;paint()}}
  finally{clearTimeout(timeout);if(id===generation){controller=null;$("marketRefresh").disabled=false}}
 }
 function boot(){
  let lang="ar",chain=document.body.classList.contains("bex-home-redesign")?"bsc":"solana";try{lang=localStorage.getItem("bexentra-language")||"ar";chain=localStorage.getItem("bexentra-market-network")||(document.body.classList.contains("bex-home-redesign")?"bsc":"solana")}catch{}
  $("marketLang").value=translations[lang]?lang:"ar";S.chain=["solana","bsc"].includes(chain)?chain:"solana";$("marketChain").value=S.chain;
  $("marketLang").addEventListener("change",()=>{try{localStorage.setItem("bexentra-language",$("marketLang").value)}catch{}labels()});
  $("marketChain").addEventListener("change",()=>{S.chain=$("marketChain").value;S.search="";$("marketQuery").value="";try{localStorage.setItem("bexentra-market-network",S.chain)}catch{}load()});
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{S.mode=b.dataset.view;document.querySelectorAll(".tab").forEach(x=>{x.classList.toggle("active",x===b);x.setAttribute("aria-pressed",String(x===b))});load()}));
  document.querySelectorAll("[data-period]").forEach(b=>b.addEventListener("click",()=>{S.period=b.dataset.period;document.querySelectorAll("[data-period]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));$("changeColumn").textContent=S.period==="h1"?"1H %":S.period==="h6"?"6H %":"24H %";paint()}));
  $("marketSort").addEventListener("change",()=>{S.sort=$("marketSort").value;paint()});
  $("marketRefresh").addEventListener("click",load);
  $("marketSearch").addEventListener("submit",e=>{
   e.preventDefault();const q=$("marketQuery").value.trim();
   if(validAddr(S.chain,q)){location.href="explorer.html?chain="+(S.chain==="bsc"?"bnb":"solana")+"&type=address&q="+encodeURIComponent(q);return}
   if(S.chain==="bsc"&&/^0x[0-9a-fA-F]{64}$/.test(q)){location.href="explorer.html?chain=bnb&type=tx&q="+encodeURIComponent(q);return}
   S.search=q;paint();
  });
  labels();load();
 }
 window.BexentraMarkets=Object.freeze({normalize,validAddr,endpoint});
 boot();
})();