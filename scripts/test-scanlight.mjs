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
assert(detail.includes('src="public/explorer.js?v=47"'));
assert(sw.includes("bex-scanlight-v1.css?v=2")&&sw.includes("explorer.js?v=47"));
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
assert(home.includes('src="public/app.js?v=45"')&&sw.includes("app.js?v=45"));
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
assert(app.includes('Network + partial index'));
assert(app.includes('pageView!=="blocks"'));

const explorerLight=await read("public/scanlight-detail-v2.css");
assert(detail.includes('scanlight-detail-v2.css?v=1'));
assert(sw.includes('scanlight-detail-v2.css?v=1'));
assert(detail.includes('src="public/explorer.js?v=47"')&&sw.includes('explorer.js?v=47'));
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
