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
function age(day,today=todayIST()){return iso(day)?(Date.parse(today)-Date.parse(day))/86400000:Infinity;}
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
function conversionFX(row,spot,checked){
 const time=Date.parse(row?.quote_as_of),at=Date.parse(checked),gold=spot?.XAU;
 const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
 return row?.rate_timing==='conversion_quote_not_fx_tick'&&row.source_url==='https://gold-api.com/docs'&&
  positive(row.inr_per_usd)&&row.inr_per_usd>20&&row.inr_per_usd<250&&
  positive(row.inr_per_troy_ounce)&&positive(row.usd_per_troy_ounce)&&
  Math.abs(row.inr_per_troy_ounce/row.inr_per_usd/row.usd_per_troy_ounce-1)<1e-8&&
  Number.isFinite(time)&&Number.isFinite(at)&&time<=at+60000&&at-time<=5400000&&
  /(?:Z|[+-]\d\d:\d\d)$/i.test(row.quote_as_of)&&row.date===todayIST(new Date(time))&&
  Math.abs(time-Date.parse(gold?.as_of))<=60000&&positive(gold?.usd_per_troy_ounce)&&
  Math.abs(row.usd_per_troy_ounce/gold.usd_per_troy_ounce-1)<=.0025;
}
function market(snapshot,today=todayIST()){
 if(snapshot?.schema_version!==1||!validIndia(snapshot.india,today))return null;
 const result={...snapshot,spot:{},fx:null,forecast_fx:null};
 for(const name of ['XAU','XAG']){
  const quote=snapshot.spot?.[name];
  const epoch=Date.parse(quote?.as_of||'');
  if(typeof quote?.usd_per_troy_ounce==='number'&&
     Number.isFinite(quote.usd_per_troy_ounce)&&quote.usd_per_troy_ounce>0&&
     Number.isFinite(epoch)&&/(?:Z|[+-]\d\d:\d\d)$/i.test(quote.as_of)&&
     epoch<=Date.now()+600000&&age(todayIST(new Date(epoch)),today)<=7)
   result.spot[name]=quote;
 }
 const fx=snapshot.fx;
 if(typeof fx?.inr_per_usd==='number'&&Number.isFinite(fx.inr_per_usd)&&
    fx.inr_per_usd>20&&fx.inr_per_usd<250&&iso(fx.date)&&fx.date<=today&&age(fx.date,today)<=10)
  result.fx=fx;
 if(conversionFX(snapshot.forecast_fx,result.spot,snapshot.checked_at))result.forecast_fx=snapshot.forecast_fx;
 return result;
}
function history(doc,india,today=todayIST()){
 const rows=doc?.schema_version===1&&Array.isArray(doc.india)?doc.india:[];
 const byKey=new Map(),conflicts=new Set();
 for(const row of rows){
  if(!validHistoryRow(row,today)||india&&(row.date>india.date||
    row.date===india.date&&india.session==='AM'&&row.session==='PM'))continue;
  const clean={...row};for(const k of keys)if(!validPrice(clean,k))delete clean[k];
  const key=clean.date+':'+clean.session,prior=byKey.get(key);
  if(prior&&keys.some(k=>prior[k]!=null&&clean[k]!=null&&prior[k]!==clean[k]))conflicts.add(key);
  byKey.set(key,{...prior,...clean});
 }
 for(const [key,row] of byKey)if(conflicts.has(key)||!validHistoryRow(row,today))byKey.delete(key);
 if(india)byKey.set(india.date+':'+india.session,{...india});
 return {schema_version:1,india:[...byKey.values()].sort((a,b)=>
  a.date.localeCompare(b.date)||a.session.localeCompare(b.session))};
}
const schemes={goldbees:140088,hdfcgold:113049,sbigold:111954,goldfund:120685,
 silveretf:149758,hdfcsilver:150556,silverfund:152735};
