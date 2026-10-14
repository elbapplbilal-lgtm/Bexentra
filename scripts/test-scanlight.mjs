import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=p=>readFile(new URL("../"+p,import.meta.url),"utf8");
const [home,detail,css,prefs,explorer,sw,fixes,app]=await Promise.all([
 read("index.html"),read("explorer.html"),read("public/bex-scanlight-v1.css"),
 read("public/preferences.js"),read("public/explorer.js"),read("sw.js"),read("public/scanlight-mobile-fixes.css"),read("public/app.js")
]);
// Preserve the existing production search, menus, and read-only navigation.
for(const id of ["globalSearch","globalInput","network","menuToggle","quickRefresh",
 "recentBlocks","recentTransactions"])
 assert(home.includes('id="'+id+'"'),"Missing home functionality: "+id);
for(const id of ["detailSearch","detailInput","detailFields","addressFeed","tokenFeed",
 "externalLink","walletProfile","walletNativeBalance","walletTokenHoldings","walletFiatValue"])
 assert(detail.includes('id="'+id+'"'),"Missing address/detail functionality: "+id);
assert(home.includes('bex-scanlight-v1.css?v=2')&&detail.includes('bex-scanlight-v1.css?v=2'));
assert(home.includes("bex-scanlight light-mode"));
assert(detail.includes('href="public/explorer.js?v=46"')===false); // Script, not stylesheet
assert(detail.includes('src="public/explorer.js?v=51"'));
assert(sw.includes("bex-scanlight-v1.css?v=2")&&sw.includes("explorer.js?v=51"));
assert(css.includes("bex-scanlight.light-mode:not(.category-view)"));
assert(css.includes("bex-address-layout.light-mode"));
assert(css.includes(".wallet-tabs[hidden]"));
assert(css.includes(".wallet-loaded .simple-result"));
assert(explorer.includes("document.body.classList.add(\"wallet-loaded\")"));
assert(css.split("{").length===css.split("}").length,"Unbalanced light CSS");
assert(prefs.includes('theme:"light"'));
assert(prefs.includes("bexentra-scanlight-choice-v1"));
for(const key of ["wallet.title","wallet.native","wallet.usd","wallet.holdings",
 "wallet.balanceFailed","wallet.note","quick.address"]){
 assert.equal(prefs.split('"'+key+'":').length,3,"Arabic and English keys must exist: "+key);
}
assert(explorer.includes('value.source!=="rpc_live"'),"Wallet must be verified via RPC");
assert(explorer.includes('value.chain!==chain'),"Wallet balance must match chain");
assert(explorer.includes('nativeAmount(value.native_balance'),"Wallet balance must use real base units");
assert(explorer.includes('walletFiatValue").textContent=tr("wallet.unavailable")'));
assert(explorer.includes('walletTokenHoldings").textContent=tr("wallet.unavailable")'));
assert(explorer.includes('walletCopyBtn").onclick=()=>copyText'));
assert(explorer.includes('classList.toggle("bex-address-layout",type==="address")'));
console.log("ScanLight verification: preserved search, original white layout, bilingual content, real wallet balances, no fake USD/tokens");

assert(home.includes("scanlight-mobile-fixes.css?v=2")&&sw.includes("scanlight-mobile-fixes.css?v=2"));
assert(home.includes('src="public/app.js?v=48"')&&sw.includes("app.js?v=48"));
assert(home.includes('aria-controls="mobileMenu"'));
assert.equal(home.split('id="quickRefresh"').length,2);
const quick=home.slice(home.indexOf('<div class="quick-grid">'),home.indexOf('</div>\n  </section>',home.indexOf('<div class="quick-grid">')));
assert(!quick.includes('id="quickRefresh"'),"Refresh should not take a fifth tile");
assert(app.includes('aria-expanded')&&app.includes('e.key==="Escape"'));
assert(fixes.includes("text-shadow:none!important")&&fixes.includes("z-index:160!important"));
assert(fixes.split("{").length===fixes.split("}").length);

assert(fixes.includes('#recentBlocks .reference-row .feed-side'));
assert(fixes.includes('color:#174870!important'));
assert(fixes.includes('background:#eaf4fe!important'));
assert(fixes.includes('#recentTransactions .reference-row .feed-side'));
assert(fixes.includes('box-shadow:none!important'));

const categoryCss=await read("public/category-view.css");
assert(home.includes("category-view.css?v=4")&&sw.includes("category-view.css?v=4"));
assert(categoryCss.includes("bex-scanlight.light-mode.category-view"));
assert(categoryCss.includes(".feed{\n min-height:0!important"));
assert(categoryCss.includes("background:#fff!important"));
assert(categoryCss.split("{").length===categoryCss.split("}").length);

