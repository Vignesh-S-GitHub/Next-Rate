'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');

test('City selector stays inside branded page and not native Android selection sheet',()=>{
  assert.match(html,/class="city-trigger"/);
  assert.match(html,/class="city-menu"/);
  assert.doesNotMatch(html,/<select[^>]*id="city-select"/);
  assert.match(app,/function setupCityMenu/);
  assert.match(app,/aria-pressed/);
  assert.match(css,/\.city-option\[aria-pressed="true"\]/);
});
test('Grams and kilograms are accessible branded buttons, not native select',()=>{
  assert.doesNotMatch(app,/<select id="weight-unit"/);
  assert.match(app,/class="unit-toggle"/);
  assert.match(app,/data-unit="g"/);
  assert.match(app,/data-unit="kg"/);
  assert.match(app,/syncUnitButtons/);
  assert.match(css,/\.unit-button\.active/);
});
test('Site keeps both live calculations and transparent bullion icons',()=>{
  assert.match(app,/NextRateWeights\.calculate/);
  assert.match(app,/gold-bar\.webp/);
  assert.match(app,/silver-bar\.webp/);
  assert.match(app,/bullion-gold/);
  assert.match(css,/\.bullion-gold\s*\{/);
  assert.match(app,/src="\.\/assets\/silver-bar\.webp\?v=20261025-doublebars"/);
  assert.match(app,/getJSON\('latest\.json'\)/);
  assert.match(html,/styles\.css\?v=20261025-tools1/);
  assert.match(html,/app\.js\?v=20261025-tools1/);
});
test('Menu supports close on Escape and tap outside',()=>{
  assert.match(app,/event\.key==='Escape'/);
  assert.match(app,/document\.addEventListener\('pointerdown'/);
  assert.match(app,/cityTrigger\.focus\(\)/);
});
