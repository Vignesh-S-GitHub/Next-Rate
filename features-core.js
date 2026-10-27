/* NextRate feature calculations.
 * No price feeds, user secrets or side effects; designed for Node tests.
 * Quotes entered by a user are ALWAYS manual and never "verified".
 */
(function(root) {
'use strict';
const INR=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:0,maximumFractionDigits:2});
function money(amount) {
 return typeof amount==='number'&&Number.isFinite(amount)?INR.format(amount):'—';
}
function esc(value) {
 return String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function number(value,lower=0,upper=1e9,allowZero=false) {
 if(typeof value==='string'&&!value.trim())throw new RangeError('Enter a number');
 if(value===null||value===undefined||typeof value==='boolean')throw new RangeError('Enter a number');
 const n=Number(value);
 if(!Number.isFinite(n)||n<lower||n>upper||(!allowZero&&n===0))throw new RangeError('Check the value entered');
 return n;
}
function round(n) {return Math.round((n+Number.EPSILON)*100)/100;}
function publishedRate(snapshot,metal) {
 const market=snapshot?.india||{};
 const field={gold24:'gold24_inr_10g',gold22:'gold22_inr_10g',silver:'silver999_inr_kg'}[metal];
 if(!field)return null;
 const v=market[field];
 return typeof v==='number'&&Number.isFinite(v)&&v>0?v:null;
}
function bullionValue(snapshot,metal,grams) {
 const rate=publishedRate(snapshot,metal);
 if(rate===null)return null;
 return round(rate*number(grams,.01,100000)/(metal==='silver'?1000:10));
}
function jewelleryBill({ratePer10g,grams,wastagePct=0,makingPct=0,makingFlat=0,gstPct=3}) {
 const rate=number(ratePer10g,1,1e8),weight=number(grams,.01,10000);
 const wastage=number(wastagePct,0,35,true),making=number(makingPct,0,100,true);
 const fixed=number(makingFlat,0,1e7,true),gst=number(gstPct,0,28,true);
 const metal=rate*weight/10;
 const wastageCharge=metal*wastage/100;
 const makingCharge=(metal+wastageCharge)*making/100+fixed;
 const base=metal+wastageCharge+makingCharge;
 const tax=base*gst/100;
 return {metal:round(metal),wastage:round(wastageCharge),making:round(makingCharge),
         taxable:round(base),tax:round(tax),total:round(base+tax)};
}
function resaleQuote({ratePer10g,grams,purity=22,deductionPct=2,fixedFee=0}) {
 const rate=number(ratePer10g,1,1e8),weight=number(grams,.01,10000);
 const karat=number(purity,9,24),deduct=number(deductionPct,0,100,true),fee=number(fixedFee,0,1e7,true);
 const metal=rate*weight/10,discount=metal*deduct/100;
 return {metal:round(metal),deduction:round(discount),fixedFee:round(fee),
         proceeds:round(Math.max(0,metal-discount-fee)),purity:karat};
}
function manualShopBill({ratePerGram,grams,makingPct=0,makingFlat=0,wastagePct=0}) {
 const rate=number(ratePerGram,1,1e7),weight=number(grams,.01,10000);
 return jewelleryBill({ratePer10g:rate*10,grams:weight,makingPct,makingFlat,wastagePct,gstPct:3});
}
function holdingValuation(entry,ctx) {
 if(!entry || typeof entry!=='object')return null;
 const kind=entry.kind;
 const count=number(entry.qty,.001,100000);
 let value=null,source='',asOf='';
 if(['gold24','gold22','silver'].includes(kind)){
   value=bullionValue(ctx.rates,kind,count);
   source='IBJA metal value; excludes selling deductions';asOf=ctx.rates?.india?.date||'';
 }else{
   const record=ctx.funds?.funds?.[kind];
   if(record&&Number.isFinite(record.nav_inr_per_unit)&&record.nav_inr_per_unit>0){
     value=round(record.nav_inr_per_unit*count);
     source='AMFI NAV; ETF exchange trade price differs';asOf=record.nav_date;
   }
 }
 if(value===null)return {value:null,pnl:null,source,asOf};
 return {value,pnl:round(value-number(entry.paid,0,1e10,true)),source,asOf};
}
function premium(quote,nav) {
 return round((number(quote,0.01,1e7)/number(nav,0.01,1e7)-1)*100);
}
function alertObservationDate(rule,ctx){
 if(rule?.source==='city')return ctx?.cities?.dates?.[rule.metal==='silver'?'silver':'gold']||null;
 return ctx?.rates?.india?.date||null;
}
function alertValue(rule,ctx) {
 const qty=number(rule.grams,.01,100000);
 if(rule?.source==='city'){
   const row=ctx?.cities?.cities?.[rule.city];
   const field={gold24:'gold24_inr_g',gold22:'gold22_inr_g',silver:'silver999_inr_kg'}[rule.metal];
   const rate=field?row?.[field]:null;
   return Number.isFinite(rate)&&rate>0?round(rate*qty/(rule.metal==='silver'?1000:1)):null;
 }
 return bullionValue(ctx.rates,rule.metal,qty);
}
function triggered(rule,ctx){
 const current=alertValue(rule,ctx);
 if(current===null)return null;
 const target=number(rule.target,0.01,1e9);
 return {current,hit:rule.op==='below'?current<=target:current>=target};
}
function historicalAccuracy(entries,metal,modelVersion=null) {
 // One realised closing price per target day is one independent outcome.
 // Later revisions (especially the current model version) supersede older
 // issuances for accuracy totals; the audit list still retains every issue.
 const byDay=new Map();
 const priority=e=>[
   Number(e.model_version)||1,e.based_on_date||'',
   e.based_on_session==='PM'?1:0,e.issued_at||''
 ];
 const newer=(a,b)=>{
  const x=priority(a),y=priority(b);
  for(let i=0;i<x.length;i++){
   if(x[i]!==y[i])return x[i]>y[i];
  }
  return false;
 };
 for(const e of Array.isArray(entries)?entries:[]){
   if(!e?.evaluation?.metals?.[metal]||!isoDay(e.target_date))continue;
   if(!prospective(e))continue;
   if(modelVersion!==null && Number(e.model_version||1)!==Number(modelVersion))continue;
   const record=e.evaluation.metals[metal];
   if(typeof record.absolute_error_pct!=='number'||
      !Number.isFinite(record.absolute_error_pct)||record.absolute_error_pct<0)continue;
   const older=byDay.get(e.target_date);
   if(!older||newer(e,older))byDay.set(e.target_date,e);
 }
 const matches=[...byDay.values()].map(e=>e.evaluation.metals[metal]);
 return {evaluated:matches.length,
   mape:matches.length?round(matches.reduce((n,v)=>n+v.absolute_error_pct,0)/matches.length):null,
   covered:matches.length?matches.filter(x=>x.range_covered).length:null,
   directionScored:matches.filter(x=>x.direction_correct!==null).length,
   directionCorrect:matches.filter(x=>x.direction_correct===true).length};
}
function isoDay(value) {return typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)?value:'';}
function prospective(e){
 if(!isoDay(e?.target_date)||!isoDay(e?.based_on_date)||e.based_on_date>=e.target_date)return false;
 if(typeof e.issued_at!=='string'||!/(?:Z|[+-]\d\d:\d\d)$/i.test(e.issued_at))return false;
 const issued=Date.parse(e.issued_at),cutoff=Date.parse(e.target_date+'T00:00:00+05:30');
 return Number.isFinite(issued)&&issued<cutoff;
}
function publishedChange(snapshot,history,metal){
 const field={gold24:'gold24_inr_10g',gold22:'gold22_inr_10g',silver:'silver999_inr_kg'}[metal];
 const current=snapshot?.india,value=current?.[field];
 if(!field||!isoDay(current?.date)||!Number.isFinite(value)||value<=0)return null;
 const prior=(Array.isArray(history?.india)?history.india:[])
  .filter(r=>isoDay(r?.date)&&r.date<current.date&&Number.isFinite(r[field])&&r[field]>0)
  .sort((a,b)=>a.date.localeCompare(b.date)||(a.session==='PM'?1:0)-(b.session==='PM'?1:0)).at(-1);
 if(!prior)return null;
 const amount=value-prior[field];
 return {amount,percent:amount/prior[field]*100,previous:prior[field],
  previousDate:prior.date,previousSession:prior.session,
  direction:amount>0?'up':amount<0?'down':'steady'};
}
function forecastCheck(entries,snapshot,today){
 // Pick the latest forecast actually issued BEFORE its target day. Never grade
 // a regenerated/hindsight forecast against a price already known at issuance.
 if(!isoDay(today))return null;
 const eligible=(Array.isArray(entries)?entries:[]).filter(e=>{
  return prospective(e)&&e.target_date<=today;
 }).sort((a,b)=>b.target_date.localeCompare(a.target_date)||
  Date.parse(b.issued_at)-Date.parse(a.issued_at));
 const entry=eligible[0];
 if(!entry)return null;
 const quote=snapshot?.india;
 const matching=quote?.date===entry.target_date;
 const scored=entry.evaluation?.actual_date===entry.target_date?entry.evaluation.metals:null;
 const final=!!scored||(matching&&quote.session==='PM');
 const provisional=!final&&matching&&quote.session==='AM';
 const metals={};
 for(const [name,field] of Object.entries({gold24:'gold24_inr_10g',gold22:'gold22_inr_10g',silver:'silver999_inr_kg'})){
  const p=entry.metals?.[name];
  if(!p||![p.estimate,p.baseline,p.low,p.high].every(v=>Number.isFinite(v)&&v>0)||p.low>p.estimate||p.high<p.estimate)continue;
  const value=scored?.[name]?.actual??(matching?quote[field]:null);
  const actual=Number.isFinite(value)&&value>0?value:null;
  const error=actual===null?null:Math.abs(p.estimate-actual);
  metals[name]={estimate:p.estimate,actual,low:p.low,high:p.high,
   errorAmount:error,errorPct:actual===null?null:error/actual*100,
   rangeCovered:actual===null?null:actual>=p.low&&actual<=p.high,
   directionCorrect:actual===null||p.estimate===p.baseline?null:
    Math.sign(p.estimate-p.baseline)===Math.sign(actual-p.baseline)};
 }
 return {targetDate:entry.target_date,status:final?'final':provisional?'provisional':'pending',metals};
}
function ageDays(iso,now=new Date()){
 if(!isoDay(iso))return Infinity;
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=name=>parts.find(v=>v.type===name)?.value;
 const today=part('year')+'-'+part('month')+'-'+part('day');
 const t=Date.parse(today+'T00:00:00Z'),d=Date.parse(iso+'T00:00:00Z');
 return Number.isFinite(t)&&Number.isFinite(d)?Math.floor((t-d)/86400000):Infinity;
}
const api=Object.freeze({money,esc,number,round,publishedRate,bullionValue,
 jewelleryBill,resaleQuote,manualShopBill,holdingValuation,premium,
 alertValue,alertObservationDate,triggered,historicalAccuracy,publishedChange,forecastCheck,ageDays});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.NextRateCore=api;
})(typeof window==='undefined'?globalThis:window);
