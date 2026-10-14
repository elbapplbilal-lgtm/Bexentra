import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=p=>readFile(new URL("../"+p,import.meta.url),"utf8");
const [html,css,js,manifest,home,detail,sw,api]=await Promise.all([
 read("api-docs.html"),read("public/api-docs.css"),read("public/api-docs.js"),
 read("public/openapi.json"),read("index.html"),read("explorer.html"),
 read("sw.js"),read("neon/functions/bexentra-api.ts")
]);
const schema=JSON.parse(manifest);
const routes=["/health","/live","/blocks","/block","/transactions","/tx",
 "/address","/balance","/token-transfers","/price"];
assert.equal(schema.openapi,"3.1.0");
assert.equal(Object.keys(schema.paths).length,routes.length);
const base="https://br-old-sun-b5txcoym-bexentraapi.compute.c-7.us-east-2.aws.neon.tech";
assert.equal(schema.servers[0].url,base);
assert(js.includes('const BASE="'+base+'"'));
assert(html.includes(base));
assert(!html.includes("API_KEY")&&!html.includes("NEON_API_KEY"));
for(const route of routes){
 assert(schema.paths[route]?.get?.responses["200"],"OpenAPI GET missing: "+route);
 assert(html.includes('data-path="'+route+'"'),"Docs card missing: "+route);
 assert(js.includes('"path":"'+route+'"'),"Tester missing: "+route);
 assert(api.includes('u.pathname.endsWith("'+route+'")'),"Undeployed/unsupported documented route: "+route);
}
for(const path of [home,detail]){
 assert(path.includes('<a href="api-docs.html" data-i18n="bnav.apiSoon">وثائق API</a>'));
 assert(!path.includes('data-i18n="bnav.apiSoon">وثائق API</span>'));
}
for(const target of ["api-docs.html","public/api-docs.css?v=1","public/api-docs.js?v=1","public/openapi.json"])
 assert(sw.includes('"./'+target+'"'),"Missing service-worker asset: "+target);
assert(html.includes('id="tester"')&&html.includes('id="apiResponse"')&&html.includes('id="runRequest"'));
assert(html.includes('id="langToggle"')&&html.includes('data-en='));
assert(html.includes("CORS")&&html.includes("coverage")&&html.includes("CoinGecko"));
assert(css.includes("@media(max-width:520px)")&&css.includes("Noto Sans Arabic"));
assert.equal(css.split("{").length,css.split("}").length,"Unbalanced API docs CSS");
assert(js.includes("credentials:\"omit\"")&&js.includes("ac.abort()"));
assert(js.includes('JSON.stringify(data,null,2)'));
assert(js.includes('textContent=JSON.stringify'));
assert(schema.components.parameters.limit.schema.maximum===50);
assert.equal(schema.components.parameters.chain.schema.default,"bnb");
assert(schema.paths["/balance"].get.parameters.some(p=>p.name==="address"&&p.required));
assert(schema.paths["/tx"].get.parameters.some(p=>p.name==="hash"&&p.required));
assert(schema.paths["/block"].get.parameters.some(p=>p.name==="height"&&p.required));
assert(api.includes('"Access-Control-Allow-Origin":"https://elbapplbilal-lgtm.github.io"'));
console.log("PASS BEXENTRA API documentation: 10 implemented routes, examples, navigation, localization, service worker, safe GET tester, OpenAPI contract");

assert(html.includes('<span class="mark"><img src="logo.png?v=1"'));
assert(html.includes('logo-glow-v1.css?v=1'));
