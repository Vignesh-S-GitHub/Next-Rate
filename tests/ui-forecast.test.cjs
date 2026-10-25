'use strict';
const assert=require('node:assert/strict'),test=require('node:test');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const chart=fs.readFileSync(path.join(root,'chart-ui.js'),'utf8');
const model=fs.readFileSync(path.join(root,'chart-interaction.js'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const pages=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8');
const daily=fs.readFileSync(path.join(root,'.github/workflows/refresh-rates.yml'),'utf8');

test('Home shows tomorrow, today, weights and buy together',()=>{
 const s=app.slice(app.indexOf('function home(){'),app.indexOf('function marketCard(',app.indexOf('function home(){')));
 assert.ok(s.includes('forecastPanel()+homeTodayPanel()'));
 assert.ok(s.indexOf('forecastPanel()')<s.indexOf('homeTodayPanel()'));
 assert.ok(s.indexOf('homeTodayPanel()')<s.indexOf('homeWeightPanel()'));
 assert.ok(s.indexOf('homeWeightPanel()')<s.indexOf('homeBuyPanel()'));
 assert.match(app,/home-weight-expand/);
 assert.match(app,/home-buy-expand/);
});
test('Predictions are dated model files, not live official exchange quotes',()=>{
 assert.match(app,/getJSON\('forecast\.json'\)/);
 assert.match(app,/forecast\.target_date >= indiaTodayISO\(\)/);
 assert.match(app,/forecast\.based_on_date/);
 assert.match(app,/forecastMetalCard\('gold24'/);
 assert.match(app,/forecastMetalCard\('gold22'/);
 assert.match(app,/forecastMetalCard\('silver'/);
 assert.match(app,/price\(data.low\)/);
 assert.match(app,/price\(data.high\)/);
 assert.match(app,/expected_change_pct/);
 assert.match(app,/Range is not a guarantee/);
 assert.match(app,/LBMA, COMEX and MCX are not yet model inputs/);
});
test('Trend chart separates actual IBJA from dashed estimate',()=>{
 assert.match(app,/function marketGraph\(\)/);
 assert.match(app,/data-forecast-metal/);
 assert.match(app,/activeForecastMetal=button\.dataset\.forecastMetal/);
 assert.match(model,/r\.date>forecast\.based_on_date/);
 assert.match(chart,/stroke-dasharray/);
 assert.match(chart,/>Actual<\/span>/);
 assert.match(chart,/>Estimate<\/span>/);
});
test('Mobile chart and price rows remain responsive',()=>{
 assert.match(css,/\.forecast-grid/);
 assert.match(css,/\.forecast-metal\.selected/);
 assert.match(css,/\.market-trend-svg/);
 assert.match(css,/\.nr-chart/);
 assert.match(css,/@media\(max-width:680px\)/);
});
test('Both workflows generate archived dated forecasts',()=>{
 for(const wf of [pages,daily]){
  assert.match(wf,/python scripts\/forecast\.py/);
  assert.match(wf,/data\/forecast\.json/);
  assert.match(wf,/data\/forecast_history\.json/);
  assert.match(wf,/ui-forecast\.test\.cjs/);
 }
});

test('Chart periods and measured model error stay visible and compact',()=>{
 assert.match(app,/function forecastProof\(\)/);
 assert.match(app,/holdout_mape_pct/);
 assert.match(app,/holdout_naive_mape_pct/);
 assert.match(app,/data-chart-days/);
 assert.match(app,/chartDays = 7/);
 assert.match(css,/\.home-dashboard/);
 assert.match(css,/\.home-today-item/);
 assert.match(css,/\.home-weight-cell/);
 assert.match(css,/\.home-buy-cell/);
});

test('Today and next-open-day forecasts cannot be mislabelled Tomorrow',()=>{
 assert.match(app,/const panelTitle=valid/);
 assert.match(app,/forecast\.target_date===indiaTodayISO\(\)/);
 assert.match(app,/Today outlook/);
 assert.match(app,/Next open day/);
 assert.match(chart,/markerStep/);
});

test('Markets distinguish provider fetch times from market trade times, especially Sundays',()=>{
  assert.match(app,/function isIndiaWeekend\(\)/);
  assert.match(app,/function marketStatusNote\(\)/);
  assert.match(app,/Markets closed \(weekend\)/);
  assert.match(app,/spot timestamps show when the provider fetched/);
  assert.match(app,/Fetched /);
  assert.match(app,/Reference /);
  assert.match(app,/Actual result: pending until/);
});

test('Actual dates and forecast range are independently inspectable on mobile',()=>{
 assert.match(app,/ui\.render\(\{/);
 assert.match(app,/wireChartInspection\(\)/);
 assert.match(app,/chartSelectedDate=null/);
 assert.match(app,/Possible range · not guaranteed/);
 assert.match(app,/Prediction · not actual/);
 assert.match(app,/Same as last close/);
 assert.match(chart,/data-chart-point/);
 assert.match(chart,/data-chart-slider/);
 assert.match(chart,/chart-point-tooltip/);
 assert.doesNotMatch(chart,/chart-inspect-panel/);
 assert.match(chart,/ArrowLeft/);
 assert.match(chart,/role="status"/);
 assert.match(chart,/Move slider/);
 assert.doesNotMatch(chart,/data-chart-step|chart-usage-tip/);
 assert.match(model,/function observations\(/);
 assert.match(model,/function indexAtX\(/);
 assert.match(model,/date<=forecast\.based_on_date|r\.date>forecast\.based_on_date/);
});
