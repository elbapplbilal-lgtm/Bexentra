import {WATCHLIST_KEY, WATCHLIST_LIMIT, parsePublicAddress, readList, addEntry, verifiedBalance, explorerUrl} from './watchlist-utils.mjs';
// Public addresses only; queries use the existing read-only BEXENTRA API.
const API = 'https://br-old-sun-b5txcoym-bexentraapi.compute.c-7.us-east-2.aws.neon.tech';
const keys = ['home','explorer','language','title','intro','privacy','addTitle','network','address','nickname','addButton','savedTitle','refreshAll','disclaimer','back','empty','saved','duplicate','limit','invalid','storage','count','idle','loading','verified','failed','unknown','refresh','open','remove','removeConfirm'];
const dict = {
 ar: ['الرئيسية','المستكشف','اللغة','محافظي المفضلة','احفظ عناوين BNB Chain وSolana العمومية وتابع أرصدتها الأصلية بلا ربط محفظة.','العناوين محفوظة في هذا المتصفح فقط. طلبات الرصيد تمر عبر API عام. لا تدخل المفتاح الخاص أو كلمات الاسترداد.','إضافة محفظة','الشبكة','عنوان المحفظة العمومي','اسم اختياري','+ حفظ العنوان','العناوين المحفوظة','تحديث الكل','الرصيد الأصلي الحالي فقط، لا يشمل رموز BEP-20 أو SPL. سجل المعاملات جزئي حسب تغطية الفهرسة. لا تنبيهات في الخلفية.','العودة إلى BEXENTRA','ما زال ما حفظتي حتى عنوان. أضف عنواناً عمومياً للبدء.','تم حفظ العنوان في هذا المتصفح.','هذا العنوان محفوظ من قبل.','الحد الأقصى 12 عنواناً.','تأكد من العنوان والشبكة. لا تدخل مفتاحاً خاصاً.','التخزين في هذا المتصفح غير متاح.','عنوان محفوظ','اضغط تحديث لقراءة الرصيد من الشبكة.','جاري طلب الرصيد...','تم التحقق عبر RPC المباشر','الرصيد غير متاح الآن؛ حاول مرة أخرى.','لا يمكن التحقق من هذه الاستجابة.','تحديث الرصيد','عرض المعاملات','حذف','حذف هذا العنوان من قائمة هذا الجهاز؟'],
 en: ['Home','Explorer','Language','My saved wallets','Save public BNB Chain and Solana addresses and check native balances without connecting a wallet.','Addresses are stored only in this browser. Balance checks use a public API. Never enter private keys or recovery phrases.','Add wallet','Network','Public wallet address','Optional name','+ Save address','Saved addresses','Refresh all','Current native balances only, not BEP-20 or SPL tokens. Transaction history is limited to indexed coverage. No background alerts.','Back to BEXENTRA','No saved addresses yet. Add a public address to begin.','Saved in this browser.','Already saved.','Maximum 12 addresses.','Check address and network. Never enter a private key.','Browser storage is unavailable.','saved addresses','Tap refresh to read the network.','Checking the balance...','Verified via live RPC','Balance unavailable now. Try again.','Cannot verify this response.','Refresh balance','View transactions','Remove','Remove this address from this device?'],
 fr: ['Accueil','Explorateur','Langue','Mes portefeuilles','Enregistrez des adresses publiques BNB Chain et Solana et consultez les soldes natifs.','Adresses conservées dans ce navigateur. Requêtes envoyées à une API publique. Ne saisissez jamais de clé privée.','Ajouter un portefeuille','Réseau','Adresse publique','Nom facultatif','+ Enregistrer','Adresses enregistrées','Tout actualiser','Soldes natifs uniquement, pas de jetons BEP-20 ou SPL. Historique limité aux données indexées. Aucune alerte en arrière-plan.','Retour à BEXENTRA','Aucune adresse enregistrée.','Adresse enregistrée.','Adresse déjà enregistrée.','12 adresses maximum.','Vérifiez l’adresse et le réseau. Ne saisissez pas de clé privée.','Stockage indisponible.','adresses','Actualisez pour voir le solde.','Chargement du solde...','Vérifié par RPC direct','Solde indisponible, réessayez.','Réponse non vérifiée.','Actualiser','Transactions','Supprimer','Supprimer cette adresse ?'],
 de: ['Startseite','Explorer','Sprache','Meine Wallets','Öffentliche BNB Chain- und Solana-Adressen speichern und native Guthaben prüfen.','Adressen nur in diesem Browser gespeichert. Abfragen gehen an eine öffentliche API. Niemals private Schlüssel eingeben.','Wallet hinzufügen','Netzwerk','Öffentliche Adresse','Optionaler Name','+ Adresse speichern','Gespeicherte Adressen','Alle aktualisieren','Nur native Guthaben, keine BEP-20- oder SPL-Token. Transaktionen nur soweit indexiert. Keine Hintergrundwarnungen.','Zurück zu BEXENTRA','Noch keine Adressen gespeichert.','Adresse gespeichert.','Bereits gespeichert.','Maximal 12 Adressen.','Adresse und Netzwerk prüfen. Keinen privaten Schlüssel eingeben.','Speicher nicht verfügbar.','Adressen','Zum Prüfen aktualisieren.','Guthaben wird geladen...','Über Live-RPC verifiziert','Guthaben derzeit nicht verfügbar.','Antwort nicht verifiziert.','Aktualisieren','Transaktionen','Entfernen','Adresse entfernen?'],
 es: ['Inicio','Explorador','Idioma','Mis billeteras','Guarda direcciones públicas de BNB Chain y Solana y consulta sus saldos nativos.','Direcciones guardadas solo en este navegador. Consultas a una API pública. Nunca ingreses claves privadas.','Añadir billetera','Red','Dirección pública','Nombre opcional','+ Guardar dirección','Direcciones guardadas','Actualizar todas','Solo saldos nativos, no tokens BEP-20 ni SPL. Historial limitado a datos indexados. Sin alertas en segundo plano.','Volver a BEXENTRA','Aún no hay direcciones guardadas.','Dirección guardada.','Ya está guardada.','Máximo 12 direcciones.','Comprueba dirección y red. Nunca ingreses claves privadas.','Almacenamiento no disponible.','direcciones','Actualiza para consultar el saldo.','Consultando saldo...','Verificado mediante RPC','Saldo no disponible ahora.','Respuesta no verificada.','Actualizar','Transacciones','Eliminar','¿Eliminar esta dirección?'],
 it: ['Home','Explorer','Lingua','I miei wallet','Salva indirizzi pubblici BNB Chain e Solana e controlla i saldi nativi.','Indirizzi salvati solo in questo browser. Le richieste usano un’API pubblica. Non inserire chiavi private.','Aggiungi wallet','Rete','Indirizzo pubblico','Nome facoltativo','+ Salva indirizzo','Indirizzi salvati','Aggiorna tutti','Solo saldi nativi, non token BEP-20 o SPL. Cronologia limitata ai dati indicizzati. Nessun avviso in background.','Torna a BEXENTRA','Nessun indirizzo salvato.','Indirizzo salvato.','Già salvato.','Massimo 12 indirizzi.','Controlla indirizzo e rete. Non inserire chiavi private.','Memoria non disponibile.','indirizzi','Aggiorna per controllare il saldo.','Caricamento del saldo...','Verificato tramite RPC','Saldo non disponibile ora.','Risposta non verificata.','Aggiorna','Transazioni','Rimuovi','Rimuovere questo indirizzo?']
};
const $ = id => document.getElementById(id);
let lang = 'ar';
try {const v=localStorage.getItem('bexentra-language');if(dict[v])lang=v} catch {}
let list=[];
try {list=readList(localStorage.getItem(WATCHLIST_KEY))} catch {}
let generation=0;
const views=new Map();
function t(key){return dict[lang][keys.indexOf(key)]||dict.en[keys.indexOf(key)]||key}
function translate(){
 document.documentElement.lang=lang;
 document.documentElement.dir=lang==='ar'?'rtl':'ltr';
 $('watchLanguage').value=lang;
 document.querySelectorAll('[data-wl]').forEach(el=>el.textContent=t(el.dataset.wl));
 document.title='BEXENTRA | '+t('title');
 $('watchCounter').textContent=list.length+' / '+WATCHLIST_LIMIT+' · '+t('count');
}
function message(key,error=false){$('watchMessage').textContent=key?t(key):'';$('watchMessage').classList.toggle('error',error)}
function save(next){
 try{localStorage.setItem(WATCHLIST_KEY,JSON.stringify(next));list=next;return true}
 catch {message('storage',true);return false}
}
function node(tag,cls,value){
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(value!==undefined)el.textContent=value;
 return el;
}
async function refreshCard(entry,card,balance,status,button){
 if(button.disabled)return;
 const currentGeneration=generation;
 button.disabled=true;status.textContent=t('loading');status.classList.remove('error');balance.textContent='—';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const url=new URL(API+'/balance');url.searchParams.set('chain',entry.chain);url.searchParams.set('address',entry.address);
  const response=await fetch(url,{credentials:'omit',signal:controller.signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('unavailable');
  const body=await response.json();
  const amount=verifiedBalance(body,entry);
  if(currentGeneration!==generation||!card.isConnected)return;
  balance.replaceChildren(document.createTextNode(amount+' '),node('span','',entry.chain==='bnb'?'BNB':'SOL'));
  status.textContent=t('verified')+' · '+new Date(body.observed_at).toLocaleTimeString(lang,{hour:'2-digit',minute:'2-digit'});
 }catch(error){
  if(currentGeneration!==generation||!card.isConnected)return;
  status.classList.add('error');status.textContent=['unverified','stale'].includes(error.message)?t('unknown'):t('failed');
 }finally{clearTimeout(timer);button.disabled=false}
}
function card(entry){
 const key=entry.chain+':'+entry.address,article=node('article','watch-card');
 const top=node('div','watch-card-top'),title=node('div','watch-card-title');
 const img=node('img','watch-chain-icon');
 img.src=entry.chain==='bnb'?'public/bnb-mark.svg?v=2':'public/solana-mark.svg';img.alt=entry.chain;
 const info=node('div');info.append(node('div','watch-card-name',entry.label||entry.chain.toUpperCase()),node('span','watch-card-address',entry.address));
 title.append(img,info);top.append(title,node('span','watch-chain-tag',entry.chain==='bnb'?'BNB Chain':'Solana'));
 const balance=node('div','watch-card-balance','—'),status=node('p','watch-status',t('idle'));
 status.setAttribute('role','status');balance.setAttribute('aria-label','Native balance');
 const actions=node('div','watch-actions');
 const refresh=node('button','',t('refresh'));refresh.type='button';
 refresh.addEventListener('click',()=>refreshCard(entry,article,balance,status,refresh));
 const open=node('a','',t('open'));open.href=explorerUrl(entry);
 const remove=node('button','watch-remove',t('remove'));remove.type='button';
 remove.addEventListener('click',()=>{
  if(!confirm(t('removeConfirm')))return;
  if(save(list.filter(x=>x.chain+':'+x.address!==key))){generation++;render()}
 });
 actions.append(refresh,open,remove);article.append(top,balance,status,actions);
 views.set(key,{entry,article,balance,status,refresh});
 return article;
}
function render(){
 translate();const target=$('watchList');target.replaceChildren();views.clear();
 $('watchRefreshAll').disabled=!list.length;
 if(!list.length){target.append(node('p','watch-empty',t('empty')));return}
 for(const entry of list)target.append(card(entry));
}
$('watchLanguage').addEventListener('change',event=>{
 if(!dict[event.target.value])return;
 lang=event.target.value;
 try{localStorage.setItem('bexentra-language',lang)}catch{}
 generation++;message('');render();
});
$('watchForm').addEventListener('submit',event=>{
 event.preventDefault();
 try{
  const chain=$('watchChain').value, address=parsePublicAddress($('watchAddress').value,chain);
  const next=addEntry(list,{chain,address,label:$('watchLabel').value});
  if(save(next)){$('watchAddress').value='';$('watchLabel').value='';generation++;render();message('saved')}
 }catch(error){message(['duplicate','limit'].includes(error.message)?error.message:'invalid',true)}
});
$('watchRefreshAll').addEventListener('click',async event=>{
 const button=event.currentTarget;button.disabled=true;
 const snapshot=[...views.values()];
 try{for(const x of snapshot){if(x.article.isConnected)await refreshCard(x.entry,x.article,x.balance,x.status,x.refresh)}}
 finally{button.disabled=false}
});
render();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
