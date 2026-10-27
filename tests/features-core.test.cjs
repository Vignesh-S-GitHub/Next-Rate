'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../features-core.js');

const rates={india:{date:'2026-10-23',gold24_inr_10g:141630,
 gold22_inr_10g:129733,silver999_inr_kg:194415}};
const funds={funds:{goldbees:{nav_date:'2026-10-23',nav_inr_per_unit:116.0136}}};
test('re-sell estimates deductions without promising payout',()=>{
 const result=C.resaleQuote({ratePer10g:129733,grams:8,
 purity:22,deductionPct:2,fixedFee:500});
 assert.equal(result.metal,103786.4);
 assert.equal(result.deduction,2075.73);
 assert.equal(result.proceeds,101210.67);
});
test('ETF premium uses user-entered price divided by correct NAV',()=>{
 assert.equal(C.premium(110,100),10);
 assert.equal(C.premium(95,100),-5);
 assert.throws(()=>C.premium(100,0),RangeError);
});
test('Indian source-date freshness never uses browser locale parsing assumptions',()=>{
 const now=new Date('2026-10-25T06:00:00Z');
 assert.equal(C.ageDays('2026-10-23',now),2);
 assert.equal(C.ageDays('invalid',now),Infinity);
 assert.equal(C.ageDays('2026-10-26',now),-1);
});
test('stored user names are escaped as untrusted text',()=>{
 assert.equal(C.esc('<img src=x onerror=alert(1)>'),
 '&lt;img src=x onerror=alert(1)&gt;');
});

test('Home compares the latest published date against the earlier published session across a weekend',()=>{
 const C=require('../features-core.js');
 const snapshot={india:{date:'2026-10-26',session:'AM',gold24_inr_10g:141290,silver999_inr_kg:195050}};
 const history={india:[
  {date:'2026-10-26',session:'AM',gold24_inr_10g:141290},
  {date:'2026-10-23',session:'PM',gold24_inr_10g:141630,silver999_inr_kg:194415},
  {date:'2026-10-22',session:'PM',gold24_inr_10g:142694},
  {date:'2026-10-23',session:'AM',gold24_inr_10g:141448},
  {date:'2026-10-27',session:'PM',gold24_inr_10g:999999}]};
 const gold=C.publishedChange(snapshot,history,'gold24');
 assert.equal(gold.previousDate,'2026-10-23');assert.equal(gold.previousSession,'PM');
 assert.equal(gold.amount,-340);assert.equal(gold.direction,'down');
 assert.ok(Math.abs(gold.percent-(-340/141630*100))<1e-10);
 const silver=C.publishedChange(snapshot,history,'silver');
 assert.equal(silver.amount,635);assert.equal(silver.direction,'up');
 assert.equal(C.publishedChange(snapshot,{india:[]},'gold24'),null);
 assert.equal(C.publishedChange(snapshot,history,'gold22'),null);
 assert.equal(C.publishedChange({india:{...snapshot.india,gold24_inr_10g:141630}},history,'gold24').direction,'steady');
});

