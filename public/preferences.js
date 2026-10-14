"use strict";
/* BEXENTRA appearance, language and browsing preferences.
 * All preferences stay on this device. No wallet access or accounts required. */
(()=>{
 const store={language:"bexentra-language",theme:"bexentra-theme",refresh:"bexentra-auto-refresh",network:"bexentra-network"};
 const defaults={language:"ar",theme:"dark",refresh:"on",network:"bnb"};
 const allowed={language:["ar","en"],theme:["dark","light"],refresh:["on","off"],network:["bnb","solana"]};
 function get(k){let value;try{value=localStorage.getItem(store[k])}catch{}return allowed[k].includes(value)?value:defaults[k]}
 function save(k,v){if(!allowed[k].includes(v))return;try{localStorage.setItem(store[k],v)}catch{}apply();document.dispatchEvent(new CustomEvent("bexentra:preferenceschange",{detail:{key:k,value:v}}))}
 const dict={
  ar:{
   "menu.home":"الرئيسية","menu.blocks":"البلوكات","menu.transactions":"المعاملات","menu.explorer":"المستكشف","menu.settings":"الإعدادات",
   "menu.safety":"مستكشف للقراءة فقط. ما كنطلبوش ربط المحفظة أو كلمات الاسترداد.",
   "hero.overline":"BEXENTRA INDEX · MAINNET",
   "hero.title":"أوضح. أسرع. أذكى.",
   "hero.description":"استكشف البيانات الحقيقية المفهرسة على \u2066BNB Chain\u2069 و\u2066Solana\u2069، من واجهة واحدة مصممة للهاتف.",
   "hero.indexed":"بيانات مفهرسة","hero.multichain":"متعدد الشبكات","hero.readonly":"قراءة فقط",
   "search.placeholder":"عنوان محفظة، Tx Hash أو رقم بلوك","search.button":"استكشف",
   "quick.blocks":"البلوكات","quick.blocksSub":"أحدث بيانات الشبكة",
   "quick.transactions":"المعاملات","quick.transactionsSub":"آخر نشاط مفهرس",
   "quick.refresh":"تحديث","quick.refreshSub":"إعادة جلب البيانات",
   "quick.networks":"الشبكات","quick.networksSub":"BNB + Solana",
   "stats.title":"إحصائيات المستكشف","stats.lastBlock":"آخر بلوك مفهرس","stats.network":"الشبكة الحالية",
   "stats.status":"حالة الفهرس","stats.visibleTx":"المعاملات الظاهرة","stats.latestSample":"عينة من أحدث النتائج",
   "stats.checking":"جاري التحقق","stats.noData":"لا بيانات","stats.updated":"محدّث","stats.recent":"قريب من المباشر","stats.stale":"متأخر",
   "stats.offline":"لا بيانات حديثة","stats.live":"محدّث","stats.nearLive":"قريب من المباشر","stats.needsUpdate":"يحتاج تحديث",
   "stats.noTimestamp":"لا وقت للفهرسة","stats.agePrefix":"آخر تحديث:",
   "stats.onchain":"من الشبكة مباشرة","stats.onchainAge":"آخر بلوك:","stats.onchainSlow":"تأخر بيانات الشبكة","stats.indexedOnly":"بيانات مفهرسة فقط","stats.lastBlockOnchain":"آخر بلوك من الشبكة","api.onchain":"من الشبكة",
   "data.blocks":"أحدث البلوكات","data.transactions":"أحدث المعاملات","data.refresh":"تحديث ↻","data.showAll":"عرض الكل ›","data.showLess":"عرض أقل ‹",
   "safety.title":"بيانات عامة للقراءة فقط","safety.description":"BEXENTRA ما كيطلبش كلمة السر أو المفتاح الخاص أو كلمات استرداد المحفظة.",
   "nav.home":"الرئيسية","nav.blocks":"البلوكات","nav.transactions":"المعاملات","nav.explorer":"Explorer",
   "category.subtitle":"أحدث البيانات المتاحة من الشبكة أو الفهرس. اضغط على أي صف لعرض التفاصيل.",
   "settings.title":"الإعدادات","settings.subtitle":"خصّص تجربة BEXENTRA على هاد الجهاز",
   "settings.language":"اللغة","settings.arabic":"العربية","settings.english":"English",
   "settings.appearance":"المظهر","settings.dark":"داكن","settings.light":"فاتح",
   "settings.network":"الشبكة الافتراضية","settings.refresh":"التحديث التلقائي","settings.refreshOn":"تلقائي (كل ثانية مع البث، أو 15 ثانية احتياطياً)","settings.refreshOff":"متوقف",
   "settings.privacyTitle":"الخصوصية والأمان","settings.privacyText":"الإعدادات محفوظة فهاد المتصفح فقط. الموقع كيقرأ بيانات بلوكتشين عمومية، وما كيطلبش أي مفتاح خاص.",
   "settings.reset":"إرجاع الإعدادات الأصلية","settings.close":"إغلاق الإعدادات",
   "time.seconds":"ثانية","time.minutes":"دقيقة","time.hours":"ساعة","time.days":"يوم","time.ago":"منذ",
   "api.loading":"جاري تحميل البيانات...","api.emptyBlocks":"ما كايناش بلوكات مفهرسة لهاد الشبكة حالياً.",
   "api.emptyTx":"ما كايناش معاملات مفهرسة لهاد الشبكة حالياً.","api.error":"خطأ الاتصال:",
   "api.transactionsUnit":"معاملة","api.confirmed":"مؤكد","api.failed":"فشل","api.indexed":"مفهرس",
   "details.searchHelp":"رقم فقط = بلوك · Tx Hash طويل = معاملة · عنوان محفظة = نشاط محفظة (ليس الرصيد)",
   "details.technical":"عرض التفاصيل التقنية: الرموز والعناوين الكاملة",
   "details.back":"رجوع","details.searchButton":"بحث","details.overview":"التفاصيل","details.subtitle":"بيانات من فهرس BEXENTRA العام",
   "details.sideTitle":"بيانات مفهرسة","details.sideText":"هاد الصفحة كتعرض غير البيانات اللي وصلت للفهرس الحالي، ماشي التاريخ الكامل للبلوكتشين.",
   "details.copy":"نسخ","details.verify":"تحقق خارجي ↗","details.addressActivity":"نشاط العنوان",
   "details.tokenActivity":"تحويلات التوكنات (BEP20)",
   "details.tokenCoverage":"تحويلات من الجزء المفهرس فقط، ماشي التاريخ الكامل للمحفظة. الكميات خام وما محسوباش فيها decimals.",
   "details.tokenEmpty":"ما كايناش تحويلات BEP20 لهاد العنوان فالجزء المفهرس.",
   "details.tokenLoading":"جاري تحميل تحويلات BEP20...",
   "details.tokenFailed":"تعذر تحميل تحويلات BEP20:",
   "details.tokenVerify":"تحقق على BscScan ↗","details.tokenNote":"الكمية خام (قبل decimals)، والبيانات من الجزء المفهرس فقط.",
   "details.event":"تفاصيل","details.rawAmount":"الكمية الخام",
   "details.noActivity":"ما كايناش معاملات لهاد العنوان فالجزء المفهرس.",
   "details.network":"الشبكة","details.block":"بلوك","details.address":"عنوان","details.indexedTx":"المعاملات المفهرسة",
   "details.notFound":"ما قدرناش نلقاو هاد البيانات فالجزء المفهرس:",
   "details.noSearch":"كتب عنوان محفظة أو رقم بلوك أو Tx Hash باش تبحث.",
   "details.loadBlock":"جاري تحميل البلوك...","details.loadSlot":"جاري تحميل Slot...","details.loadTx":"جاري تحميل المعاملة...","details.loadAddress":"جاري تحميل نشاط العنوان...","details.txTitle":"معاملة","details.addressTitle":"عنوان المحفظة","details.indexedTxSummary":"معاملة مفهرسة","details.confirmed":"مؤكدة","details.failed":"فاشلة","details.indexed":"مفهرسة","details.unavailable":"غير متوفرة","details.detailsLabel":"تفاصيل","details.copyDone":"تم ✓","details.viewTransfer":"عرض تفاصيل تحويل BEP20 داخل BEXENTRA","details.viewAddress":"عرض العنوان داخل BEXENTRA","details.tokenContract":"عقد التوكن","details.from":"من","details.to":"إلى","details.logIndex":"رقم السجل","details.txHash":"معرّف المعاملة","api.finding":"جاري البحث في فهرس BEXENTRA...","api.txMissing":"المعاملة ما كايناش فالجزء المفهرس حالياً.","api.txError":"تعذّر البحث حالياً.",
   "search.invalid":"العنوان أو رمز المعاملة غير صحيح. نسخ Tx Hash أو رابط BscScan صحيح.","search.empty":"كتب عنوان أو رمز معاملة باش تبحث.","search.unsupportedUrl":"هاد الرابط ماشي من BscScan أو Solscan. استعمل Tx Hash أو عنوان محفظة.","search.wrongNetwork":"الرابط تابع لشبكة أخرى. بدّل الشبكة من الصفحة الرئيسية.",
   "details.notIndexedTitle":"ما كايناش هاد المعاملة فالجزء المفهرس","details.lookupErrorTitle":"تعذّر تحميل المعاملة","details.notIndexedText":"ما لقيناش هاد المعاملة فبيانات BEXENTRA الحالية. هادشي ما كيعنيش أنها ما كايناش فشبكة BNB.","details.unverifiedTitle":"ما قدرناش نتحققو من هاد المعاملة","details.unverifiedText":"هاد المعرف ما تأكدش وجوده على الشبكة المختارة عند مصادر RPC اللي جربناها. راجع الشبكة والـ Hash أو حاول من بعد. ما غاديش نعرض حالة أو رسوم بلا إثبات.",
   "details.networkUnavailableTitle":"مصدر الشبكة غير متاح مؤقتاً","details.networkUnavailableText":"تعذر التحقق مباشرة من المعاملة بسبب الاتصال بمصدر البلوكتشين. جرب مرة أخرى؛ هادشي ما كيعنيش أن المعاملة ما كايناش.",
   "details.blockVerifiedSource":"تأكدنا من وجود المعاملة داخل بلوك حقيقي من الشبكة. الحالة والرسوم كتظهر غير إلا وصلنا لإيصال موثق.",
   "details.retry":"عاود المحاولة","details.tokenOnlySubtitle":"توصلنا بتحويلات BEP20 ديال هاد المعاملة، ولكن تفاصيل المعاملة الكاملة مازال ما مفهرسينهاش.","details.tokenOnlyLabel":"بيانات جزئية: تحويلات توكنات مفهرسة فقط","details.notVerified":"ما تحققناش من حالة المعاملة ولا رسومها داخل BEXENTRA","details.transferCount":"تحويلات توكنات","details.noNativeStatus":"حالة المعاملة الأصلية غير متوفرة فالفهرس الحالي",
   "details.liveBlockSource":"بلوك تم جلبه مباشرة من الشبكة، وماشي بالضرورة مخزن فالفهرس.","details.liveTxSource":"معاملة جلبناها مباشرة من الشبكة.","details.augmentedSource":"معاملة مفهرسة، وبعض تفاصيلها تحققنا منها مباشرة على الشبكة.","details.liveSideTitle":"معلومات مباشرة من الشبكة","details.liveSideText":"تم طلب هاد البيانات من RPC العام مباشرة. الحالة والرسوم كتظهر غير إلا توفر إثبات من الشبكة. يمكن ما تكونش مخزنة ففهرس BEXENTRA.","details.source":"مصدر البيانات","details.sourceLive":"RPC الشبكة","details.sourceIndexed":"فهرس BEXENTRA"
  },
  en:{
   "menu.home":"Home","menu.blocks":"Blocks","menu.transactions":"Transactions","menu.explorer":"Explorer","menu.settings":"Settings",
   "menu.safety":"Read-only blockchain explorer. We never ask you to connect a wallet or share a seed phrase.",
   "hero.overline":"BEXENTRA INDEX · MAINNET",
   "hero.title":"Clearer. Faster. Smarter.",
   "hero.description":"Explore real indexed data on BNB Chain and Solana in one mobile-first experience.",
   "hero.indexed":"Indexed data","hero.multichain":"Multi-chain","hero.readonly":"Read-only",
   "search.placeholder":"Wallet address, Tx Hash or block number","search.button":"Explore",
   "quick.blocks":"Blocks","quick.blocksSub":"Latest network blocks",
   "quick.transactions":"Transactions","quick.transactionsSub":"Recent indexed activity",
   "quick.refresh":"Refresh","quick.refreshSub":"Fetch latest indexed data",
   "quick.networks":"Networks","quick.networksSub":"BNB + Solana",
   "stats.title":"Explorer statistics","stats.lastBlock":"Latest indexed block","stats.network":"Current network",
   "stats.status":"Indexer status","stats.visibleTx":"Visible transactions","stats.latestSample":"Latest sample only",
   "stats.checking":"Checking","stats.noData":"No data","stats.updated":"Updated","stats.recent":"Near live","stats.stale":"Outdated",
   "stats.offline":"No recent data","stats.live":"Updated","stats.nearLive":"Near live","stats.needsUpdate":"Needs refresh",
   "stats.noTimestamp":"No indexed timestamp","stats.agePrefix":"Updated:",
   "stats.onchain":"From the blockchain","stats.onchainAge":"Latest block:","stats.onchainSlow":"Network data delayed","stats.indexedOnly":"Indexed snapshot only","stats.lastBlockOnchain":"Latest on-chain block","api.onchain":"On-chain",
   "data.blocks":"Latest blocks","data.transactions":"Latest transactions","data.refresh":"Refresh ↻","data.showAll":"Show all ›","data.showLess":"Show less ‹",
   "safety.title":"Public read-only data","safety.description":"BEXENTRA never asks for your password, private key or wallet recovery phrase.",
   "nav.home":"Home","nav.blocks":"Blocks","nav.transactions":"Transactions","nav.explorer":"Explorer",
   "category.subtitle":"Latest available network or indexed data. Select any row to view details.",
   "settings.title":"Settings","settings.subtitle":"Customize BEXENTRA on this device",
   "settings.language":"Language","settings.arabic":"العربية","settings.english":"English",
   "settings.appearance":"Appearance","settings.dark":"Dark","settings.light":"Light",
   "settings.network":"Default network","settings.refresh":"Auto refresh","settings.refreshOn":"Auto (1s stream, 15s fallback)","settings.refreshOff":"Off",
   "settings.privacyTitle":"Privacy & security","settings.privacyText":"Preferences are saved only in this browser. The explorer reads public blockchain data and never needs a private key.",
   "settings.reset":"Reset preferences","settings.close":"Close settings",
   "time.seconds":"seconds","time.minutes":"minutes","time.hours":"hours","time.days":"days","time.ago":"ago",
   "api.loading":"Loading indexed data...","api.emptyBlocks":"No indexed blocks for this network yet.",
   "api.emptyTx":"No indexed transactions for this network yet.","api.error":"Connection error:",
   "api.transactionsUnit":"transactions","api.confirmed":"Confirmed","api.failed":"Failed","api.indexed":"Indexed",
   "details.searchHelp":"Number = block · Long Tx Hash = transaction · Wallet address = indexed activity (not balance)",
   "details.technical":"Show technical details: full hashes and addresses",
   "details.back":"Back","details.searchButton":"Search","details.overview":"Overview","details.subtitle":"Data from the BEXENTRA public index",
   "details.sideTitle":"Indexed data","details.sideText":"This page shows only the part of the blockchain that BEXENTRA has indexed so far, not complete chain history.",
   "details.copy":"Copy","details.verify":"External verification ↗","details.addressActivity":"Address activity",
   "details.tokenActivity":"Token transfers (BEP20)",
   "details.tokenCoverage":"Only indexed transfers are shown, not the full wallet history. Amounts are raw base units before token decimals.",
   "details.tokenEmpty":"No BEP20 transfers found for this address in the indexed range.",
   "details.tokenLoading":"Loading indexed BEP20 transfers...",
   "details.tokenFailed":"Unable to load BEP20 transfers:",
   "details.tokenVerify":"Verify on BscScan ↗","details.tokenNote":"Raw amount (before decimals). Only indexed data is shown.",
   "details.event":"Details","details.rawAmount":"Raw amount",
   "details.noActivity":"No transactions for this address in the indexed range.",
   "details.network":"Network","details.block":"Block","details.address":"Address","details.indexedTx":"Indexed transactions",
   "details.notFound":"Not available in the current indexed range:",
   "details.noSearch":"Enter an address, block number or transaction hash to search.",
   "details.loadBlock":"Loading block...","details.loadSlot":"Loading slot...","details.loadTx":"Loading transaction...","details.loadAddress":"Loading address activity...","details.txTitle":"Transaction","details.addressTitle":"Wallet address","details.indexedTxSummary":"indexed transactions","details.confirmed":"Confirmed","details.failed":"Failed","details.indexed":"Indexed","details.unavailable":"Unavailable","details.detailsLabel":"Details","details.copyDone":"Copied ✓","details.viewTransfer":"Show BEP20 transfer details in BEXENTRA","details.viewAddress":"View address inside BEXENTRA","details.tokenContract":"Token contract","details.from":"From","details.to":"To","details.logIndex":"Log index","details.txHash":"Transaction hash","api.finding":"Searching the BEXENTRA index...","api.txMissing":"Transaction not found in the indexed range.","api.txError":"Unable to search right now.",
   "search.invalid":"Invalid address or transaction hash. Paste a valid hash or BscScan link.","search.empty":"Enter an address or transaction hash to search.","search.unsupportedUrl":"Unsupported link. Paste a BscScan or Solscan link, hash, or wallet address.","search.wrongNetwork":"This link belongs to a different network. Switch networks on the home page.",
   "details.notIndexedTitle":"Transaction not in the indexed range","details.lookupErrorTitle":"Unable to load transaction","details.notIndexedText":"BEXENTRA hasn't indexed this transaction yet. It may still exist on the blockchain.","details.unverifiedTitle":"Transaction not verified","details.unverifiedText":"The selected network's available RPC providers could not verify this hash. Check the chain and hash or retry later. Status and fees will not be invented.",
   "details.networkUnavailableTitle":"Network RPC temporarily unavailable","details.networkUnavailableText":"The blockchain RPC could not confirm this transaction right now. Retry later; this does not mean the transaction doesn't exist.",
   "details.blockVerifiedSource":"Verified inside a real on-chain block. Status and fees are shown only when a matching receipt is available.",
   "details.retry":"Retry","details.tokenOnlySubtitle":"Indexed BEP20 transfer logs found, but the complete native transaction summary is not yet indexed.","details.tokenOnlyLabel":"Partial data: indexed token transfers only","details.notVerified":"Native transaction status and fees are not verified by this index","details.transferCount":"Token transfer events","details.noNativeStatus":"Native transaction status is not available in the current index",
   "details.liveBlockSource":"Block fetched directly from the blockchain, not necessarily indexed.","details.liveTxSource":"Transaction retrieved directly from the blockchain.","details.augmentedSource":"Indexed transaction with some details verified live on-chain.","details.liveSideTitle":"Live blockchain information","details.liveSideText":"This data was requested directly from a public RPC. Status and fees only appear when the network returns verified details. It may not yet be stored in the BEXENTRA index.","details.source":"Data source","details.sourceLive":"Network RPC","details.sourceIndexed":"BEXENTRA index"
  }
 };
 const t=k=>dict[get("language")][k]||dict.ar[k]||k;
 let focusedBefore=null;
 function apply(){
  const lang=get("language"),theme=get("theme");
  document.documentElement.lang=lang;document.documentElement.dir=lang==="ar"?"rtl":"ltr";
  document.body?.classList.toggle("light-mode",theme==="light");
  document.querySelectorAll("[data-i18n]").forEach(el=>{el.textContent=t(el.dataset.i18n)});
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{el.placeholder=t(el.dataset.i18nPlaceholder)});
  document.querySelectorAll("[data-i18n-aria]").forEach(el=>{el.setAttribute("aria-label",t(el.dataset.i18nAria))});
  document.querySelectorAll("[data-pref-language]").forEach(el=>{const on=el.dataset.prefLanguage===lang;el.classList.toggle("selected",on);el.setAttribute("aria-pressed",String(on))});
  document.querySelectorAll("[data-pref-theme]").forEach(el=>{const on=el.dataset.prefTheme===theme;el.classList.toggle("selected",on);el.setAttribute("aria-pressed",String(on))});
  const refresh=document.getElementById("prefRefresh");if(refresh)refresh.value=get("refresh");
  const chain=document.getElementById("prefNetwork");if(chain)chain.value=get("network");
 }
 function open(){const panel=document.getElementById("settingsOverlay");if(!panel)return;focusedBefore=document.activeElement;panel.hidden=false;document.body.classList.add("settings-open");apply();panel.querySelector("button")?.focus()}
 function close(){const panel=document.getElementById("settingsOverlay");if(!panel)return;panel.hidden=true;document.body.classList.remove("settings-open");focusedBefore?.focus?.()}
 function init(){
  apply();
  document.querySelectorAll("[data-open-settings]").forEach(el=>el.addEventListener("click",()=>{const menu=document.getElementById("mobileMenu");menu?.classList.remove("open");menu?.setAttribute("aria-hidden","true");document.getElementById("menuBackdrop")?.classList.remove("show");open()}));
  document.querySelectorAll("[data-close-settings]").forEach(el=>el.addEventListener("click",close));
  document.getElementById("settingsOverlay")?.addEventListener("click",e=>{if(e.target.id==="settingsOverlay")close()});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
  document.querySelectorAll("[data-pref-language]").forEach(el=>el.addEventListener("click",()=>save("language",el.dataset.prefLanguage)));
  document.querySelectorAll("[data-pref-theme]").forEach(el=>el.addEventListener("click",()=>save("theme",el.dataset.prefTheme)));
  document.getElementById("prefRefresh")?.addEventListener("change",e=>save("refresh",e.target.value));
  document.getElementById("prefNetwork")?.addEventListener("change",e=>{
   save("network",e.target.value);
   const select=document.getElementById("network");
   if(select){select.value=e.target.value;select.dispatchEvent(new Event("change",{bubbles:true}))}
  });
  document.getElementById("prefReset")?.addEventListener("click",()=>{
   for(const k of Object.keys(defaults)){try{localStorage.removeItem(store[k])}catch{}}
   apply();
   const select=document.getElementById("network");
   if(select){select.value=defaults.network;select.dispatchEvent(new Event("change",{bubbles:true}))}
   document.dispatchEvent(new CustomEvent("bexentra:preferenceschange",{detail:{key:"reset"}}));
  });
 }
 window.BexentraPrefs={get,set:save,t,apply,open,close};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
