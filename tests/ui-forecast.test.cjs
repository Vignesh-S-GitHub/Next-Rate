'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const pages=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8');
const daily=fs.readFileSync(path.join(root,'.github/workflows/refresh-rates.yml'),'utf8');

test('Tomorrow prediction is the first feature on NextRate Home',()=>{
  const fn=app.slice(app.indexOf('function home() {'),app.indexOf('function marketCard(',app.indexOf('function home() {')));
  assert.ok(fn.indexOf('forecastPanel()')>=0);
  assert.ok(fn.indexOf('forecastPanel()')<fn.indexOf('Latest Verified Gold & Silver Rates'));
  assert.ok(fn.indexOf('Latest Verified Gold & Silver Rates')<fn.indexOf('weightPriceSection()'));
  assert.ok(!fn.includes('Tomorrow’s forecast is not active'));
});
test('Forecast is server-sourced, dated, and clearly experimental',()=>{
  assert.match(app,/getJSON\('forecast\.json'\)/);
  assert.match(app,/forecast\.target_date >= indiaTodayISO\(\)/);
  assert.match(app,/forecast\.calendar_tomorrow===forecast\.target_date/);
  assert.match(app,/forecast\.based_on_date/);
  assert.match(app,/Experimental forecast/);
  assert.match(app,/not<\/strong> a validated confidence interval/);
  assert.match(app,/Next IBJA publication outlook|Next expected IBJA publication/);
});
test('All three metals have an estimate and scenario range',()=>{
  assert.match(app,/forecastMetalCard\('gold24'/);
  assert.match(app,/forecastMetalCard\('gold22'/);
  assert.match(app,/forecastMetalCard\('silver'/);
  assert.match(app,/price\(data.low\)/);
  assert.match(app,/price\(data.high\)/);
  assert.match(app,/expected_change_pct/);
});
test('Forecast does not imply official unavailable exchanges are predictors',()=>{
  assert.match(app,/item.used_in_estimate/);
  assert.match(app,/Context/);
  assert.match(app,/IBJA/);
  assert.match(app,/city premiums are excluded/);
  assert.match(app,/used_in_estimate/);
});
test('Both publication paths ship dated forecast output',()=>{
  for(const wf of [pages,daily]){
    assert.match(wf,/python scripts\/forecast.py/);
    assert.match(wf,/data\/forecast\.json/);
    assert.match(wf,/data\/forecast_history\.json/);
    assert.match(wf,/ui-forecast\.test\.cjs/);
  }
});
test('Mobile forecast has its own readable card layout',()=>{
  assert.match(css,/\.forecast-grid/);
  assert.match(css,/\.forecast-metal/);
  assert.match(css,/@media\(max-width:680px\)/);
  assert.match(css,/\.forecast-direction\.is-down/);
  assert.match(css,/\.market-trend-svg/);
  assert.match(css,/\.forecast-metal\.selected/);
});

test('Stock-market-style chart selects only actual observations and a clearly dashed outlook',()=>{
  assert.match(app,/function marketGraph\(\)/);
  assert.match(app,/data-forecast-metal/);
  assert.match(app,/activeForecastMetal=button\.dataset\.forecastMetal/);
  assert.match(app,/r\.date<=forecast\.based_on_date/);
  assert.match(app,/stroke-dasharray/);
  assert.match(app,/Model estimate/);
  assert.match(app,/Published rate/);
});
test('Home shows compact watchlist, chart, referenced quotes and disclosed caveats',()=>{
  assert.match(app,/METAL WATCHLIST/);
  assert.match(app,/marketSnapshot\(\)/);
  assert.match(app,/market-chart-title/);
  assert.match(app,/<details class="forecast-details"/);
  assert.match(app,/Not yet model inputs/);
  assert.match(css,/\.forecast-market-layout/);
});
