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
test('stale references do not generate portfolio profits or reached-target alerts',()=>{
 const rates={india:{...india,date:shift(-8)}};
 const row={kind:'gold22',qty:8,paid:100000};
 assert.equal(C.holdingValuation(row,{rates}).value,null);
 assert.equal(C.alertValue({metal:'gold22',grams:8},{rates}),null);
 const fund={nav_date:shift(1),nav_inr_per_unit:116.1182};
 assert.equal(C.holdingValuation({...row,kind:'goldbees'},{funds:{funds:{goldbees:fund}}}).value,null);
 assert.equal(C.holdingValuation({...row,qty:.001},{rates:{india}}).value,12.92);
 assert.equal(C.ageDays('2026-02-31'),Infinity);
});
test('invalid backup entries cannot crash tools or contaminate aggregate totals',()=>{
 const good={id:'a',name:'Gold',kind:'gold22',qty:8,paid:100000,date:today};
 const state={version:1,alerts:[null,{id:'x'}],shops:[null],holdings:[null,good,{...good,id:'b',qty:-1},{...good,id:'c',paid:'100'}],etfQuotes:{goldbees:{quote:-1,date:today}}};
 const clean=C.storedState(state);
 assert.deepEqual(clean.holdings,[good]);assert.deepEqual(clean.alerts,[]);assert.deepEqual(clean.shops,[]);
 assert.deepEqual(clean.etfQuotes,{});
 assert.throws(()=>C.storedState(state,true),/Invalid/);
 const valid={version:1,alerts:[],shops:[],holdings:[good],etfQuotes:{},preferred:'portfolio'};
 assert.deepEqual(C.storedState(valid,true).holdings,[good]);
 assert.throws(()=>C.storedState({...valid,holdings:[good,good]},true),/Invalid/);
 assert.doesNotThrow(()=>C.storedState({version:1,holdings:[null]}));
});
