'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const sources=require('../source-logos.js');
const home=fs.readFileSync(path.join(root,'app.js'),'utf8');
const tools=fs.readFileSync(path.join(root,'features.js'),'utf8');
const css=fs.readFileSync(path.join(root,'features.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const workflows=['pages.yml','refresh-rates.yml'].map(f=>fs.readFileSync(path.join(root,'.github/workflows',f),'utf8'));

test('Publisher logo URLs come from original official websites, never stock or AI images',()=>{
 const p=sources.providers;
 assert.equal(p.ibja.image,'https://www.ibja.co/images/IBJA_logo-big.png');
 assert.match(p.goodreturns.image,/^https:\/\/images\.goodreturns\.in\//);
 assert.match(p.nse.image,/^https:\/\/nsearchives\.nseindia\.com\//);
 assert.match(sources.badge('ibja',{compact:true}),/<img/);
 assert.match(sources.badge('nse'),/Open official NSE source/);
 assert.match(sources.badge('goodreturns'),/Goodreturns/);
});
test('Brand-restricted BIS/AMFI appear as official links, not unapproved logo images',()=>{
 assert.equal(sources.providers.biscare.image,null);
 assert.equal(sources.providers.amfi.image,null);
 assert.doesNotMatch(sources.badge('biscare'),/<img/);
 assert.doesNotMatch(sources.badge('amfi'),/<img/);
 assert.match(sources.badge('biscare'),/href="https:\/\/www\.bis\.gov\.in\/bis-apps/);
 assert.match(sources.badge('amfi'),/href="https:\/\/www\.amfiindia\.com\/"/);
 assert.match(tools,/play\.google\.com\/store\/apps\/details\?id=com\.bis\.bisapp/);
 assert.match(tools,/apps\.apple\.com\/in\/app\/bis-care-app\/id6443724891/);
});
test('Each logo is a real accessible official-source link with fallback for blocked images',()=>{
 const mark=sources.badge('ibja',{label:'IBJA rates'});
 assert.match(mark,/aria-label="Open official IBJA source"/);
 assert.match(mark,/rel="noopener noreferrer"/);
 assert.match(mark,/loading="lazy"/);
 assert.match(mark,/onerror="this\.hidden=true"/);
 assert.match(mark,/source-logo-fallback/);
 assert.match(css,/\.source-logo-img\[hidden\]\{display:none!important\}/);
 assert.throws(()=>sources.badge('not-listed'),RangeError);
 assert.match(sources.badge('goodreturns',{href:'https://www.goodreturns.in/silver-rates/',compact:true}),/silver-rates/);
 assert.doesNotMatch(sources.badge('goodreturns',{href:'https://malicious.example/'}),/malicious\.example/);
});
test('Source links are at Home, Markets, Compare, Hallmark, Buy, ETF, and Shop comparison',()=>{
 assert.match(home,/sourceBadge\('ibja',\{label:'IBJA source'/);
 assert.match(home,/sourceBadge\('ibja',\{label:'IBJA national rates'/);
 assert.match(home,/sourceBadge\('goodreturns',\{label:'City-rate source'/);
 assert.match(home,/sourceBadge\('amfi',\{label:'AMFI NAV source'/);
 assert.match(tools,/official\('biscare',\{label:'BIS Care App'/);
 assert.match(tools,/official\('nse',\{label:'NSE ETF market information'/);
 assert.match(tools,/official\('goodreturns',\{label:'City source'/);
 assert.match(tools,/official\('amfi',\{label:'AMFI NAV source'/);
});
test('Both deployment pipelines include source logos module and cache version is bumped',()=>{
 assert.match(html,/source-logos\.js\?v=20261025-official-sources1/);
 assert.match(html,/features\.css\?v=20261025-official-sources1/);
 for(const wf of workflows){
  assert.match(wf,/node --check source-logos\.js/);
  assert.match(wf,/node --test tests\/source-logos\.test\.cjs/);
  assert.match(wf,/cp index\.html .* source-logos\.js .* _site\//);
 }
});
