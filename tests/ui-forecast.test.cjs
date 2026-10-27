'use strict';
const assert=require('node:assert/strict'),test=require('node:test');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const chart=fs.readFileSync(path.join(root,'chart-ui.js'),'utf8');
const model=fs.readFileSync(path.join(root,'chart-interaction.js'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const pages=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8');

test('Home uses two continuous desktop columns and a compact mobile order',()=>{
 const section=app.slice(app.indexOf('function home(){'),app.indexOf('function featuresContext(){'));
 assert.match(section,/home-primary/);assert.match(section,/home-sidebar/);
 for(const name of ['homeTodayPanel','forecastPanel','homeForecastResultPanel','homeWeightPanel','homeBuyPanel'])assert.ok(section.includes(name+'()'));
 assert.doesNotMatch(section,/homeMetalLearning|feature-link/);
 assert.match(css,/display:contents/);
});
test('Predictions are dated model files, not live official exchange quotes',()=>{
 assert.match(app,/getJSON\('forecast\.json'\)/);
 assert.match(app,/forecastIsConsistent/);
 assert.match(app,/indiaTodayISO\(\)/);
 assert.match(app,/forecast\.based_on_date/);
 assert.match(app,/forecastMetalCard\('gold24'/);
 assert.match(app,/forecastMetalCard\('gold22'/);
 assert.match(app,/forecastMetalCard\('silver'/);
 assert.match(app,/price\(data.low\)/);
 assert.match(app,/price\(data.high\)/);
 assert.match(app,/data.estimate\/data.baseline-1/);
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
test('Only Cloudflare builds forecasts; Pages serves committed forecasts',()=>{
 assert.match(fs.readFileSync(root+'/cloudflare/nextrate-scheduler/pipeline.mjs','utf8'),/publishForecast/);
 assert.doesNotMatch(pages,/python scripts\/forecast\.py/);
 for(const workflow of [pages]){
  assert.ok(workflow.includes('data/forecast.json'));
  assert.ok(workflow.includes('data/forecast_history.json'));
  assert.ok(workflow.includes('node --test tests/*.test.cjs'));
 }
});
test('Chart periods remain visible without a technical explanation panel',()=>{
 assert.match(app,/data-chart-days/);assert.match(app,/chartDays = 7/);
 assert.doesNotMatch(app,/About this estimate|function forecastProof|nr-small-details/);
 assert.doesNotMatch(app,/Data checked|data-refresh|Actual national rate/);
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
 });

test('Actual dates and forecast range are independently inspectable on mobile',()=>{
 assert.match(app,/ui\.render\(\{/);
 assert.match(app,/wireChartInspection\(\)/);
 assert.match(app,/chartSelectedDate=null/);
 assert.match(app,/Typical range · 50%/);
 assert.match(app,/class="forecast-prediction-label">Estimate/);
 assert.match(app,/Same as last close/);
 assert.match(chart,/data-chart-point/);
 assert.doesNotMatch(chart,/data-chart-slider/);
 assert.match(chart,/chart-point-tooltip/);
 assert.doesNotMatch(chart,/chart-inspect-panel/);
 assert.match(chart,/ArrowLeft/);
 assert.match(chart,/currentIndex/);
 assert.match(chart,/role="status"/);
 assert.doesNotMatch(chart,/Move slider/);
 assert.doesNotMatch(chart,/data-chart-step|chart-usage-tip/);
 assert.match(model,/function observations\(/);
 assert.match(model,/function indexAtX\(/);
 assert.match(model,/date<=forecast\.based_on_date|r\.date>forecast\.based_on_date/);
});

test('Insights teaches price drivers visually using gold/silver images',()=>{
 assert.match(app,/function factorIcon/);
 assert.match(app,/class="factor-svg"/);
 assert.match(app,/class="factor-card"/);
 assert.match(app,/function metalPicture\(metal,size=62\)/);
 assert.match(app,/Two gold bars/);
 assert.match(app,/Two silver bars/);
 assert.doesNotMatch(app,/assets\/'\+metal\+'-bar\.webp/);
 assert.match(app,/Gold drivers/);
 assert.match(app,/Silver drivers/);
 assert.match(app,/Solar panels use silver/);
 assert.match(app,/Higher real yields/);
 assert.match(app,/not the proven cause/);
 assert.match(css,/\.insights-metal-grid/);
 assert.match(css,/\.factor-symbol/);
});
test('Home displays rupee/percent movement and keeps provisional forecast checks ungraded',()=>{
 const vm=require('node:vm');
 const core=require('../features-core.js');
 const snapshot={india:{date:'2026-10-26',session:'AM',gold24_inr_10g:141290,gold22_inr_10g:129422,silver999_inr_kg:195050}};
 const ctx={window:{NextRateCore:core},rates:snapshot,priceChangeDays:0,
  history:{india:[{date:'2026-10-23',session:'PM',gold24_inr_10g:141630,gold22_inr_10g:129733,silver999_inr_kg:194415}]},
  benchmark:key=>({value:core.publishedRate(snapshot,key)}),sourceDate:x=>x,
  india:()=>snapshot.india,indiaTodayISO:()=>'2026-10-26',escapeHTML:x=>String(x),
  homeCityPrice:()=>'',sourceBadge:()=>'',price:n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n),
  issuedForecasts:{forecasts:[{target_date:'2026-10-26',based_on_date:'2026-10-23',issued_at:'2026-10-25T10:00:00Z',
    metals:{gold24:{estimate:141630,baseline:141630,low:140000,high:143000}}}]}};
 vm.createContext(ctx);vm.runInContext(app.slice(app.indexOf('function homeTodayPanel(){'),app.indexOf('function homeWeightPanel(){')),ctx);
 const today=ctx.homeTodayPanel();assert.match(today,/▼ Down ₹340 · 0.24%/);assert.match(today,/▲ Up ₹635 · 0.33%/);assert.match(today,/vs 2026-10-23 PM/);
 const am=ctx.homeForecastResultPanel();assert.match(am,/AM comparison only/);assert.match(am,/Awaiting PM close/);assert.doesNotMatch(am,/Within forecast range|result-hit|Direction matched/);
 snapshot.india.session='PM';const pm=ctx.homeForecastResultPanel();assert.match(pm,/Final · Compared/);assert.match(pm,/Within forecast range/);assert.match(pm,/Error ₹340 · 0.24%/);
});
