'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../features-core.js');

const rates={india:{date:'2026-10-23',gold24_inr_10g:141630,
 gold22_inr_10g:129733,silver999_inr_kg:194415}};
const funds={funds:{goldbees:{nav_date:'2026-10-23',nav_inr_per_unit:116.0136}}};
test('3 percent jewellery GST applies to total including making',()=>{
 const bill=C.jewelleryBill({ratePer10g:129733,grams:8,
  wastagePct:0,makingPct:10,makingFlat:0});
 assert.equal(bill.metal,103786.4);
 assert.equal(bill.making,10378.64);
 assert.equal(bill.tax,3424.95);
 assert.equal(bill.total,117589.99);
});
test('jewellery handles wastage, additional flat making, and invalid negative fees',()=>{
 const q=C.jewelleryBill({ratePer10g:129733,grams:8,
 wastagePct:5,makingPct:8,makingFlat:400});
 assert.equal(q.wastage,5189.32);
 assert.ok(q.total>q.taxable);
 assert.throws(()=>C.jewelleryBill({ratePer10g:129733,grams:-1}),RangeError);
 assert.throws(()=>C.jewelleryBill({ratePer10g:129733,grams:8,wastagePct:200}),RangeError);
});
test('re-sell estimates deductions without promising payout',()=>{
 const result=C.resaleQuote({ratePer10g:129733,grams:8,
 purity:22,deductionPct:2,fixedFee:500});
 assert.equal(result.metal,103786.4);
 assert.equal(result.deduction,2075.73);
 assert.equal(result.proceeds,101210.67);
});
test('benchmark units correctly distinguish gold ten grams from silver kilogram',()=>{
 assert.equal(C.bullionValue(rates,'gold22',8),103786.4);
 assert.equal(C.bullionValue(rates,'gold24',1),14163);
 assert.equal(C.bullionValue(rates,'silver',100),19441.5);
 assert.equal(C.bullionValue({india:{}},'gold22',8),null);
});
test('manual jeweller quote is calculated as entered, not falsely verified',()=>{
 const quote=C.manualShopBill({ratePerGram:13070,grams:8,
 makingPct:10,makingFlat:0,wastagePct:0});
 assert.equal(quote.metal,104560);
 assert.equal(quote.total,118466.48);
});
test('portfolio values include dated reference with explicit type',()=>{
 const a=C.holdingValuation({kind:'gold22',qty:8,paid:110000}, {rates,funds});
 assert.equal(a.value,103786.4);
 assert.equal(a.pnl,-6213.6);
 assert.equal(a.asOf,'2026-10-23');
 const etf=C.holdingValuation({kind:'goldbees',qty:10,paid:1200},{rates,funds});
 assert.equal(etf.value,1160.14);
 assert.equal(etf.asOf,'2026-10-23');
 assert.match(etf.source,/ETF exchange trade price differs/);
});
test('ETF premium uses user-entered price divided by correct NAV',()=>{
 assert.equal(C.premium(110,100),10);
 assert.equal(C.premium(95,100),-5);
 assert.throws(()=>C.premium(100,0),RangeError);
});
test('one-shot target alert uses exact weight and direction',()=>{
 let result=C.triggered({metal:'gold22',grams:8,target:105000,op:'below'}, {rates});
 assert.equal(result.current,103786.4);
 assert.equal(result.hit,true);
 result=C.triggered({metal:'gold22',grams:8,target:110000,op:'above'}, {rates});
 assert.equal(result.hit,false);
});
test('prospective errors are model-specific and count each target day only once',()=>{
 const row=(v,d,err,covered)=>({model_version:v,target_date:d,based_on_date:'2026-10-23',issued_at:'2026-10-23T12:00:00Z',
   evaluation:{metals:{gold24:{absolute_error_pct:err,range_covered:covered,direction_correct:true}}}});
 const stats=C.historicalAccuracy([
  row(2,'2026-10-26',1,true),
  row(2,'2026-10-26',2,false),
  row(3,'2026-10-26',1.5,false),
  row(2,'2026-10-27',.5,true),
  {target_date:'2026-10-28',metals:{gold24:{estimate:1000}}}
 ],'gold24');
 assert.equal(stats.evaluated,2);
 assert.equal(stats.mape,1);
 assert.equal(stats.covered,1);
 const current=C.historicalAccuracy([
  row(2,'2026-10-26',1,true),row(3,'2026-10-26',1.5,false),
  row(2,'2026-10-27',.5,true)],'gold24',2);
 assert.equal(current.evaluated,2);
 assert.equal(current.mape,.75);
 assert.equal(current.covered,2);
 const invalid={...row(3,'2026-10-26',0,true),issued_at:'2026-10-25T18:30:00Z'};
 assert.equal(C.historicalAccuracy([invalid],'gold24').evaluated,0);
 assert.equal(C.historicalAccuracy([{...invalid,issued_at:'2026-10-25T12:00:00'}],'gold24').evaluated,0);
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
