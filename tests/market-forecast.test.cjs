'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
let model,forecast,market;
const india={date:'2026-10-26',session:'PM',gold24_inr_10g:100000,gold22_inr_10g:91600,silver999_inr_kg:150000,source_url:'https://www.ibjarates.com/'};
function snapshot(time,xau=4000,xag=50,fx=95){return {schema_version:1,checked_at:time,india:{...india},sources_checked:{ibja:'ok',xau:'ok',xag:'ok',usd_inr:'ok'},
 spot:{XAU:{usd_per_troy_ounce:xau,as_of:time,source_url:'https://gold-api.com/docs'},XAG:{usd_per_troy_ounce:xag,as_of:time,source_url:'https://gold-api.com/docs'}},fx:{inr_per_usd:fx,date:'2026-10-26',source_url:'https://frankfurter.dev/'}};}
const previous=snapshot('2026-10-26T14:00:00Z'),now='2026-10-26T16:45:00Z';
function history(){const rows=[];for(let i=0;i<100;i++){const date=new Date(Date.parse('2026-10-26')-(99-i)*86400000).toISOString().slice(0,10),factor=1+Math.sin(i)*.005;rows.push({...india,date,gold24_inr_10g:Math.round(100000*factor),gold22_inr_10g:Math.round(91600*factor),silver999_inr_kg:Math.round(150000*factor)});}rows[99]={...india};return rows;}
test.before(async()=>{model=await import('../cloudflare/nextrate-scheduler/market-forecast.mjs');forecast=await import('../cloudflare/nextrate-scheduler/forecast.mjs');market=await import('../cloudflare/nextrate-scheduler/market.mjs');});
function adjust(latest,anchors=model.captureAnchors(previous,latest),issued=[]){return model.adjustForecast(forecast.generate(latest,history(),now),latest,anchors,history(),issued,now);}
test('global metal and currency ratios actually change each forecast and preserve purity',()=>{
 const latest=snapshot(now,4080,49,96),f=adjust(latest);
 assert.equal(f.forecast_mode,'market_adjusted');assert.equal(f.model_version,4);
 assert.equal(f.metals.gold24.estimate,Math.round(100000*1.02*96/95));
 assert.equal(f.metals.gold22.estimate,Math.round(91600*1.02*96/95));
 assert.equal(f.metals.silver.estimate,Math.round(150000*.98*96/95));
 assert.equal(f.metals.gold24.range_profile,null);assert.equal(f.metals.gold24.backtest.status,'forward_only');
 assert.equal(f.metals.gold24.forward_evidence.independent_target_dates,0);
 const d=f.metals.gold24.drivers;assert.ok(Math.abs(d.metal_change_pct-2)<1e-10);
 assert.ok(Math.abs(d.metal_contribution_inr+d.fx_contribution_inr-(100000*1.02*96/95-100000))<1e-8);
 assert.ok(f.metals.gold24.low<f.metals.gold24.estimate&&f.metals.gold24.high>f.metals.gold24.estimate);
});
test('unchanged or offsetting inputs can honestly produce an unchanged projection',()=>{
 const f=adjust(snapshot(now));assert.equal(f.metals.gold24.estimate,india.gold24_inr_10g);
 const offset=adjust(snapshot(now,4080,51,95/1.02));assert.equal(offset.metals.gold24.estimate,india.gold24_inr_10g);
});
test('reference snapshots are first verified coupled checks and cannot drift with later refreshes',()=>{
 const latest=snapshot(now,4080);const anchors=model.captureAnchors(previous,latest);
 assert.equal(anchors.length,1);assert.equal(anchors[0].available_at,previous.checked_at);
 assert.equal(anchors[0].spot.XAU.usd_per_troy_ounce,4000);
 assert.deepEqual(model.captureAnchors(latest,snapshot('2026-10-26T17:00:00Z',4200),anchors),anchors);
 assert.throws(()=>market.merge('market-anchors',anchors,[{...anchors[0],available_at:now}]),/rewrite/);
});
test('a newly published IBJA session gets its own comparable market reference',()=>{
 const am=snapshot('2026-10-26T08:00:00Z');am.india.session='AM';
 const anchors=model.captureAnchors(am,previous);assert.equal(anchors.length,2);
 const f=adjust(snapshot(now,4080),anchors);assert.equal(f.market_model.reference_checked_at,previous.checked_at);
});
test('stale, future, incompatible, missing and unusually large inputs fail explicitly',()=>{
 for(const mutate of [
  x=>x.sources_checked.xau='unavailable',
  x=>x.spot.XAU.as_of='2026-10-26T11:00:00Z',
  x=>x.spot.XAU.as_of='2026-10-27T10:00:00Z',
  x=>x.spot.XAU.source_url='https://other.example/',
  x=>x.fx.source_url='https://other.example/',
  x=>x.fx.date='2026-10-27',
  x=>x.spot.XAU.usd_per_troy_ounce=6000,
 ]){const latest=snapshot(now,4080);mutate(latest);const f=adjust(latest);assert.equal(f.forecast_mode,'baseline');assert.equal(f.market_model.status,'waiting_inputs');}
 assert.equal(adjust(snapshot(now),[]).forecast_mode,'baseline');
 const invalid=structuredClone(previous);invalid.sources_checked.ibja='unavailable';
 assert.equal(model.captureAnchors(invalid,null).length,0);
});
test('saved market forecasts are immutable editions and only prospective matching PM outcomes are graded',()=>{
 const anchors=model.captureAnchors(previous,snapshot(now,4080));
 const options={adjust:(base,issued)=>model.adjustForecast(base,snapshot(now,4080),anchors,history(),issued,now)};
 const first=forecast.publishForecast(snapshot(now,4080),history(),[],now,options);
 assert.equal(first.issued.length,1);assert.equal(first.issued[0].model_version,4);
 assert.equal(first.issued[0].forecast_mode,'market_adjusted');assert.equal(first.issued[0].evaluation,undefined);
 const tomorrow={...india,date:'2026-10-27',gold24_inr_10g:103000,gold22_inr_10g:94348};
 const later=forecast.publishForecast({india:tomorrow},[...history(),tomorrow],first.issued,'2026-10-27T14:00:00Z');
 const graded=later.issued.find(r=>r.issuance_key===first.issued[0].issuance_key);
 assert.equal(graded.evaluation.metals.gold24.actual,103000);
 assert.equal(graded.metals.gold24.estimate,first.issued[0].metals.gold24.estimate);
 assert.equal(adjust(snapshot(now,4080),anchors,[graded]).metals.gold24.forward_evidence.independent_target_dates,0);
 const laterTime='2026-10-27T16:45:00Z';
 const score=(issued)=>model.adjustForecast(forecast.generate(snapshot(laterTime,4080),history(),laterTime),snapshot(laterTime,4080),anchors,history(),issued,laterTime).metals.gold24.forward_evidence;
 const evidence=score([graded]);
 assert.equal(evidence.independent_target_dates,1);assert.ok(evidence.market_mape_pct<evidence.baseline_mape_pct);
 const duplicate={...graded,issuance_key:graded.issuance_key+'later',issued_at:'2026-10-26T17:00:00Z'};
 assert.equal(score([graded,duplicate]).independent_target_dates,1);
 const hindsight={...graded,issued_at:'2026-10-27T01:00:00Z'};
 assert.equal(score([hindsight]).independent_target_dates,0);
});

