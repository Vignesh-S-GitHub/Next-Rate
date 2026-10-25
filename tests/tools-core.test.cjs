'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),m=require('../tools-core.js');
const rates={gold24_inr_10g:141630,gold22_inr_10g:129733,silver999_inr_kg:194415};
test('jewellery GST is 3 percent on entire price including making and wastage',()=>{
 const q=m.jewelleryBill({ratePerGram:12973.3,grams:8,making:5000,wastagePct:2});
 assert.equal(q.metal,103786.4);
 assert.equal(q.wastage,2075.73);
 assert.equal(q.makingCharge,5000);
 assert.equal(q.gst,m.round(q.taxable*.03));
 assert.equal(q.total,m.round(q.taxable+q.gst));
 assert.equal(m.jewelleryBill({ratePerGram:100,grams:10,makingMode:'percent',making:10}).makingCharge,100);
});
test('resale and exchange do not invent tax deductions or negative credits',()=>{
 const b=m.buyback({ratePerGram:10000,grams:8,deductionPct:2,spreadPct:1,fee:200});
 assert.equal(b.gross,80000);assert.equal(b.melt,1600);assert.equal(b.discount,784);
 assert.equal(b.estimatedCredit,77416);
 assert.deepEqual(m.exchangeBill({total:80000},b),{netPayable:2584,surplusCredit:0});
 assert.equal(m.buyback({ratePerGram:1000,grams:1,fee:2000}).estimatedCredit,0);
});
test('only real market inputs convert spot and ETF premiums',()=>{
 assert.equal(m.impliedSpotInr(4000,95),m.round(4000*95/31.1034768*10));
 assert.equal(m.percentDiff(105,100),5);
 assert.throws(()=>m.impliedSpotInr(null,95),RangeError);
});
test('real issued forecast scores are separate from model backtests',()=>{
 const sample={target_date:'2026-10-26',metals:{gold24:{estimate:140000,baseline:141000,low:138000,high:142000}},
  evaluation:{actual_date:'2026-10-26',metals:{gold24:{actual:139000}}}};
 const r=m.accuracy([sample], 'gold24');
 assert.equal(r.n,1);assert.ok(r.mape>0);assert.equal(r.rangeCovered,1);
 assert.equal(m.accuracy([{...sample,evaluation:null}], 'gold24').n,0);
 assert.equal(m.accuracy([{...sample,evaluation:{...sample.evaluation,actual_date:'2026-10-27'}}], 'gold24').n,0);
});
test('alerts require valid direction, threshold, current available quote',()=>{
 assert.equal(m.alertKey('gold22',8,'Chennai'),'gold22:8:Chennai');
 assert.ok(m.statusMatch({direction:'below',key:'Chennai:gold22',threshold:105000},{'Chennai:gold22':104000}));
 assert.ok(!m.statusMatch({direction:'below',key:'Chennai:gold22',threshold:105000},{}));
 assert.throws(()=>m.alertKey('fake',8,'Chennai'),RangeError);
});
test('portfolio uses dated IBJA per-gram value, and ETFs only as NAV not trade',()=>{
 const q=m.buildQuotes({india:rates,funds:{funds:{goldbees:{nav_inr_per_unit:115}}}});
 assert.equal(q.gold22,12973.3);assert.equal(q.silver,194.415);
 const p=m.holdingValue({quantity:8,paid:90000,type:'gold22'},q);
 assert.equal(p.value,103786.4);assert.equal(p.pnl,13786.4);
 assert.match(m.holdingValue({quantity:10,paid:1000,type:'etf',scheme:'goldbees'},q).note,/NAV/);
 assert.equal(m.holdingValue({quantity:1,paid:1,type:'etf',scheme:'missing'},q).value,null);
});
test('reject untrusted numeric input and unreasonable quantities',()=>{
 for(const v of ['',null,undefined,'x',-1,Infinity]) assert.throws(()=>m.jewelleryBill({ratePerGram:v,grams:1}),RangeError);
 assert.throws(()=>m.jewelleryBill({ratePerGram:100,grams:8,making:10000001}),RangeError);
 assert.throws(()=>m.buyback({ratePerGram:100,grams:-1}),RangeError);
});