test('Price periods use calendar cutoffs, dated PM closes and the starting price as denominator',()=>{
 const snapshot={india:{date:'2026-10-27',session:'AM',gold24_inr_10g:120000}};
 const history={india:[
  {date:'2026-10-20',session:'AM',gold24_inr_10g:90000},
  {date:'2026-10-20',session:'PM',gold24_inr_10g:100000},
  {date:'2026-10-21',session:'PM',gold24_inr_10g:119000},
  {date:'2026-09-25',session:'PM',gold24_inr_10g:125000},
  {date:'2026-07-29',session:'PM',gold24_inr_10g:120000},
  {date:'2026-10-27',session:'PM',gold24_inr_10g:999999}]};
 const week=C.publishedChange(snapshot,history,'gold24',7);
 assert.equal(week.previousDate,'2026-10-20');assert.equal(week.previousSession,'PM');
 assert.equal(week.amount,20000);assert.equal(week.percent,20);assert.equal(week.direction,'up');
 const month=C.publishedChange(snapshot,history,'gold24',30);
 assert.equal(month.cutoffDate,'2026-09-27');assert.equal(month.previousDate,'2026-09-25');
 assert.equal(month.percent,-4);assert.equal(month.direction,'down');
 const quarter=C.publishedChange(snapshot,history,'gold24',90);
 assert.equal(quarter.cutoffDate,'2026-07-29');assert.equal(quarter.direction,'steady');
 assert.equal(quarter.percent,0);
 assert.deepEqual(history.india.map(r=>r.date),['2026-10-20','2026-10-20','2026-10-21','2026-09-25','2026-07-29','2026-10-27']);
});
test('Price periods withhold missing history and invalid quotes instead of shortening the period',()=>{
 const snapshot={india:{date:'2026-03-02',session:'PM',gold24_inr_10g:110000}};
 const history={india:[{date:'2026-02-24',session:'PM',gold24_inr_10g:100000},
  {date:'2026-02-23',session:'PM',gold24_inr_10g:0},
  {date:'2026-02-22',session:'PM',gold24_inr_10g:'90000'},
  {date:'2026-02-21',session:'unknown',gold24_inr_10g:90000}]};
 assert.equal(C.publishedChange(snapshot,history,'gold24',7),null);
 assert.equal(C.publishedChange(snapshot,history,'gold24',30),null);
 assert.equal(C.publishedChange(snapshot,history,'gold24',90),null);
 assert.equal(C.publishedChange(snapshot,history,'gold24',5),null);
 assert.equal(C.publishedChange(snapshot,history,'invalid',7),null);
 assert.equal(C.publishedChange({...snapshot,india:{...snapshot.india,date:'2026-02-31'}},history,'gold24',7),null);
 history.india.push({date:'2026-02-23',session:'PM',gold24_inr_10g:100000});
 assert.equal(C.publishedChange(snapshot,history,'gold24',7).cutoffDate,'2026-02-23');
});

test('Forecast checks reject hindsight issuance and keep AM provisional until the matching PM close',()=>{
 const C=require('../features-core.js');
 const issue={target_date:'2026-10-26',based_on_date:'2026-10-23',based_on_session:'PM',
  issued_at:'2026-10-25T10:00:00Z',metals:{gold24:{estimate:141630,baseline:141630,low:140000,high:143000}}};
 const am={india:{date:'2026-10-26',session:'AM',gold24_inr_10g:141290}};
 const check=C.forecastCheck([issue],am,'2026-10-26');
 assert.equal(check.status,'provisional');assert.equal(check.metals.gold24.errorAmount,340);
 assert.equal(check.metals.gold24.rangeCovered,true);assert.equal(check.metals.gold24.directionCorrect,null);
 const final=C.forecastCheck([issue],{india:{...am.india,session:'PM',gold24_inr_10g:139000}},'2026-10-26');
 assert.equal(final.status,'final');assert.equal(final.metals.gold24.rangeCovered,false);
 assert.equal(final.metals.gold24.errorAmount,2630);
 assert.equal(C.forecastCheck([{...issue,issued_at:'2026-10-26T00:00:00+05:30'}],am,'2026-10-26'),null);
 assert.equal(C.forecastCheck([{...issue,based_on_date:'2026-10-26'}],am,'2026-10-26'),null);
 assert.equal(C.forecastCheck([issue],am,'2026-10-25'),null);
});

test('Forecast range, point error and direction are independent results',()=>{
 const C=require('../features-core.js');
 const issue={target_date:'2026-10-26',based_on_date:'2026-10-23',issued_at:'2026-10-25T10:00:00Z',
  metals:{gold24:{estimate:142000,baseline:141000,low:140000,high:143000}}};
 const r=C.forecastCheck([issue],{india:{date:'2026-10-26',session:'PM',gold24_inr_10g:140500}},'2026-10-26').metals.gold24;
 assert.equal(r.rangeCovered,true);assert.equal(r.directionCorrect,false);assert.equal(r.errorAmount,1500);
 const older={...issue,target_date:'2026-10-22',based_on_date:'2026-10-21',issued_at:'2026-10-21T10:00:00Z',
  evaluation:{actual_date:'2026-10-22',metals:{gold24:{actual:142000}}}};
 const past=C.forecastCheck([older],{india:{date:'2026-10-26',session:'AM',gold24_inr_10g:1}},'2026-10-26');
 assert.equal(past.status,'final');assert.equal(past.metals.gold24.actual,142000);assert.equal(past.metals.gold24.errorAmount,0);
});
