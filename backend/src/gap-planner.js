/* Pure bounds for low-cost historical index expansion. */
export function boundedBackfillLimit(raw){
 const n=Number(raw??8);
 return Number.isSafeInteger(n)&&n>=1?Math.min(n,20):8;
}
export function selectPreviousSlots(slots,edge,limit=8){
 if(!Array.isArray(slots)||!Number.isSafeInteger(edge)||edge<=1)return [];
 const safe=boundedBackfillLimit(limit);
 return [...new Set(slots.filter(x=>Number.isSafeInteger(x)&&x>=1&&x<edge))]
  .sort((a,b)=>b-a).slice(0,safe);
}