assert(app.includes('refreshIndexedBlockSample(chain)'));
assert(app.includes('blocks(chain,12)'));
assert(app.includes('heights.has(height)'));
assert(app.includes('block._indexed_sample'));
assert(app.includes('Recent and saved information'));
assert(app.includes('معلومات حديثة وأخرى سابقة'));
assert(app.includes('pageView!=="blocks"'));

const explorerLight=await read("public/scanlight-detail-v2.css");
assert(detail.includes('scanlight-detail-v2.css?v=1'));
assert(sw.includes('scanlight-detail-v2.css?v=1'));
assert(detail.includes('src="public/explorer.js?v=51"')&&sw.includes('explorer.js?v=51'));
assert(detail.includes('id="detailMenu"')&&detail.includes('id="detailMenuToggle"'));
assert(detail.includes('id="searchWelcome"')&&detail.includes('data-search-kind="address"'));
assert(detail.includes('data-search-kind="tx"')&&detail.includes('data-search-kind="block"'));
assert(explorer.includes('function setDetailMenu(open)')&&explorer.includes('setDetailMenu(false)'));
assert(explorer.includes('document.body.classList.add("explorer-welcome")'));
assert(explorer.includes('document.body.classList.remove("wallet-loaded","explorer-welcome")'));
assert(explorerLight.includes('.explorer-welcome .simple-result'));
assert(explorerLight.includes('background:#fff!important'));
assert(explorerLight.split("{").length===explorerLight.split("}").length);
for(const key of ["scan.menuBrowse","scan.menuWallets","scan.menuTools","scan.tx",
 "scan.block","scan.sol","scan.welcome","scan.welcomeText","scan.address","scan.safety"])
 assert.equal(prefs.split('"'+key+'":').length,3,"Missing bilingual translation for "+key);

const utcFn=explorer.match(/function utcWhen\(value\)\{[\s\S]*?\n\}/)?.[0];
assert(utcFn,"Missing consistent UTC formatter");
assert(!explorer.includes("توقيت جهازك"));
assert(!explorer.includes("your device"));
assert(!explorer.includes("localWhen("));
assert(explorer.includes('easy("تاريخ ووقت البلوك (UTC)","Block date and time (UTC)")'));
const renderTime=new Function("document","easy",utcFn+"; return utcWhen;");
const sample="2026-10-12T10:34:00.000Z";
for(const lang of ["ar","en"]){
 const format=renderTime({documentElement:{lang}},(ar,en)=>lang==="en"?en:ar);
 const output=format(sample);
 assert(output.includes("10:34")&&output.endsWith(" UTC"),"Invalid visitor UTC time: "+output);
 assert.equal(format(null),lang==="en"?"Unavailable":"غير متوفر");
}

// Clear, truthful visitor-facing labels on dashboard and real-time sample.
const streamClient=await read("public/realtime-client.js");
assert(!streamClient.includes("أحداث مرصودة فآخر ثانية"));
assert(!streamClient.includes(" (عينة)"));
assert(streamClient.includes('" عملية جديدة دابا"'));
assert(streamClient.includes("ماشي جميع عمليات الشبكة"));
assert(home.includes("realtime-client.js?v=3")&&sw.includes("realtime-client.js?v=3"));
assert(home.includes("app.js?v=48")&&sw.includes("app.js?v=48"));
assert(home.includes("preferences.js?v=17")&&detail.includes("preferences.js?v=17")&&sw.includes("preferences.js?v=17"));
for(const key of ["stats.title","stats.visibleTx","stats.status","stats.network","stats.onchain","stats.onchainSlow","stats.latestSample"])
 assert.equal(prefs.split('"'+key+'":').length,3,"Visitor label needs Arabic and English: "+key);
assert(prefs.includes('"stats.onchain":"مباشر الآن ●"'));
assert(prefs.includes('"stats.visibleTx":"آخر التحويلات"'));
assert(prefs.includes('"stats.latestSample":"آخر المعاملات"'));
assert(app.includes('"معلومات من الشبكة"'));
assert(app.includes('"معلومات مسجلة من قبل"'));

