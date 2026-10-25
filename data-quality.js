/* NextRate strict client-side checks for independently published static data.
 * Malformed or out-of-sync files never become prices or predictions. */
(function(root){
'use strict';
const keys=['gold24_inr_10g','gold22_inr_10g','silver999_inr_kg'];
const bounds={gold24_inr_10g:[10000,1000000],
 gold22_inr_10g:[10000,1000000],silver999_inr_kg:[5000,3000000]};
function iso(day){
 if(typeof day!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(day))return false;
 const date=new Date(day+'T00:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day;
}
function todayIST(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',
  month:'2-digit',day:'2-digit'}).formatToParts(now);
 const v=n=>parts.find(x=>x.type===n)?.value;
 return v('year')+'-'+v('month')+'-'+v('day');
}
function validPrice(row,key){
 return typeof row?.[key]==='number'&&Number.isFinite(row[key])&&
  row[key]>bounds[key][0]&&row[key]<bounds[key][1];
}
function validIndia(row,today=todayIST()){
 return !!row&&iso(row.date)&&row.date<=today&&['AM','PM'].includes(row.session)&&
  keys.every(k=>validPrice(row,k))&&
  row.gold22_inr_10g/row.gold24_inr_10g>.87&&
  row.gold22_inr_10g/row.gold24_inr_10g<.97;
}
function validHistoryRow(row,today){
 return !!row&&iso(row.date)&&row.date<=today&&['AM','PM'].includes(row.session)&&
  keys.some(k=>validPrice(row,k))&&
  (!validPrice(row,'gold24_inr_10g')||!validPrice(row,'gold22_inr_10g')||
   (row.gold22_inr_10g/row.gold24_inr_10g>.87&&
    row.gold22_inr_10g/row.gold24_inr_10g<.97));
}
function market(snapshot,today=todayIST()){
 if(snapshot?.schema_version!==1||!validIndia(snapshot.india,today))return null;
 const result={...snapshot,spot:{},fx:null};
 for(const name of ['XAU','XAG']){
  const quote=snapshot.spot?.[name];
  const epoch=Date.parse(quote?.as_of||'');
  if(typeof quote?.usd_per_troy_ounce==='number'&&
     Number.isFinite(quote.usd_per_troy_ounce)&&quote.usd_per_troy_ounce>0&&
     Number.isFinite(epoch)&&epoch<=Date.now()+600000)
   result.spot[name]=quote;
 }
 const fx=snapshot.fx;
 if(typeof fx?.inr_per_usd==='number'&&Number.isFinite(fx.inr_per_usd)&&
    fx.inr_per_usd>20&&fx.inr_per_usd<250&&iso(fx.date)&&fx.date<=today)
  result.fx=fx;
 return result;
}
function history(doc,india,today=todayIST()){
 const rows=doc?.schema_version===1&&Array.isArray(doc.india)?doc.india:[];
 const valid=rows.filter(row=>validHistoryRow(row,today));
 if(india&&!valid.some(row=>row.date===india.date&&row.session===india.session)){
  valid.push(india);
 }
 return {...(doc?.schema_version===1?doc:{}),schema_version:1,
  india:valid.sort((a,b)=>a.date.localeCompare(b.date))};
}
function forecastIsConsistent(doc,snapshot,today=todayIST()){
 if(!doc||doc.schema_version!==1||doc.status!=='experimental'||
   !snapshot?.india||!iso(doc.target_date)||doc.target_date<today||
   !iso(doc.based_on_date)||doc.based_on_date!==snapshot.india.date||
   doc.based_on_session!==snapshot.india.session)return false;
 const days=(Date.parse(doc.target_date+'T00:00:00Z')-
  Date.parse(today+'T00:00:00Z'))/86400000;
 if(days>14)return false;
 const mapped={gold24:'gold24_inr_10g',gold22:'gold22_inr_10g',silver:'silver999_inr_kg'};
 return Object.entries(mapped).every(([metal,key])=>{
  const v=doc.metals?.[metal];
  return v&&['estimate','baseline','low','high'].every(k=>
   typeof v[k]==='number'&&Number.isFinite(v[k])&&v[k]>0)&&
   v.baseline===snapshot.india[key]&&v.low<v.estimate&&v.estimate<v.high&&
   Math.abs(v.estimate/v.baseline-1)<.2;
 });
}
const api=Object.freeze({iso,todayIST,validIndia,market,history,forecastIsConsistent});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.NextRateDataQuality=api;
})(typeof window==='undefined'?globalThis:window);
