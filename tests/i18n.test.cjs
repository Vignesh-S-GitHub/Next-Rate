'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {translate,TA}=require('../i18n.js');
test('Tamil preserves proper names and translates the audited source and city labels',()=>{
 assert.equal(translate('Jewellers Association','ta'),'Jewellers Association');
 assert.equal(translate('Major city prices · 1 g','ta'),'முக்கிய நகர விலைகள் · 1 கிராம்');
 assert.equal(translate('Switch language to Tamil','ta'),'தமிழ் மொழிக்கு மாற்று');
 assert.ok(translate('Image hosted by India Bullion and Jewellers Association','ta').includes('சங்கம்'));
 for(const n of [1,8]){
  const label=translate('Calculate '+n+' grams of 22K Gold','ta');
  assert.doesNotMatch(label,/grams|\bof\b/);
 }
});
test('Tamil navigation translates all four tabs and locale switches back to English',()=>{
 for(const label of ['Home','Markets','Compare','Insights']){
   assert.notEqual(translate(label,'ta'),label);
   assert.equal(translate(label,'en'),label);
 }
});
test('Tamil major city names are distinct and current data remains unchanged',()=>{
 const names=['Chennai','Mumbai','Delhi','Bengaluru','Hyderabad'];
 const results=names.map(x=>translate(x,'ta'));
 assert.equal(new Set(results).size,5);
 assert.equal(translate('₹1,42,580','ta'),'₹1,42,580');
});
test('Tamil common price and weight captions',()=>{
 for(const phrase of ['Tomorrow','Today · IBJA','City indicative prices',
   '24K Gold','22K Gold','Silver 999','By Weight','Buy Gold & Silver',
   'City retail rates','GST, making charges and shop premiums extra.']){
   assert.notEqual(translate(phrase,'ta'),phrase,phrase);
 }
 assert.ok(translate('India benchmark: 24K Gold','ta').includes('இந்திய'));
});
test('Translation dictionary is substantive and static, no fabricated price strings',()=>{
 assert.ok(Object.keys(TA).length>=110);
 assert.ok(!translate('22K Gold ₹13,070','ta').includes('Gold'));
 assert.ok(translate('22K Gold ₹13,070','ta').includes('₹13,070'));
});

test('Tamil translates chart controls and illustrated metal price factors',()=>{
 for(const name of ['Move slider','Estimate only · Not guaranteed','Gold drivers',
 'Silver drivers','World gold','Solar power','Real yields','Jewellery demand','Mine supply']){
  assert.notEqual(translate(name,'ta'),name,name);
 }
});

test('Tamil translates Home changes and provisional forecast results without altering amounts',()=>{
 for(const text of ['Forecast check','Awaiting PM close','Within forecast range','Outside forecast range',
  'Typical range · 50%','AM comparison only · Final result after PM close']){
  assert.notEqual(translate(text,'ta'),text,text);
 }
 assert.ok(translate('Down ₹340 · 0.24%','ta').includes('₹340 · 0.24%'));
});

test('Tamil translates price period controls and missing history without changing returns',()=>{
 for(const label of ['Price change period','Not enough history','Calendar days before the displayed rate; non-publishing dates use the previous published rate.'])assert.notEqual(translate(label,'ta'),label);
 assert.ok(translate('vs ₹1,00,000 · 20 Oct 2026 PM','ta').includes('₹1,00,000'));
});