const navCss=await read("public/bnav-v1.css");
assert(navCss.includes("Noto Sans Arabic"));
assert(navCss.split("{").length===navCss.split("}").length);
for(const page of [home,detail]){
 assert(page.includes('bnav-v1.css?v=2'));
 for(const group of ["chain","validators","tokens","nfts","resources","api","more","explorers","appearance","language"])
  assert(page.includes('data-section="'+group+'"'),"Menu section missing: "+group);
 assert(page.includes('data-pref-theme="light"')&&page.includes('data-pref-language="ar"'));
 assert(page.includes('data-i18n="bnav.soon"'));
}
assert(sw.includes('bnav-v1.css?v=2')&&sw.includes('preferences.js?v=17'));
for(const k of ["chain","validators","tokens","nfts","resources","api","more","explorers","appearance","language","blocks","txs","wallets","validatorsSoon","contract","tokensSoon","nftsSoon","search","solSearch","apiSoon","about","aboutText","bnb","sol","soon","settings","safety"])
 assert.equal(prefs.split('"bnav.'+k+'":').length,3,"Missing bilingual label "+k);

assert(navCss.includes("details.bnav-group:not([open])>.bnav-submenu"));
assert(navCss.includes("font:400 14px/1.7"));
assert(explorer.includes('request("/price",{chain:network})'));
assert(explorer.includes('quote?.source!=="coingecko"'));
assert(explorer.includes('Date.now()-Date.parse(quote.price_updated_at)>600000'));
const usdBody=explorer.match(/function approximateNativeUsd\(balance,decimals,price\)\{[\s\S]*?\n\}/)?.[0];
assert(usdBody);
const dollar=new Function(usdBody+";return approximateNativeUsd;")();
assert.equal(dollar("1000000000000000000",18,600),"≈ $600.00");
assert.equal(dollar("1000000000",9,125.5),"≈ $125.50");
assert.equal(dollar("0",18,600),"≈ $0.00");
assert.equal(dollar("1",18,600),"< $0.01");
assert.equal(dollar("oops",18,600),null);
assert.equal(prefs.split('"wallet.priceVerified":').length,3);

for(const page of [home,detail]){
 assert(page.includes('placeholder="ابحث عن محفظة، معاملة، أو بلوك..."'));
 assert(page.includes('<option value="auto">تلقائي</option>'));
}
assert(home.includes('data-i18n="search.button">بحث'));
for(const fragment of [
 'data-i18n="quick.transactionsSub">تابع التحويلات الجديدة',
 'data-i18n="quick.blocksSub">شاهد آخر البلوكات',
 'data-i18n="quick.addressSub">ابحث عن رصيد أي محفظة',
 'data-i18n="quick.networksSub">BNB Chain و Solana'
])assert(home.includes(fragment));
assert(app.includes('ts.length+" معاملة"'));
assert(app.includes('recent?tr("stats.running")'));
assert(app.includes('timestamp?ago(timestamp):"—"'));
assert.equal(prefs.split('"stats.running":').length,3);
assert(prefs.includes('"stats.running":"مباشر الآن ●"'));
assert(!prefs.slice(0,prefs.indexOf('  en:{')).includes('Tx Hash'));
assert(!prefs.slice(0,prefs.indexOf('  en:{')).includes('مفهرس'));
assert(!prefs.includes('المعاملات المعروضة'));

const visitorAr=prefs.slice(0,prefs.indexOf('  en:{'));
assert(visitorAr.includes('"wallet.note":"الرصيد من الشبكة، وقيمته بالدولار تقريبية'));
for(const text of ["المعاملات المعروضة من الفهرس","وقت الفهرسة","رصيد العملة الأساسية (RPC)"])
 assert(!explorer.includes(text),"Technical visitor copy remains: "+text);

assert(home.includes('data-i18n="hero.overline">BEXENTRA · BNB وSolana'));
assert(home.includes('data-i18n="nav.explorer">بحث'));
assert(detail.includes('data-i18n="nav.explorer">بحث'));
assert(detail.includes('public/explorer.js?v=51'));

assert(home.includes('data-i18n="quick.blocks">آخر البلوكات'));
assert(home.includes('data-i18n="quick.transactions">آخر التحويلات'));
assert(home.includes('data-i18n="quick.address">رصيدك'));
assert(home.includes('data-i18n="quick.networks">الشبكات'));
assert(prefs.includes('"stats.onchain":"مباشر الآن ●"'));
assert(app.includes('elapsed<45000'));
assert(app.includes('indexStatus.textContent=recent?tr("stats.onchain")'));
assert(explorer.includes('easy("العملة: ","Token: ")'));
assert(!home.includes('data-i18n="search.button">قلّب'));
assert(!detail.includes('data-i18n="details.searchButton">قلّب'));