function funds(doc,today=todayIST()){
 const result={schema_version:1,status:doc?.status||'unavailable',funds:{}};
 if(doc?.schema_version!==1||!doc.funds||typeof doc.funds!=='object')return result;
 for(const [key,code] of Object.entries(schemes)){
  const row=doc.funds[key];
  if(row?.scheme_code!==code||typeof row.name!=='string'||!row.name||
    !['Gold ETF','Silver ETF','Gold Fund','Silver Fund'].includes(row.kind)||
    !iso(row.nav_date)||row.nav_date>today||age(row.nav_date,today)>10||
    typeof row.nav_inr_per_unit!=='number'||!Number.isFinite(row.nav_inr_per_unit)||
    row.nav_inr_per_unit<=.01||row.nav_inr_per_unit>=1000000)continue;
  result.funds[key]={...row,source_url:'https://www.amfiindia.com/net-asset-value/nav-download'};
 }
 return result;
}
function cities(doc,today=todayIST()){
 const result={schema_version:1,dates:{},cities:{}};
 if(doc?.schema_version!==1)return result;
 for(const group of ['gold','silver']){
  const day=doc.dates?.[group];
  if(!iso(day)||day>today||age(day,today)>7)continue;
  result.dates[group]=day;
  for(const name of ['Chennai','Mumbai','Delhi','Bengaluru','Hyderabad']){
   const row=doc.cities?.[name];if(!row)continue;
   let clean;
   if(group==='gold'&&typeof row.gold24_inr_g==='number'&&typeof row.gold22_inr_g==='number'&&
     row.gold24_inr_g>2500&&row.gold24_inr_g<200000&&
     row.gold22_inr_g/row.gold24_inr_g>.875&&row.gold22_inr_g/row.gold24_inr_g<.965)
    clean={gold24_inr_g:row.gold24_inr_g,gold22_inr_g:row.gold22_inr_g};
   if(group==='silver'&&typeof row.silver999_inr_kg==='number'&&
     row.silver999_inr_kg>10000&&row.silver999_inr_kg<3000000)
    clean={silver999_inr_kg:row.silver999_inr_kg};
   if(clean)result.cities[name]={...result.cities[name],...clean};
  }
 }
 return result;
}
function forecastHistory(doc,historical,today=todayIST()){
 const rows=doc?.schema_version===1&&Array.isArray(doc.forecasts)?doc.forecasts:[];
 const fields={gold24:keys[0],gold22:keys[1],silver:keys[2]};
 const forecasts=[];
 for(const row of rows){
  const issued=Date.parse(row?.issued_at);
  if(!iso(row?.target_date)||!iso(row.based_on_date)||row.based_on_date>=row.target_date||
   !['AM','PM'].includes(row.based_on_session)||!Number.isFinite(issued)||issued>Date.now()+600000||
   !/(?:Z|[+-]\d\d:\d\d)$/i.test(row.issued_at)||!row.metals)continue;
  const metals={};
  for(const [metal,key]of Object.entries(fields)){
   const v=row.metals[metal];
   if(v&&['estimate','baseline','low','high'].every(k=>validPrice({[key]:v[k]},key))&&
     v.low<=v.estimate&&v.estimate<=v.high)metals[metal]=v;
  }
  if(Object.keys(metals).length!==3)continue;
  const clean={...row,metals};delete clean.evaluation;
  const actual=(historical?.india||[]).find(r=>r.date===row.target_date&&r.session==='PM');
  if(row.target_date<=today&&row.evaluation?.actual_date===row.target_date&&actual&&
    issued<Date.parse(row.target_date+'T00:00:00+05:30')){
   const scored={};
   for(const [metal,key]of Object.entries(fields)){
    const v=metals[metal],value=actual[key];if(!validPrice(actual,key))continue;
    // Recompute displayed scores from the verified PM close, never trust supplied percentages.
    scored[metal]={actual:value,absolute_error_pct:Math.abs(v.estimate-value)/value*100,
     range_covered:value>=v.low&&value<=v.high,
     direction_correct:v.estimate===v.baseline?null:Math.sign(v.estimate-v.baseline)===Math.sign(value-v.baseline)};
   }
   if(Object.keys(scored).length)clean.evaluation={actual_date:row.target_date,metals:scored};
  }
  forecasts.push(clean);
 }
 return {schema_version:1,forecasts:forecasts.sort((a,b)=>a.target_date.localeCompare(b.target_date)||
  Date.parse(a.issued_at)-Date.parse(b.issued_at))};
}
function marketForecastMatches(doc,snapshot){
 const m=doc.market_model;
 if(m?.fx?.kind&&!['daily_reference','indicative_conversion'].includes(m.fx.kind))return false;
 const converted=m?.fx?.kind==='indicative_conversion',fxInput=converted?snapshot.forecast_fx:snapshot.fx;
 if(converted&&(!conversionFX(fxInput,snapshot.spot,snapshot.checked_at)||m.fx.fx_tick_timestamp_verified!==false||
  m.fx.current_quote_as_of!==fxInput.quote_as_of||m.fx.source_url!==fxInput.source_url||
  !Number.isFinite(Date.parse(m.fx.reference_quote_as_of))||Date.parse(m.fx.reference_quote_as_of)>Date.parse(m.fx.current_quote_as_of)))return false;
 const at=Date.parse(doc.generated_at),reference=Date.parse(m?.reference_checked_at),current=Date.parse(m?.current_checked_at);
 if(converted){const r=Date.parse(m.fx.reference_quote_as_of);if(r>reference+60000||reference-r>5400000||m.fx.reference_date!==todayIST(new Date(r)))return false;}
 if(doc.model_version!==4||m?.status!=='active'||m.method!=='market_parity_v1'||
  !Number.isFinite(at)||!Number.isFinite(reference)||!Number.isFinite(current)||reference>current||current>at+60000||
  m.current_checked_at!==snapshot.checked_at||m.fx?.current!==fxInput?.inr_per_usd||
  m.fx?.current_date!==fxInput?.date||!iso(m.fx?.reference_date)||m.fx.reference_date>m.fx.current_date||
  typeof m.fx.reference!=='number'||m.fx.reference<=20||m.fx.reference>=250)return false;
 for(const code of ['gold24','gold22','silver']){
  const v=doc.metals?.[code],input=m.inputs?.[code],sym=code==='silver'?'XAG':'XAU';
  const r=Date.parse(input?.reference_as_of),c=Date.parse(input?.current_as_of);
  if(!v||input?.symbol!==sym||v.model_name!=='market_parity'||v.range_profile!=null||
    !Number.isFinite(r)||!Number.isFinite(c)||r>c||r>reference+60000||c>current+60000||
    typeof input.reference_usd_oz!=='number'||input.reference_usd_oz<=0||
    input.current_usd_oz!==snapshot.spot?.[sym]?.usd_per_troy_ounce||input.current_as_of!==snapshot.spot?.[sym]?.as_of)return false;
  const metal=input.current_usd_oz/input.reference_usd_oz,fx=m.fx.current/m.fx.reference;
  if(v.estimate!==Math.round(v.baseline*metal*fx))return false;
  const d=v.drivers,checks={metal_change_pct:(metal-1)*100,fx_change_pct:(fx-1)*100,
   metal_contribution_inr:v.baseline*(metal-1),fx_contribution_inr:v.baseline*metal*(fx-1)};
  if(Object.entries(checks).some(([key,value])=>typeof d?.[key]!=='number'||!Number.isFinite(d[key])||Math.abs(d[key]-value)>.00001))return false;
  const f=v.forward_evidence;
  if(!f||!Number.isInteger(f.independent_target_dates)||f.independent_target_dates<0||
    !['collecting','available'].includes(f.status)||
    (f.independent_target_dates>0&&!['market_mape_pct','baseline_mape_pct'].every(k=>typeof f[k]==='number'&&Number.isFinite(f[k])&&f[k]>=0)))return false;
 }
 return true;
}
function forecastIsConsistent(doc,snapshot,today=todayIST()){
 if(!doc||doc.schema_version!==1||doc.status!=='experimental'||
   !snapshot?.india||!iso(doc.target_date)||doc.target_date<today||
   !iso(doc.based_on_date)||doc.based_on_date!==snapshot.india.date||
   doc.based_on_session!==snapshot.india.session||doc.target_date<=doc.based_on_date||
   age(snapshot.india.date,today)>7)return false;
 const days=(Date.parse(doc.target_date+'T00:00:00Z')-
  Date.parse(today+'T00:00:00Z'))/86400000;
 if(days>14)return false;
 if(doc.forecast_mode==='market_adjusted'&&!marketForecastMatches(doc,snapshot))return false;
 const mapped={gold24:'gold24_inr_10g',gold22:'gold22_inr_10g',silver:'silver999_inr_kg'};
 return Object.entries(mapped).every(([metal,key])=>{
  const v=doc.metals?.[metal];
  if(v?.backtest?.status==='walk_forward'&&(!['holdout_mape_pct','holdout_naive_mape_pct'].every(k=>
    typeof v.backtest[k]==='number'&&Number.isFinite(v.backtest[k])&&v.backtest[k]>=0)||
    typeof v.backtest.holdout_beats_naive!=='boolean'))return false;
  const p=v?.range_profile;
  if(p&&(!Number.isInteger(p.holdout_samples)||p.holdout_samples<=0||
    !Number.isInteger(p.holdout_covered)||p.holdout_covered<0||p.holdout_covered>p.holdout_samples||
    typeof p.holdout_coverage_pct!=='number'||!Number.isFinite(p.holdout_coverage_pct)||
    Math.abs(p.holdout_coverage_pct-p.holdout_covered/p.holdout_samples*100)>.11))return false;
  return v&&['estimate','baseline','low','high'].every(k=>
   typeof v[k]==='number'&&Number.isFinite(v[k])&&v[k]>0)&&
   v.baseline===snapshot.india[key]&&v.low<v.estimate&&v.estimate<v.high&&
   Math.abs(v.estimate/v.baseline-1)<.2;
 });
}
const api=Object.freeze({iso,todayIST,validIndia,market,history,funds,cities,forecastHistory,forecastIsConsistent});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.NextRateDataQuality=api;
})(typeof window==='undefined'?globalThis:window);
