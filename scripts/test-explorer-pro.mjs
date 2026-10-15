// Static release safety assertions for the original BEXENTRA explorer theme.
// Live backend coverage requires separate end-to-end production checks.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL("../"+path,import.meta.url),"utf8");
const [home,details,style,locale,sw,indexer,batch]=await Promise.all([
 read("classic.html"),read("explorer.html"),read("public/explorer-pro-v1.css"),
 read("public/coverage-note.js"),read("sw.js"),read("backend/src/token-indexer.js"),
 read("backend/src/token-transfer-batch.js")
]);
assert(home.includes("public/explorer-pro-v1.css?v=1"),"Home loads pro theme");
assert(details.includes("public/explorer-pro-v1.css?v=1"),"Details load pro theme");
assert(home.includes('id="coverageTruth"'),"Visitors must see data coverage caveat");
assert(home.includes("public/coverage-note.js?v=1"),"Home loads translated coverage");
for(const lang of ["ar","en","fr","de","es","it"])assert(locale.includes("  "+lang+":{"),"Missing locale: "+lang);
assert(locale.includes("Indexed wallet and transaction history remains partial."),"No exaggerated index coverage");
assert(!locale.includes("100% complete"),"Never claim complete index");
assert(style.includes("body.bex-home.category-view .coverage-truth"),"Category pages must remain focused");
assert(style.split("{").length===style.split("}").length,"Explorer theme CSS brackets");
assert(sw.includes("public/explorer-pro-v1.css?v=1"),"PWA caches current style");
assert(sw.includes("public/coverage-note.js?v=1"),"PWA caches coverage note");
assert(indexer.includes("jsonb_to_recordset($1::jsonb)"),"Indexer must bulk insert logs");
assert(indexer.includes("ON CONFLICT(chain,tx_hash,log_index)"),"Indexer must remain idempotent");
assert(indexer.includes("INSERT INTO token_indexer_state"),"Only advance cursor after writes");
assert(batch.includes("TRANSFER_TOPIC"),"Verified Transfer event filter required");
console.log("PASS original responsive explorer theme, six-language honest coverage, PWA assets, batched idempotent BEP20 indexing");