test('browser validation independently verifies parity inputs, contributions and exact source snapshot',()=>{
 const Q=require('../data-quality.js'),latest=snapshot(now,4080,49,96),f=adjust(latest);
 assert.equal(Q.forecastIsConsistent(f,latest,'2026-10-26'),true);
 const corrupt=structuredClone(f);corrupt.metals.gold24.drivers.metal_change_pct=99;
 assert.equal(Q.forecastIsConsistent(corrupt,latest,'2026-10-26'),false);
 const wrong=structuredClone(f);wrong.market_model.fx.current=95;
 assert.equal(Q.forecastIsConsistent(wrong,latest,'2026-10-26'),false);
 const fake=structuredClone(f);fake.metals.gold24.estimate++;
 assert.equal(Q.forecastIsConsistent(fake,latest,'2026-10-26'),false);
 const invalid=structuredClone(f);invalid.metals.gold24.forward_evidence.market_mape_pct=NaN;invalid.metals.gold24.forward_evidence.independent_target_dates=1;
 assert.equal(Q.forecastIsConsistent(invalid,latest,'2026-10-26'),false);
});

test('future and duplicated daily prices cannot change the scenario sample or range',()=>{
 const latest=snapshot(now,4080),anchors=model.captureAnchors(previous,latest),base=forecast.generate(latest,history(),now);
 const a=model.adjustForecast(base,latest,anchors,history(),[],now);
 const altered=[...history(),history()[0],{...india,date:'2026-10-28',gold24_inr_10g:900000}];
 const b=model.adjustForecast(base,latest,anchors,altered,[],now);
 assert.deepEqual(b.metals.gold24.scenario_basis,a.metals.gold24.scenario_basis);
});
test('many intraday forecast editions do not evict independent daily evidence from the browser cache',()=>{
 const rows=Array.from({length:25},(_,i)=>{const day=new Date(Date.parse('2026-10-01')+i*86400000).toISOString().slice(0,10);return {issuance_key:'day'+i,model_version:4,forecast_mode:'market_adjusted',target_date:day,issued_at:new Date(Date.parse(day)-6*3600000).toISOString()};});
 for(let i=0;i<100;i++)rows.push({issuance_key:'edition'+i,model_version:4,forecast_mode:'market_adjusted',target_date:'2026-10-28',issued_at:new Date(Date.parse('2026-10-27T00:00:00Z')+i*60000).toISOString()});
 const cache=model.forecastCache(rows,'2026-10-27');assert.equal(cache.filter(x=>x.issuance_key.startsWith('day')).length,25);
 assert.equal(cache.filter(x=>x.issuance_key.startsWith('edition')).length,12);
});

