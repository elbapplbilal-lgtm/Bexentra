import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const w={};
runInNewContext(readFileSync(new URL("../public/identity-utils.js",import.meta.url),"utf8"),{window:w,URL});
const U=w.BexentraIdentityUtils;
const evm="0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
const sol="HKKp49qGWXd639QsuH7JiLijfVW5UtCVY4s1n2HANwEA";
const mock={
 address:evm,identity:"vitalik.eth",platform:"ens",displayName:"vitalik.eth",
 avatar:"https://euc.li/vitalik.eth",description:"Public profile",
 links:{website:{link:"https://vitalik.ca"},github:{link:"https://github.com/vbuterin"},
 twitter:{link:"https://x.com/VitalikButerin"}}
};
test("only valid, chain-specific addresses trigger API lookups",()=>{
 assert.equal(U.endpoint("bnb",evm),"https://api.web3.bio/profile/ens/"+evm);
 assert.equal(U.endpoint("solana",sol),"https://api.web3.bio/profile/solana/"+sol);
 assert.equal(U.endpoint("bnb","vitalik.eth"),null);
 assert.equal(U.endpoint("bnb",sol),null);
 assert.equal(U.endpoint("solana",evm),null);
 assert.equal(U.endpoint("ethereum",evm),null);
});
test("accept matching ENS identity with non-trusted social metadata",()=>{
 const p=U.normalize(mock,"bnb",evm);
 assert.equal(p.name,"vitalik.eth");
 assert.equal(p.avatar,"https://euc.li/vitalik.eth");
 assert.equal(p.source,"web3.bio");
 assert.equal(p.service,"ENS (Ethereum)");
 assert.deepEqual(Array.from(p.links,x=>x.label),["Website","GitHub","X / Twitter"]);
});
test("reject provider address mismatches and unknown network/platform",()=>{
 assert.equal(U.normalize({...mock,address:"0x"+"1".repeat(40)},"bnb",evm),null);
 assert.equal(U.normalize({...mock,platform:"sns"},"bnb",evm),null);
 assert.equal(U.normalize({...mock,platform:"ens"},"solana",sol),null);
 assert.equal(U.normalize(null,"bnb",evm),null);
});
test("never display echoed raw address as name, including basic Solana fallbacks",()=>{
 const p=U.normalize({address:sol,identity:sol,displayName:"HKKp...",platform:"solana",links:{}}, "solana",sol);
 assert.equal(p,null);
});
test("accept verified-address-matched SNS, reject fake domain",()=>{
 const p=U.normalize({address:sol,identity:"bonfida.sns",platform:"sns",links:{}}, "solana",sol);
 assert.equal(p.name,"bonfida.sns");
 assert.equal(U.normalize({address:sol,identity:"Not a domain!",platform:"sns"}, "solana",sol),null);
});
test("discard javascript, http, credentials and malformed URLs",()=>{
 assert.equal(U.safeHttps("javascript:alert(1)"),null);
 assert.equal(U.safeHttps("http://foo.bar"),null);
 assert.equal(U.safeHttps("https://user:pass@foo.bar"),null);
 assert.equal(U.safeHttps("https://trusted.example/okay"),"https://trusted.example/okay");
 const p=U.normalize({...mock,avatar:"javascript:alert(1)",links:{
  website:{link:"javascript:alert(1)"},github:{link:"http://github.com/vbuterin"},twitter:{link:"https://x.com/VitalikButerin"}
 }}, "bnb",evm);
 assert.equal(p.avatar,null);
 assert.deepEqual(Array.from(p.links,x=>x.label),["X / Twitter"]);
});
test("do not leak private metadata fields or embed HTML via profile parser",()=>{
 const p=U.normalize({...mock,email:"secret@example.com",description:"<script>alert('x')</script>",links:{website:{link:"https://example.org"}}},"bnb",evm);
 assert.equal("email" in p,false);
 assert.equal(p.description,"<script>alert('x')</script>");
 assert.equal(p.links.length,1);
});
