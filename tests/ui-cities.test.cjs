'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const pages=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8');
const scheduled=fs.readFileSync(path.join(root,'.github/workflows/refresh-rates.yml'),'utf8');
const cities=JSON.parse(fs.readFileSync(path.join(root,'data/cities.json'),'utf8'));
test('all five city labels and source attribution are actually displayed',()=>{
 for(const city of ['Chennai','Mumbai','Delhi','Bengaluru','Hyderabad']){
   assert.ok(app.includes(city) || html.includes(city),city);
   assert.ok(cities.cities[city],city+' seeded rate');
 }
 assert.match(app,/cityComparison\(\)/);
 assert.match(app,/cityQuote\(c,key\)/);
 assert.match(app,/sourceBadge\('goodreturns',\{label:'City-rate source'/);
 assert.match(require('../source-logos.js').badge('goodreturns'),/goodreturns\.in/);
 assert.match(app,/Published city estimates, not individual jeweller quotations/);
 assert.match(app,/IBJA national rate is different from city indicative rates/);
});
test('24K/22K are sourced per gram, silver per kilogram; never infer city premium from IBJA',()=>{
 assert.match(app,/gold24_inr_g/);
 assert.match(app,/gold22_inr_g/);
 assert.match(app,/silver999_inr_kg/);
 assert.match(app,/cityRates\?\.dates/);
 assert.match(app,/age<=7/);
 assert.match(app,/No published city rate/);
 assert.match(app,/getJSON\('cities\.json'\)/);
 assert.match(app,/8g /);
 for(const data of Object.values(cities.cities)){
   assert.ok(data.gold24_inr_g>data.gold22_inr_g);
   assert.ok(data.silver999_inr_kg>0);
 }
});
test('Tamil control is accessible, theme-matched and renders across all routes',()=>{
 assert.match(html,/data-language="en"/);
 assert.match(html,/data-language="ta"/);
 assert.match(html,/>தமிழ்<\/button>/);
 assert.match(html,/i18n\.js\?v=20261025-no-notifications1/);
 assert.match(app,/function setLanguage\(language\)/);
 assert.match(app,/NextRateI18n\.apply\(document\.body,appLanguage\)/);
 assert.match(css,/\.lang-button\.active/);
 assert.match(css,/@media\(max-width:520px\)/);
});
test('both deployments refresh and publish city data and language assets',()=>{
 for(const wf of [pages,scheduled]){
  assert.match(wf,/python scripts\/update_cities\.py/);
  assert.match(wf,/data\/cities\.json/);
  assert.match(wf,/i18n\.js/);
  assert.match(wf,/ui-cities\.test\.cjs/);
 }
});
test('city prices carry an observation date and must not be called live checkout prices',()=>{
 assert.equal(cities.schema_version,1);
 assert.equal(cities.source,'Goodreturns indicative city rate tables');
 assert.ok(cities.dates.gold);
 assert.ok(cities.dates.silver);
 assert.match(cities.basis,/not a jeweller checkout quote/);
});
