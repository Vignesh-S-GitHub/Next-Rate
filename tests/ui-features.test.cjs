'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(root+'/app.js','utf8');
const index=fs.readFileSync(root+'/index.html','utf8');
const css=fs.readFileSync(root+'/features.css','utf8');
const feature=fs.readFileSync(root+'/features.js','utf8');
const pages=fs.readFileSync(root+'/.github/workflows/pages.yml','utf8');
const daily=fs.readFileSync(root+'/.github/workflows/refresh-rates.yml','utf8');
test('Tools route is reachable on desktop and phone without losing logo and four original tabs',()=>{
 for(const route of ['home','markets','compare','insights','tools']){
  assert.match(index,new RegExp('data-route="'+route+'"'));
 }
 assert.match(index,/data-route="tools".+>Tools<\/a>/s);
 assert.match(index,/assets\/nextrate-icon\.png/);
 assert.match(css,/repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(app,/NextRateFeatures\?\.page/);
 assert.match(app,/NextRateFeatures\?\.mount/);
});
test('Nine features are implemented as working panels with meaningful form handlers',()=>{
 for(const key of ['alerts','jewellery','accuracy','shops','portfolio','resale','hallmark','etfs','signals']){
  assert.match(feature,new RegExp("'"+key+"'"));
 }
 for(const kind of ['alert','jewellery','shops','holdings','resale','huid','etf']){
  assert.match(feature,new RegExp("kind==='"+kind+"'"));
 }
 assert.match(feature,/data-tool-select/);
 assert.match(feature,/data-delete-kind/);
 assert.match(feature,/onSubmit/);
});
test('Android alerts use service worker, explicit consent and test delivery',()=>{
 assert.match(feature,/GitHub Pages cannot send guaranteed background push alerts/);
 assert.match(feature,/Notifications[.]enable/);
 assert.match(feature,/Notifications[.]show/);
 assert.match(feature,/Send test notification/);
 assert.doesNotMatch(feature,/new root[.]Notification/);
 assert.match(feature,/checkAlerts/);
 assert.match(feature,/C[.]ageDays/);
 assert.match(feature,/a[.]triggeredAt/);
 assert.match(feature,/inFlightNotifications/);
 assert.match(feature,/a[.]notifiedAt/);
 assert.match(feature,/if\(demo[.]ok\)checkAlerts\(context\(\)\)/);
 assert.match(index,/browser-notifications[.]js/);
 assert.match(feature,/data-notification-status/);
 assert.match(feature,/notificationRequestPending/);
 assert.match(feature,/watchPermission/);
 assert.match(feature,/Request sent/);
});
test('BIS verification is official external handoff rather than fake verification',()=>{
 assert.match(require('../source-logos.js').badge('biscare'),/www\.bis\.gov\.in\/bis-apps/);
 assert.match(feature,/cannot verify HUID by itself/);
 assert.match(feature,/Not yet verified/);
 assert.doesNotMatch(feature,/HUID verified successfully/);
});
test('Shop and portfolio data stay on device with backup and unverified markers',()=>{
 assert.match(feature,/localStorage/);
 assert.match(feature,/nextrate-tools-v1/);
 assert.match(feature,/No independent shop-by-shop quote feed is connected/);
 assert.match(feature,/Download my backup/);
 assert.match(feature,/Restore backup/);
 assert.match(feature,/Manual shop quote saved/);
});
test('Market signals never fabricate COMEX LBMA or MCX and ETFs never fake LTP',()=>{
 assert.match(feature,/Official feed not connected/);
 assert.match(feature,/Official LBMA, COMEX and MCX signals are not included/);
 assert.match(feature,/NAV is not an executable exchange quote/);
 assert.match(feature,/Expense ratios, tracking differences/);
});
test('Both deployments stage tool scripts, stylesheet and run tests',()=>{
 for(const workflow of [pages,daily]){
   for(const script of ['features.js','features-core.js','features.css','browser-notifications.js','notification-sw.js']){
    assert.ok(workflow.includes(script),script+' staged');
   }
   assert.match(workflow,/tests\/features-core\.test\.cjs/);
   assert.match(workflow,/tests\/ui-features\.test\.cjs/);
   assert.ok(workflow.includes('tests/browser-notifications.test.cjs'));
 }
});

test('Every tool panel renders using a dated India market snapshot',()=>{
 const module=require('../features.js');
 const context={
  rates:{india:{date:'2026-10-23',gold24_inr_10g:141630,gold22_inr_10g:129733,
   silver999_inr_kg:194415},
   spot:{XAU:{usd_per_troy_ounce:3996.9,as_of:'2026-10-23T08:00:00Z'},
         XAG:{usd_per_troy_ounce:54.05,as_of:'2026-10-23T08:00:00Z'}},
   fx:{inr_per_usd:94.76,date:'2026-10-23'}},
  funds:{funds:{goldbees:{name:'Nippon India ETF Gold BeES',kind:'Gold ETF',nav_inr_per_unit:116.0136,nav_date:'2026-10-23'}}},
  cities:{cities:{Chennai:{gold22_inr_g:13070}},dates:{gold:'2026-10-23'}},
  forecast:{metals:{gold24:{backtest:{status:'walk_forward',holdout_mape_pct:0.629,holdout_naive_mape_pct:0.629}}}},
  forecastHistory:{forecasts:[{target_date:'2026-10-26',metals:{gold24:{estimate:141630}}}]},
  city:'Chennai',language:'en',refresh:()=>{}
 };
 assert.equal(module.sections.length,9);
 for(const [id] of module.sections){
   module.select(id);
   const markup=module.page(context);
   assert.match(markup,/class="toolspage"/);
   assert.match(markup,new RegExp('data-tool-select="'+id+'"'));
   assert.ok(markup.length>950,id);
 }
 module.select('alerts');
 assert.match(module.page(context),/GitHub Pages cannot send guaranteed background push alerts/);
 module.select('hallmark');
 assert.match(module.page(context),/official BIS Care/);
 module.select('signals');
 assert.match(module.page(context),/Official feed not connected/);
});


test('Official source identities appear in the relevant tools without pretending endorsement',()=>{
 const provider=require('../source-logos.js');
 const coreContext={rates:{india:{date:'2026-10-23'}},
   cities:{cities:{Chennai:{gold22_inr_g:13070}},dates:{gold:'2026-10-23'}},
   funds:{funds:{goldbees:{name:'Gold BeES',kind:'Gold ETF',nav_inr_per_unit:116.0,nav_date:'2026-10-23'}}},
   forecastHistory:{forecasts:[]},city:'Chennai',language:'en',refresh:()=>{}};
 const feature=require('../features.js');
 feature.select('hallmark');
 const hallmark=feature.page(coreContext);
 assert.match(hallmark,/data-tool-select="hallmark"/);
 assert.match(hallmark,/play\.google\.com\/store\/apps\/details\?id=com\.bis\.bisapp/);
 assert.match(hallmark,/apps\.apple\.com\/in\/app\/bis-care-app\/id6443724891/);
 assert.match(hallmark,/BIS Care verification opens outside NextRate/);
 assert.doesNotMatch(provider.badge('biscare'),/<img/);
 feature.select('etfs');
 const etf=feature.page(coreContext);
 assert.match(etf,/NSE ETF market information/);
 assert.match(etf,/AMFI NAV source/);
 assert.match(etf,/nsearchives\.nseindia\.com/);
 assert.doesNotMatch(provider.badge('amfi'),/<img/);
 feature.select('shops');
 assert.match(feature.page(coreContext),/images\.goodreturns\.in/);
});

test('Reached before permission: a recently triggered target notifies once after enabling',async()=>{
 const vm=require('node:vm');
 const core=require('../features-core.js');
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',
  year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const part=name=>parts.find(x=>x.type===name).value;
 const day=part('year')+'-'+part('month')+'-'+part('day');
 const record={version:1,notifications:true,preferred:'alerts',
  alerts:[{id:'a-previously-hit',metal:'gold24',grams:10,op:'above',
   target:140000,triggeredAt:day,triggerPrice:141630}],
  shops:[],holdings:[],etfQuotes:{}};
 let storage=JSON.stringify(record),sent=[];
 const win={
  NextRateCore:core,
  NextRateSources:{badge:()=>''},
  NextRateNotifications:{
   permitted:()=>true,
   show:async(title,body,tag)=>{sent.push({title,body,tag});return {ok:true};}
  },
  localStorage:{getItem:()=>storage,setItem:(_,value)=>{storage=value;}},
 };
 vm.runInNewContext(feature,{window:win});
 const ctx={rates:{india:{date:day,gold24_inr_10g:141630}},refresh:()=>{}};
 assert.equal(win.NextRateFeatures.checkAlerts(ctx),0);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(sent.length,1);
 assert.match(sent[0].body,/reached/);
 assert.equal(JSON.parse(storage).alerts[0].notifiedAt,day);
 assert.equal(win.NextRateFeatures.checkAlerts(ctx),0);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(sent.length,1,'no duplicate notice');
});
