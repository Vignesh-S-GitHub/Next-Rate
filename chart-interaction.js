/* NextRate chart interaction: pure date/price selection and hit testing.
 * Dated IBJA observations only; a projection is never an actual data point. */
(function(root){
'use strict';
const FIELDS=Object.freeze({
 gold24:'gold24_inr_10g',gold22:'gold22_inr_10g',silver:'silver999_inr_kg'
});
const X_FIRST=55,X_LAST=480,X_PROJECTION=590,X_SEPARATOR=533;
function observations(history,forecast,metal,days=7){
 const key=FIELDS[metal];
 if(!key||!forecast||!/^\d{4}-\d\d-\d\d$/.test(forecast.based_on_date||''))return [];
 const anchor=Date.parse(forecast.based_on_date+'T00:00:00Z');
 if(!Number.isFinite(anchor))return [];
 const span=Math.max(2,Math.min(90,Math.trunc(days)||7));
 const start=new Date(anchor-(span-1)*86400000).toISOString().slice(0,10);
 const cleaned=new Map();
 const values=Array.isArray(history?.india)?history.india:[];
 for(const r of values){
  if(!r||typeof r.date!=='string'||r.date<start||r.date>forecast.based_on_date)continue;
  if(!Number.isFinite(r[key])||r[key]<=0)continue;
  const prior=cleaned.get(r.date);
  if(!prior||r.session==='PM'&&prior.session!=='PM')cleaned.set(r.date,r);
 }
 return [...cleaned.values()].sort((a,b)=>a.date.localeCompare(b.date))
  .map(r=>({date:r.date,value:r[key],session:r.session||'PM'}));
}
function clampIndex(index,n){
 const i=Number(index);
 return Math.max(0,Math.min(n,Number.isFinite(i)?Math.round(i):Math.max(0,n-1)));
}
function indexForDate(rows,date,forecastDate){
 if(date===forecastDate)return rows.length;
 const found=rows.findIndex(r=>r.date===date);
 return found<0?Math.max(0,rows.length-1):found;
}
function xForIndex(index,n){
 return index>=n?X_PROJECTION:X_FIRST+(X_LAST-X_FIRST)*index/Math.max(1,n-1);
}
function indexAtX(x,n){
 if(!Number.isFinite(x)||n<=0)return 0;
 if(x>=X_SEPARATOR)return n;
 return clampIndex((x-X_FIRST)/(X_LAST-X_FIRST)*(n-1),n-1);
}
function displayPoint(rows,forecast,metal,index){
 const n=rows.length;
 const value=forecast?.metals?.[metal];
 if(index>=n){
  return value&&Number.isFinite(value.estimate)?{
   kind:'prediction',date:forecast.target_date,value:value.estimate,
   low:value.low,high:value.high,unit:metal==='silver'?'1 kg':'10 g',
   model:value.model_name||'unknown'
  }:null;
 }
 const row=rows[index];
 if(!row)return null;
 return {kind:'actual',date:row.date,value:row.value,session:row.session,
   unit:metal==='silver'?'1 kg':'10 g'};
}
const api=Object.freeze({observations,clampIndex,indexForDate,indexAtX,xForIndex,displayPoint,
 X_FIRST,X_LAST,X_PROJECTION,X_SEPARATOR});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.NextRateChart=api;
})(typeof window==='undefined'?globalThis:window);
