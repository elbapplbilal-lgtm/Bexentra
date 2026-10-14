"use strict";
(()=>{
const BASE="https://br-old-sun-b5txcoym-bexentraapi.compute.c-7.us-east-2.aws.neon.tech";
const endpoints=[{"path":"/health","example":"/health","params":"لا توجد معاملات مطلوبة"},{"path":"/live","example":"/live?chain=bnb&limit=8","params":"chain: bnb أو solana · limit: من 1 إلى 50 (الافتراضي 8)"},{"path":"/blocks","example":"/blocks?chain=bnb&limit=10","params":"chain · limit: من 1 إلى 50"},{"path":"/block","example":"/block?chain=bnb&height=127195710","params":"chain · height: رقم بلوك صحيح"},{"path":"/transactions","example":"/transactions?chain=bnb&limit=10","params":"chain · limit: من 1 إلى 50"},{"path":"/tx","example":"/tx?chain=bnb&hash=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","params":"chain · hash: معرّف المعاملة · height اختياري على BNB فقط"},{"path":"/address","example":"/address?chain=bnb&address=0x0000000000000000000000000000000000000000&limit=20","params":"chain · address · limit (1–50) · before_height وbefore_hash اختياريان معاً"},{"path":"/balance","example":"/balance?chain=bnb&address=0x0000000000000000000000000000000000000000","params":"chain · address: عنوان صحيح للشبكة"},{"path":"/token-transfers","example":"/token-transfers?chain=bnb&address=0x0000000000000000000000000000000000000000&limit=20","params":"chain=bnb · address · limit: من 1 إلى 50"},{"path":"/price","example":"/price?chain=bnb","params":"chain: bnb أو solana"}];
const $=id=>document.getElementById(id);
let lang="ar";try{lang=localStorage.getItem("bexentra-language")==="en"?"en":"ar"}catch{}
const t=(ar,en)=>lang==="en"?en:ar;
function setLang(next){
 lang=next;document.documentElement.lang=lang;document.documentElement.dir=lang==="en"?"ltr":"rtl";
 document.querySelectorAll("[data-ar][data-en]").forEach(el=>{
  const value=el.getAttribute("data-"+lang);
  if(value!==null)el.textContent=value;
 });
 $("langToggle").textContent=lang==="en"?"AR":"EN";
 $("requestPreview").textContent=previewUrl();
 $("requestStatus").textContent=t("لم يُرسل طلب بعد","No request sent");
 $("apiResponse").textContent="";
 try{localStorage.setItem("bexentra-language",lang)}catch{}
}
const withParams=(path,chain)=>{
 const url=new URL(BASE+path);if(path!=="/health")url.searchParams.set("chain",chain);
 if(["/live","/blocks","/transactions","/address","/token-transfers"].includes(path)){
  const num=Number($("limitInput").value);url.searchParams.set("limit",String(Number.isInteger(num)&&num>=1&&num<=50?num:8));
 }
 const value=$("requestInput").value.trim();
 if(path==="/block"&&value)url.searchParams.set("height",value);
 if(path==="/tx"&&value)url.searchParams.set("hash",value);
 if(["/balance","/address","/token-transfers"].includes(path)&&value)url.searchParams.set("address",value);
 return url;
};
const needs={"/block":"height","/tx":"hash","/address":"address","/balance":"address","/token-transfers":"address"};
const limited=["/live","/blocks","/transactions","/address","/token-transfers"];
const defaults={"/block":"127195710","/tx":"0x"+("a".repeat(64)),"/balance":"0x"+("0".repeat(40)),"/address":"0x"+("0".repeat(40)),"/token-transfers":"0x"+("0".repeat(40))};
function previewUrl(){return withParams($("pathPicker").value,$("chainPicker").value).toString()}
function refreshInputs(){
 const path=$("pathPicker").value;
 $("chainPicker").disabled=path==="/health"||path==="/token-transfers";
 if(path==="/token-transfers")$("chainPicker").value="bnb";
 $("inputWrap").hidden=!needs[path];
 $("limitWrap").hidden=!limited.includes(path);
 $("inputLabel").textContent=needs[path]||"";
 const old=$("requestInput").dataset.forPath;
 if(old!==path){
  $("requestInput").value=defaults[path]||"";
  $("requestInput").dataset.forPath=path;
 }
 $("requestPreview").textContent=previewUrl();
}
const copying=async text=>{
 try{
  await navigator.clipboard.writeText(text);
  return true;
 }catch{return false}
};
async function run(){
 const path=$("pathPicker").value,url=withParams(path,$("chainPicker").value);
 const input=$("requestInput").value.trim();
 if(needs[path]&&!input){$("requestStatus").textContent=t("أدخل "+needs[path],"Enter "+needs[path]);$("requestInput").focus();return}
 const button=$("runRequest");
 button.disabled=true;$("requestStatus").textContent=t("جاري الاتصال…","Connecting…");
 $("apiResponse").textContent="";
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),12000);
 try{
  const response=await fetch(url,{signal:ac.signal,method:"GET",headers:{Accept:"application/json"},credentials:"omit"});
  const text=await response.text();
  let data;try{data=JSON.parse(text)}catch{data={error:"Unexpected response type"}}
  $("requestStatus").textContent="HTTP "+response.status+(response.ok?" ✓":"");
  $("apiResponse").textContent=JSON.stringify(data,null,2);
 }catch(err){
  $("requestStatus").textContent=t("تعذّر الاتصال","Request failed");
  $("apiResponse").textContent=t("تعذر الحصول على نتيجة. راجع الاتصال أو حدود الخدمة.","No response. Check connectivity or service limits.");
 }finally{clearTimeout(timer);button.disabled=false}
}
$("langToggle").addEventListener("click",()=>setLang(lang==="ar"?"en":"ar"));
$("pathPicker").addEventListener("change",refreshInputs);
$("chainPicker").addEventListener("change",refreshInputs);
$("requestInput").addEventListener("input",()=>{$("requestPreview").textContent=previewUrl()});
$("limitInput").addEventListener("input",()=>{$("requestPreview").textContent=previewUrl()});
$("runRequest").addEventListener("click",run);
$("copyRequest").addEventListener("click",async()=>{
 const button=$("copyRequest"),ok=await copying(previewUrl());
 button.textContent=ok?t("تم النسخ","Copied"):t("تعذر النسخ","Copy failed");
});
$("copyBase").addEventListener("click",async()=>{
 const ok=await copying(BASE);$("copyBase").textContent=ok?t("تم النسخ","Copied"):t("تعذر النسخ","Copy failed");
});
document.querySelectorAll("[data-copy-route]").forEach(button=>button.addEventListener("click",async()=>{
 const e=endpoints.find(x=>x.path===button.dataset.copyRoute);if(!e)return;
 const success=await copying(BASE+e.example);
 button.textContent=success?t("تم النسخ","Copied"):t("تعذر النسخ","Copy failed");
}));
document.querySelectorAll("[data-try-route]").forEach(button=>button.addEventListener("click",()=>{
 const p=button.dataset.tryRoute,e=endpoints.find(x=>x.path===p);if(!e)return;
 $("pathPicker").value=p;
 $("chainPicker").value=p==="/token-transfers"?"bnb":"bnb";
 $("requestInput").dataset.forPath="";
 refreshInputs();
 $("tester").scrollIntoView({behavior:"smooth",block:"start"});
}));
setLang(lang);refreshInputs();
})();