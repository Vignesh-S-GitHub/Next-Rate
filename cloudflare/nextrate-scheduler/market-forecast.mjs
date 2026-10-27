// Market-implied next-publication projection. This is an explicit parity model,
// not a fitted ML model or a claim to forecast overnight world prices.
import {validDay,validRates,FIELDS,isoDay,ageDays,IBJA} from './market.mjs';
const CODES={gold24:[FIELDS[0],'XAU',100],gold22:[FIELDS[1],'XAU',100],silver:[FIELDS[2],'XAG',500]};
const zoned=s=>typeof s==='string'&&/(?:Z|[+-]\d\d:\d\d)$/i.test(s)&&Number.isFinite(Date.parse(s));
const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
function sourceURL(value){try{return new URL(value).origin;}catch{return null;}}
function validInputs(latest,at,fresh=false){
 const stamp=Date.parse(at),checked=Date.parse(latest?.checked_at);
 if(!Number.isFinite(stamp)||!zoned(latest?.checked_at)||checked>stamp+60000||stamp-checked>90*60000)return false;
 if(!validRates(latest.india)||!validDay(latest.india.date)||latest.india.date>isoDay(at)||
   !['AM','PM'].includes(latest.india.session)||latest.india.date>isoDay(latest.checked_at)||ageDays(isoDay(at),latest.india.date)>5)return false;
 for(const sym of ['XAU','XAG']){
  const quote=latest.spot?.[sym],asof=Date.parse(quote?.as_of);
  if(!positive(quote?.usd_per_troy_ounce)||!zoned(quote?.as_of)||asof>checked+60000||
    checked-asof>90*60000||!sourceURL(quote.source_url))return false;
 }
 const fx=latest.fx;
 if(!positive(fx?.inr_per_usd)||fx.inr_per_usd<=20||fx.inr_per_usd>=250||!validDay(fx.date)||fx.date>isoDay(at)||
   ageDays(isoDay(at),fx.date)>5||!sourceURL(fx.source_url))return false;
 return !fresh||['xau','xag','usd_inr'].every(k=>latest.sources_checked?.[k]==='ok');
}
export function anchorKey(india){return india?.date+':'+india?.session;}
export function validAnchor(row){
 return row?.schema_version===1&&row.id===anchorKey(row.india)&&zoned(row.available_at)&&
  validInputs({...row,checked_at:row.available_at},row.available_at)&&row.india.source_url===IBJA;
}
export function captureAnchors(previous,latest,existing=[]){
 const byKey=new Map(existing.filter(validAnchor).map(r=>[r.id,r]));
 // Bootstrap only an actual saved, coupled publication. Never reconstruct a
 // historical same-time observation by joining unrelated dates or later quotes.
 for(const snapshot of [previous,latest]){
  if(snapshot?.sources_checked?.ibja!=='ok'||!validInputs(snapshot,snapshot.checked_at,true)||snapshot.india.source_url!==IBJA)continue;
  const id=anchorKey(snapshot.india);if(byKey.has(id))continue;
  byKey.set(id,{schema_version:1,id,available_at:snapshot.checked_at,
   india:structuredClone(snapshot.india),spot:structuredClone(snapshot.spot),fx:structuredClone(snapshot.fx)});
 }
 return [...byKey.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
const quantile=(values,q)=>{const a=[...values].sort((a,b)=>a-b),i=(a.length-1)*q,l=Math.floor(i);return a[l]+(a[Math.ceil(i)]-a[l])*(i-l);};
function scenario(history,key,point,step){
 const rows=[...new Map(history.filter(r=>r.session==='PM'&&validDay(r.date)&&positive(r[key])).map(r=>[r.date,r])).values()].sort((a,b)=>a.date.localeCompare(b.date));
 const moves=rows.slice(1).map((r,i)=>Math.abs(r[key]/rows[i][key]-1)).slice(-90);
 const width=moves.length>=10?Math.max(.001,Math.min(.15,quantile(moves,.8))):null;
 if(width===null)return null;
 const low=Math.max(step,Math.floor(point*(1-width)/step)*step),high=Math.ceil(point*(1+width)/step)*step;
 return {low:low>=point?low-step:low,high:high<=point?high+step:high,
  half_width:width,sample_size:moves.length,
  method:'80th percentile of past absolute IBJA daily moves. Descriptive scenario, not a calibrated prediction interval.'};
}
function forwardEvidence(issued,code,now){
 const dates=new Map();
 for(const row of issued){
  if(row.model_version!==4||row.forecast_mode!=='market_adjusted'||!row.evaluation||
   row.evaluation.actual_date!==row.target_date||row.target_date>isoDay(now)||
   (row.evaluation.evaluated_at&&Date.parse(row.evaluation.evaluated_at)>Date.parse(now))||
   !zoned(row.issued_at)||!validDay(row.target_date)||Date.parse(row.issued_at)>=Date.parse(row.target_date+'T00:00:00+05:30'))continue;
  const m=row.metals?.[code],a=row.evaluation.metals?.[code]?.actual;
  if(!m||!positive(a)||!positive(m.baseline)||!positive(m.estimate))continue;
  const old=dates.get(row.target_date);if(!old||row.issued_at>old.issued_at)dates.set(row.target_date,row);
 }
 const scored=[...dates.values()].map(row=>{const m=row.metals[code],a=row.evaluation.metals[code].actual;return {market:Math.abs(m.estimate-a)/a*100,baseline:Math.abs(m.baseline-a)/a*100};});
 const avg=k=>scored.reduce((n,r)=>n+r[k],0)/scored.length;
 return {status:scored.length>=20?'available':'collecting',independent_target_dates:scored.length,
  market_mape_pct:scored.length?Number(avg('market').toFixed(3)):null,
  baseline_mape_pct:scored.length?Number(avg('baseline').toFixed(3)):null,
  note:'Forward results from forecasts saved before the target day. Latest saved issue per target date; no historical simulation is presented as live accuracy.'};
}
export function adjustForecast(base,latest,anchors,history,issued,now){
 if(base.status!=='experimental')return base;
 const fallback=reason=>({...base,model_version:4,forecast_mode:'baseline',market_model:{status:'waiting_inputs',reason,
   method:'market_parity_v1',assumptions:['The market-adjusted model needs a verified paired benchmark and fresh source checks.']}});
 if(!validInputs(latest,now,true))return fallback('Fresh gold, silver or USD/INR source checks are unavailable. Showing the IBJA-history fallback.');
 const anchor=anchors.find(r=>r.id===anchorKey(latest.india)&&validAnchor(r));
 if(!anchor||Date.parse(anchor.available_at)>Date.parse(latest.checked_at)||FIELDS.some(k=>anchor.india[k]!==latest.india[k]))return fallback('A comparable market snapshot for this IBJA publication is not available yet.');
 const spot=latest.spot,fx=latest.fx,reference=anchor.spot;
 if(['XAU','XAG'].some(s=>sourceURL(spot[s].source_url)!==sourceURL(reference[s].source_url)||
   Date.parse(spot[s].as_of)<Date.parse(reference[s].as_of))||
   sourceURL(fx.source_url)!==sourceURL(anchor.fx.source_url)||fx.date<anchor.fx.date)
  return fallback('Market sources or observation times changed; an incompatible comparison was withheld.');
 const fxRatio=fx.inr_per_usd/anchor.fx.inr_per_usd,metals={};
 const inputs={};
 for(const [code,[key,symbol,step]]of Object.entries(CODES)){
  const metalRatio=spot[symbol].usd_per_troy_ounce/reference[symbol].usd_per_troy_ounce;
  const factor=metalRatio*fxRatio;
  if(!Number.isFinite(factor)||Math.abs(factor-1)>=.15)return fallback('Unusual market movement exceeds this experimental model’s supported range.');
  const point=Math.round(latest.india[key]*factor),band=scenario(history.filter(r=>r.date<=latest.india.date),key,point,step);
  if(!band)return fallback('At least ten past daily IBJA moves are needed for an honest scenario band.');
  const evidence=forwardEvidence(issued,code,now),difference=point-latest.india[key];
  metals[code]={...base.metals[code],baseline:latest.india[key],estimate:point,low:band.low,high:band.high,
   expected_change_pct:Number((difference/latest.india[key]*100).toFixed(2)),direction:difference>0?'Up':difference<0?'Down':'Mostly steady',
   model_name:'market_parity',model_version:4,
   description:'Last verified IBJA rate adjusted by observed same-provider global metal and USD/INR ratios since its first paired source check.',
   backtest:{status:'forward_only'},range_profile:null,range_label:'Scenario range',interval_calibrated:false,
   wider_range:{low:band.low,high:band.high,method:band.method},scenario_basis:band,forward_evidence:evidence,
   drivers:{metal_change_pct:(metalRatio-1)*100,fx_change_pct:(fxRatio-1)*100,
    metal_contribution_inr:latest.india[key]*(metalRatio-1),fx_contribution_inr:latest.india[key]*metalRatio*(fxRatio-1)}};
  inputs[code]={symbol,reference_usd_oz:reference[symbol].usd_per_troy_ounce,current_usd_oz:spot[symbol].usd_per_troy_ounce,
   reference_as_of:reference[symbol].as_of,current_as_of:spot[symbol].as_of,source_url:spot[symbol].source_url};
 }
 return {...base,model_version:4,forecast_mode:'market_adjusted',metals,
  market_model:{status:'active',method:'market_parity_v1',reference_checked_at:anchor.available_at,
   current_checked_at:latest.checked_at,inputs,fx:{reference:anchor.fx.inr_per_usd,current:fx.inr_per_usd,
    reference_date:anchor.fx.date,current_date:fx.date,source_url:fx.source_url},
   assumptions:['Global metal and FX levels hold until the next IBJA publication.','Domestic taxes and the local market premium remain unchanged.',
    'Reference market quotes were captured at the first verified benchmark check, not at an assumed IBJA publication time.'],
   limitations:['This is an experimental market-implied projection, not a fitted or proven predictive model.','MCX, COMEX and LBMA feeds are not connected.','The FX feed is a dated daily reference, not an intraday trade quote.']},
  validation:{status:'forward_collecting',model_version:4,description:'Market-implied parity assumption; forward errors are measured against actual target-date PM closes.'},
  signal_summary:[{factor:'Global metal movement',used:true},{factor:'USD/INR movement',used:true},{factor:'IBJA benchmark and historical moves',used:true}]};
}

// Keep independent target-day evidence in the browser cache even when a day
// has several market editions. Every original edition remains permanently in D1.
export function forecastCache(rows,today){
 const byDay=new Map(),keep=new Map();
 for(const row of [...rows].sort((a,b)=>String(a.issued_at||'').localeCompare(String(b.issued_at||'')))){
  if(!validDay(row.target_date)||ageDays(today,row.target_date)>100)continue;
  if(zoned(row.issued_at)&&Date.parse(row.issued_at)<Date.parse(row.target_date+'T00:00:00+05:30'))
   byDay.set(row.target_date+':'+(row.model_version||1)+':'+(row.forecast_mode||'legacy'),row);
 }
 for(const row of [...byDay.values(),...rows.slice(-12)])keep.set(row.issuance_key,row);
 return [...keep.values()].sort((a,b)=>a.target_date.localeCompare(b.target_date)||String(a.issued_at).localeCompare(String(b.issued_at)));
}
