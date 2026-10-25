'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Model=require('../chart-interaction.js');
const UI=require('../chart-ui.js');
const ctx0={
  forecast:{target_date:'2026-10-26',based_on_date:'2026-10-23',
   metals:{gold24:{baseline:141630,estimate:141630,low:139500,high:143800},
    gold22:{baseline:129733,estimate:129733,low:127700,high:131700},
    silver:{baseline:194415,estimate:194415,low:185000,high:204000}}},
  history:null,metal:'gold24',days:7,selectedDate:null,
  price:v=>'₹'+Number(v).toLocaleString('en-IN',{maximumFractionDigits:0}),
  sourceDate:s=>s,
  forecastDate:s=>s,
  language:'en'
};
function sampleHistory(){
 const india=[];
 const start=new Date('2026-06-01T00:00:00Z');
 for(let i=0;i<90;i++){
  const iso=new Date(start.getTime()+i*86400000).toISOString().slice(0,10);
  india.push({date:iso,session:'PM',
   gold24_inr_10g:140000+i*20,gold22_inr_10g:128000+i*19,silver999_inr_kg:190000+i*30});
 }
 india.push({date:'2026-10-22',session:'AM',gold24_inr_10g:141900,gold22_inr_10g:129970,silver999_inr_kg:197000});
 india.push({date:'2026-10-23',session:'PM',gold24_inr_10g:141630,gold22_inr_10g:129733,silver999_inr_kg:194415});
 india.push({date:'2026-10-27',session:'PM',gold24_inr_10g:999999,gold22_inr_10g:999999,silver999_inr_kg:999999});
 return {india};
}
test('7D, 30D and 90D views use verified dated rows before the forecast',()=>{
 const ctx={...ctx0,history:sampleHistory()};
 for(const d of [7,30,90]){
  const points=Model.observations(ctx.history,ctx.forecast,'gold24',d);
  assert.equal(points.length,d);
  assert.equal(points.at(-1).date,'2026-10-23');
  assert.equal(points.at(-1).value,141630);
  assert.ok(points.every(x=>x.date<='2026-10-23'&&x.value<200000));
  assert.equal(points.at(-1).session,'PM');
 }
});
test('PM supersedes AM on same date, keeping only one actual for each session-day',()=>{
 const h=sampleHistory();
 h.india.push({date:'2026-10-23',session:'AM',gold24_inr_10g:141550});
 const rows=Model.observations(h,ctx0.forecast,'gold24',7);
 assert.equal(rows.at(-1).value,141630);
 assert.equal(rows.at(-1).session,'PM');
});
test('Projection is a distinct optional data point, never a manufactured actual close',()=>{
 const points=Model.observations(sampleHistory(),ctx0.forecast,'gold24',7);
 assert.equal(Model.indexForDate(points,null,'2026-10-26'),6);
 assert.equal(Model.indexForDate(points,'2026-10-26','2026-10-26'),7);
 assert.deepEqual(Model.displayPoint(points,ctx0.forecast,'gold24',7),{
  kind:'prediction',date:'2026-10-26',value:141630,
  low:139500,high:143800,unit:'10 g',model:'unknown'
 });
 const actual=Model.displayPoint(points,ctx0.forecast,'gold24',6);
 assert.equal(actual.kind,'actual');
 assert.equal(actual.date,'2026-10-23');
 assert.equal(actual.value,141630);
});
test('X hit testing picks nearest dated observation or forecast band, clamping outside plot',()=>{
 assert.equal(Model.indexAtX(55,7),0);
 assert.equal(Model.indexAtX(480,7),6);
 assert.equal(Model.indexAtX(590,7),7);
 assert.equal(Model.indexAtX(535,7),7);
 assert.equal(Model.indexAtX(-999,7),0);
 assert.equal(Model.indexAtX(2000,7),7);
 assert.equal(Model.indexAtX(NaN,7),0);
 assert.equal(Model.clampIndex(-100,7),0);
 assert.equal(Model.clampIndex(100,7),7);
 assert.equal(Model.xForIndex(7,7),590);
});
test('Interactive SVG retains gold line, gradient, dashed estimate, chart and range',()=>{
 const html=UI.render({...ctx0,history:sampleHistory()});
 assert.match(html,/class="market-trend-svg chart-interactive"/);
 assert.match(html,/id="market-actual-fill"/);
 assert.match(html,/stroke-dasharray="6 5"/);
 assert.match(html,/class="chart-range-band"/);
 assert.match(html,/data-chart-point="7"/);
 assert.match(html,/data-chart-slider min="0" max="7"/);
 assert.match(html,/data-chart-readout role="status"/);
 assert.match(html,/ACTUAL · 2026-10-23/);
 assert.match(html,/1,41,630/);
 assert.match(html,/aria-label="Next date"/);
 assert.match(html,/role="group"/);
});
test('Selection of forecast never labels estimated rate as actual or claims guaranteed band',()=>{
 const html=UI.render({...ctx0,history:sampleHistory(),selectedDate:'2026-10-26'});
 assert.match(html,/PREDICTION · 2026-10-26/);
 assert.match(html,/Same as the last published rate/);
 assert.match(html,/Possible range ₹1,39,500 – ₹1,43,800/);
 assert.match(html,/Not a guarantee/);
 assert.match(html,/experimental prediction/);
 assert.match(html,/value="7"/);
});
test('Silver uses silver unit and gray theme, and fails safely on missing actual history',()=>{
 const html=UI.render({...ctx0,metal:'silver',history:sampleHistory()});
 assert.match(html,/Silver 999 Price Trend/);
 assert.match(html,/₹ \/ kg/);
 assert.match(html,/#7d8d9f/);
 assert.match(html,/1 kg/);
 assert.match(UI.render({...ctx0,history:{india:[]}}),/At least two dated IBJA observations/);
});
test('Chart inspector is safe for missing data and identifies exact past or future status',()=>{
 const pts=Model.observations(sampleHistory(),ctx0.forecast,'gold22',7);
 assert.match(UI.insightHtml(Model.displayPoint(pts,ctx0.forecast,'gold22',0),ctx0),/ACTUAL/);
 assert.match(UI.insightHtml(Model.displayPoint(pts,ctx0.forecast,'gold22',7),ctx0),/PREDICTION/);
 assert.match(UI.insightHtml(null,ctx0),/Published rate unavailable/);
});
