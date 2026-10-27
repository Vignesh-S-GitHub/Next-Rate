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
function resaleQuote({ratePer10g,grams,purity=22,deductionPct=2,fixedFee=0}) {
 const rate=number(ratePer10g,1,1e8),weight=number(grams,.01,10000);
 const karat=number(purity,9,24),deduct=number(deductionPct,0,100,true),fee=number(fixedFee,0,1e7,true);
 const metal=rate*weight/10,discount=metal*deduct/100;
 return {metal:round(metal),deduction:round(discount),fixedFee:round(fee),
         proceeds:round(Math.max(0,metal-discount-fee)),purity:karat};
}
function premium(quote,nav) {
 return round((number(quote,0.01,1e7)/number(nav,0.01,1e7)-1)*100);
}
function isoDay(value) {
 if(typeof value!=='string'||!/^20\d{2}-\d\d-\d\d$/.test(value))return '';
 const d=new Date(value+'T00:00:00Z');
 return Number.isFinite(+d)&&d.toISOString().slice(0,10)===value?value:'';
}
function prospective(e){
 if(!isoDay(e?.target_date)||!isoDay(e?.based_on_date)||e.based_on_date>=e.target_date)return false;
 if(typeof e.issued_at!=='string'||!/(?:Z|[+-]\d\d:\d\d)$/i.test(e.issued_at))return false;
 const issued=Date.parse(e.issued_at),cutoff=Date.parse(e.target_date+'T00:00:00+05:30');
 return Number.isFinite(issued)&&issued<cutoff;
}
function publishedChange(snapshot,history,metal,days=0){
 const field={gold24:'gold24_inr_10g',gold22:'gold22_inr_10g',silver:'silver999_inr_kg'}[metal];
 const current=snapshot?.india,value=current?.[field];
 if(!field||!isoDay(current?.date)||!Number.isFinite(value)||value<=0||![0,7,30,90].includes(days))return null;
 // Calendar periods end at the displayed publication, never at an unseen or
 // estimated price. Holidays use the latest actual publication on/before cutoff.
 const cutoff=days?new Date(Date.parse(current.date+'T00:00:00Z')-days*86400000).toISOString().slice(0,10):current.date;
 const prior=(Array.isArray(history?.india)?history.india:[])
  .filter(r=>isoDay(r?.date)&&r.date<current.date&&r.date<=cutoff&&['AM','PM'].includes(r.session)&&Number.isFinite(r[field])&&r[field]>0)
  .sort((a,b)=>a.date.localeCompare(b.date)||(a.session==='PM'?1:0)-(b.session==='PM'?1:0)).at(-1);
 if(!prior)return null;
 const amount=value-prior[field];
 return {amount,percent:amount/prior[field]*100,previous:prior[field],days,cutoffDate:cutoff,
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
// Migrate only supported preferences and ETF quotes from older saved versions.
function storedState(input){
 const empty={etfQuotes:{},preferred:'resale'};
 if(!input||![1,2].includes(input.version))return empty;
 const names=['goldbees','hdfcgold','sbigold','silveretf','hdfcsilver','goldfund','silverfund'];
 for(const key of names){
  const row=input.etfQuotes?.[key];
  if(row&&typeof row.quote==='number'&&Number.isFinite(row.quote)&&row.quote>=.01&&row.quote<=1e7&&isoDay(row.date)&&ageDays(row.date)>=0)
   empty.etfQuotes[key]={quote:row.quote,date:row.date};
 }
 if(['resale','hallmark','etfs'].includes(input.preferred))empty.preferred=input.preferred;
 return empty;
}
const api=Object.freeze({money,esc,number,round,publishedRate,resaleQuote,premium,
 publishedChange,forecastCheck,ageDays,storedState});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.NextRateCore=api;
})(typeof window==='undefined'?globalThis:window);
