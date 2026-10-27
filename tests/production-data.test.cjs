'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Q=require('../data-quality.js'),C=require('../features-core.js');
const today=Q.todayIST();
const shift=n=>new Date(Date.parse(today)+n*86400000).toISOString().slice(0,10);
const india={date:today,session:'AM',gold24_inr_10g:141082,gold22_inr_10g:129231,silver999_inr_kg:192037};

test('every city consumer receives only bounded, real, nonfuture publication dates',()=>{
 const doc={schema_version:1,dates:{gold:today,silver:shift(1)},cities:{
  Chennai:{gold24_inr_g:14329,gold22_inr_g:13135,silver999_inr_kg:220000},
  Mumbai:{gold24_inr_g:14329,gold22_inr_g:15000},Delhi:{gold24_inr_g:'14329',gold22_inr_g:13135}}};
 const clean=Q.cities(doc,today);
 assert.equal(clean.cities.Chennai.gold22_inr_g,13135);
 assert.equal(clean.cities.Chennai.silver999_inr_kg,undefined);
 assert.equal(clean.cities.Mumbai,undefined);assert.equal(clean.cities.Delhi,undefined);
 assert.deepEqual(Q.cities({...doc,dates:{gold:'2026-02-31'}},today).cities,{});
 assert.deepEqual(Q.cities({...doc,dates:{gold:shift(-8)}},today).cities,{});
});
test('ETF and portfolio references reject wrong scheme identities, future dates and numeric strings',()=>{
 const row={scheme_code:140088,name:'Nippon India ETF Gold BeES',kind:'Gold ETF',nav_date:today,nav_inr_per_unit:116.1182};
 const clean=Q.funds({schema_version:1,funds:{goldbees:row,hdfcgold:row}},today);
 assert.equal(clean.funds.goldbees.nav_inr_per_unit,116.1182);assert.equal(clean.funds.hdfcgold,undefined);
 for(const patch of [{nav_date:shift(1)},{nav_date:shift(-11)},{nav_date:'2026-02-31'},{nav_inr_per_unit:'116.1182'},{nav_inr_per_unit:Infinity}]){
  assert.deepEqual(Q.funds({schema_version:1,funds:{goldbees:{...row,...patch}}},today).funds,{});
 }
});
test('history cannot override the live session or introduce later observations and invalid prices',()=>{
 const clean=Q.history({schema_version:1,india:[
  {...india,gold24_inr_10g:150000,gold22_inr_10g:137400},
  {...india,session:'PM',gold24_inr_10g:150000,gold22_inr_10g:137400},
  {...india,date:shift(-1),gold24_inr_10g:-1},
  {...india,date:shift(-2),gold24_inr_10g:141000},
  {...india,date:shift(-2),gold24_inr_10g:142000},
 ]},india,today);
 assert.deepEqual(clean.india.at(-1),india);
 assert.ok(!clean.india.some(x=>x.session==='PM'||x.date===shift(-2)));
 assert.equal(clean.india[0].gold24_inr_10g,undefined);
});
test('accuracy is recomputed from verified PM prices, never an arbitrary supplied score',()=>{
 const target=shift(-1),base=shift(-2),issued=base+'T10:00:00Z';
 const m={estimate:140000,baseline:141000,low:130000,high:150000};
 const record={target_date:target,based_on_date:base,based_on_session:'PM',issued_at:issued,
  metals:{gold24:m,gold22:{...m,estimate:128240,baseline:129156,low:120000,high:140000},silver:{...m,estimate:190000,baseline:191000,low:180000,high:200000}},
  evaluation:{actual_date:target,metals:{gold24:{actual:1,absolute_error_pct:0,range_covered:false}}}};
 const historical={india:[{...india,date:target,session:'PM',gold24_inr_10g:142000}]};
 const result=Q.forecastHistory({schema_version:1,forecasts:[record,null]},historical,today);
 assert.equal(result.forecasts.length,1);
 const score=result.forecasts[0].evaluation.metals.gold24;
 assert.equal(score.actual,142000);assert.ok(score.absolute_error_pct>1);assert.equal(score.range_covered,true);
 assert.equal(score.direction_correct,false);
 const am=Q.forecastHistory({schema_version:1,forecasts:[record]},{india:[{...historical.india[0],session:'AM'}]},today);
 assert.equal(am.forecasts[0].evaluation,undefined);
});
test('malformed forecast performance evidence is never displayed as a numeric score',()=>{
 const v={baseline:141082,estimate:141082,low:140000,high:143000};
 const forecast={schema_version:1,status:'experimental',target_date:shift(1),based_on_date:today,based_on_session:'AM',
  metals:{gold24:v,gold22:{...v,baseline:129231,estimate:129231,low:128000,high:130000},silver:{...v,baseline:192037,estimate:192037,low:190000,high:194000}}};
 assert.equal(Q.forecastIsConsistent(forecast,{india},today),true);
 const bad=clone=>({...forecast,metals:{...forecast.metals,gold24:{...v,...clone}}});
 assert.equal(Q.forecastIsConsistent(bad({backtest:{status:'walk_forward',holdout_mape_pct:.5}}),{india},today),false);
 assert.equal(Q.forecastIsConsistent(bad({range_profile:{holdout_samples:10,holdout_covered:8,holdout_coverage_pct:100}}),{india},today),false);
});


test('blocked browser storage preserves in-memory tools and reports that data will not persist',()=>{
 const vm=require('node:vm'),fs=require('node:fs');
 const win={NextRateCore:C,NextRateSources:{badge:()=>''},localStorage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../features.js'),'utf8'),{window:win});
 win.NextRateFeatures.select('resale');
 assert.match(win.NextRateFeatures.page({rates:{india}}),/Changes last only for this visit/);
 assert.equal(win.NextRateFeatures.getState().preferred,'resale');
});

test('tool preferences migrate only supported ETF quotes and reject invalid saved values',()=>{
 const clean=C.storedState({version:1,preferred:'removed',legacy:[null],etfQuotes:{goldbees:{quote:120,date:today},hdfcgold:{quote:-1,date:today},sbigold:{quote:'120',date:today},silveretf:{quote:1,date:shift(1)}}});
 assert.deepEqual(clean,{preferred:'resale',etfQuotes:{goldbees:{quote:120,date:today}}});
 assert.equal(C.storedState({version:2,preferred:'etfs'}).preferred,'etfs');
 assert.equal(C.storedState({version:99,preferred:'hallmark'}).preferred,'resale');
});
