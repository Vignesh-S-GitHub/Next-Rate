'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const pages=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8');
const daily=fs.readFileSync(path.join(root,'.github/workflows/refresh-rates.yml'),'utf8');
test('Buy Gold section shows all India ownership routes',()=>{
 for(const title of ['Gold Bar','Gold Coin','Jewellery','Gold ETF','Gold Fund',
  'Gold Bond (SGB)','Digital Gold','Silver Bar','Silver Coin','Silver ETF','Silver Fund']){
  assert.ok(app.includes("'"+title+"'"),title);
 }
 assert.match(app,/Stock broker/);
 assert.match(app,/Bullion dealer/);
 assert.match(app,/Jeweller/);
});
test('Physical estimates contain GST only, with extra charges disclosed',()=>{
 assert.match(app,/NextRateBuying\.metalAndGST/);
 assert.match(app,/IBJA \+ 3% GST only/);
 assert.match(app,/Shop charges extra/);
 assert.match(app,/Making extra/);
 assert.match(app,/Not SEBI regulated/);
});
test('NAV is dated per ETF unit, not traded exchange buy quote',()=>{
 assert.match(app,/getJSON\('funds\.json'\)/);
 assert.match(app,/nav_inr_per_unit/);
 assert.match(app,/daysOld\(nav.nav_date\)>10/);
 assert.match(app,/AMFI NAV per unit/);
 assert.match(app,/not live buy price/);
 assert.match(app,/Old bonds only/);
});
test('Both metal tabs and popular weights use published IBJA benchmarks',()=>{
 assert.match(app,/data-buy-metal="gold"/);
 assert.match(app,/data-buy-metal="silver"/);
 assert.match(app,/data-buy-grams/);
 assert.match(app,/buyGrams=buyMetal==='gold'\?8:100/);
 for(const metal of ['gold24','gold22','silver'])assert.ok(app.includes("benchmark('"+metal+"')"));
});
test('Both workflows publish AMFI and validated GST helper',()=>{
 for(const wf of [pages,daily]){
  assert.match(wf,/python scripts\/update_funds\.py/);
  assert.match(wf,/data\/funds\.json/);
  assert.match(wf,/buy-options\.js/);
  assert.match(wf,/buy-options\.test\.cjs/);
 }
 assert.match(html,/buy-options\.js/);
});
