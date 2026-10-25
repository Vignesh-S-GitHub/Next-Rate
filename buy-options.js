/* Bullion metal + Indian GST benchmark; NOT an actual shop selling price. */
(function(root){
  'use strict';
  const weights = typeof module!=='undefined'&&module.exports
    ? require('./weights.js') : root.NextRateWeights;
  function metalAndGST(rate,metal,grams) {
    const metalValue=weights.calculate(rate,metal,grams).amount;
    const gst=Math.round((metalValue*0.03+Number.EPSILON)*100)/100;
    return Object.freeze({
      grams,metalValue,gstRate:0.03,gst,
      subtotal:Math.round((metalValue+gst+Number.EPSILON)*100)/100,
      excludes:'Seller premiums and jewellery making charges',
      isShopQuote:false
    });
  }
  const api=Object.freeze({metalAndGST});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.NextRateBuying=api;
})(typeof window==='undefined'?globalThis:window);
