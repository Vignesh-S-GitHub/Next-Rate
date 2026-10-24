'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {calculate,formatINR,gramLabel,POPULAR_WEIGHTS}=require('../weights.js');

test('24K rate per ten grams converts to Indian popular weights',()=>{
  assert.equal(calculate(141630,'gold24',1).amount,14163);
  assert.equal(calculate(141630,'gold24',8).amount,113304);
  assert.equal(calculate(141630,'gold24',10).amount,141630);
  assert.equal(calculate(141630,'gold24',1000).amount,14163000);
});
test('22K 8 gram pavan is 80 percent of its per-ten-gram reference',()=>{
  assert.equal(calculate(129733,'gold22',8).amount,103786.4);
  assert.equal(formatINR(calculate(129733,'gold22',8).amount),'₹1,03,786.40');
});
test('Silver per kilogram converts to grams including paise',()=>{
  assert.equal(calculate(194415,'silver',1).amount,194.42);
  assert.equal(calculate(194415,'silver',8).amount,1555.32);
  assert.equal(calculate(194415,'silver',100).amount,19441.5);
  assert.equal(calculate(194415,'silver',1,'kg').amount,194415);
  assert.equal(calculate(194415,'silver',1000,'g').amount,194415);
});
test('India-format lakh and crore grouping',()=>{
  assert.equal(formatINR(14163000),'₹1,41,63,000');
  assert.equal(formatINR(103786.4),'₹1,03,786.40');
  assert.equal(formatINR(194.42),'₹194.42');
});
test('Sovereign, ten gram and kilogram weights are included',()=>{
  for(const metal of ['gold24','gold22']){
    assert.ok(POPULAR_WEIGHTS[metal].includes(1));
    assert.ok(POPULAR_WEIGHTS[metal].includes(8));
    assert.ok(POPULAR_WEIGHTS[metal].includes(10));
  }
  assert.ok(POPULAR_WEIGHTS.silver.includes(1000));
  assert.equal(gramLabel(8),'8 g');
  assert.equal(gramLabel(1000),'1 kg');
});
test('Missing benchmarks are not converted into invented zero quotes',()=>{
  for(const bad of [null,undefined,0,-5,NaN,Infinity,'141630']){
    assert.throws(()=>calculate(bad,'gold24',8),RangeError);
  }
  assert.equal(formatINR(null),'Unavailable');
});
test('Reject invalid weights and units',()=>{
  for(const bad of ['',0,-1,'oops',Infinity,null,' ',100001]){
    assert.throws(()=>calculate(141630,'gold24',bad),RangeError);
  }
  assert.throws(()=>calculate(141630,'gold24',1,'oz'),RangeError);
  assert.throws(()=>calculate(141630,'platinum',1),RangeError);
});
test('Fractional kg and gram calculations agree',()=>{
  assert.deepEqual(calculate(141630,'gold24',0.5),calculate(141630,'gold24',0.0005,'kg'));
});
