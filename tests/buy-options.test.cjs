'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const {metalAndGST}=require('../buy-options.js');
const {formatINR}=require('../weights.js');

test('24K 8g uses published rate and adds only 3 percent GST',()=>{
 const q=metalAndGST(141630,'gold24',8);
 assert.equal(q.metalValue,113304);
 assert.equal(q.gst,3399.12);
 assert.equal(q.subtotal,116703.12);
 assert.equal(q.isShopQuote,false);
 assert.equal(formatINR(q.subtotal),'₹1,16,703.12');
});
test('22K sovereign jewellery excludes making charges',()=>{
 const q=metalAndGST(129733,'gold22',8);
 assert.equal(q.metalValue,103786.4);
 assert.equal(q.gst,3113.59);
 assert.equal(q.subtotal,106899.99);
 assert.match(q.excludes,/making/);
});
test('Silver grams have correct per-kg basis and GST',()=>{
 const q=metalAndGST(194415,'silver',100);
 assert.equal(q.metalValue,19441.5);
 assert.equal(q.gst,583.25);
 assert.equal(q.subtotal,20024.75);
});
test('Invalid benchmark cannot turn into an invented quote',()=>{
 assert.throws(()=>metalAndGST(0,'gold24',8),RangeError);
 assert.throws(()=>metalAndGST(null,'silver',1),RangeError);
 assert.throws(()=>metalAndGST(141630,'gold24',0),RangeError);
});
