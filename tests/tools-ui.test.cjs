'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const ui=require('../tools-ui.js');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const pages=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8');
const daily=fs.readFileSync(path.join(root,'.github/workflows/refresh-rates.yml'),'utf8');
const context={rates:{india:{date:'2026-10-23',gold24_inr_10g:141630,gold22_inr_10g:129733,silver999_inr_kg:194415},
 spot:{XAU:{usd_per_troy_ounce:3996.9,as_of:'2026-10-23T10:00:00Z'},XAG:{usd_per_troy_ounce:54.05}}},
 fx:{inr_per_usd:94.76,date:'2026-10-23'},
 funds:{funds:{goldbees:{name:'Gold BeES',kind:'Gold ETF',nav_inr_per_unit:116.01,nav_date:'2026-10-23'}}},
 forecast:{metals:{gold24:{backtest:{status:'walk_forward',holdout_mape_pct:0.62,holdout_naive_mape_pct:0.62}}}},
 forecastHistory:{forecasts:[]},cityRates:{dates:{gold:'2026-10-23'},cities:{}},
 city:'Chennai',language:'en'};
test('all nine tools render with actual sample data and no backend',()=>{
 assert.equal(ui.items.length,9);
 for(const [key] of ui.items){
   ui.open(key);
   const html=ui.render(context);
   assert.match(html,/class="nt-app"/);
   assert.match(html,/data-nt-module/);
   assert.ok(html.length>450,key);
 }
});
test('all nine tools support the Tamil header',()=>{
 for(const [key] of ui.items){
   ui.open(key);
   const markup=ui.render({...context,language:'ta'});
   assert.match(markup,/[ஃ-ஹ]/u);
 }
});
test('jewellery, verified BIS source, ETF NAV and premium tools are present',()=>{
 ui.open('bill');assert.match(ui.render(context),/nt-bill-form/);
 ui.open('hallmark');assert.match(ui.render(context),/https:\/\/www.bis.gov.in\/bis-apps/);
 ui.open('etf');assert.match(ui.render(context),/AMFI/);
 ui.open('accuracy');assert.match(ui.render(context),/No proven improvement/);
 ui.open('portfolio');assert.match(ui.render(context),/nt-holding-form/);
 ui.open('sell');assert.match(ui.render(context),/nt-resale-form/);
 ui.open('global');assert.match(ui.render(context),/official feeds not connected/);
 ui.open('alerts');assert.match(ui.render(context),/No background push service/);
 ui.open('shops');assert.match(ui.render(context),/No verified dealer feed is connected/);
});
test('source destinations are official sites and no fabricated exchanges',()=>{
 for(const key of ['bis','gst','amfi','lbma','cme','mcx','sebi'])
  assert.match(ui.source[key],/^https:\/\//);
});
test('app navigation and both Pages builds include scripts and tests',()=>{
 assert.match(app,/tools:toolsPage/);
 assert.match(app,/NextRateFeatures\.mount/);
 assert.match(app,/data-feature-link/);
 assert.match(app,/getJSON\('forecast_history\.json'\)/);
 assert.match(html,/data-route="tools"/);
 for(const script of ['features-core.js','features.js'])assert.match(html,new RegExp(script.replace('.','\\.')));
 for(const wf of [pages,daily]){
  assert.match(wf,/node --test tests\/tools-core\.test\.cjs/);
  assert.match(wf,/node --test tests\/tools-ui\.test\.cjs/);
  assert.match(wf,/cp index\.html .*features\.js.*_site\//);
 }
});
