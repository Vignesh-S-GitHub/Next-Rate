/*
 * NextRate weight calculations from verified Indian bullion benchmarks.
 * Browser and Node-compatible. No forecast or retail markup is invented.
 */
(function (root) {
  'use strict';
  const BASE_GRAMS=Object.freeze({gold24:10,gold22:10,silver:1000});
  const POPULAR_WEIGHTS=Object.freeze({
    gold24:Object.freeze([1,2,4,5,8,10,20,50,100,1000]),
    gold22:Object.freeze([1,2,4,5,8,10,20,50,100,1000]),
    silver:Object.freeze([1,5,10,20,50,100,250,500,1000,2000])
  });
  const formatter=new Intl.NumberFormat('en-IN',{
    style:'currency',currency:'INR',minimumFractionDigits:0,maximumFractionDigits:2
  });
  function formatINR(value) {
    return typeof value==='number' && Number.isFinite(value)
      ? formatter.format(value) : 'Unavailable';
  }
  function gramLabel(grams) {
    return grams>=1000 && grams%1000===0 ? (grams/1000)+' kg' : grams+' g';
  }
  function calculate(benchmarkRate,metal,weight,unit='g') {
    if(!Object.prototype.hasOwnProperty.call(BASE_GRAMS,metal))
      throw new RangeError('Unsupported metal');
    if(typeof benchmarkRate!=='number' || !Number.isFinite(benchmarkRate) || benchmarkRate<=0)
      throw new RangeError('No valid published benchmark for this metal');
    if(unit!=='g' && unit!=='kg') throw new RangeError('Weight unit must be grams or kilograms');
    if(weight===null || weight===undefined || typeof weight==='boolean' ||
       (typeof weight==='string' && weight.trim()===''))
      throw new RangeError('Enter a valid weight');
    const input=Number(weight);
    const grams=unit==='kg'?input*1000:input;
    if(!Number.isFinite(grams)||grams<.01||grams>100000)
      throw new RangeError('Enter a weight from 0.01 g to 100 kg');
    const basisGrams=BASE_GRAMS[metal];
    const raw=benchmarkRate*grams/basisGrams;
    return {
      grams,basisGrams,benchmarkRate,
      rupeesPerGram:benchmarkRate/basisGrams,
      amount:Math.round((raw+Number.EPSILON)*100)/100
    };
  }
  const api=Object.freeze({BASE_GRAMS,POPULAR_WEIGHTS,calculate,formatINR,gramLabel});
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  root.NextRateWeights=api;
})(typeof window==='undefined'?globalThis:window);
