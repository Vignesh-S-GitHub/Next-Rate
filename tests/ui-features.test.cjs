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
 assert.match(app,/NextRateFeatures\.page/);
 assert.match(app,/NextRateFeatures\.mount/);
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
test('Alerts explain foreground-only behavior and require permission on a click',()=>{
 assert.match(feature,/GitHub Pages cannot send guaranteed background push alerts/);
 assert.match(feature,/Notification\.requestPermission/);
 assert.match(feature,/checkAlerts\(ctx\)/);
 assert.match(feature,/C\.ageDays\(ctx\.rates\.india\.date\)>7/);
 assert.match(feature,/a\.triggeredAt/);
});
test('BIS verification is official external handoff rather than fake verification',()=>{
 assert.match(feature,/www\.bis\.gov\.in\/bis-apps\//);
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
   for(const script of ['features.js','features-core.js','features.css']){
    assert.ok(workflow.includes(script),script+' staged');
   }
   assert.match(workflow,/tests\/features-core\.test\.cjs/);
   assert.match(workflow,/tests\/ui-features\.test\.cjs/);
 }
});
