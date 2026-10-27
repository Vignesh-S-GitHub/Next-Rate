const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createLoader}=require('../data-loader.js');
const names=['latest.json','history.json','forecast.json','funds.json','cities.json','forecast_history.json'];
const docs=Object.fromEntries(names.map(n=>[n,{schema_version:1,revision:5}]));
const response=value=>({ok:true,json:async()=>value});
test('All six documents share one Cloudflare publication request',async()=>{
 let count=0;const loader=createLoader(async url=>{count++;assert.ok(url.endsWith('/bundle.json'));return response({schema_version:1,documents:docs});});
 const loaded=await Promise.all(names.map(n=>loader.get(n)));assert.equal(count,1);assert.equal(loaded.length,6);assert.ok(loaded.every(x=>x.revision===5));
});
test('An incomplete API response falls back as a set without mixing publications',async()=>{
 const loader=createLoader(async url=>url.includes('bundle.json')?response({schema_version:1,documents:{'latest.json':{schema_version:1,revision:9}}}):response({schema_version:1,revision:2}));
 const loaded=await Promise.all(names.map(n=>loader.get(n)));assert.ok(loaded.every(x=>x.revision===2));
});
test('Local fallback retains independent failures and rejects unknown document names',async()=>{
 const loader=createLoader(async url=>{if(url.includes('bundle')||url.includes('history'))throw Error('offline');return response({schema_version:1});});
 assert.equal((await loader.get('latest.json')).schema_version,1);await assert.rejects(loader.get('history.json'));await assert.rejects(loader.get('../secret'));
});
