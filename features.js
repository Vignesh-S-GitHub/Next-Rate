/*
 * NextRate practical tools.
 * All user records remain on this device (localStorage). No backend exists
 * to send push notifications, save accounts or obtain broker/dealer quotes.
 * All labelled market references are sourced from the existing dated feeds.
 */
(function(root) {
'use strict';
const C=root.NextRateCore || (typeof module!=='undefined'?require('./features-core.js'):null);
const Sources=root.NextRateSources || (typeof module!=='undefined'?require('./source-logos.js'):null);
const Notifications=root.NextRateNotifications ||
 (typeof module!=='undefined'?require('./browser-notifications.js'):null);
const official=(id,options)=>Sources?.badge(id,options)||'';
const KEY='nextrate-tools-v1';
const CITIES=['Chennai','Mumbai','Delhi','Bengaluru','Hyderabad'];
const SECTIONS=[
 ['alerts','bell','Price Alerts','Target watch'],
 ['jewellery','calculator','Jewellery Bill','Total cost'],
 ['accuracy','chart','Prediction Accuracy','Actual vs estimate'],
 ['shops','store','Shop Comparison','Your quotes'],
 ['portfolio','wallet','My Portfolio','Holdings'],
 ['resale','arrows','Sell / Exchange','Resale value'],
 ['hallmark','shield','Verify Hallmark','BIS Care'],
 ['etfs','market','ETF Comparison','NAV & premiums'],
 ['signals','globe','Global Signals','World markets'],
];
let memory={alerts:[],shops:[],holdings:[],etfQuotes:{},preferred:'alerts',notifications:false};
let message='',ctxCache=null;
function read(){
 try{
  const data=JSON.parse(root.localStorage.getItem(KEY)||'null');
  if(data&&typeof data==='object'&&data.version===1){
    memory={
      alerts:Array.isArray(data.alerts)?data.alerts.slice(0,40):[],
      shops:Array.isArray(data.shops)?data.shops.slice(0,80):[],
      holdings:Array.isArray(data.holdings)?data.holdings.slice(0,100):[],
      etfQuotes:typeof data.etfQuotes==='object'&&data.etfQuotes&&!Array.isArray(data.etfQuotes)?data.etfQuotes:{},
      preferred:SECTIONS.some(row=>row[0]===data.preferred)?data.preferred:'alerts',
      notifications:data.notifications===true
    };
  }
 }catch{/* private browsing: retain in memory */}
}
function save(){
 try{root.localStorage.setItem(KEY,JSON.stringify({version:1,...memory}));return true;}
 catch{return false;}
}
read();
const m=x=>C.money(x),h=x=>C.esc(x);
const field=(name,label,value='',type='number',attrs='')=>
 '<label class="tool-field"><span>'+h(label)+'</span>'+
 '<input name="'+h(name)+'" type="'+type+'" value="'+h(value)+'" '+attrs+' required></label>';
const opt=(name,values,label)=>{
 const first=values[0]||['','Unavailable'],key='tool-picker-'+name;
 return '<div class="tool-field"><span id="'+key+'-label">'+h(label)+'</span>'+
  '<div class="tool-picker" data-tool-picker><input type="hidden" name="'+h(name)+'" value="'+h(first[0])+'">'+
  '<button type="button" class="tool-picker-trigger" data-tool-picker-toggle aria-haspopup="listbox" aria-expanded="false"'+
  ' aria-labelledby="'+key+'-label '+key+'-current" aria-controls="'+key+'-options">'+
  '<span id="'+key+'-current">'+h(first[1])+'</span><span class="tool-picker-arrow" aria-hidden="true">⌄</span></button>'+
  '<div class="tool-picker-menu" id="'+key+'-options" role="listbox" aria-labelledby="'+key+'-label" hidden>'+
  values.map((v,i)=>'<button type="button" role="option" class="tool-picker-option" data-tool-picker-option'+
    ' data-value="'+h(v[0])+'" aria-selected="'+(i===0)+'" tabindex="'+(i===0?0:-1)+'">'+h(v[1])+'</button>').join('')+
  '</div></div></div>';
};
const btn=(label)=>'<button type="submit" class="tool-primary">'+h(label)+'</button>';
const note=(text)=>'<p class="tool-note">'+text+'</p>';
const link=(label,url)=>'<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+h(label)+' ↗</a>';
const metalOptions=[['gold24','24K gold'],['gold22','22K gold'],['silver','Silver 999']];
function context(){return ctxCache||{};}
function date(){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const part=n=>parts.find(p=>p.type===n)?.value;return part('year')+'-'+part('month')+'-'+part('day');}
function id(){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);}
function validBenchmark(kind,contextObj=context()){
 const rate=C.publishedRate(contextObj.rates,kind);
 const day=contextObj.rates?.india?.date;
 if(!rate||C.ageDays(day)>7||C.ageDays(day)<0)return null;
 return {rate,date:day};
}
function formData(form){const values={};for(const [k,v] of new FormData(form).entries())values[k]=String(v).trim();return values;}
function quantityPrice(kind,qty){
 const rate=validBenchmark(kind);
 return rate?C.bullionValue(context().rates,kind,qty):null;
}
function showBanner(){return message?'<p class="tool-banner" role="status">'+h(message)+'</p>':'';}
function infoAlert(){
 const matched=memory.alerts.filter(a=>a.triggeredAt).length;
 return '<div class="tool-stats"><div><strong>'+memory.alerts.length+'</strong><span>Saved alerts</span></div>'+
 '<div><strong>'+matched+'</strong><span>Reached targets</span></div></div>';
}
function alertPanel(){
 const items=memory.alerts.map(a=>{
  let now=null;
  try{now=C.alertValue(a,context());}catch{}
  const reached=!!a.triggeredAt;
  return '<div class="tool-list-item"><div><strong>'+h(a.metal==='silver'?'Silver':a.metal==='gold22'?'22K Gold':'24K Gold')+
   ' · '+h(a.grams)+' g</strong><small>'+(a.op==='below'?'At or below ':'At or above ')+m(a.target)+
   (now===null?' · Source unavailable':' · Now '+m(now))+
   (reached?' · Reached '+h(a.triggeredAt):'')+'</small></div>'+
   '<button type="button" class="tool-delete" data-delete-kind="alerts" data-delete-id="'+h(a.id)+'" aria-label="Remove price alert">×</button></div>';
 }).join('');
 return '<div class="tool-feature-heading"><h2>Price Alerts</h2><p>Check targets when NextRate opens or resumes.</p></div>'+
  infoAlert()+
  '<form data-feature-form="alert"><div class="tool-form-grid">'+
  opt('metal',metalOptions,'Metal')+
  field('grams','Weight (g)','8','number','min="0.01" max="100000" step="any" inputmode="decimal"')+
  opt('op',[['below','Falls to / below'],['above','Rises to / above']],'Alert when')+
  field('target','Total target (₹)','100000','number','min="0.01" max="1000000000" step="any" inputmode="decimal"')+
  '</div>'+btn('Save price alert')+'</form>'+
  '<div class="tool-list" aria-label="Saved price alerts">'+(items||'<p class="tool-note">No alerts yet.</p>')+'</div>'+
  '<button type="button" class="tool-plain" data-feature-action="notify">'+
    (memory.notifications&&Notifications?.permitted()?'Send test notification':'Enable browser notifications')+'</button>'+
  '<p class="tool-note">'+(memory.notifications&&Notifications?.permitted()?
    'Notifications enabled on this device.':'Notifications require Chrome permission.')+'</p>'+
  note('<b>Important:</b> Targets are checked when this page opens or regains focus. '+
    'GitHub Pages cannot send guaranteed background push alerts without a notification server. '+
    'No alert is triggered from rates older than 7 days.');
}
function billPanel(){
 const r=validBenchmark('gold22');
 const reference=r?m(r.rate):'Unavailable';
 return '<div class="tool-feature-heading"><h2>Jewellery Bill</h2><p>Metal + wastage + making + GST.</p></div>'+
  '<p class="tool-reference">22K gold / 10g · '+reference+' · IBJA '+h(r?.date||'not available')+'</p>'+
  '<form data-feature-form="jewellery"><div class="tool-form-grid">'+
  opt('metal',[['gold22','22K Gold'],['gold24','24K Gold']],'Gold purity')+
  field('grams','Net gold weight (g)','8','number','min="0.01" max="10000" step="any" inputmode="decimal"')+
  field('wastage','Wastage (%)','0','number','min="0" max="35" step="any" inputmode="decimal"')+
  field('making','Making charge (%)','10','number','min="0" max="100" step="any" inputmode="decimal"')+
  field('flat','Fixed making (₹)','0','number','min="0" max="10000000" step="any" inputmode="decimal"')+
  '</div>'+btn('Calculate bill')+'</form>'+
  '<div class="tool-result" id="jewellery-result">'+
  '<p>Enter your shop charges to estimate the bill.</p></div>'+
  note('GST estimate: 3% of the total jewellery transaction value, including making charges. '+
    link('CBIC jewellery GST FAQ','https://cbic-gst.gov.in/sectoral-faq.html')+
    '. Does not include stones, hallmarking, delivery or additional dealer charges.');
}
function accuracyPanel(){
 const contextObj=context(),records=contextObj.forecastHistory?.forecasts||[];
 const labels=[['gold24','24K Gold'],['gold22','22K Gold'],['silver','Silver']];
 const lines=labels.map(([key,label])=>{
  const stats=C.historicalAccuracy(records,key);
  const back=contextObj.forecast?.metals?.[key]?.backtest;
  const backText=back?.status==='walk_forward'
    ? ('Holdout '+Number(back.holdout_mape_pct).toFixed(2)+'% · last-close '+Number(back.holdout_naive_mape_pct).toFixed(2)+'%')
    : 'Not enough history for a tested model';
  const live=stats.evaluated?stats.mape.toFixed(2)+'% ('+stats.evaluated+' evaluated)':'Awaiting actual closes';
  return '<div class="tool-accuracy-row"><strong>'+label+'</strong>'+
   '<div><span>Issued forecast error</span><b>'+live+'</b></div>'+
   '<div><span>Older walk-forward test</span><b>'+backText+'</b></div></div>';
 }).join('');
 const issued=records.slice(-8).reverse().map(rec=>{
   const tested=rec.evaluation?.metals?.gold24;
   const value=rec.metals?.gold24?.estimate;
   return '<div class="tool-list-item"><div><strong>'+h(rec.target_date)+' · 24K / 10g</strong>'+
    '<small>Predicted '+m(value)+(tested?' · Actual '+m(tested.actual):' · Actual pending')+'</small></div>'+
    '<span class="tool-badge '+(tested?'done':'')+'">'+(tested?Number(tested.absolute_error_pct).toFixed(2)+'% error':'Pending')+'</span></div>';
 }).join('');
 return '<div class="tool-feature-heading"><h2>Prediction Accuracy</h2><p>Past forecast versus actual close.</p></div>'+
  '<div class="tool-accuracy">'+lines+'</div>'+
  '<h3 class="tool-subtitle">Issued forecasts</h3>'+('<div class="tool-list">'+(issued||
    '<p class="tool-note">No published forecasts yet.</p>')+'</div>')+
  note('Historical holdout error and actual forward-issued accuracy are different. '+
    'A lower error is better. The selected model may be no better than simply using the last price. '+
    'Results are graded only when a matching target-date IBJA PM rate is published.');
}
function cityRef(metal){
 const ctx=context(),name=ctx.city||'Chennai',record=ctx.cities?.cities?.[name];
 const key=metal==='gold22'?'gold22_inr_g':'gold24_inr_g';
 const day=ctx.cities?.dates?.gold;
 if(!record||!Number.isFinite(record[key])||C.ageDays(day)>7)return null;
 return {rate:record[key],date:day};
}
function shopsPanel(){
 const ct=context().city||'Chennai',q=cityRef('gold22');
 const entries=memory.shops.filter(x=>x.city===ct);
 const ordered=entries.map(entry=>{
  try{return {entry,total:C.manualShopBill(entry).total};}catch{return null;}
 }).filter(Boolean).sort((a,b)=>a.total-b.total);
 const list=ordered.map(({entry,total},i)=>
   '<div class="tool-list-item"><div><strong>'+h(entry.name)+'</strong><small>'+
   h(entry.metal==='gold22'?'22K':'24K')+' · '+h(entry.grams)+'g · '+h(entry.date)+
   ' · '+(i===0?'Lowest entered':'User-entered')+'</small></div>'+
   '<div class="tool-list-tail"><b>'+m(total)+'</b>'+
   '<button type="button" class="tool-delete" data-delete-kind="shops" data-delete-id="'+h(entry.id)+'" aria-label="Remove shop quote">×</button></div></div>').join('');
 return '<div class="tool-feature-heading"><h2>Shop Comparison</h2>'+
    '<p>'+h(ct)+' · Compare your own shop quotes.</p></div>'+
    '<p class="tool-reference">City 22K reference: '+(q?m(q.rate)+' / g · '+h(q.date):'Unavailable')+
    ' · '+official('goodreturns',{label:'City source',compact:true})+'</p>'+
    '<form data-feature-form="shops"><div class="tool-form-grid">'+
    field('name','Jeweller / shop','', 'text','maxlength="55" placeholder="Shop name"')+
    opt('metal',[['gold22','22K'],['gold24','24K']],'Purity')+
    field('grams','Weight (g)','8','number','min="0.01" max="10000" step="any" inputmode="decimal"')+
    field('ratePerGram','Shop rate / g (₹)',q?.rate||'', 'number','min="1" max="10000000" step="any" inputmode="decimal"')+
    field('makingPct','Making (%)','10','number','min="0" max="100" step="any" inputmode="decimal"')+
    field('makingFlat','Flat making (₹)','0','number','min="0" max="10000000" step="any" inputmode="decimal"')+
    field('wastagePct','Wastage (%)','0','number','min="0" max="35" step="any" inputmode="decimal"')+
    '</div>'+btn('Save and compare')+'</form>'+
    '<h3 class="tool-subtitle">Your '+h(ct)+' quotes</h3>'+
    '<div class="tool-list">'+(list||'<p class="tool-note">Add quotes from local jewellers to compare.</p>')+'</div>'+
    note('No independent shop-by-shop quote feed is connected. These figures are entered by you, '+
    'not verified retailer offers. 3% GST on total jewellery value is included. Ask each shop about '+
    'stone charges, exchange terms, hallmark and final invoice.');
}
function portfolioPanel(){
 const ctx=context();
 const holdings=memory.holdings.map(p=>({p,v:null}));
 let totalCost=0,totalVal=0,valued=0;
 for(const entry of holdings){
  try{
   entry.v=C.holdingValuation(entry.p,ctx);totalCost+=Number(entry.p.paid);
   if(entry.v.value!==null){valued++;totalVal+=entry.v.value;}
  }catch{entry.v={value:null,pnl:null,source:'',asOf:''};}
 }
 const cards=holdings.map(({p,v})=>
 '<div class="tool-list-item"><div><strong>'+h(p.name||p.kind)+'</strong><small>'+
 h(p.qty)+' '+(['gold24','gold22','silver'].includes(p.kind)?'g':'units')+
 ' · Paid '+m(Number(p.paid))+' · '+h(p.date)+
 (v?.asOf?' · Quote '+h(v.asOf):'')+'</small></div>'+
 '<div class="tool-list-tail"><b>'+(v?.value!==null?m(v.value):'—')+'</b>'+
 '<button type="button" class="tool-delete" data-delete-kind="holdings" data-delete-id="'+h(p.id)+'" aria-label="Remove holding">×</button></div></div>').join('');
 const products=[
 ...metalOptions,
 ['goldbees','Gold BeES ETF'],['hdfcgold','HDFC Gold ETF'],['sbigold','SBI Gold ETF'],
 ['silveretf','Nippon Silver ETF'],['hdfcsilver','HDFC Silver ETF'],
 ['goldfund','Gold fund of funds'],['silverfund','Silver fund of funds']
 ];
 return '<div class="tool-feature-heading"><h2>My Portfolio</h2><p>Private to this browser.</p></div>'+
    '<div class="tool-stats"><div><strong>'+m(totalCost)+'</strong><span>Total paid</span></div>'+
    '<div><strong>'+(valued===holdings.length?m(totalVal):'Partial '+m(totalVal))+'</strong><span>Reference value</span></div>'+
    '<div><strong>'+(valued===holdings.length?m(totalVal-totalCost):'—')+'</strong><span>Indicative gain / loss</span></div></div>'+
    '<form data-feature-form="holdings"><div class="tool-form-grid">'+
    field('name','Item name','', 'text','maxlength="55" placeholder="My gold"')+
    opt('kind',products,'Holding')+
    field('qty','Grams / ETF units','8','number','min="0.001" max="100000" step="any" inputmode="decimal"')+
    field('paid','Total paid (₹)','100000','number','min="0" max="10000000000" step="any" inputmode="decimal"')+
    '</div>'+btn('Add holding')+'</form>'+
    '<div class="tool-list">'+(cards||'<p class="tool-note">No holdings saved.</p>')+'</div>'+
    '<button type="button" class="tool-plain" data-feature-action="export">Download my backup</button> '+
    '<label class="tool-import">Restore backup <input type="file" accept="application/json" data-feature-import></label>'+
    note('Private, on-device only. Clearing browser storage removes entries unless backed up. '+
      'Metal values exclude buy/sell fees, GST and jewellery making. ETF figures are dated NAV, not execution prices.');
}
function resalePanel(){
 const r=validBenchmark('gold22');
 return '<div class="tool-feature-heading"><h2>Sell / Exchange Gold</h2><p>Estimate resale proceeds.</p></div>'+
  '<p class="tool-reference">IBJA 22K / 10g: '+(r?m(r.rate):'Unavailable')+'</p>'+
  '<form data-feature-form="resale"><div class="tool-form-grid">'+
    opt('purity',[['24','24K'],['22','22K'],['18','18K (derived)']],'Purity')+
    field('grams','Net gold (g)','8','number','min="0.01" max="10000" step="any" inputmode="decimal"')+
    field('deduction','Buyer deduction (%)','2','number','min="0" max="100" step="any" inputmode="decimal"')+
    field('fixedFee','Testing / other fee (₹)','0','number','min="0" max="10000000" step="any" inputmode="decimal"')+
    '</div>'+btn('Estimate resale')+'</form>'+
  '<div class="tool-result" id="resale-result"><p>Your estimated proceeds will appear here.</p></div>'+
  note('Indicative reference only. A dealer may pay less due to melting/testing, stones, purity '+
   'differences, exchange policy, or buyback spread. 18K is mathematically derived from 24K purity, '+
   'not an IBJA-published 18K selling quote.');
}
function hallmarkPanel(){
 return '<div class="tool-feature-heading"><h2>Verify Hallmark</h2><p>Open the official BIS Care app.</p></div>'+
  '<div class="tool-hallmark"><div class="tool-app-mark">'+official('biscare',{label:'BIS Care App'})+'</div>'+
  '<div class="tool-hallmark-body"><strong>Check gold jewellery HUID</strong>'+
   '<p>Use Verify HUID in the official BIS Care app. Only BIS can confirm whether an ID is valid.</p>'+
   '<div class="tool-app-links">'+
    link('Android · Google Play','https://play.google.com/store/apps/details?id=com.bis.bisapp')+
    link('iPhone · App Store','https://apps.apple.com/in/app/bis-care-app/id6443724891')+
    '</div></div></div>'+
  '<p class="tool-mark-notice">BIS Care verification opens outside NextRate. This is not an official BIS app or certification service.</p>'+
  '<form data-feature-form="huid"><div class="tool-form-grid">'+
    field('code','6-character HUID','', 'text','maxlength="6" minlength="6" pattern="[A-Za-z0-9]{6}" placeholder="HUID"')+
    '</div>'+btn('Copy HUID to check in BIS Care')+'</form>'+
  '<div class="tool-result" id="huid-result"><p>NextRate cannot verify HUID by itself.</p></div>'+
  note('Check the six-character HUID, BIS logo and purity mark. Inspect the jeweller invoice. '+
    link('BIS consumer guidance','https://www.bis.gov.in/hallmarking-overview/consumer-protection/?lang=en')+
    '. Never treat entering or copying a number here as authentication.');
}
function etfPanel(){
 const funds=context().funds?.funds||{};
 const all=Object.entries(funds).filter(([id,row])=>row&&/ETF|Fund/.test(row.kind||''));
 const table=all.map(([id,row])=>{
  const nav=Number(row.nav_inr_per_unit);
  const manual=memory.etfQuotes[id];
  let premiumValue=null;
  try{premiumValue=manual&&manual.date===row.nav_date?C.premium(manual.quote,nav):null;}catch{}
  return '<div class="tool-etf-row"><div><strong>'+h(row.name)+'</strong><small>'+h(row.kind)+
   ' · '+h(row.nav_date||'Unknown date')+'</small></div>'+
   '<div><b>'+m(nav)+'</b><small>NAV / unit</small></div>'+
   '<div><b>'+(premiumValue===null?'—':(premiumValue>0?'+':'')+premiumValue.toFixed(2)+'%')+
   '</b><small>Manual premium</small></div></div>';
 }).join('');
 const products=all.map(([id,row])=>[id,row.name]);
 return '<div class="tool-feature-heading"><h2>ETF Comparison</h2><p>Published AMFI NAV. Trade price may differ.</p></div>'+
  '<div class="tool-provider-row">'+official('amfi',{label:'AMFI NAV source'})+
    official('nse',{label:'NSE ETF market information'})+'</div>'+
  '<div class="tool-etf-list">'+(table||'<p class="tool-note">AMFI feed unavailable.</p>')+'</div>'+
  (products.length?'<form data-feature-form="etf"><div class="tool-form-grid">'+
    opt('fund',products,'ETF / Fund')+
    field('quote','Exchange price entered by you (₹)','', 'number','min="0.01" max="10000000" step="any" inputmode="decimal"')+
    '</div>'+btn('Compare to NAV')+'</form>':'')+
  '<div class="tool-result" id="etf-result"><p>Enter an exchange quote from your broker to estimate its premium or discount.</p></div>'+
  note('NAV is not an executable exchange quote. Manual premium is only comparable when quote and NAV are dated '+
   'to the same trading session; otherwise a warning appears. Expense ratios, tracking differences '+
   'and broker order-book prices are not available in the connected feed—no figures are invented. '+
   link('AMFI NAV','https://www.amfiindia.com/net-asset-value/nav-download')+' · '+
   link('NSE ETF market data','https://www.nseindia.com/market-data/exchange-traded-funds-etf'));
}
function signalsPanel(){
 const r=context().rates||{},fx=r.fx?.inr_per_usd,xau=r.spot?.XAU?.usd_per_troy_ounce,xag=r.spot?.XAG?.usd_per_troy_ounce;
 const cards=[
  ['Gold XAU',Number.isFinite(xau)?'$'+Number(xau).toLocaleString('en-US',{maximumFractionDigits:2}):'—','USD / troy oz',r.spot?.XAU?.as_of],
  ['Silver XAG',Number.isFinite(xag)?'$'+Number(xag).toLocaleString('en-US',{maximumFractionDigits:2}):'—','USD / troy oz',r.spot?.XAG?.as_of],
  ['USD/INR',Number.isFinite(fx)?'₹'+Number(fx).toFixed(3):'—','Daily FX reference',r.fx?.date]
 ].map(([label,value,unit,time])=>
 '<div class="tool-signal"><span>'+label+'</span><strong>'+value+'</strong><small>'+
   h(unit)+(time?' · '+h(String(time).slice(0,16)):'')+'</small></div>').join('');
 const parity=(Number.isFinite(xau)&&Number.isFinite(fx))?m(xau*fx/31.1034768*10):'—';
 return '<div class="tool-feature-heading"><h2>Global Signals</h2><p>Current dated market references.</p></div>'+
  '<div class="tool-signals">'+cards+'</div>'+
  '<div class="tool-result"><span>USD gold converted into INR / 10g (unadjusted)</span><strong>'+parity+
    '</strong><small>Not Indian IBJA price. Excludes import taxes, local premiums, time differences, and FX costs.</small></div>'+
  '<div class="tool-venues"><strong>London LBMA</strong><span>Official feed not connected</span></div>'+
  '<div class="tool-venues"><strong>US COMEX</strong><span>Official futures feed not connected</span></div>'+
  '<div class="tool-venues"><strong>India MCX</strong><span>Official futures feed not connected</span></div>'+
  note('Official LBMA, COMEX and MCX signals are not included in the prediction model. '+
    'The displayed global references cannot establish a reliable buy/sell signal. '+
    link('Gold API','https://gold-api.com/docs')+' · '+
    link('Frankfurter FX','https://frankfurter.dev/')+' · '+
    link('IBJA','https://www.ibjarates.com/'));
}
const panels={alerts:alertPanel,jewellery:billPanel,accuracy:accuracyPanel,shops:shopsPanel,
 portfolio:portfolioPanel,resale:resalePanel,hallmark:hallmarkPanel,etfs:etfPanel,signals:signalsPanel};
function page(ctx){
 ctxCache=ctx||ctxCache||{};
 const links=SECTIONS.map(([id,ic,label,desc],index)=>
  '<button type="button" class="tool-menu-item'+(memory.preferred===id?' active':'')+
  '" data-tool-select="'+id+'" aria-pressed="'+(memory.preferred===id)+'">'+
   '<span class="tool-menu-icon" aria-hidden="true">'+(index+1)+'</span><span><strong>'+label+
   '</strong><small>'+desc+'</small></span></button>').join('');
 return '<div class="toolspage"><div class="tools-header"><div><span class="nr-kicker">NEXT RATE</span>'+
   '<h1>Gold Tools</h1><p>9 tools · Simple and private</p></div>'+
   '<div class="tool-count">9</div></div><div class="tools-layout">'+
   '<nav class="tools-menu" aria-label="Gold tools">'+links+'</nav>'+
   '<section class="tools-panel" aria-live="polite">'+showBanner()+
     (panels[memory.preferred]||alertPanel)()+'</section></div></div>';
}
function refresh(){if(ctxCache?.refresh)ctxCache.refresh();}
function notifyUser(text,alertId){
 if(!memory.notifications||!Notifications?.permitted())return;
 // Android Chrome requires serviceWorkerRegistration.showNotification.
 void Notifications.show('NextRate price alert',text,'nextrate-target-'+alertId);
}
function checkAlerts(ctx){
 ctxCache=ctx||ctxCache;
 if(!ctx?.rates?.india?.date||C.ageDays(ctx.rates.india.date)>7||C.ageDays(ctx.rates.india.date)<0)return 0;
 let found=0;
 for(const a of memory.alerts){
  if(a.triggeredAt)continue; // one-shot target; user may add a new alert
  try{
   const outcome=C.triggered(a,ctx);
   if(outcome?.hit){
    a.triggeredAt=ctx.rates.india.date; a.triggerPrice=outcome.current;found++;
    notifyUser(a.metal+' '+a.grams+'g reached '+m(outcome.current)+' ('+a.triggeredAt+')',a.id);
   }
  }catch{}
 }
 if(found){save();message=found+' target'+(found>1?'s':'')+' reached at last published rate.';}
 return found;
}
function updateStatus(text){message=text;refresh();}
function onSubmit(event){
 const form=event.target.closest('form[data-feature-form]');
 if(!form)return;
 event.preventDefault();
 const v=formData(form),kind=form.dataset.featureForm,ctx=context();
 try{
  if(kind==='alert'){
   if(memory.alerts.length>=40)throw new Error('Maximum 40 alerts per device.');
   if(!metalOptions.some(x=>x[0]===v.metal))throw new Error('Select a metal');
   const grams=C.number(v.grams,.01,100000),target=C.number(v.target,.01,1e9);
   if(!['below','above'].includes(v.op))throw new Error('Choose alert type');
   memory.alerts.push({id:id(),metal:v.metal,grams,op:v.op,target,created:date(),triggeredAt:null});
   message='Alert saved. NextRate checks when opened.';
   save();checkAlerts(ctx);refresh();
  } else if(kind==='jewellery'){
   if(!['gold24','gold22'].includes(v.metal))throw new Error('Choose gold purity');
   const b=validBenchmark(v.metal);if(!b)throw new Error('Current IBJA rate unavailable.');
   const estimate=C.jewelleryBill({ratePer10g:b.rate,grams:v.grams,wastagePct:v.wastage,
    makingPct:v.making,makingFlat:v.flat});
   const container=form.parentElement.querySelector('#jewellery-result');
   if(container)container.innerHTML='<span>Estimated total</span><strong>'+m(estimate.total)+'</strong>'+
   '<small>Metal '+m(estimate.metal)+' · Wastage '+m(estimate.wastage)+
   ' · Making '+m(estimate.making)+' · GST '+m(estimate.tax)+'</small>';
  }else if(kind==='shops'){
   if(memory.shops.length>=80)throw new Error('Maximum 80 saved quotes.');
   if(!v.name)throw new Error('Enter shop name');
   if(!['gold22','gold24'].includes(v.metal))throw new Error('Select gold purity');
   const row={id:id(),name:v.name.slice(0,55),city:ctx.city||'Chennai',date:date(),metal:v.metal,
    ratePerGram:C.number(v.ratePerGram,1,1e7),grams:C.number(v.grams,.01,10000),
    makingPct:C.number(v.makingPct,0,100,true),makingFlat:C.number(v.makingFlat,0,1e7,true),
    wastagePct:C.number(v.wastagePct,0,35,true)};
   C.manualShopBill(row);
   memory.shops.push(row);save();updateStatus('Manual shop quote saved.');
  }else if(kind==='holdings'){
   if(memory.holdings.length>=100)throw new Error('Maximum 100 holdings.');
   const all=new Set([...metalOptions.map(x=>x[0]),...Object.keys(ctx.funds?.funds||{})]);
   if(!all.has(v.kind))throw new Error('Unknown holding type');
   memory.holdings.push({id:id(),name:(v.name||v.kind).slice(0,55),
    kind:v.kind,qty:C.number(v.qty,.001,100000),
    paid:C.number(v.paid,0,1e10,true),date:date()});
   save();updateStatus('Holding saved on this device.');
  }else if(kind==='resale'){
   let rate=null;
   if(v.purity==='22')rate=validBenchmark('gold22')?.rate;
   else if(v.purity==='24')rate=validBenchmark('gold24')?.rate;
   else if(v.purity==='18')rate=(validBenchmark('gold24')?.rate||0)*.75;
   if(!rate)throw new Error('IBJA reference unavailable.');
   const result=C.resaleQuote({ratePer10g:rate,grams:v.grams,
     purity:v.purity,deductionPct:v.deduction,fixedFee:v.fixedFee});
   const container=form.parentElement.querySelector('#resale-result');
   if(container)container.innerHTML='<span>Estimated cash / exchange value</span>'+
    '<strong>'+m(result.proceeds)+'</strong><small>Metal '+m(result.metal)+
    ' − deduction '+m(result.deduction)+' − other '+m(result.fixedFee)+'</small>';
  }else if(kind==='huid'){
   if(!/^[a-zA-Z0-9]{6}$/.test(v.code))throw new Error('HUID must contain 6 letters/numbers.');
   const el=form.parentElement.querySelector('#huid-result');
   if(el)el.innerHTML='<span>Ready for official BIS Care verification.</span>'+
    '<strong>Not yet verified</strong><small>Open BIS Care, select Verify HUID and enter '+h(v.code.toUpperCase())+'.</small>';
   if(root.navigator?.clipboard?.writeText){
    root.navigator.clipboard.writeText(v.code.toUpperCase()).then(()=>{
      if(el)el.querySelector('small').textContent='HUID copied. Open BIS Care and use Verify HUID.';
    }).catch(()=>{});
   }
  }else if(kind==='etf'){
   const fund=ctx.funds?.funds?.[v.fund];
   if(!fund||!Number.isFinite(fund.nav_inr_per_unit))throw new Error('Select a published NAV');
   const q=C.number(v.quote,.01,1e7),pct=C.premium(q,fund.nav_inr_per_unit);
   const stamped=date(),out=form.parentElement.querySelector('#etf-result');
   memory.etfQuotes[v.fund]={quote:q,date:stamped};
   save();
   if(out)out.innerHTML='<span>Manually entered price vs dated NAV</span>'+
   '<strong>'+(pct>0?'+':'')+pct.toFixed(2)+'%</strong>'+
   '<small>Entered '+h(stamped)+'; NAV '+h(fund.nav_date)+
   (stamped===fund.nav_date?' (same day)':' (different dates: not a comparable trading premium)')+'</small>';
  }
 }catch(e){message=e.message||'Check the entered values.';refresh();}
}
function importBackup(file){
 if(!file||file.size>1000000){updateStatus('Choose a JSON backup under 1 MB.');return;}
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const obj=JSON.parse(reader.result);
   if(!obj||obj.version!==1||!Array.isArray(obj.alerts)||!Array.isArray(obj.shops)||!Array.isArray(obj.holdings)){
    throw new Error('Invalid NextRate backup.');
   }
   for(const arr of [obj.alerts,obj.shops,obj.holdings]){
    if(arr.length>100||!arr.every(row=>row&&typeof row==='object'&&typeof row.id==='string')){
     throw new Error('Invalid or oversized backup.');
    }
   }
   // Only the tools' own known keys are imported; no token, HTML or executable content.
   memory.alerts=obj.alerts.slice(0,40);
   memory.shops=obj.shops.slice(0,80);
   memory.holdings=obj.holdings.slice(0,100);
   memory.etfQuotes=typeof obj.etfQuotes==='object'&&obj.etfQuotes||{};
   save();updateStatus('Your local backup has been restored.');
  }catch(e){updateStatus(e.message||'Unable to restore backup.');}
 };
 reader.readAsText(file);
}
function closePicker(picker,restoreFocus=false){
 if(!picker)return;
 const button=picker.querySelector('[data-tool-picker-toggle]');
 const panel=picker.querySelector('.tool-picker-menu');
 if(!button||!panel)return;
 panel.hidden=true;button.setAttribute('aria-expanded','false');
 if(restoreFocus)button.focus();
}
function closeAllPickers(except=null){
 root.document?.querySelectorAll('.tool-picker').forEach(picker=>{
  if(picker!==except)closePicker(picker);
 });
}
function togglePicker(picker,keyboard=false){
 if(!picker)return;
 const button=picker.querySelector('[data-tool-picker-toggle]');
 const panel=picker.querySelector('.tool-picker-menu');
 if(!button||!panel)return;
 const willOpen=panel.hidden;
 closeAllPickers(picker);
 panel.hidden=!willOpen;button.setAttribute('aria-expanded',String(willOpen));
 if(willOpen&&keyboard)panel.querySelector('.tool-picker-option[aria-selected="true"]')?.focus();
}
function onPickerKey(event){
 const picker=event.target.closest?.('[data-tool-picker]');
 if(!picker)return;
 const options=[...picker.querySelectorAll('[data-tool-picker-option]')];
 const menu=picker.querySelector('.tool-picker-menu');
 const current=options.indexOf(event.target);
 if(event.key==='Escape'&&!menu.hidden){
  event.preventDefault();closePicker(picker,true);return;
 }
 if((event.key==='ArrowDown'||event.key==='ArrowUp')&&event.target.matches('[data-tool-picker-toggle]')){
  event.preventDefault();
  if(menu.hidden)togglePicker(picker,true);
  else options[event.key==='ArrowDown'?0:options.length-1]?.focus();
 }else if(!menu.hidden&&current>=0&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
  event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?options.length-1:
   (current+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;
  options[next]?.focus();
 }
}
function onClick(event){
 const pickerOption=event.target.closest('[data-tool-picker-option]');
 if(pickerOption){
  const picker=pickerOption.closest('[data-tool-picker]');
  if(!picker)return;
  picker.querySelector('input[type="hidden"]').value=pickerOption.dataset.value;
  const current=picker.querySelector('.tool-picker-trigger>span:first-child');
  if(current)current.textContent=pickerOption.textContent;
  picker.querySelectorAll('[data-tool-picker-option]').forEach(option=>{
   const active=option===pickerOption;
   option.setAttribute('aria-selected',String(active));
   option.tabIndex=active?0:-1;
  });
  closePicker(picker,true);return;
 }
 const pickerTrigger=event.target.closest('[data-tool-picker-toggle]');
 if(pickerTrigger){togglePicker(pickerTrigger.closest('[data-tool-picker]'));return;}
 closeAllPickers();
 const t=event.target.closest('[data-tool-select],[data-delete-kind],[data-feature-action],[data-feature-link]');
 if(!t)return;
 if(t.dataset.toolSelect){
  memory.preferred=t.dataset.toolSelect;message='';save();refresh();
  return;
 }
 if(t.dataset.featureLink){
  memory.preferred=t.dataset.featureLink;message='';save();
  if(root.location.hash==='#tools')refresh();
  return;
 }
 if(t.dataset.deleteKind){
  const k=t.dataset.deleteKind;
  if(!['alerts','shops','holdings'].includes(k))return;
  memory[k]=memory[k].filter(x=>x.id!==t.dataset.deleteId);
  save();updateStatus('Item removed.');
  return;
 }
 if(t.dataset.featureAction==='notify'){
  if(!Notifications){updateStatus('Browser notifications unsupported here.');return;}
  // Starts permission request synchronously within the user's click.
  void Notifications.enable().then(async result=>{
   if(!result.ok){
    memory.notifications=false;save();
    const errors={
     denied:'Notifications blocked. Chrome site settings → Permissions → Notifications → Allow. Also enable Chrome notifications in Android settings.',
     'not-allowed':'Permission not granted. Allow notifications in Chrome site settings.',
     insecure:'Notifications require HTTPS.',
     unsupported:'Browser notifications are not supported here.',
     'service-worker-unavailable':'Use Android Chrome or a browser with service worker support.',
     'worker-error':'Could not start notifications. Reload and try again.',
     'permission-error':'Notification permission request failed.'
    };
    updateStatus(errors[result.reason]||'Notifications unavailable.');
    return;
   }
   memory.notifications=true;save();
   const demo=await Notifications.show('NextRate notifications ready',
     'Test notice. Price alerts are checked when NextRate opens or resumes.');
   updateStatus(demo.ok?
     'Test notification sent. Price alerts appear when a saved target is reached while NextRate checks rates.':
     'Permission allowed, but the test could not display. Check Android Settings → Apps → Chrome → Notifications.');
  }).catch(()=>updateStatus('Could not enable notifications. Reload and try again.'));
  return;
 }else if(t.dataset.featureAction==='export'){
  const blob=new Blob([JSON.stringify({version:1,...memory},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download='nextrate-my-data.json';
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  URL.revokeObjectURL(url);
 }
}
function mount(container,ctx){
 ctxCache=ctx;
 if(!container)return;
 container.addEventListener('click',onClick);
 container.addEventListener('keydown',onPickerKey);
 container.addEventListener('submit',onSubmit);
 container.addEventListener('change',e=>{
  if(e.target.matches('[data-feature-import]'))importBackup(e.target.files?.[0]);
 });
}
if(root.document)root.document.addEventListener('pointerdown',event=>{
 if(!event.target.closest?.('[data-tool-picker]'))closeAllPickers();
});
const api=Object.freeze({page,mount,checkAlerts,sections:SECTIONS,
 select(id){if(SECTIONS.some(x=>x[0]===id)){memory.preferred=id;message='';save();}},
 getState(){return JSON.parse(JSON.stringify(memory));}});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.NextRateFeatures=api;
})(typeof window==='undefined'?globalThis:window);