function withConversion(s,rate=95){
 s.sources_checked.conversion='ok';s.forecast_fx={inr_per_usd:rate,inr_per_troy_ounce:s.spot.XAU.usd_per_troy_ounce*rate,
  usd_per_troy_ounce:s.spot.XAU.usd_per_troy_ounce,quote_as_of:s.spot.XAU.as_of,date:s.fx?.date||'2026-10-26',
  source_url:'https://gold-api.com/docs',rate_timing:'conversion_quote_not_fx_tick'};return s;
}
test('paired provider conversion changes the estimate while the daily FX reference stays flat',()=>{
 const reference=withConversion(structuredClone(previous),95),latest=withConversion(snapshot(now,4080),96);
 const anchors=model.captureAnchors(reference,latest),f=adjust(latest,anchors);
 assert.equal(f.market_model.fx.kind,'indicative_conversion');assert.equal(f.market_model.fx.fx_tick_timestamp_verified,false);
 assert.equal(f.metals.gold24.estimate,Math.round(100000*1.02*96/95));
 assert.equal(f.metals.gold22.estimate,Math.round(91600*1.02*96/95));
 assert.equal(f.metals.gold24.history_returns_used,f.metals.gold24.scenario_basis.sample_size);
 assert.doesNotMatch(f.validity,/50%/);
 const Q=require('../data-quality.js');assert.equal(Q.forecastIsConsistent(f,latest,'2026-10-26'),true);
 const broken=structuredClone(latest);broken.forecast_fx.inr_per_troy_ounce*=10;
 assert.equal(Q.forecastIsConsistent(f,broken,'2026-10-26'),false);
 const tampered=structuredClone(f);tampered.market_model.fx.current_quote_as_of='2026-10-26T12:00:00Z';
 assert.equal(Q.forecastIsConsistent(tampered,latest,'2026-10-26'),false);
});
test('old anchors never acquire a reconstructed conversion rate; missing conversion falls back to daily FX',()=>{
 const latest=withConversion(snapshot(now,4080),96),old=model.captureAnchors(previous,null);
 const f=adjust(latest,old);assert.equal(f.market_model.fx.kind,'daily_reference');assert.equal(f.metals.gold24.estimate,102000);
 assert.equal(old[0].forecast_fx,undefined);
 const reference=withConversion(structuredClone(previous),95),anchors=model.captureAnchors(reference,null);
 latest.sources_checked.conversion='unavailable';
 assert.equal(adjust(latest,anchors).market_model.fx.kind,'daily_reference');
});
test('fresh paired conversion can operate during a daily FX outage, but stale conversion cannot',()=>{
 const reference=withConversion(structuredClone(previous),95),latest=withConversion(snapshot(now,4080),96);
 reference.fx=null;latest.fx=null;reference.sources_checked.usd_inr='unavailable';latest.sources_checked.usd_inr='unavailable';
 const anchors=model.captureAnchors(reference,latest),f=adjust(latest,anchors);
 assert.equal(f.forecast_mode,'market_adjusted');assert.equal(f.market_model.fx.kind,'indicative_conversion');
 latest.forecast_fx.quote_as_of='2026-10-26T12:00:00Z';assert.equal(adjust(latest,anchors).forecast_mode,'baseline');
});
test('conversion parser rejects wrong currency, units, time, types and mismatched USD observations',()=>{
 const spot=previous.spot.XAU,raw={symbol:'XAU',currency:'INR',price:4000*95,exchangeRate:95,updatedAt:previous.checked_at};
 const parsed=market.parseConversion(raw,spot,previous.checked_at);assert.equal(parsed.inr_per_usd,95);
 for(const patch of [{currency:'USD'},{symbol:'XAG'},{exchangeRate:'95'},{exchangeRate:0},{price:4000},{updatedAt:now},{updatedAt:'2026-10-26T10:00:00Z'}])
  assert.throws(()=>market.parseConversion({...raw,...patch},spot,previous.checked_at));
 assert.equal(model.validConversion(parsed,previous,previous.checked_at),true);
});
