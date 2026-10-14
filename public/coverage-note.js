"use strict";
// Clear and localized provenance notice. No invented chain statistics.
(()=>{
 const copy={
  ar:{title:"تغطية البيانات:",message:"البلوكات المباشرة عينات من الشبكة؛ سجل المعاملات والمحافظ المفهرس مازال جزئياً.",docs:"وثائق API ↗",label:"حدود بيانات BEXENTRA"},
  en:{title:"Data coverage:",message:"Live blocks are network samples. Indexed wallet and transaction history remains partial.",docs:"API documentation ↗",label:"BEXENTRA data coverage"},
  fr:{title:"Couverture des données :",message:"Les blocs en direct sont des échantillons. L'historique indexé reste partiel.",docs:"Documentation API ↗",label:"Couverture des données"},
  de:{title:"Datenabdeckung:",message:"Live-Blöcke sind Stichproben. Der indexierte Transaktionsverlauf ist noch unvollständig.",docs:"API-Dokumentation ↗",label:"BEXENTRA Datenabdeckung"},
  es:{title:"Cobertura de datos:",message:"Los bloques en directo son muestras. El historial indexado aún es parcial.",docs:"Documentación API ↗",label:"Cobertura de datos"},
  it:{title:"Copertura dei dati:",message:"I blocchi in tempo reale sono campioni. Lo storico indicizzato è ancora parziale.",docs:"Documentazione API ↗",label:"Copertura dei dati"}
 };
 const banner=document.getElementById("coverageTruth");
 if(!banner)return;
 function render(){
  const language=window.BexentraPrefs?.get("language")||"ar";
  const words=copy[language]||copy.en;
  banner.setAttribute("aria-label",words.label);
  banner.querySelector("[data-coverage-title]").textContent=words.title;
  banner.querySelector("[data-coverage-message]").textContent=words.message;
  banner.querySelector("a").textContent=words.docs;
 }
 document.addEventListener("bexentra:preferenceschange",render);
 render();
})();
