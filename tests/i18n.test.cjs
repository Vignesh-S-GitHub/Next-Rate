'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {translate,TA}=require('../i18n.js');
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
