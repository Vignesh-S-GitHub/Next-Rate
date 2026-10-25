'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('../data-quality.js');
const today='2026-10-25';
const india={date:'2026-10-23',session:'PM',gold24_inr_10g:141630,
 gold22_inr_10g:129733,silver999_inr_kg:194415};
const latest={schema_version:1,india,spot:{XAU:{usd_per_troy_ounce:3996.9,
 as_of:'2026-10-24T18:00:00Z'}},fx:{date:'2026-10-23',inr_per_usd:94.8}};
const forecast={schema_version:1,status:'experimental',target_date:'2026-10-26',
 based_on_date:india.date,based_on_session:india.session,
 metals:{gold24:{baseline:141630,low:130000,estimate:141630,high:150000},
 gold22:{baseline:129733,low:120000,estimate:129733,high:139000},
 silver:{baseline:194415,low:180000,estimate:194415,high:210000}}};
test('real India benchmark data passes; malformed or future-dated data fails closed',()=>{
 assert.equal(Q.market(latest,today)?.india.gold24_inr_10g,141630);
 assert.equal(Q.market({...latest,india:{...india,date:'2026-10-26'}},today),null);
 assert.equal(Q.market({...latest,india:{...india,gold22_inr_10g:180000}},today),null);
 assert.equal(Q.market({...latest,india:{...india,gold24_inr_10g:'141630'}},today),null);
 assert.equal(Q.market({...latest,schema_version:2},today),null);
 assert.equal(Q.iso('2026-02-31'),false);
});
test('invalid optional FX and international quotes are not shown as credible values',()=>{
 const cleaned=Q.market({...latest,fx:{date:'2026-10-26',inr_per_usd:94.8},
  spot:{XAU:{usd_per_troy_ounce:-10,as_of:'2026-10-24T18:00:00Z'}}},today);
 assert.equal(cleaned.fx,null);
 assert.deepEqual(cleaned.spot,{});
});
test('history feed outage leaves current price visible and chart safely empty',()=>{
 const doc=Q.history(null,india,today);
 assert.equal(doc.india.length,1);
 assert.equal(doc.india[0].gold24_inr_10g,141630);
 assert.equal(Q.history({schema_version:1,india:[{...india,date:'2026-10-30'}]},india,today).india.length,1);
});
test('forecast must be built from the very same published IBJA session',()=>{
 assert.equal(Q.forecastIsConsistent(forecast,latest,today),true);
 assert.equal(Q.forecastIsConsistent({...forecast,based_on_date:'2026-10-22'},latest,today),false);
 assert.equal(Q.forecastIsConsistent({...forecast,target_date:'2026-10-24'},latest,today),false);
 assert.equal(Q.forecastIsConsistent({...forecast,metals:{...forecast.metals,gold24:{...forecast.metals.gold24,baseline:150000}}},latest,today),false);
 assert.equal(Q.forecastIsConsistent({...forecast,metals:{...forecast.metals,silver:{...forecast.metals.silver,low:300000}}},latest,today),false);
});
test('history accepts legitimately partial historical records, rejects invalid ones',()=>{
 const result=Q.history({schema_version:1,india:[
  {date:'2026-10-21',session:'PM',gold24_inr_10g:144105},
  {date:'2026-10-22',session:'PM',gold24_inr_10g:-1},
  india
 ]},india,today);
 assert.equal(result.india.length,2);
 assert.equal(result.india[0].date,'2026-10-21');
});
