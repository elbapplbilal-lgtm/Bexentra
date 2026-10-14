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
assert(detail.includes('src="public/explorer.js?v=46"'));
assert(sw.includes("bex-scanlight-v1.css?v=2")&&sw.includes("explorer.js?v=46"));
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
assert(home.includes('src="public/app.js?v=44"')&&sw.includes("app.js?v=44"));
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
