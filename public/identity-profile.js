"use strict";
/* Optional wallet identity discovery: independent of wallet balance / tx RPC.
   Sends a PUBLIC address to Web3.bio only after an explicit visitor click.
   No keys, no accounts, no wallet connect, no external HTML injection. */
(()=>{
 const U=window.BexentraIdentityUtils;
 if(!U)return;
 const $=id=>document.getElementById(id);
 const locales={
  ar:{title:"الهوية الرقمية للمحفظة",subtitle:"ابحث عن اسم ENS أو SNS مرتبط بهذا العنوان.",button:"استكشاف هوية المحفظة",loading:"جارٍ البحث عن الهوية...",none:"ما لقيناش اسم ENS / SNS لهذا العنوان حالياً.",fail:"تعذر جلب ملف الهوية. الرصيد والمعاملات ما زالوا مستقلين عن هاد الخدمة.",limit:"الخدمة حدّت الطلبات مؤقتاً. حاول لاحقاً.",mismatch:"تعذر تأكيد مطابقة الهوية لهذا العنوان.",name:"الاسم المسجل",copy:"نسخ الاسم",copied:"تم النسخ",external:"روابط عامة (غير موثقة)",source:"فتح مصدر البيانات ↗",caveat:"اسم ENS / SNS والروابط معلومات عامة من طرف ثالث؛ ماشي إثبات هوية الشخص أو صحة معاملات الشبكة.",privacy:"عند الضغط، غادي يتشارك العنوان العمومي فقط مع Web3.bio. بلا ربط المحفظة."},
  en:{title:"Wallet identity",subtitle:"Look up ENS or SNS identity linked to this address.",button:"Discover identity",loading:"Looking up identity...",none:"No ENS / SNS identity was found for this address.",fail:"Identity service unavailable. Blockchain data is unaffected.",limit:"Identity provider is rate-limiting requests. Try later.",mismatch:"Provider data did not match the requested address.",name:"Name service label",copy:"Copy name",copied:"Copied",external:"Public links (not verified)",source:"View source data ↗",caveat:"Name-service labels and links are third-party metadata, not proof of a person's identity or a blockchain transaction.",privacy:"On click, only this public address is sent to Web3.bio. No wallet connection."},
  fr:{title:"Identité du portefeuille",subtitle:"Rechercher un nom ENS ou SNS lié à cette adresse.",button:"Rechercher l'identité",loading:"Recherche en cours...",none:"Aucune identité ENS / SNS trouvée.",fail:"Service d'identité indisponible. Les données blockchain ne changent pas.",limit:"Limite de requêtes atteinte. Réessayez plus tard.",mismatch:"L'adresse du profil ne correspond pas.",name:"Nom associé",copy:"Copier le nom",copied:"Copié",external:"Liens publics (non vérifiés)",source:"Voir les données source ↗",caveat:"Ces noms et liens externes ne prouvent pas l'identité d'une personne.",privacy:"Un clic transmet uniquement cette adresse publique à Web3.bio."},
  de:{title:"Wallet-Identität",subtitle:"ENS- oder SNS-Namen für diese Adresse suchen.",button:"Identität suchen",loading:"Identität wird gesucht...",none:"Kein ENS-/SNS-Name gefunden.",fail:"Identitätsdienst nicht verfügbar. Blockchain-Daten sind nicht betroffen.",limit:"Anfragelimit erreicht. Bitte später erneut versuchen.",mismatch:"Profiladresse stimmt nicht überein.",name:"Namensdienst",copy:"Namen kopieren",copied:"Kopiert",external:"Öffentliche Links (ungeprüft)",source:"Quelldaten öffnen ↗",caveat:"Namenslabels und Links sind keine Bestätigung der realen Identität.",privacy:"Erst beim Klick wird diese öffentliche Adresse an Web3.bio gesendet."},
  es:{title:"Identidad de la cartera",subtitle:"Busca nombres ENS o SNS vinculados con esta dirección.",button:"Buscar identidad",loading:"Buscando identidad...",none:"No se encontró una identidad ENS / SNS.",fail:"Servicio no disponible. Los datos de blockchain no se ven afectados.",limit:"Límite de solicitudes. Inténtalo más tarde.",mismatch:"El perfil no coincide con la dirección.",name:"Nombre asociado",copy:"Copiar nombre",copied:"Copiado",external:"Enlaces públicos (sin verificar)",source:"Ver datos de origen ↗",caveat:"Los nombres y enlaces no prueban la identidad real de nadie.",privacy:"Al pulsar, solo se envía esta dirección pública a Web3.bio."},
  it:{title:"Identità del portafoglio",subtitle:"Cerca nomi ENS o SNS associati a questo indirizzo.",button:"Cerca identità",loading:"Ricerca dell'identità...",none:"Nessuna identità ENS / SNS trovata.",fail:"Servizio non disponibile. I dati blockchain non cambiano.",limit:"Limite di richieste raggiunto. Riprova più tardi.",mismatch:"Il profilo non corrisponde all'indirizzo.",name:"Nome associato",copy:"Copia nome",copied:"Copiato",external:"Link pubblici (non verificati)",source:"Apri dati di origine ↗",caveat:"Nomi e link non dimostrano l'identità reale di una persona.",privacy:"Solo dopo un clic l'indirizzo pubblico viene inviato a Web3.bio."}
 };
 const memo=new Map(), TTL=15*60*1000;
 let current=null, pending=null, generation=0;
 const tr=()=>locales[window.BexentraPrefs?.get("language")]||locales.ar;
 function line(tag,cls,content){
  const el=document.createElement(tag);el.className=cls;el.textContent=content;return el;
 }
 function externalLink(url,label){
  const a=line("a","identity-external",label);
  a.href=url;a.target="_blank";a.rel="noopener noreferrer nofollow";
  a.referrerPolicy="no-referrer";return a;
 }
 function status(message){
  const el=$("identityStatus");if(el)el.textContent=message;
 }
 function paint(profile,words,address,network){
  const body=$("identityResult");
  if(!body)return;
  body.replaceChildren();
  body.hidden=false;
  const heading=document.createElement("div");
  heading.className="identity-profile-heading";
  if(profile.avatar){
   const avatar=document.createElement("img");
   avatar.src=profile.avatar;avatar.alt="";avatar.loading="lazy";
   avatar.referrerPolicy="no-referrer";
   avatar.addEventListener("error",()=>avatar.remove(),{once:true});
   heading.append(avatar);
  }
  const details=document.createElement("div");
  details.className="identity-profile-meta";
  if(profile.name){
   details.append(line("strong","identity-name",profile.name));
   const copy=line("button","identity-copy",words.copy);
   copy.type="button";
   copy.addEventListener("click",()=>{
    if(!navigator.clipboard?.writeText)return;
    navigator.clipboard.writeText(profile.name).then(()=>{copy.textContent=tr().copied}).catch(()=>{});
   });
   details.append(copy);
  }else details.append(line("strong","identity-name",network==="bnb"?"ENS":"Solana / SNS"));
  details.append(line("small","identity-origin",profile.service+" · Web3.bio"));
  heading.append(details);
  body.append(heading);
  if(profile.description)body.append(line("p","identity-description",profile.description));
  if(profile.links.length){
   body.append(line("small","identity-link-label",words.external));
   const links=document.createElement("div");links.className="identity-links";
   for(const item of profile.links)links.append(externalLink(item.url,item.label+" ↗"));
   body.append(links);
  }
  const source=U.endpoint(network,address);
  if(source)body.append(externalLink(source,words.source));
 }
 function cancel(){
  generation++;
  if(pending){pending.abort();pending=null}
 }
 function mount(address,network){
  const card=$("walletIdentity");
  if(!card)return;
  cancel();
  const words=tr();
  $("identityTitle").textContent=words.title;
  $("identitySubtitle").textContent=words.subtitle;
  $("identityPrivacy").textContent=words.privacy;
  $("identityCaveat").textContent=words.caveat;
  const button=$("identityLookup");
  button.textContent=words.button;
  button.disabled=false;button.hidden=false;
  $("identityResult").replaceChildren();
  $("identityResult").hidden=true;
  status("");
  current=U.validAddress(network,address)?{address,network}:null;
  card.hidden=!current;
 }
 async function lookup(){
  if(!current)return;
  const {address,network}=current,endpoint=U.endpoint(network,address);
  if(!endpoint)return;
  const words=tr(),button=$("identityLookup");
  if(button.disabled)return;
  const token=++generation;
  button.disabled=true;button.textContent=words.loading;
  status(words.loading);
  try{
   const key=network+":"+address.toLowerCase();
   const saved=memo.get(key);
   let result;
   if(saved&&saved.until>Date.now())result=saved.value;
   else{
    const controller=new AbortController();pending=controller;
    const timeout=setTimeout(()=>controller.abort(),7500);
    let response;
    try{
     response=await fetch(endpoint,{method:"GET",mode:"cors",credentials:"omit",
      headers:{"Accept":"application/json"},signal:controller.signal,cache:"no-store"});
    }finally{clearTimeout(timeout)}
    if(response.status===429){const error=new Error("rate-limit");error.kind="limit";throw error}
    if(response.status===404){result=null}
    else if(!response.ok)throw Error("profile HTTP "+response.status);
    else{
     const data=await response.json();
     result=U.normalize(data,network,address);
     // A nonmatching record must not be displayed as an identity.
     if(data&&data.address&&!result &&
        (network==="bnb"?data.address.toLowerCase()!==address.toLowerCase():data.address!==address)){
      const error=new Error("address mismatch");error.kind="mismatch";throw error;
     }
    }
    memo.set(key,{until:Date.now()+(result?TTL:5*60*1000),value:result});
   }
   if(token!==generation)return;
   if(result){paint(result,tr(),address,network);status("")}
   else status(tr().none);
  }catch(error){
   if(token!==generation)return;
   status(error.kind==="limit"?tr().limit:error.kind==="mismatch"?tr().mismatch:tr().fail);
  }finally{
   if(token===generation){
    pending=null;button.disabled=false;button.textContent=tr().button;
   }
  }
 }
 $("identityLookup")?.addEventListener("click",lookup);
 window.BexentraIdentity=Object.freeze({mount});
})();
