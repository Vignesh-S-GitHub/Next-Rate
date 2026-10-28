// Same chronological model selection and scoring rules as scripts/forecast.py.
import {HOLIDAYS,TEMPLATE} from './model-template.mjs';
import {isoDay,ageDays,FIELDS,merge} from './market.mjs';
export { HOLIDAYS };
const CONFIG={gold24:[FIELDS[0],100,.015],gold22:[FIELDS[1],100,.015],silver:[FIELDS[2],500,.028]};
const METHODS=['last_close','damped_median','momentum_3','reversion_3','moving_average'];
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const median=a=>{const b=[...a].sort((x,y)=>x-y),i=Math.floor(b.length/2);return b.length%2?b[i]:(b[i-1]+b[i])/2;};
// Python's round-to-even, including rupee point estimates.
export function rounded(v,d=0){const f=10**d,x=v*f,lo=Math.floor(x),t=x-lo;return (t===.5?(lo%2===0?lo:lo+1):Math.round(x))/f;}
const clip=(v,l,h)=>Math.max(l,Math.min(h,v));
export function estimate(prices,method) {
  const last=prices.at(-1);if(method==='last_close')return last;
  const tail=prices.slice(-8),rets=tail.slice(1).map((b,i)=>(b-tail[i])/tail[i]);if(!rets.length)return last;
  let shift;
  if(method==='damped_median')shift=median(rets.slice(-7))*.20;
  else if(method==='momentum_3')shift=mean(rets.slice(-3))*.18;
  else if(method==='reversion_3')shift=-mean(rets.slice(-3))*.16;
  else if(method==='moving_average')shift=(mean(prices.slice(-5))/last-1)*.14;
  else throw Error('Unknown forecast method');
  return last*(1+clip(shift,-.008,.008));
}
const errors=(p,m,start,stop)=>Array.from({length:stop-start},(_,j)=>{const i=start+j;return Math.abs(estimate(p.slice(0,i),m)-p[i])/p[i]*100;});
export function walkForward(p) {
  const n=p.length,split=Math.max(42,Math.floor(n*.75));
  if(n<55||n-split<12)return {status:'insufficient',selected_model:'damped_median',source_observations:n,note:n<55?'Fewer than 55 dated closes; no robust chronological backtest.':'Not enough non-overlapping validation and held-out samples.'};
  const validation=Object.fromEntries(METHODS.map(m=>[m,errors(p,m,15,split)]));
  let best=METHODS.reduce((b,m)=>mean(validation[m])<mean(validation[b])?m:b,METHODS[0]);
  const baseline=mean(validation.last_close),tail=Math.min(20,validation[best].length);
  if(best!=='last_close'&&(mean(validation[best])>=baseline*.975||mean(validation[best].slice(-tail))>=mean(validation.last_close.slice(-tail))))best='last_close';
  const out=errors(p,best,split,n),naive=errors(p,'last_close',split,n),score=rounded(mean(out),3),naiveScore=rounded(mean(naive),3);
  return {status:'walk_forward',selected_model:best,source_observations:n,validation_samples:validation[best].length,validation_mape_pct:rounded(mean(validation[best]),3),validation_naive_mape_pct:rounded(baseline,3),holdout_samples:out.length,holdout_mape_pct:score,holdout_naive_mape_pct:naiveScore,holdout_beats_naive:score<naiveScore,note:'Earlier validation selected the strategy; untouched chronological holdout used only to report error. Lower MAPE is better.'};
}
function bounds(point,width,step){let low=Math.max(step,Math.floor(point*(1-width)/step)*step),high=Math.ceil(point*(1+width)/step)*step;return [low>=point?low-step:low,high<=point?high+step:high];}
function typical(p,method,step){const n=p.length,split=Math.max(42,Math.floor(n*.75));if(n<55||n-split<12)return null;
 const residuals=[];for(let i=15;i<split;i++){const point=Math.max(1,rounded(estimate(p.slice(0,i),method)));residuals.push(Math.abs(point-p[i])/point);}
 const width=median(residuals);let covered=0;
 for(let i=split;i<n;i++){const point=Math.max(1,rounded(estimate(p.slice(0,i),method))),[l,h]=bounds(point,width,step);if(l<=p[i]&&p[i]<=h)covered++;}
 return {target_historical_coverage_pct:50,half_width:width,calibration_samples:residuals.length,holdout_samples:n-split,holdout_covered:covered,holdout_coverage_pct:rounded(covered/(n-split)*100,1),method:'Median absolute one-step error from earlier validation; outward-rounded bounds checked on later closes.'};
}
function metal(rows,anchor,code){const [key,step,minBand]=CONFIG[code],usable=rows.filter(r=>Number.isFinite(r[key])&&r[key]>0),p=usable.map(r=>r[key]);if(p.length<3)return null;
 const returns=p.slice(1).map((b,i)=>(b-p[i])/p[i]).slice(-7);if(returns.length<2)return null;
 const closes=usable.filter(r=>r.session==='PM').map(r=>r[key]),backtest=walkForward(closes),method=backtest.selected_model;
 const point=Math.max(1,rounded(estimate(p,method))),baseline=anchor[key],band=clip(Math.max(minBand,median(returns.map(Math.abs))*2),minBand,.12);
 let low=Math.max(step,Math.floor(Math.min(baseline,point)*(1-band)/step)*step),high=Math.max(step,Math.ceil(Math.max(baseline,point)*(1+band)/step)*step);if(high<=low)high=low+2*step;
 const wider={low,high,method:'Heuristic volatility scenario, not a guaranteed interval.'};
 const profile=backtest.status==='walk_forward'?typical(closes,method,step):null;
 if(profile){[low,high]=bounds(point,profile.half_width,step);wider.low=Math.min(wider.low,low);wider.high=Math.max(wider.high,high);}
 const pct=rounded((point/baseline-1)*100,2);
 return {...structuredClone(TEMPLATE.metals[code]),baseline,estimate:point,low,high,expected_change_pct:pct,direction:pct>.1?'Up':pct<-.1?'Down':'Mostly steady',scenario_width_pct:rounded(band*100,2),history_returns_used:returns.length,history_rows_used:usable.length,history_close_rows_used:closes.length,model_name:method,model_version:3,description:backtest.status==='walk_forward'?'Simple model chosen using past validation, then checked on a later held-out period.':'Short-history experimental trend without a reliable backtest.',backtest,interval_calibrated:false,range_label:profile?'Typical range':'Range',range_profile:profile,wider_range:wider};
}
const nextDay=s=>new Date(Date.parse(s)+86400000).toISOString().slice(0,10);
const weekday=s=>{const d=new Date(s).getUTCDay();return d>0&&d<6;};
export function isClosed(s){return !weekday(s)||HOLIDAYS.has(s);}
export function prospective(r){return Number.isFinite(Date.parse(r.issued_at))&&/(?:Z|[+-]\d\d:\d\d)$/i.test(r.issued_at)&&r.based_on_date<r.target_date&&isoDay(r.issued_at)<r.target_date;}
export function generate(latest,india,now){const today=isoDay(now),tomorrow=nextDay(today);let target=tomorrow;while(isClosed(target))target=nextDay(target);
 const anchor=latest.india,map=new Map(india.filter(r=>r.date<=today&&r.session==='PM'&&FIELDS.some(k=>r[k]>0)).map(r=>[r.date,r]));
 const good=anchor&&anchor.date<=today&&ageDays(today,anchor.date)<=5&&FIELDS.every(k=>Number.isFinite(anchor[k])&&anchor[k]>0);
 if(good)map.set(anchor.date,anchor);
 if(good&&today.startsWith('2026')&&!isClosed(today)&&anchor.date<today)target=today;
 const out={...structuredClone(TEMPLATE),generated_at:new Date(now).toISOString(),today_ist:today,calendar_tomorrow:tomorrow,target_date:target,holiday_calendar_verified:target.startsWith('2026'),holiday_calendar_source:target.startsWith('2026')?TEMPLATE.holiday_calendar_source:null,market_closed_tomorrow:tomorrow!==(()=>{let d=tomorrow;while(isClosed(d))d=nextDay(d);return d;})(),status:'unavailable',metals:{},signal_summary:[]};
 for(const k of ['based_on_date','based_on_session','observations','validation','issuance_key','accuracy_tracking','reason'])delete out[k];
 if(!out.holiday_calendar_verified){out.reason='The IBJA holiday calendar for the next publication year is not verified.';return out;}
 if(!good){out.reason='Last valid Indian benchmark is missing or over five days old.';return out;}
 const rows=[...map.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-365);
 Object.assign(out,{based_on_date:anchor.date,based_on_session:anchor.session||'last',observations:rows.length});
 if(rows.length<3){out.reason='At least three dated IBJA observations are required.';return out;}
 const metals=Object.fromEntries(Object.keys(CONFIG).map(k=>[k,metal(rows,anchor,k)]));
 if(Object.values(metals).some(x=>!x)){out.reason='Insufficient consistent IBJA changes for an estimate.';return out;}
 const tested=Object.values(metals).filter(x=>x.backtest.status==='walk_forward').length;
 return {...out,status:'experimental',metals,signal_summary:structuredClone(TEMPLATE.signal_summary),validation:{status:tested===3?'walk_forward':tested?'partial_walk_forward':'not_backtested',observations:rows.length,model_version:3,tested_metals:tested,description:'Time-ordered train, validation and untouched holdout per metal. Models may still lose to last-close.'}};
}
export function publishForecast(latest,india,previous,now,options={}){
 const issued=structuredClone(previous),actuals=new Map(india.map(r=>[r.date,r]));
 for(const r of issued){if(r.evaluation||!prospective(r)||r.target_date>isoDay(now))continue;const obs=actuals.get(r.target_date);if(!obs||obs.session!=='PM')continue;
  const metals={};for(const [name,[key]]of Object.entries(CONFIG)){const m=r.metals?.[name],a=obs[key];if(!m||!(a>0))continue;metals[name]={actual:a,absolute_error_pct:rounded(Math.abs(m.estimate-a)/a*100,3),range_covered:m.low<=a&&a<=m.high,direction_correct:m.estimate===m.baseline?null:Math.sign(m.estimate-m.baseline)===Math.sign(a-m.baseline)};}
  if(Object.keys(metals).length)r.evaluation={evaluated_at:new Date(now).toISOString(),actual_date:r.target_date,metals};
 }
 const fresh=options.adjust?options.adjust(generate(latest,india,now),issued):generate(latest,india,now);
 if(fresh.status==='experimental'){
  const version=fresh.model_version||3;
  fresh.issuance_key=version===4?`v4:${fresh.target_date}:${fresh.based_on_date}:${fresh.based_on_session}:${fresh.forecast_mode}:${latest.checked_at}`:`v3:${fresh.target_date}:${fresh.based_on_date}:${fresh.based_on_session}`;
  if(!issued.some(r=>r.issuance_key===fresh.issuance_key))issued.push({issuance_key:fresh.issuance_key,model_version:version,issued_at:new Date(now).toISOString(),target_date:fresh.target_date,based_on_date:fresh.based_on_date,based_on_session:fresh.based_on_session,metals:fresh.metals,...(version===4?{forecast_mode:fresh.forecast_mode,market_model:fresh.market_model}:{})});
  const chosen=new Map();for(const r of [...issued].sort((a,b)=>(a.based_on_date+(a.based_on_session==='PM'?'1':'0')+a.issued_at).localeCompare(b.based_on_date+(b.based_on_session==='PM'?'1':'0')+b.issued_at)))if((r.model_version||1)===version&&(version!==4||r.forecast_mode==='market_adjusted')&&r.evaluation&&prospective(r))chosen.set(r.target_date,r);
  const rows=[...chosen.values()],minimum=version===4?20:10;fresh.accuracy_tracking={evaluated_issuances:rows.length,independent_target_dates:rows.length,model_version:version,status:rows.length<minimum?'collecting':'available'};
  if(rows.length>=minimum)for(const metal of Object.keys(CONFIG)){const e=rows.filter(x=>x.evaluation.metals[metal]).map(x=>x.evaluation.metals[metal].absolute_error_pct);if(e.length)fresh.accuracy_tracking[metal]={mean_absolute_percentage_error:rounded(mean(e),2),sample_size:e.length};}
 }
 return {forecast:fresh,issued:merge('forecasts',[],issued)};
}
