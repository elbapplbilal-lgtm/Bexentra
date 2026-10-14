"use strict";
/* BEXENTRA appearance, language and browsing preferences.
 * All preferences stay on this device. No wallet access or accounts required. */
(()=>{
 const store={language:"bexentra-language",theme:"bexentra-theme",refresh:"bexentra-auto-refresh",network:"bexentra-network"};
 const defaults={language:"ar",theme:"light",refresh:"on",network:"bnb"};
 const allowed={language:["ar","en"],theme:["dark","light"],refresh:["on","off"],network:["bnb","solana"]};
 function get(k){let value;try{value=localStorage.getItem(store[k])}catch{}return allowed[k].includes(value)?value:defaults[k]}
 function save(k,v){if(!allowed[k].includes(v))return;try{localStorage.setItem(store[k],v)}catch{}apply();document.dispatchEvent(new CustomEvent("bexentra:preferenceschange",{detail:{key:k,value:v}}))}
 const dict={
  ar:{
   "menu.home":"الرئيسية","menu.blocks":"البلوكات","menu.transactions":"المعاملات","menu.explorer":"بحث","menu.settings":"الإعدادات",
   "bnav.chain":"تقنية البلوك تشين",
   "bnav.validators":"المدققون",
   "bnav.tokens":"الرموز",
   "bnav.nfts":"NFTs",
   "bnav.resources":"موارد",
   "bnav.api":"واجهة برمجة التطبيقات (API)",
   "bnav.more":"أكثر",
   "bnav.explorers":"المستكشفون",
   "bnav.appearance":"المظهر",
   "bnav.language":"اللغة",
   "bnav.blocks":"آخر البلوكات",
   "bnav.txs":"آخر التحويلات",
   "bnav.wallets":"المحافظ",
   "bnav.validatorsSoon":"قائمة المدققين",
   "bnav.contract":"البحث بعنوان عقد",
   "bnav.tokensSoon":"جميع العملات",
   "bnav.nftsSoon":"استكشاف NFTs",
   "bnav.search":"البحث في الشبكة",
   "bnav.solSearch":"البحث في Solana",
   "bnav.apiSoon":"وثائق API",
   "bnav.about":"عن BEXENTRA",
   "bnav.aboutText":"تعرّف على ما يحدث في الشبكة وابحث عن المحافظ والمعاملات.",
   "bnav.bnb":"BNB Chain",
   "bnav.sol":"Solana",
   "bnav.soon":"قريباً",
   "bnav.settings":"إعدادات الموقع",
   "bnav.searchTitle":"مستكشف BNB Chain وSolana",
   "bnav.searchPlaceholder":"عنوان محفظة، معاملة، أو رقم بلوك...",
   "bnav.searchNetwork":"اختر الشبكة",
   "bnav.searchNote":"البحث يدعم المحافظ والمعاملات والبلوكات. البحث بأسماء العملات والنطاقات قريباً.",
   "bnav.safety":"يمكنك البحث بأمان. لا تشارك كلمة السر أو كلمات استعادة المحفظة.",
   "menu.safety":"ابحث بأمان دون ربط محفظتك أو مشاركة كلمات الاستعادة.",
   "scan.menuBrowse":"بحث في الشبكة",
   "scan.menuWallets":"المحافظ",
   "scan.menuTools":"أدوات البحث",
   "scan.tx":"البحث عن معاملة",
   "scan.block":"البحث عن بلوك",
   "scan.sol":"محافظ Solana",
   "scan.welcome":"ما الذي تريد البحث عنه؟",
   "scan.welcomeText":"ابحث عن محفظة، معاملة أو بلوك.",
   "scan.address":"محفظة",
   "scan.safety":"البيانات للقراءة فقط. لا تشارك مفتاحك الخاص أو كلمات الاسترداد.",
   "hero.overline":"BEXENTRA · BNB وSolana",
   "hero.title":"عالم العملات بين يديك",
   "hero.description":"تابع المحافظ والتحويلات والبلوكات على BNB Chain وSolana بسهولة.",
   "hero.indexed":"بيانات الشبكة","hero.multichain":"BNB Chain وSolana","hero.readonly":"بدون ربط المحفظة",
   "search.placeholder":"ابحث عن محفظة، معاملة، أو بلوك...","search.button":"بحث",
   "quick.blocks":"آخر البلوكات","quick.blocksSub":"شاهد آخر البلوكات",
   "quick.address":"رصيدك",
   "quick.addressSub":"ابحث عن رصيد أي محفظة",
   "wallet.title":"رصيد المحفظة",
   "wallet.subtitle":"تابع الرصيد وحركة المحفظة.",
   "wallet.native":"الرصيد",
   "wallet.usd":"القيمة بالدولار (تقريبية)",
   "wallet.holdings":"العملات الأخرى",
   "wallet.unavailable":"لا توجد معلومات الآن",
   "wallet.loading":"جارٍ تحميل الرصيد...",
   "wallet.balanceFailed":"تعذّر جلب الرصيد. حاول لاحقاً.",
   "wallet.priceVerified":"القيمة بالدولار تقديرية، وقد تختلف عند البيع.",
   "wallet.balanceVerified":"تم جلب الرصيد من الشبكة. قد يتغيّر.",
   "wallet.note":"الرصيد من الشبكة، وقيمته بالدولار تقريبية. قد لا تظهر جميع التحويلات هنا.",
   "wallet.tabTransactions":"آخر المعاملات",
   "wallet.tabTransfers":"تحويلات العملات",
   "wallet.tabInfo":"معلومات أخرى",
   "quick.transactions":"آخر التحويلات","quick.transactionsSub":"تابع التحويلات الجديدة",
   "quick.refresh":"تحديث","quick.refreshSub":"جيب آخر البيانات",
   "quick.networks":"الشبكات","quick.networksSub":"BNB Chain وSolana",
   "stats.title":"معلومات الشبكة","stats.lastBlock":"آخر بلوك","stats.network":"الشبكة",
   "stats.status":"حالة الشبكة","stats.visibleTx":"آخر التحويلات","stats.latestSample":"آخر المعاملات",
   "stats.checking":"جارٍ الاتصال...","stats.noData":"لا توجد بيانات جديدة","stats.updated":"تم التحديث","stats.recent":"آخر تحديث قبل قليل","stats.stale":"التحديث متأخر",
   "stats.offline":"تعذّر الاتصال الآن","stats.live":"تم التحديث مؤخراً","stats.nearLive":"تحديث متأخر","stats.needsUpdate":"توقّف التحديث",
   "stats.noTimestamp":"وقت التحديث غير معروف","stats.agePrefix":"آخر تحديث:",
   "stats.running":"مباشر الآن ●","stats.onchain":"مباشر الآن ●","stats.onchainAge":"","stats.onchainSlow":"التحديث متأخر","stats.indexedOnly":"آخر البيانات المحفوظة","stats.lastBlockOnchain":"آخر بلوك","api.onchain":"من الشبكة",
   "data.blocks":"آخر البلوكات","data.transactions":"آخر التحويلات","data.refresh":"تحديث ↻","data.showAll":"عرض الكل ›","data.showLess":"عرض أقل ‹",
   "safety.title":"تصفح آمن","safety.description":"لا تحتاج إلى ربط محفظتك. لا تشارك كلمة السر أو كلمات الاستعادة.",
   "nav.home":"الرئيسية","nav.blocks":"البلوكات","nav.transactions":"المعاملات","nav.explorer":"بحث",
   "category.subtitle":"اضغط على أي معاملة أو بلوك لعرض التفاصيل.",
   "category.blocksHelp":"اطّلع على أحدث البلوكات وما تحتويه من معاملات.",
   "category.transactionsHelp":"اطّلع على آخر المعاملات وتفاصيلها.",
   "guide.summary":"كيف تتم المعاملة؟",
   "guide.intro":"تمر المعاملة بأربع خطوات بسيطة:",
   "guide.s1":"تأكيد العملية في المحفظة",
   "guide.p1":"تراجع تفاصيل العملية وتؤكدها من محفظتك.",
   "guide.s2":"إرسالها للشبكة",
   "guide.p2":"تصل العملية للشبكة لفحصها، وقد تستغرق بعض الوقت.",
   "guide.s3":"تسجيل المعاملة",
   "guide.p3":"تُضاف المعاملة إلى بلوك على الشبكة.",
   "guide.s4":"معرفة النتيجة",
   "guide.p4":"يمكنك البحث عن المعاملة لمعرفة حالتها عندما تصلنا البيانات.",
   "guide.caveat":"ظهور المعاملة في بلوك لا يعني بالضرورة نجاحها.",
   "settings.title":"الإعدادات","settings.subtitle":"اختر اللغة والمظهر والشبكة المناسبة لك.",
   "settings.language":"اللغة","settings.arabic":"العربية","settings.english":"English",
   "settings.appearance":"المظهر","settings.dark":"داكن","settings.light":"فاتح",
   "settings.network":"الشبكة الافتراضية","settings.refresh":"التحديث التلقائي","settings.refreshOn":"تلقائي","settings.refreshOff":"متوقف",
   "settings.privacyTitle":"الخصوصية والأمان","settings.privacyText":"إعداداتك محفوظة على جهازك فقط. لا نطلب مفاتيح محفظتك.",
   "settings.reset":"إرجاع الإعدادات الأصلية","settings.close":"إغلاق الإعدادات",
   "time.seconds":"ثانية","time.minutes":"دقيقة","time.hours":"ساعة","time.days":"يوم","time.ago":"منذ",
   "api.loading":"جارٍ تحميل المعلومات...","api.emptyBlocks":"لم نجد بلوكات جديدة حالياً.",
   "api.emptyTx":"لم نجد معاملات جديدة حالياً.","api.error":"تعذّر الاتصال:",
   "api.transactionsUnit":"معاملة","api.confirmed":"مؤكد","api.failed":"فشل","api.indexed":"مسجّلة",
   "details.searchHelp":"أدخل عنوان المحفظة أو رقم المعاملة أو رقم البلوك.",
   "details.technical":"عرض معلومات أكثر",
   "details.back":"رجوع","details.searchButton":"بحث","details.overview":"التفاصيل","details.subtitle":"ابحث عن محفظة أو معاملة أو بلوك.",
   "details.sideTitle":"معلومات إضافية","details.sideText":"نعرض ما وصل إلينا من معلومات. قد توجد معاملات أخرى غير ظاهرة هنا.",
   "details.copy":"نسخ","details.verify":"عرض على موقع آخر ↗","details.addressActivity":"نشاط المحفظة",
   "details.tokenActivity":"تحويلات العملات",
   "details.tokenCoverage":"هذه بعض التحويلات فقط. قد توجد تحويلات أخرى. بعض الأرقام تحتاج إلى تعديل حسب نوع العملة.",
   "details.tokenEmpty":"لا توجد تحويلات ظهرت لهذه المحفظة.",
   "details.tokenLoading":"جارٍ تحميل تحويلات العملات...",
   "details.tokenFailed":"تعذّر تحميل التحويلات:",
   "details.tokenVerify":"تحقق على BscScan ↗","details.tokenNote":"قد تحتاج الكمية إلى ضبط حسب نوع العملة.",
   "details.event":"تفاصيل","details.rawAmount":"الكمية قبل الحساب",
   "details.noActivity":"لم نجد معاملات لهذه المحفظة في معلوماتنا الحالية. قد توجد معاملات أخرى.",
   "details.network":"الشبكة","details.block":"بلوك","details.address":"عنوان","details.indexedTx":"آخر المعاملات",
   "details.notFound":"ما لقيناش هاد المعلومات:",
   "details.noSearch":"أدخل محفظة أو معاملة أو رقم بلوك.",
   "details.loadBlock":"جارٍ تحميل البلوك...","details.loadSlot":"جارٍ تحميل البلوك...","details.loadTx":"جارٍ تحميل المعاملة...","details.loadAddress":"جارٍ تحميل معلومات المحفظة...","details.txTitle":"معاملة","details.addressTitle":"عنوان المحفظة","details.indexedTxSummary":"معاملة مسجلة","details.confirmed":"مؤكدة","details.failed":"فاشلة","details.indexed":"مسجلة","details.unavailable":"غير متوفرة","details.detailsLabel":"تفاصيل","details.copyDone":"تم ✓","details.viewTransfer":"عرض تفاصيل تحويل BEP20 داخل BEXENTRA","details.viewAddress":"عرض العنوان داخل BEXENTRA","details.tokenContract":"عقد التوكن","details.from":"من","details.to":"إلى","details.logIndex":"رقم السجل","details.txHash":"معرّف المعاملة","api.finding":"كنقلبو على المعاملة...","api.txMissing":"هاد المعاملة ما ظهرتش عندنا دابا.","api.txError":"تعذّر البحث حالياً.",
   "search.invalid":"تأكد من العنوان أو رقم المعاملة وجرب مرة أخرى.","search.empty":"دخل عنوان محفظة أو رقم معاملة.","search.unsupportedUrl":"دخل عنوان المحفظة أو رقم المعاملة مباشرة.","search.wrongNetwork":"الرابط تابع لشبكة أخرى. بدّل الشبكة من الصفحة الرئيسية.",
   "details.notIndexedTitle":"المعاملة ما ظهرتش عندنا دابا","details.lookupErrorTitle":"تعذّر تحميل المعاملة","details.notIndexedText":"لم نجد هذه المعاملة في معلوماتنا الحالية. قد تكون موجودة على الشبكة.","details.unverifiedTitle":"تعذّر التحقق من المعاملة","details.unverifiedText":"لم نستطع تأكيد هذه المعاملة. تحقّق من الرقم والشبكة.",
   "details.networkUnavailableTitle":"الشبكة غير متصلة حالياً","details.networkUnavailableText":"تعذّر الاتصال بالشبكة. حاول مجدداً بعد قليل.",
   "details.blockVerifiedSource":"تأكدنا من وجود المعاملة داخل بلوك حقيقي من الشبكة. الحالة والرسوم كتظهر غير إلا وصلنا لإيصال موثق.",
   "details.retry":"حاول مرة أخرى","details.tokenOnlySubtitle":"وجدنا بعض تحويلات العملات، لكن لا توجد تفاصيل كافية عن المعاملة.","details.tokenOnlyLabel":"بعض تحويلات العملات","details.notVerified":"لم نستطع تأكيد حالة المعاملة أو رسومها.","details.transferCount":"تحويلات العملات","details.noNativeStatus":"لم يتم تأكيد حالة المعاملة.",
   "details.liveBlockSource":"معلومات البلوك من الشبكة.","details.liveTxSource":"معلومات المعاملة من الشبكة.","details.augmentedSource":"تأكدنا من بعض تفاصيل المعاملة على الشبكة.","details.liveSideTitle":"معلومات من الشبكة","details.liveSideText":"تم جلب المعلومات من الشبكة. تظهر الرسوم والحالة بعد تأكيدهما.","details.source":"مصدر البيانات","details.sourceLive":"الشبكة","details.sourceIndexed":"معلومات محفوظة"
  },
  en:{
   "menu.home":"Home","menu.blocks":"Blocks","menu.transactions":"Transactions","menu.explorer":"Explorer","menu.settings":"Settings",
   "bnav.chain":"Blockchain",
   "bnav.validators":"Validators",
   "bnav.tokens":"Tokens",
   "bnav.nfts":"NFTs",
   "bnav.resources":"Resources",
   "bnav.api":"API",
   "bnav.more":"More",
   "bnav.explorers":"Explorers",
   "bnav.appearance":"Appearance",
   "bnav.language":"Language",
   "bnav.blocks":"Latest blocks",
   "bnav.txs":"Latest transactions",
   "bnav.wallets":"Wallets and addresses",
   "bnav.validatorsSoon":"Validator directory",
   "bnav.contract":"Search by contract address",
   "bnav.tokensSoon":"Token directory",
   "bnav.nftsSoon":"Explore NFTs",
   "bnav.search":"Search blockchain",
   "bnav.solSearch":"Search Solana",
   "bnav.apiSoon":"API documentation",
   "bnav.about":"About BEXENTRA",
   "bnav.aboutText":"Public-data explorer. Additional services are in development.",
   "bnav.bnb":"BNB Chain explorer",
   "bnav.sol":"Solana explorer",
   "bnav.soon":"Coming soon",
   "bnav.settings":"Site settings",
   "bnav.searchTitle":"BNB Chain & Solana Explorer",
   "bnav.searchPlaceholder":"Wallet address, transaction ID, or block number...",
   "bnav.searchNetwork":"Choose a network",
   "bnav.searchNote":"Search supports wallets, transactions and blocks. Token-name and domain search are coming soon.",
   "bnav.safety":"Read-only public information. Never share wallet keys or recovery phrases.",
   "menu.safety":"Read-only blockchain explorer. We never ask you to connect a wallet or share a seed phrase.",
   "scan.menuBrowse":"Explore network",
   "scan.menuWallets":"Wallet addresses",
   "scan.menuTools":"Search tools",
   "scan.tx":"Find transaction",
   "scan.block":"Find block",
   "scan.sol":"Solana wallets",
   "scan.welcome":"What would you like to explore?",
   "scan.welcomeText":"Search a wallet, transaction or block on the selected network.",
   "scan.address":"Wallet",
   "scan.safety":"Read-only public data. Never share private keys or recovery phrases.",
   "hero.overline":"BEXENTRA · BNB & Solana",
   "hero.title":"Your crypto world",
   "hero.description":"Follow wallets, transfers and blocks on BNB Chain and Solana easily.",
   "hero.indexed":"Network data","hero.multichain":"BNB Chain and Solana","hero.readonly":"Read-only",
   "search.placeholder":"Search for a wallet, transaction, or block...","search.button":"Search",
   "quick.blocks":"Latest blocks","quick.blocksSub":"See recent blocks",
   "quick.address":"Your balance",
   "quick.addressSub":"Look up any wallet balance",
   "wallet.title":"Wallet balance",
   "wallet.subtitle":"Wallet details on the network.",
   "wallet.native":"Balance",
   "wallet.usd":"Estimated native balance in USD",
   "wallet.holdings":"Other tokens",
   "wallet.unavailable":"Unavailable",
   "wallet.loading":"Loading balance...",
   "wallet.balanceFailed":"Unable to load balance",
   "wallet.priceVerified":"Approximate value based on a recent CoinGecko quote, not a guaranteed sale price.",
   "wallet.balanceVerified":"Balance comes from the network and can change.",
   "wallet.note":"Balance comes from the network and USD value is an estimate. Some transactions may not appear here.",
   "wallet.tabTransactions":"Latest transactions",
   "wallet.tabTransfers":"Token transfers",
   "wallet.tabInfo":"More details",
   "quick.transactions":"Recent transfers","quick.transactionsSub":"See new transfers",
   "quick.refresh":"Refresh","quick.refreshSub":"Fetch latest data",
   "quick.networks":"Networks","quick.networksSub":"BNB Chain and Solana",
   "stats.title":"Network overview","stats.lastBlock":"Latest block","stats.network":"Network",
   "stats.status":"Network status","stats.visibleTx":"Recent transfers","stats.latestSample":"Latest transactions",
   "stats.checking":"Connecting...","stats.noData":"No new data received","stats.updated":"Updated","stats.recent":"Updated a while ago","stats.stale":"Updates delayed",
   "stats.offline":"Connection unavailable","stats.live":"Updated recently","stats.nearLive":"Update delayed","stats.needsUpdate":"Updates stopped",
   "stats.noTimestamp":"Update time unknown","stats.agePrefix":"Last updated:",
   "stats.running":"Live now ●","stats.onchain":"Live now ●","stats.onchainAge":"","stats.onchainSlow":"Last update is old","stats.indexedOnly":"Latest saved records","stats.lastBlockOnchain":"Latest block","api.onchain":"From network",
   "data.blocks":"Latest blocks","data.transactions":"Latest transactions","data.refresh":"Refresh ↻","data.showAll":"Show all ›","data.showLess":"Show less ‹",
   "safety.title":"Public read-only data","safety.description":"BEXENTRA never asks for your password, private key or wallet recovery phrase.",
   "nav.home":"Home","nav.blocks":"Blocks","nav.transactions":"Transactions","nav.explorer":"Search",
   "category.subtitle":"See recent activity and tap any item for details.",
   "category.blocksHelp":"See recent blocks and their activity.",
   "category.transactionsHelp":"See recent transactions and details.",
   "guide.summary":"How does a transaction enter a blockchain block?",
   "guide.intro":"How a transaction moves from wallet to network:",
   "guide.s1":"Create and sign",
   "guide.p1":"A user creates a transaction in a wallet and signs it digitally. The private key is not shared with the network.",
   "guide.s2":"Broadcast to the network",
   "guide.p2":"The transaction is broadcast for validation and may remain pending before inclusion.",
   "guide.s3":"Include in a block",
   "guide.p3":"A validator includes transactions in a new block according to the network's rules.",
   "guide.s4":"Inspect the result",
   "guide.p4":"Visitors can search by block number or transaction hash for details and verified execution status when available.",
   "guide.caveat":"Important: A transaction in a block might still have failed.",
   "settings.title":"Settings","settings.subtitle":"Customize BEXENTRA on this device",
   "settings.language":"Language","settings.arabic":"العربية","settings.english":"English",
   "settings.appearance":"Appearance","settings.dark":"Dark","settings.light":"Light",
   "settings.network":"Default network","settings.refresh":"Auto refresh","settings.refreshOn":"Automatic","settings.refreshOff":"Off",
   "settings.privacyTitle":"Privacy & security","settings.privacyText":"Preferences are saved only in this browser. The explorer reads public blockchain data and never needs a private key.",
   "settings.reset":"Reset preferences","settings.close":"Close settings",
   "time.seconds":"seconds","time.minutes":"minutes","time.hours":"hours","time.days":"days","time.ago":"ago",
   "api.loading":"Loading...","api.emptyBlocks":"No new blocks found.",
   "api.emptyTx":"No recent transactions found.","api.error":"Connection error:",
   "api.transactionsUnit":"transactions","api.confirmed":"Confirmed","api.failed":"Failed","api.indexed":"Saved",
   "details.searchHelp":"Enter a block number, wallet address, or transaction ID.",
   "details.technical":"More details",
   "details.back":"Back","details.searchButton":"Search","details.overview":"Overview","details.subtitle":"Wallets, transactions, and blocks.",
   "details.sideTitle":"More information","details.sideText":"This is the information currently received. Other transactions may exist.",
   "details.copy":"Copy","details.verify":"View on another site ↗","details.addressActivity":"Wallet activity",
   "details.tokenActivity":"Token transfers",
   "details.tokenCoverage":"Only some transfers are shown. Others may exist. Some amounts need token-specific adjustments.",
   "details.tokenEmpty":"No transfers found for this address.",
   "details.tokenLoading":"Loading indexed BEP20 transfers...",
   "details.tokenFailed":"Unable to load BEP20 transfers:",
   "details.tokenVerify":"Verify on BscScan ↗","details.tokenNote":"Amounts may need token decimals.",
   "details.event":"Details","details.rawAmount":"Amount before adjustment",
   "details.noActivity":"No transactions in our current records. Others may exist.",
   "details.network":"Network","details.block":"Block","details.address":"Address","details.indexedTx":"Recent transactions",
   "details.notFound":"We couldn't find this:",
   "details.noSearch":"Enter a wallet, transaction, or block number.",
   "details.loadBlock":"Loading block...","details.loadSlot":"Loading slot...","details.loadTx":"Loading transaction...","details.loadAddress":"Loading wallet activity...","details.txTitle":"Transaction","details.addressTitle":"Wallet address","details.indexedTxSummary":"Recorded transaction","details.confirmed":"Confirmed","details.failed":"Failed","details.indexed":"Recorded","details.unavailable":"Unavailable","details.detailsLabel":"Details","details.copyDone":"Copied ✓","details.viewTransfer":"Show BEP20 transfer details in BEXENTRA","details.viewAddress":"View address inside BEXENTRA","details.tokenContract":"Token contract","details.from":"From","details.to":"To","details.logIndex":"Log index","details.txHash":"Transaction hash","api.finding":"Looking for transaction...","api.txMissing":"Transaction not found in current results.","api.txError":"Unable to search right now.",
   "search.invalid":"Check the address or transaction ID and try again.","search.empty":"Enter a wallet or transaction ID.","search.unsupportedUrl":"Enter the wallet or transaction ID directly.","search.wrongNetwork":"This link belongs to a different network. Switch networks on the home page.",
   "details.notIndexedTitle":"Transaction not found in current results","details.lookupErrorTitle":"Unable to load transaction","details.notIndexedText":"BEXENTRA hasn't indexed this transaction yet. It may still exist on the blockchain.","details.unverifiedTitle":"Transaction not verified","details.unverifiedText":"We couldn't confirm this transaction. Check the network and ID.",
   "details.networkUnavailableTitle":"Network RPC temporarily unavailable","details.networkUnavailableText":"Couldn't reach the network. Try again later.",
   "details.blockVerifiedSource":"Verified inside a real on-chain block. Status and fees are shown only when a matching receipt is available.",
   "details.retry":"Retry","details.tokenOnlySubtitle":"We found some token transfers, but not the full transaction details.","details.tokenOnlyLabel":"Token transfers","details.notVerified":"Native transaction status and fees are not verified by this index","details.transferCount":"Token transfer events","details.noNativeStatus":"Transaction status unconfirmed",
   "details.liveBlockSource":"Block information from network.","details.liveTxSource":"Transaction information from network.","details.augmentedSource":"Some transaction details were checked on network.","details.liveSideTitle":"Network information","details.liveSideText":"Data was checked on the network. Status and fees appear only when verified.","details.source":"Data source","details.sourceLive":"Network","details.sourceIndexed":"BEXENTRA records"
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
  // Migrate the existing neon-only appearance once, then respect visitors' later choices.
  try{
   if(!localStorage.getItem("bexentra-scanlight-choice-v1")){
    localStorage.setItem(store.theme,"light");
    localStorage.setItem("bexentra-scanlight-choice-v1","1");
   }
  }catch{}
  apply();
  document.querySelectorAll("[data-open-settings]").forEach(el=>el.addEventListener("click",()=>{const menu=document.getElementById("mobileMenu");menu?.classList.remove("open");menu?.setAttribute("aria-hidden","true");document.getElementById("menuBackdrop")?.classList.remove("show");document.getElementById("menuToggle")?.setAttribute("aria-expanded","false");
   const detail=document.getElementById("detailMenu");if(detail){detail.hidden=true;detail.setAttribute("aria-hidden","true");document.getElementById("detailMenuBackdrop")?.setAttribute("hidden","");document.getElementById("detailMenuToggle")?.setAttribute("aria-expanded","false")}open()}));
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
