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
   "menu.home":"الرئيسية","menu.blocks":"البلوكات","menu.transactions":"المعاملات","menu.explorer":"المستكشف","menu.settings":"الإعدادات",
   "bnav.chain":"تقنية البلوكتشين",
   "bnav.validators":"المدققون",
   "bnav.tokens":"الرموز",
   "bnav.nfts":"NFTs",
   "bnav.resources":"موارد",
   "bnav.api":"واجهة برمجة التطبيقات (API)",
   "bnav.more":"أكثر",
   "bnav.explorers":"المستكشفون",
   "bnav.appearance":"المظهر",
   "bnav.language":"اللغة",
   "bnav.blocks":"أحدث البلوكات",
   "bnav.txs":"أحدث المعاملات",
   "bnav.wallets":"المحافظ والعناوين",
   "bnav.validatorsSoon":"قائمة المدققين",
   "bnav.contract":"البحث بعنوان عقد",
   "bnav.tokensSoon":"دليل الرموز",
   "bnav.nftsSoon":"استكشاف NFTs",
   "bnav.search":"البحث في البلوكتشين",
   "bnav.solSearch":"البحث في Solana",
   "bnav.apiSoon":"وثائق API",
   "bnav.about":"عن BEXENTRA",
   "bnav.aboutText":"مستكشف للبيانات العامة. نطوّر خدمات إضافية تدريجياً.",
   "bnav.bnb":"مستكشف BNB Chain",
   "bnav.sol":"مستكشف Solana",
   "bnav.soon":"قريباً",
   "bnav.settings":"إعدادات الموقع",
   "bnav.safety":"معلومات عامة للقراءة فقط. لا تشارك كلمات الاسترداد أو مفاتيح المحفظة.",
   "menu.safety":"مستكشف للقراءة فقط. ما كنطلبوش ربط المحفظة أو كلمات الاسترداد.",
   "scan.menuBrowse":"استكشاف الشبكة",
   "scan.menuWallets":"المحافظ",
   "scan.menuTools":"أدوات البحث",
   "scan.tx":"البحث عن معاملة",
   "scan.block":"البحث عن بلوك",
   "scan.sol":"محافظ Solana",
   "scan.welcome":"ماذا تريد أن تستكشف؟",
   "scan.welcomeText":"ابحث عن عنوان أو معاملة أو بلوك على الشبكة المختارة.",
   "scan.address":"محفظة",
   "scan.safety":"البيانات للقراءة فقط. لا تشارك مفتاحك الخاص أو كلمات الاسترداد.",
   "hero.overline":"BEXENTRA · BNB وSolana",
   "hero.title":"عالم العملات بين يديك",
   "hero.description":"تابع المحافظ والمعاملات والبلوكات على BNB Chain وSolana بسهولة.",
   "hero.indexed":"معلومات الشبكة","hero.multichain":"BNB Chain وSolana","hero.readonly":"قراءة فقط",
   "search.placeholder":"قلب على أي محفظة، معاملة، أو بلوك...","search.button":"قلّب",
   "quick.blocks":"البلوكات","quick.blocksSub":"آخر البلوكات فالشبكة",
   "quick.address":"المحافظ",
   "quick.addressSub":"شوف الرصيد والنشاط ديالك",
   "wallet.title":"معلومات المحفظة",
   "wallet.subtitle":"تفاصيل المحفظة على الشبكة.",
   "wallet.native":"الرصيد",
   "wallet.usd":"قيمة الرصيد بالدولار (تقريبية)",
   "wallet.holdings":"العملات داخل المحفظة",
   "wallet.unavailable":"غير متوفرة",
   "wallet.loading":"كنجيبو الرصيد...",
   "wallet.balanceFailed":"ما قدرناش نجيبو الرصيد دابا",
   "wallet.priceVerified":"قيمة تقريبية وفق سعر حديث من CoinGecko، وقد تختلف عن قيمة البيع الفعلية.",
   "wallet.balanceVerified":"الرصيد من الشبكة وقد يتبدّل.",
   "wallet.note":"الرصيد من الشبكة، والتقدير بالدولار غير تقريبي. يمكن تكون كاينة معاملات أخرى ما ظهرتش هنا.",
   "wallet.tabTransactions":"آخر المعاملات",
   "wallet.tabTransfers":"تحويلات العملات",
   "wallet.tabInfo":"تفاصيل أخرى",
   "quick.transactions":"المعاملات","quick.transactionsSub":"شوف آخر التحويلات",
   "quick.refresh":"تحديث","quick.refreshSub":"جيب آخر البيانات",
   "quick.networks":"الشبكات","quick.networksSub":"BNB Chain و Solana",
   "stats.title":"معلومات الشبكة","stats.lastBlock":"آخر بلوك","stats.network":"الشبكة",
   "stats.status":"حالة الشبكة","stats.visibleTx":"آخر المعاملات","stats.latestSample":"آخر المعاملات",
   "stats.checking":"كنتحققو من الشبكة","stats.noData":"ما وصلاتناش بيانات جديدة","stats.updated":"محدّث","stats.recent":"آخر تحديث من شوية","stats.stale":"التحديث متأخر",
   "stats.offline":"الاتصال ما خدامش دابا","stats.live":"تحديث قريب","stats.nearLive":"تحديث متأخر","stats.needsUpdate":"التحديث توقف",
   "stats.noTimestamp":"وقت التحديث ما معروفش","stats.agePrefix":"آخر تحديث:",
   "stats.running":"الشبكة خدامة دابا ● مباشر","stats.onchain":"مباشر","stats.onchainAge":"","stats.onchainSlow":"آخر تحديث قديم","stats.indexedOnly":"آخر البيانات المحفوظة","stats.lastBlockOnchain":"آخر بلوك","api.onchain":"من الشبكة",
   "data.blocks":"آخر البلوكات","data.transactions":"آخر المعاملات","data.refresh":"تحديث ↻","data.showAll":"عرض الكل ›","data.showLess":"عرض أقل ‹",
   "safety.title":"بيانات عامة للقراءة فقط","safety.description":"BEXENTRA ما كيطلبش كلمة السر أو المفتاح الخاص أو كلمات استرداد المحفظة.",
   "nav.home":"الرئيسية","nav.blocks":"البلوكات","nav.transactions":"المعاملات","nav.explorer":"قلّب",
   "category.subtitle":"شوف آخر العمليات واضغط على أي وحدة للتفاصيل.",
   "category.blocksHelp":"تابع آخر البلوكات وشنو وقع فيها.",
   "category.transactionsHelp":"شوف آخر المعاملات وتفاصيلها.",
   "guide.summary":"كيف تنتقل المعاملة من المحفظة إلى البلوك؟",
   "guide.intro":"شوف كيفاش كتدوز المعاملة من المحفظة للشبكة:",
   "guide.s1":"إنشاء المعاملة وتوقيعها",
   "guide.p1":"يُنشئ المستخدم المعاملة داخل محفظته ويوقّعها رقمياً. لا يُرسل المفتاح الخاص إلى الشبكة.",
   "guide.s2":"إرسالها إلى الشبكة",
   "guide.p2":"تُرسل المعاملة إلى الشبكة للتحقق من صلاحيتها، وقد تبقى قيد الانتظار مؤقتاً.",
   "guide.s3":"إدراجها داخل بلوك",
   "guide.p3":"يُدرج المدقق معاملات في بلوك جديد يُضاف إلى السلسلة وفق قواعد الشبكة.",
   "guide.s4":"التحقق من النتيجة",
   "guide.p4":"يتيح البحث عن رقم البلوك أو معرّف المعاملة الاطلاع على تفاصيلها وحالة التنفيذ إذا توفرت أدلة موثوقة.",
   "guide.caveat":"مهم: ظهور المعاملة فبلوك ما كيعنيش بالضرورة أنها نجحات.",
   "settings.title":"الإعدادات","settings.subtitle":"خصّص تجربة BEXENTRA على هاد الجهاز",
   "settings.language":"اللغة","settings.arabic":"العربية","settings.english":"English",
   "settings.appearance":"المظهر","settings.dark":"داكن","settings.light":"فاتح",
   "settings.network":"الشبكة الافتراضية","settings.refresh":"التحديث التلقائي","settings.refreshOn":"تلقائي (كل ثانية مع البث، أو 15 ثانية احتياطياً)","settings.refreshOff":"متوقف",
   "settings.privacyTitle":"الخصوصية والأمان","settings.privacyText":"الإعدادات محفوظة فهاد المتصفح فقط. الموقع كيقرأ بيانات بلوكتشين عمومية، وما كيطلبش أي مفتاح خاص.",
   "settings.reset":"إرجاع الإعدادات الأصلية","settings.close":"إغلاق الإعدادات",
   "time.seconds":"ثانية","time.minutes":"دقيقة","time.hours":"ساعة","time.days":"يوم","time.ago":"منذ",
   "api.loading":"كنجيبو المعلومات...","api.emptyBlocks":"ما لقيناش بلوكات جديدة دابا.",
   "api.emptyTx":"ما لقيناش معاملات جديدة دابا.","api.error":"خطأ الاتصال:",
   "api.transactionsUnit":"معاملة","api.confirmed":"مؤكد","api.failed":"فشل","api.indexed":"محفوظ",
   "details.searchHelp":"دخل رقم البلوك أو عنوان المحفظة أو رقم المعاملة.",
   "details.technical":"عرض التفاصيل التقنية: الرموز والعناوين الكاملة",
   "details.back":"رجوع","details.searchButton":"قلّب","details.overview":"التفاصيل","details.subtitle":"تفاصيل المحافظ والمعاملات والبلوكات.",
   "details.sideTitle":"معلومات إضافية","details.sideText":"كنعرضو المعلومات اللي عندنا دابا. ممكن تكون كاينة معاملات أخرى.",
   "details.copy":"نسخ","details.verify":"تحقق خارجي ↗","details.addressActivity":"نشاط العنوان",
   "details.tokenActivity":"تحويلات التوكنات (BEP20)",
   "details.tokenCoverage":"هادو بعض تحويلات العملات فقط، وماشي جميع التحويلات. الكميات معروضة قبل حساب الخانات العشرية.",
   "details.tokenEmpty":"ما لقيناش تحويلات لهاد العنوان دابا.",
   "details.tokenLoading":"جاري تحميل تحويلات BEP20...",
   "details.tokenFailed":"تعذر تحميل تحويلات BEP20:",
   "details.tokenVerify":"تحقق على BscScan ↗","details.tokenNote":"القيمة خاصها تتعدّل حسب الخانات العشرية ديال العملة.",
   "details.event":"تفاصيل","details.rawAmount":"الكمية قبل الحساب",
   "details.noActivity":"ما لقيناش معاملات لهاد المحفظة فالسجلات الحالية. ممكن تكون كاينة معاملات أخرى.",
   "details.network":"الشبكة","details.block":"بلوك","details.address":"عنوان","details.indexedTx":"آخر المعاملات",
   "details.notFound":"ما لقيناش هاد المعلومات:",
   "details.noSearch":"دخل عنوان محفظة أو معاملة أو رقم بلوك.",
   "details.loadBlock":"كنجيبو البلوك...","details.loadSlot":"جاري تحميل Slot...","details.loadTx":"كنجيبو المعاملة...","details.loadAddress":"كنجيبو نشاط المحفظة...","details.txTitle":"معاملة","details.addressTitle":"عنوان المحفظة","details.indexedTxSummary":"معاملة مسجلة","details.confirmed":"مؤكدة","details.failed":"فاشلة","details.indexed":"مسجلة","details.unavailable":"غير متوفرة","details.detailsLabel":"تفاصيل","details.copyDone":"تم ✓","details.viewTransfer":"عرض تفاصيل تحويل BEP20 داخل BEXENTRA","details.viewAddress":"عرض العنوان داخل BEXENTRA","details.tokenContract":"عقد التوكن","details.from":"من","details.to":"إلى","details.logIndex":"رقم السجل","details.txHash":"معرّف المعاملة","api.finding":"كنقلبو على المعاملة...","api.txMissing":"هاد المعاملة ما ظهرتش عندنا دابا.","api.txError":"تعذّر البحث حالياً.",
   "search.invalid":"تأكد من العنوان أو رقم المعاملة وجرب مرة أخرى.","search.empty":"دخل عنوان محفظة أو رقم معاملة.","search.unsupportedUrl":"دخل عنوان المحفظة أو رقم المعاملة مباشرة.","search.wrongNetwork":"الرابط تابع لشبكة أخرى. بدّل الشبكة من الصفحة الرئيسية.",
   "details.notIndexedTitle":"المعاملة ما ظهرتش عندنا دابا","details.lookupErrorTitle":"تعذّر تحميل المعاملة","details.notIndexedText":"ما لقيناش هاد المعاملة فبيانات BEXENTRA الحالية. هادشي ما كيعنيش أنها ما كايناش فشبكة BNB.","details.unverifiedTitle":"تعذّر التحقق من المعاملة","details.unverifiedText":"ما قدرناش نتأكدو من هاد المعاملة. تأكد من الشبكة والرقم وجرب من بعد.",
   "details.networkUnavailableTitle":"مصدر الشبكة غير متاح مؤقتاً","details.networkUnavailableText":"ما قدرناش نتاصلو بالشبكة دابا. جرّب من بعد.",
   "details.blockVerifiedSource":"تأكدنا من وجود المعاملة داخل بلوك حقيقي من الشبكة. الحالة والرسوم كتظهر غير إلا وصلنا لإيصال موثق.",
   "details.retry":"عاود المحاولة","details.tokenOnlySubtitle":"لقينا بعض تحويلات العملات، ولكن ما عندناش باقي تفاصيل المعاملة.","details.tokenOnlyLabel":"تحويلات العملات","details.notVerified":"ما تحققناش من حالة المعاملة ولا رسومها داخل BEXENTRA","details.transferCount":"تحويلات توكنات","details.noNativeStatus":"حالة المعاملة ما تأكداتش",
   "details.liveBlockSource":"معلومات البلوك من الشبكة.","details.liveTxSource":"معلومات المعاملة من الشبكة.","details.augmentedSource":"تأكدنا من بعض تفاصيل المعاملة على الشبكة.","details.liveSideTitle":"معلومات من الشبكة","details.liveSideText":"تم التحقق من هاد المعلومات على الشبكة. الحالة والرسوم كيبانو غير إلا تأكدو.","details.source":"مصدر البيانات","details.sourceLive":"الشبكة","details.sourceIndexed":"سجلات BEXENTRA"
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
   "bnav.contract":"Search contract address",
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
   "hero.description":"Follow wallets, transactions, and blocks on BNB Chain and Solana with ease.",
   "hero.indexed":"Network data","hero.multichain":"BNB Chain and Solana","hero.readonly":"Read-only",
   "search.placeholder":"Search for a wallet, transaction, or block...","search.button":"Search",
   "quick.blocks":"Blocks","quick.blocksSub":"Latest blocks on the network",
   "quick.address":"Addresses",
   "quick.addressSub":"Check your balance and activity",
   "wallet.title":"Wallet details",
   "wallet.subtitle":"Wallet details on the network.",
   "wallet.native":"Balance",
   "wallet.usd":"Estimated native balance in USD",
   "wallet.holdings":"Wallet tokens",
   "wallet.unavailable":"Unavailable",
   "wallet.loading":"Loading balance...",
   "wallet.balanceFailed":"Unable to load balance",
   "wallet.priceVerified":"Approximate value based on a recent CoinGecko quote, not a guaranteed sale price.",
   "wallet.balanceVerified":"Balance comes from the network and can change.",
   "wallet.note":"Balance comes from the network and USD value is an estimate. Some transactions may not appear here.",
   "wallet.tabTransactions":"Latest transactions",
   "wallet.tabTransfers":"Token transfers",
   "wallet.tabInfo":"More details",
   "quick.transactions":"Transactions","quick.transactionsSub":"See recent transfers",
   "quick.refresh":"Refresh","quick.refreshSub":"Fetch latest data",
   "quick.networks":"Networks","quick.networksSub":"BNB Chain and Solana",
   "stats.title":"Network overview","stats.lastBlock":"Latest block","stats.network":"Network",
   "stats.status":"Network status","stats.visibleTx":"Latest transactions","stats.latestSample":"Latest transactions",
   "stats.checking":"Checking network","stats.noData":"No new data received","stats.updated":"Updated","stats.recent":"Updated a while ago","stats.stale":"Updates delayed",
   "stats.offline":"Connection unavailable","stats.live":"Updated recently","stats.nearLive":"Update delayed","stats.needsUpdate":"Updates stopped",
   "stats.noTimestamp":"Update time unknown","stats.agePrefix":"Last updated:",
   "stats.running":"Network is running ● Live","stats.onchain":"Live","stats.onchainAge":"","stats.onchainSlow":"Last update is old","stats.indexedOnly":"Latest saved records","stats.lastBlockOnchain":"Latest block","api.onchain":"From network",
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
   "settings.network":"Default network","settings.refresh":"Auto refresh","settings.refreshOn":"Auto (1s stream, 15s fallback)","settings.refreshOff":"Off",
   "settings.privacyTitle":"Privacy & security","settings.privacyText":"Preferences are saved only in this browser. The explorer reads public blockchain data and never needs a private key.",
   "settings.reset":"Reset preferences","settings.close":"Close settings",
   "time.seconds":"seconds","time.minutes":"minutes","time.hours":"hours","time.days":"days","time.ago":"ago",
   "api.loading":"Loading...","api.emptyBlocks":"No new blocks found.",
   "api.emptyTx":"No recent transactions found.","api.error":"Connection error:",
   "api.transactionsUnit":"transactions","api.confirmed":"Confirmed","api.failed":"Failed","api.indexed":"Saved",
   "details.searchHelp":"Enter a block number, wallet address, or transaction ID.",
   "details.technical":"Show technical details: full hashes and addresses",
   "details.back":"Back","details.searchButton":"Search","details.overview":"Overview","details.subtitle":"Wallets, transactions, and blocks.",
   "details.sideTitle":"More information","details.sideText":"Here is what we have right now. More transactions may exist.",
   "details.copy":"Copy","details.verify":"External verification ↗","details.addressActivity":"Address activity",
   "details.tokenActivity":"Token transfers (BEP20)",
   "details.tokenCoverage":"Only some token transfers are shown, not the full history. Amounts may need token decimals.",
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
