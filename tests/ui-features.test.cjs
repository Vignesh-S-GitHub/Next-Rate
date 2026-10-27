'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(root+'/app.js','utf8'),feature=fs.readFileSync(root+'/features.js','utf8');
const index=fs.readFileSync(root+'/index.html','utf8'),css=fs.readFileSync(root+'/features.css','utf8');
const C=require('../features-core.js'),F=require('../features.js');
test('Only resale, hallmark and ETF tools remain, with no retired panels or handlers',()=>{
 assert.deepEqual(F.sections.map(x=>x[0]),['resale','hallmark','etfs']);
 for(const fn of ['alertPanel','billPanel','accuracyPanel','shopsPanel','portfolioPanel','signalsPanel','checkAlerts','importBackup'])assert.ok(!feature.includes(fn));
 for(const fn of ['jewelleryBill','manualShopBill','holdingValuation','alertValue','triggered','historicalAccuracy'])assert.equal(C[fn],undefined);
 assert.doesNotMatch(feature,/data-delete-kind|data-feature-import|data-feature-action|9 tools|tool-count/);
});
test('Supported panels retain working forms and authoritative plain source links',()=>{
 const context={rates:{india:{date:'2026-10-27',gold24_inr_10g:141431,gold22_inr_10g:129551}},funds:{funds:{goldbees:{name:'Nippon India ETF Gold BeES',kind:'Gold ETF',nav_inr_per_unit:116.1,nav_date:'2026-10-26'}}}};
 for(const [id,kind]of [['resale','resale'],['hallmark','huid'],['etfs','etf']]){
  F.select(id);const markup=F.page(context);
  assert.ok(markup.includes('data-feature-form="'+kind+'"'));assert.ok(markup.includes('data-tool-select="'+id+'" aria-pressed="true"'));
  assert.doesNotMatch(markup,/source-logo|tool-count|<svg/);
 }
 F.select('hallmark');assert.match(F.page(context),/play\.google\.com\/store\/apps\/details\?id=com\.bis\.bisapp/);
 assert.match(F.page(context),/NextRate cannot verify HUID by itself/);
 F.select('etfs');assert.match(F.page(context),/NAV is not a trade price/);assert.match(F.page(context),/nseindia\.com/);
});
test('Compact controls remain reachable through all five routes and keyboard pickers',()=>{
 for(const route of ['home','markets','compare','insights','tools'])assert.ok(index.includes('data-route="'+route+'"'));
 assert.match(css,/repeat\(5,minmax\(0,1fr\)\)/);assert.match(css,/repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(feature,/ArrowDown/);assert.match(feature,/Escape/);assert.match(feature,/aria-selected/);
 assert.match(app,/NextRateFeatures\?\.mount/);assert.doesNotMatch(app,/data-feature-link="jewellery"|checkAlerts|About this estimate|Data checked|data-refresh/);
});
test('Old saved preferences cannot reopen removed tools and only ETF quotes migrate',()=>{
 const previous=JSON.stringify({version:1,preferred:'portfolio',holdings:[{}],etfQuotes:{goldbees:{quote:120,date:'2026-10-26'}}});
 const saved=[];const win={NextRateCore:C,localStorage:{getItem:k=>k==='nextrate-tools-v1'?previous:null,setItem:(k,v)=>saved.push([k,JSON.parse(v)])}};
 vm.runInNewContext(feature,{window:win});
 const state=JSON.parse(JSON.stringify(win.NextRateFeatures.getState()));
 assert.deepEqual(state,{preferred:'resale',etfQuotes:{goldbees:{quote:120,date:'2026-10-26'}}});
 win.NextRateFeatures.select('etfs');assert.equal(saved[0][0],'nextrate-tools-v2');assert.equal(saved[0][1].version,2);
 win.NextRateFeatures.select('portfolio');assert.equal(win.NextRateFeatures.getState().preferred,'etfs');
});
