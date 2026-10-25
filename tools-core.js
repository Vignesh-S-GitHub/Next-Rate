/*
 * NextRate independent tools: pure formulas, input validation and local data.
 * All money is INR. This file makes no network calls and never invents quotes.
 * Reference sources:
 * GST Council jewellery FAQ: 3% on TOTAL transaction including making.
 * BIS Care: https://www.bis.gov.in/bis-apps/?lang=en
 */
(function(root){
 'use strict';
 const fmt=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2,minimumFractionDigits:0});
 const GRAM_OZ=31.1034768;
 const GST=.03;
 const MIN=0;
 function valid(value,label,min=0,max=100000000){
   if(value===null||value===undefined||typeof value==='boolean'||(typeof value==='string'&&!value.trim()))throw new RangeError(label+' required');
   const n=Number(value);
   if(!Number.isFinite(n)||n<min||n>max)throw new RangeError('Invalid '+label);
   return n;
 }
 function money(n){return Number.isFinite(n)?fmt.format(n):'—'}
 function round(v){return Math.round((v+Number.EPSILON)*100)/100}
 function metalRate(benchmark,metal){
   const field=metal==='gold24'?'gold24_inr_10g':metal==='gold22'?'gold22_inr_10g':metal==='silver'?'silver999_inr_kg':null;
   if(!field)throw new RangeError('Invalid metal');
   if(!benchmark||!Number.isFinite(benchmark[field])||benchmark[field]<=0)return null;
   return benchmark[field]/(metal==='silver'?1000:10);
 }
 function jewelleryBill({ratePerGram,grams,wastagePct=0,makingMode='flat',making=0,gstRate=3}){
   const rate=valid(ratePerGram,'rate per gram',.01,1000000);
   const weight=valid(grams,'grams',.01,100000);
   const waste=valid(wastagePct,'wastage percent',0,100);
   const make=valid(making,'making charges',0,10000000);
   const gstPct=valid(gstRate,'GST percent',0,100);
   if(!['flat','percent'].includes(makingMode))throw new RangeError('Invalid making mode');
   const metal=round(rate*weight);
   const wastage=round(metal*waste/100);
   const makingCharge=round(makingMode==='percent'?metal*make/100:make);
   const taxable=round(metal+wastage+makingCharge);
   const tax=round(taxable*gstPct/100);
   return {metal,wastage,makingCharge,taxable,gst:tax,total:round(taxable+tax),weight,
     note:'3% GST on total jewellery transaction (metal + wastage + making), not 5% on making'};
 }
 function buyback({ratePerGram,grams,purityFactor=1,deductionPct=0,spreadPct=0,fee=0}){
   const rate=valid(ratePerGram,'buyback benchmark',.01,1000000);
   const mass=valid(grams,'grams',.01,100000);
   const purity=valid(purityFactor,'purity factor',.01,1);
   const deduction=valid(deductionPct,'deduction percent',0,100);
   const spread=valid(spreadPct,'dealer discount percent',0,100);
   const charges=valid(fee,'dealer fee',0,10000000);
   const gross=round(rate*mass*purity);
   const melt=round(gross*deduction/100);
   const discount=round((gross-melt)*spread/100);
   return {gross,melt,discount,fee:charges,estimatedCredit:Math.max(0,round(gross-melt-discount-charges))};
 }
 function exchangeBill(newJewellery,oldBuyback){
   if(!newJewellery||!oldBuyback)throw new RangeError('Missing exchange values');
   const purchase=valid(newJewellery.total,'new jewellery total');
   const credit=valid(oldBuyback.estimatedCredit,'old jewellery credit');
   return {netPayable:round(Math.max(0,purchase-credit)),surplusCredit:round(Math.max(0,credit-purchase))};
 }
 function impliedSpotInr(spot,fx){
   const usd=valid(spot,'spot USD/oz',.01,1000000),inr=valid(fx,'USD/INR',.01,500);
   return round(usd*inr/GRAM_OZ*10);
 }
 function percentDiff(last,nav){
   const p=valid(last,'exchange market price',.01,100000),n=valid(nav,'published NAV',.01,100000);
   return round((p/n-1)*100);
 }
 function statusMatch(alert,quotes){
   const v=quotes?.[alert?.key];
   if(!Number.isFinite(v)||v<=0)return false;
   if(!['below','above'].includes(alert.direction))return false;
   const threshold=Number(alert.threshold);
   if(!Number.isFinite(threshold)||threshold<=0)return false;
   return alert.direction==='below'?v<=threshold:v>=threshold;
 }
 function alertKey(metal,weight,city){
   if(!['gold24','gold22','silver'].includes(metal))throw new RangeError('Invalid alert metal');
   const grams=valid(weight,'grams',.01,100000);
   return [metal,String(grams),String(city||'India')].join(':');
 }
 function accuracy(records,metal,minimum=1){
   if(!['gold24','gold22','silver'].includes(metal))throw new RangeError('Invalid metal');
   const graded=[];
   for(const issuance of Array.isArray(records)?records:[]){
     const ev=issuance?.evaluation?.metals?.[metal];
     const pred=issuance?.metals?.[metal];
     if(!ev||!pred||!Number.isFinite(ev.actual)||ev.actual<=0||
        !Number.isFinite(pred.estimate)||pred.estimate<=0)continue;
     if(!issuance.target_date||ev.actual_date!==issuance.target_date)continue;
     graded.push({date:issuance.target_date,actual:ev.actual,prediction:pred.estimate,
       baseline:pred.baseline,
       errorPct:100*Math.abs(pred.estimate-ev.actual)/ev.actual,
       baselineErrorPct:Number.isFinite(pred.baseline)&&pred.baseline>0?
         100*Math.abs(pred.baseline-ev.actual)/ev.actual:null,
       covered:Number.isFinite(pred.low)&&Number.isFinite(pred.high)?
          ev.actual>=pred.low&&ev.actual<=pred.high:null});
   }
   const n=graded.length;
   if(n<minimum)return {n,status:'insufficient',graded};
   const mean=fn=>round(graded.reduce((sum,v)=>sum+fn(v),0)/n);
   const base=graded.filter(v=>v.baselineErrorPct!==null);
   const baselineMape=base.length?round(base.reduce((t,v)=>t+v.baselineErrorPct,0)/base.length):null;
   const selected=mean(v=>v.errorPct);
   return {n,status:'evaluated',mape:selected,baselineMape,
     beatsNaive:baselineMape===null?null:selected<baselineMape,
     rangeCovered:graded.filter(v=>v.covered===true).length,graded};
 }
 function holdingValue(entry,quotes){
   const units=valid(entry.quantity,'holding quantity',.001,10000000);
   const invested=valid(entry.paid,'purchase total',.01,1000000000);
   const type=entry.type;
   const keys={gold24:'gold24',gold22:'gold22',silver:'silver'};
   let quote=null,note='';
   if(keys[type]){
     quote=quotes?.[keys[type]];
     note='IBJA metal reference; taxes/making/premiums/resale deductions excluded';
   }else if(type==='etf' || type==='fund'){
     quote=quotes?.fundNav?.[entry.scheme];
     note='AMFI NAV per unit; not executable exchange price';
   }
   if(!Number.isFinite(quote)||quote<=0)return {invested,quantity:units,value:null,pnl:null,note:'No dated benchmark'};
   const value=round(quote*units);
   return {invested,quantity:units,value,pnl:round(value-invested),note};
 }
 function buildQuotes({india,funds,cityRates,city}){
   const values={
     gold24:metalRate(india,'gold24'),
     gold22:metalRate(india,'gold22'),
     silver:metalRate(india,'silver'),
     fundNav:{}
   };
   for(const [id,f] of Object.entries(funds?.funds||{})){
     if(Number.isFinite(f.nav_inr_per_unit)&&f.nav_inr_per_unit>0)values.fundNav[id]=f.nav_inr_per_unit;
   }
   if(city && cityRates?.cities?.[city]){
     const c=cityRates.cities[city];
     values.cityGold24=Number.isFinite(c.gold24_inr_g)?c.gold24_inr_g:null;
     values.cityGold22=Number.isFinite(c.gold22_inr_g)?c.gold22_inr_g:null;
   }
   return values;
 }
 function localRead(key,fallback=[]){
   try{
     if(!root.localStorage)return fallback;
     const v=JSON.parse(root.localStorage.getItem('nextrate-v1-'+key)||'null');
     return Array.isArray(v)?v:fallback;
   }catch{return fallback}
 }
 function localWrite(key,rows){
   if(!Array.isArray(rows)||rows.length>300)throw new RangeError('Too many local records');
   if(!root.localStorage)throw new Error('Browser storage unavailable');
   root.localStorage.setItem('nextrate-v1-'+key,JSON.stringify(rows));
 }
 const api=Object.freeze({money,valid,round,metalRate,jewelleryBill,buyback,
   exchangeBill,impliedSpotInr,percentDiff,statusMatch,alertKey,accuracy,
   holdingValue,buildQuotes,localRead,localWrite,GST,GRAM_OZ});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.NextRateTools=api;
})(typeof window==='undefined'?globalThis:window);
