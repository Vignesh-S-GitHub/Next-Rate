/*
 * NextRate Tools hub. The current static GitHub Pages deployment does not
 * offer server-side accounts, push subscriptions or licensed exchange feeds.
 * Price alerts are checked on page visits while the app is open.
 * User-entered shop prices and portfolio records stay in this browser.
 */
(function(root){
 'use strict';
 const C=root.NextRateTools || (typeof module!=='undefined'?require('./tools-core.js'):null);
 const SOURCE={
  bis:'https://www.bis.gov.in/bis-apps/?lang=en',
  gst:'https://gstcouncil.gov.in/sites/default/files/2024-02/sectoral-fq-gems-jewellery.pdf',
  amfi:'https://www.amfiindia.com/net-asset-value/nav-download',
  ibja:'https://www.ibjarates.com/',
  sebi:'https://www.sebi.gov.in/media-and-notifications/press-releases/nov-2025/caution-to-public-regarding-dealing-in-digital-gold-_97676.html',
  nse:'https://www.nseindia.com/market-data/live-equity-market?symbol=ETF',
  mcx:'https://www.mcxindia.com/',
  cme:'https://www.cmegroup.com/markets/metals/precious/gold.html',
  lbma:'https://www.lbma.org.uk/prices-and-data/precious-metal-prices',
  bisFAQ:'https://www.bis.gov.in/bis-apps/?lang=en'
 };
 const MODULES=[
  ['alerts','Price Alerts','விலை அறிவிப்பு','bell'],
  ['bill','Jewellery Bill','நகை பில்','calculator'],
  ['accuracy','Accuracy','கணிப்பு துல்லியம்','chart'],
  ['shops','Compare Shops','கடை ஒப்பீடு','store'],
  ['portfolio','My Gold','எனது தங்கம்','wallet'],
  ['sell','Sell / Exchange','விற்பனை / மாற்று','exchange'],
  ['hallmark','Hallmark','ஹால்மார்க்','shield'],
  ['etf','Gold & Silver ETF','தங்கம் / வெள்ளி ETF','fund'],
  ['global','World Markets','உலக சந்தைகள்','world']
 ];
 const T={
  'Tools':'கருவிகள்','All 9 features':'9 அம்சங்கள்',
  'Price Alerts':'விலை அறிவிப்பு','Jewellery Bill':'நகை பில்',
  'Accuracy':'கணிப்பு துல்லியம்','Compare Shops':'கடை ஒப்பீடு',
  'My Gold':'எனது தங்கம்','Sell / Exchange':'விற்பனை / மாற்று',
  'Hallmark':'ஹால்மார்க்','Gold & Silver ETF':'தங்கம் / வெள்ளி ETF',
  'World Markets':'உலக சந்தைகள்','Gold 24K':'24K தங்கம்',
  'Gold 22K':'22K தங்கம்','Silver':'வெள்ளி','Gold':'தங்கம்',
  'Weight (g)':'எடை (கிராம்)','Purity':'தூய்மை',
  'Target (₹)':'இலக்கு (₹)','City':'நகரம்','Save Alert':'அறிவிப்பைச் சேமி',
  'Current price':'இன்றைய விலை','Alert when':'எப்போது அறிவிக்க வேண்டும்',
  'Below':'கீழே','Above':'மேலே','Your alerts':'உங்கள் அறிவிப்புகள்',
  'No saved alerts':'அறிவிப்புகள் இல்லை','Remove':'நீக்கு',
  'Triggered':'இலக்கு எட்டியது','Not triggered':'இலக்கு எட்டவில்லை',
  'Unavailable':'கிடைக்கவில்லை','Check now':'இப்போது சரிபார்',
  'Browser notification':'உலாவி அறிவிப்பு','Alerts work while the app is open. No background push service.':'செயலி திறந்திருக்கும்போது அறிவிப்பு சரிபார்க்கப்படும். பின்னணி அறிவிப்பு இல்லை.',
  'Making charges':'செய்கூலி','Flat ₹':'நிலையான ₹','Percent %':'சதவீதம் %',
  'Wastage %':'சேதாரம் %','Calculate Bill':'பில் கணக்கிடு',
  'Metal value':'தங்க மதிப்பு','Wastage':'சேதாரம்','Making':'செய்கூலி',
  'GST (3%)':'GST (3%)','Estimated bill':'மதிப்பிடப்பட்ட பில்',
  'IBJA reference':'IBJA குறிப்பு','City reference':'நகர விலை',
  'Dated reference prices, not a shop checkout quote.':'தேதியிட்ட குறிப்பு விலை; கடையின் இறுதி விலை அல்ல.',
  'Shop making charges and actual invoice may differ.':'உண்மையான செய்கூலி மற்றும் கடை பில் மாறலாம்.',
  'Metal':'உலோகம்','Predictions evaluated':'சோதிக்கப்பட்ட கணிப்புகள்',
  'Issued forecasts':'வெளியிடப்பட்ட கணிப்புகள்',
  'Realized error':'உண்மையான பிழை','Last-close baseline':'முந்தைய விலை அடிப்படை',
  'Lower is better':'குறைவாக இருப்பது சிறந்தது',
  'No evaluated forecasts yet.':'இன்னும் சோதிக்கப்பட்ட கணிப்புகள் இல்லை.',
  'Historical model test (not live forecast accuracy)':'பழைய தரவு மாதிரி சோதனை (நேரடி கணிப்பு துல்லியம் அல்ல)',
  'No proven improvement over last-close baseline.':'முந்தைய விலையை விட துல்லியம் அதிகரித்தது நிரூபிக்கப்படவில்லை.',
  'New shop quote':'புதிய கடை விலை','Shop name':'கடை பெயர்',
  'Quoted ₹ per gram':'கடையின் ஒரு கிராம் விலை',
  'Making charge ₹':'செய்கூலி ₹','Date':'தேதி',
  'Add Quote':'விலையைச் சேர்','Your shop quotes':'உங்கள் கடை விலைகள்',
  'No verified dealer feed is connected. Enter quotes from shops you contact.':'உறுதிப்படுத்தப்பட்ட கடை விலை தரவு இணைக்கப்படவில்லை. நீங்கள் பெற்ற விலைகளைச் சேர்க்கலாம்.',
  'User-entered, not independently verified':'நீங்கள் உள்ளிட்டது; தனியாக சரிபார்க்கப்படவில்லை',
  'Estimated final bill':'மதிப்பிடப்பட்ட மொத்த பில்',
  'Record purchase':'வாங்கியதைப் பதிவு செய்',
  'Holding type':'வகை','Quantity (grams or units)':'அளவு (கிராம் / யூனிட்)',
  'Total paid (₹)':'செலுத்திய மொத்தம் (₹)',
  'ETF / Fund scheme':'ETF / ஃபண்ட்',
  'Save Holding':'சேமி','Holdings':'சேமித்த வாங்குதல்கள்',
  'Portfolio value':'மொத்த மதிப்பு','Total cost':'மொத்த செலவு',
  'Profit / Loss':'லாபம் / நஷ்டம்','Export JSON':'JSON சேமிக்க',
  'Stored on this device only. Jewellery resale value can be lower.':'இந்த சாதனத்தில் மட்டும் சேமிக்கப்படும். நகை மறுவிற்பனை மதிப்பு குறையலாம்.',
  'No holdings yet':'இன்னும் பதிவுகள் இல்லை',
  'Old jewellery weight (g)':'பழைய நகை எடை (கிராம்)',
  'Purity deduction %':'தூய்மை கழிவு %','Dealer discount %':'கடை கழிவு %',
  'Fee ₹':'கட்டணம் ₹','Estimate Resale':'மறுவிற்பனை மதிப்பு',
  'New jewellery weight (g)':'புதிய நகை எடை (கிராம்)',
  'Exchange estimate':'மாற்று மதிப்பீடு','Old gold credit':'பழைய தங்க மதிப்பு',
  'Net to pay':'செலுத்த வேண்டியது',
  'Buyback terms depend on the jeweller. No resale quote is guaranteed.':'மறுவிற்பனை மதிப்பு நகைக்கடையைப் பொறுத்தது. இது உறுதியான விலை அல்ல.',
  'Verify HUID in BIS Care':'BIS Care-இல் HUID சரிபார்க்க',
  'Enter HUID (optional)':'HUID உள்ளிடவும் (விருப்பம்)',
  'Check format':'வடிவத்தைச் சரிபார்',
  'Open official BIS Care':'அதிகாரப்பூர்வ BIS Care',
  'Format check only. Actual verification happens inside BIS Care.':'வடிவம் மட்டும் சரிபார்க்கப்படும். உண்மையான சான்று BIS Care-இல் கிடைக்கும்.',
  'NAV per unit':'ஒரு யூனிட்டின் NAV',
  'Not a live exchange price':'நேரடி பங்குச் சந்தை விலை அல்ல',
  'Enter exchange price (optional)':'பங்குச் சந்தை விலை (விருப்பம்)',
  'Compare with NAV':'NAV-உடன் ஒப்பிடு',
  'Premium / Discount':'அதிக / குறைந்த விலை',
  'Expense ratio':'நிர்வாகக் கட்டணம்',
  'Tracking difference':'கண்காணிப்பு வேறுபாடு',
  'Not available in current feed':'தற்போதைய தரவில் இல்லை',
  'Official fund documents':'அதிகாரப்பூர்வ ஃபண்ட் ஆவணங்கள்',
  'Gold spot (XAU)':'உலக தங்க விலை (XAU)',
  'Silver spot (XAG)':'உலக வெள்ளி விலை (XAG)',
  'USD/INR':'டாலர் / ரூபாய்','Indicative INR / 10g':'குறிப்பு ₹ / 10 கிராம்',
  'Not an Indian retail price':'இந்திய கடை விலை அல்ல',
  'LBMA':'LBMA','COMEX':'COMEX','MCX':'MCX',
  'Reference only — official feeds not connected':'குறிப்பு மட்டும் — அதிகாரப்பூர்வ தரவு இன்னும் இணைக்கப்படவில்லை',
  'Not included in forecast model':'கணிப்பு மாதிரியில் சேர்க்கப்படவில்லை',
  'View official source':'அதிகாரப்பூர்வ மூலத்தைப் பார்க்க',
  'Check sources':'மூலங்களைக் காண்க',
  'Open':'திற','Add':'சேர்','All data stays in this browser.':'அனைத்து பதிவுகளும் இந்த உலாவியில் மட்டுமே உள்ளன.',
  'Read more':'மேலும் அறிய','Select':'தேர்ந்தெடு',
  'Saved successfully':'சேமிக்கப்பட்டது','Invalid input':'தவறான உள்ளீடு',
  'No price available':'விலை கிடைக்கவில்லை',
  'Choose tool':'கருவியைத் தேர்ந்தெடு',
  'IBJA':'IBJA','AMFI':'AMFI',
  'Unit count':'யூனிட்கள்',
  'Current value':'தற்போதைய மதிப்பு'
 };
 let active='alerts';
 let ctx=null;
 let rerender=null;
 let notice='';
 const F=(n)=>C.money(n);
 const isTa=()=>ctx?.language==='ta';
 const t=s=>isTa()?(T[s]||s):s;
 const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const label=(s,forId)=>'<label'+(forId?' for="'+h(forId)+'"':'')+'>'+t(s)+'</label>';
 const fld=(id,name,type,value='',step='any',extra='')=>
    '<div class="nt-field">'+label(name,id)+'<input id="'+id+'" name="'+id+'" type="'+type+
    '" value="'+h(value)+'" step="'+step+'" '+extra+'></div>';
 const select=(id,name,choices)=>
    '<div class="nt-field">'+label(name,id)+'<select name="'+id+'" id="'+id+'">'+
    choices.map(([v,n])=>'<option value="'+h(v)+'">'+t(n)+'</option>').join('')+'</select></div>';
 const btn=(s,extra='')=>'<button type="submit" class="nt-primary" '+extra+'>'+t(s)+'</button>';
 const link=(text,url)=>'<a class="nt-link" href="'+url+'" target="_blank" rel="noopener noreferrer">'+t(text)+' ↗</a>';
 const card=(title,body)=>'<section class="nt-card"><h2>'+t(title)+'</h2>'+body+'</section>';
 const footer=txt=>'<p class="nt-foot">'+t(txt)+'</p>';
 const quotes=()=>C.buildQuotes({india:ctx.rates?.india,funds:ctx.funds,cityRates:ctx.cityRates,city:ctx.city});
 const cityDate=()=>ctx.cityRates?.dates?.gold||'';
 const reference=(metal='gold22')=>{
   const q=quotes(),value=q[metal],dataDate=ctx.rates?.india?.date;
   const isCity=ctx.cityRates?.cities?.[ctx.city];
   const sourceCity=metal==='gold22'?q.cityGold22:metal==='gold24'?q.cityGold24:null;
   // Accept dated city source only if not beyond 7 calendar days.
   const fresh=Boolean(sourceCity&&cityDate()&&Date.parse(cityDate())>=Date.now()-8*86400000);
   return {value:fresh?sourceCity:value,date:fresh?cityDate():dataDate,
     source:fresh?'City reference':'IBJA reference'};
 };
 const header=()=>{
   const links=MODULES.map(([id,title,ta])=>
     '<button type="button" class="nt-nav-item'+(id===active?' active':'')+
       '" data-nt-module="'+id+'" aria-pressed="'+(active===id)+'">'+(isTa()?ta:title)+'</button>').join('');
   return '<section class="nt-heading"><div><span class="nr-kicker">NEXT RATE</span><h1>'+t('Tools')+'</h1><p>'+
     t('All 9 features')+'</p></div><span class="nt-local">'+t('All data stays in this browser.')+
     '</span></section><nav class="nt-selector" aria-label="'+t('Choose tool')+'">'+links+'</nav>';
 };
 function alerts(){
   const all=C.localRead('alerts');
   const q=quotes();
   const pairs={};
   for(const [metal,mult] of [['gold22',1],['gold24',1],['silver',1]]){
     const rate=q[metal];
     if(Number.isFinite(rate))pairs[ctx.city+':'+metal]=rate;
   }
   const rows=all.map((v,i)=>{
     const perGram=pairs[v.city+':'+v.metal];
     const current=Number.isFinite(perGram)?C.round(perGram*v.grams):null;
     const match=current!==null&&C.statusMatch({key:'price',direction:v.direction,threshold:v.target},{price:current});
     return '<div class="nt-line"><span><b>'+h(v.city)+' · '+h(v.metal)+' · '+h(v.grams)+'g</b>'+
       '<small>'+t(v.direction==='below'?'Below':'Above')+' '+F(v.target)+' · '+
       t('Current price')+': '+F(current)+'</small></span><span class="'+(match?'nt-positive':'nt-muted')+
       '">'+t(match?'Triggered':'Not triggered')+'</span><button type="button" data-nt-remove="alerts" data-index="'+i+
       '" aria-label="'+t('Remove')+'">×</button></div>';
   }).join('');
   const body='<p class="nt-help">'+t('Alerts work while the app is open. No background push service.')+'</p>'+
     '<form id="nt-alert-form" class="nt-form">'+
     select('alert-metal','Metal',[['gold22','Gold 22K'],['gold24','Gold 24K'],['silver','Silver']])+
     select('alert-direction','Alert when',[['below','Below'],['above','Above']])+
     fld('alert-grams','Weight (g)','number',8,.01,'min="0.01" max="100000" required')+
     fld('alert-target','Target (₹)','number','',.01,'min="0.01" required')+
     btn('Save Alert')+'</form>'+
     '<div class="nt-line-head"><h3>'+t('Your alerts')+'</h3><button type="button" class="nt-soft" data-nt-alert-check>'+
       t('Check now')+'</button></div>'+
     (rows||'<p class="nt-empty">'+t('No saved alerts')+'</p>')+
     '<div class="nt-action">'+
       '<button type="button" class="nt-soft" data-nt-notifications>'+t('Browser notification')+'</button></div>';
   return card('Price Alerts',body);
 }
 function bill(){
   const p=reference('gold22');
   const body='<p class="nt-help">'+t('Dated reference prices, not a shop checkout quote.')+'</p>'+
    '<form class="nt-form" id="nt-bill-form">'+
    select('bill-purity','Purity',[['gold22','Gold 22K'],['gold24','Gold 24K']])+
    fld('bill-grams','Weight (g)','number',8,.01,'min="0.01" required')+
    select('bill-mode','Making charges',[['flat','Flat ₹'],['percent','Percent %']])+
    fld('bill-making','Making charges','number',3000,.01,'min="0" required')+
    fld('bill-waste','Wastage %','number',0,.01,'min="0" max="100" required')+
    btn('Calculate Bill')+'</form><div id="nt-bill-result" class="nt-output" role="status"></div>'+
    footer('Shop making charges and actual invoice may differ.')+
    link('View official source',SOURCE.gst);
   return card('Jewellery Bill',body);
 }
 function accuracy(){
   const metals=[['gold24','Gold 24K'],['gold22','Gold 22K'],['silver','Silver']];
   const rows=metals.map(([metal,name])=>{
     const completed=C.accuracy(ctx.forecastHistory?.forecasts,metal);
     const backtest=ctx.forecast?.metals?.[metal]?.backtest;
     const live='<strong>'+(completed.n?completed.mape+'%':'—')+'</strong>';
     const holdout=backtest?.status==='walk_forward'?
       backtest.holdout_mape_pct+'% / '+backtest.holdout_naive_mape_pct+'%':'—';
     return '<div class="nt-accuracy-row"><b>'+t(name)+'</b><span>'+
       t('Issued forecasts')+': '+completed.n+'</span><span>'+
       t('Realized error')+': '+live+'</span><span>'+t('Historical model test (not live forecast accuracy)')+
       ': '+holdout+'</span></div>';
   }).join('');
   return card('Accuracy','<p class="nt-help">'+t('No proven improvement over last-close baseline.')+'</p>'+
     rows+footer('Historical model test (not live forecast accuracy)'));
 }
 function shops(){
   const rows=C.localRead('shops').filter(v=>v.city===ctx.city);
   const listing=rows.map((q)=>{
     let estimate='—';
     try{estimate=F(C.jewelleryBill({ratePerGram:q.rate,grams:q.grams,making:q.making}).total)}catch{}
     return '<div class="nt-line"><span><b>'+h(q.name)+'</b><small>'+h(q.city)+' · '+
       h(q.date)+' · '+h(q.grams)+' g · '+t('User-entered, not independently verified')+
       '</small></span><strong>'+estimate+'</strong><button type="button" data-nt-remove-id="shops" data-id="'+h(q.id)+'">×</button></div>';
   }).join('');
   return card('Compare Shops','<p class="nt-help">'+t('No verified dealer feed is connected. Enter quotes from shops you contact.')+'</p>'+
     '<form id="nt-shop-form" class="nt-form">'+
       fld('shop-name','Shop name','text','','any','required maxlength="72"')+
       fld('shop-rate','Quoted ₹ per gram','number','',.01,'min="0.01" required')+
       fld('shop-grams','Weight (g)','number',8,.01,'min="0.01" required')+
       fld('shop-making','Making charge ₹','number',0,.01,'min="0" required')+
       fld('shop-date','Date','date',new Date().toISOString().slice(0,10),'any','required')+
       btn('Add Quote')+'</form>'+
     '<h3>'+t('Your shop quotes')+' · '+h(ctx.city)+'</h3>'+
     (listing||'<p class="nt-empty">'+t('No price available')+'</p>')+
     footer('User-entered, not independently verified'));
 }
 function portfolio(){
   const q=quotes(),holdings=C.localRead('holdings');
   const values=holdings.map(h=>{try{return C.holdingValue(h,q)}catch{return {value:null,invested:0,pnl:null}}});
   const invested=values.reduce((x,v)=>x+(v.invested||0),0);
   const known=values.filter(v=>v.value!==null);
   const total=known.reduce((x,v)=>x+v.value,0);
   const complete=known.length===holdings.length;
   const pnl=complete?total-invested:null;
   const items=holdings.map((entry,i)=>{
     const v=values[i];
     return '<div class="nt-line"><span><b>'+t(({gold24:'Gold 24K',gold22:'Gold 22K',silver:'Silver',etf:'Gold & Silver ETF',fund:'Gold & Silver ETF'})[entry.type]||entry.type)+'</b>'+
       '<small>'+h(entry.quantity)+' · '+F(entry.paid)+' · '+h(entry.date||'')+'</small></span>'+
       '<strong>'+F(v.value)+'</strong><button type="button" data-nt-remove="holdings" data-index="'+i+'">×</button></div>';
   }).join('');
   const funds=Object.entries(ctx.funds?.funds||{}).map(([id,f])=>[id,f.name]);
   return card('My Gold','<p class="nt-help">'+t('Stored on this device only. Jewellery resale value can be lower.')+'</p>'+
    '<div class="nt-metrics"><div><span>'+t('Total cost')+'</span><strong>'+F(invested)+'</strong></div>'+
    '<div><span>'+t('Portfolio value')+'</span><strong>'+(complete?F(total):'—')+'</strong></div>'+
    '<div><span>'+t('Profit / Loss')+'</span><strong>'+F(pnl)+'</strong></div></div>'+
    '<form class="nt-form" id="nt-holding-form">'+
    select('holding-type','Holding type',[['gold22','Gold 22K'],['gold24','Gold 24K'],['silver','Silver'],['etf','Gold & Silver ETF'],['fund','Gold & Silver ETF']])+
    select('holding-scheme','ETF / Fund scheme',funds.length?funds:[['','Unavailable']])+
    fld('holding-qty','Quantity (grams or units)','number',8,.001,'min="0.001" required')+
    fld('holding-paid','Total paid (₹)','number','',.01,'min="0.01" required')+
    btn('Save Holding')+'</form>'+
    '<div class="nt-line-head"><h3>'+t('Holdings')+'</h3><button type="button" class="nt-soft" data-nt-export>'+
    t('Export JSON')+'</button></div>'+(items||'<p class="nt-empty">'+t('No holdings yet')+'</p>'));
 }
 function sell(){
   return card('Sell / Exchange','<p class="nt-help">'+t('Buyback terms depend on the jeweller. No resale quote is guaranteed.')+'</p>'+
    '<form class="nt-form" id="nt-resale-form">'+
    select('sell-metal','Purity',[['gold22','Gold 22K'],['gold24','Gold 24K']])+
    fld('sell-grams','Old jewellery weight (g)','number',8,.01,'min="0.01" required')+
    fld('sell-deduction','Purity deduction %','number',1,.1,'min="0" max="100" required')+
    fld('sell-spread','Dealer discount %','number',2,.1,'min="0" max="100" required')+
    fld('sell-fee','Fee ₹','number',0,.01,'min="0" required')+
    fld('sell-new','New jewellery weight (g)','number',8,.01,'min="0.01" required')+
    btn('Estimate Resale')+'</form>'+
    '<div id="nt-resale-result" class="nt-output" role="status"></div>'+
    footer('Buyback terms depend on the jeweller. No resale quote is guaranteed.'));
 }
 function hallmark(){
   return card('Hallmark','<p class="nt-help">'+t('Format check only. Actual verification happens inside BIS Care.')+'</p>'+
     '<div class="nt-form">'+fld('nt-huid','Enter HUID (optional)','text','','any','maxlength="6" autocomplete="off"')+
     '<button type="button" class="nt-primary" data-nt-huid>'+t('Check format')+'</button></div>'+
     '<div id="nt-huid-result" class="nt-output" role="status"></div>'+
     '<p class="nt-help">BIS Care → Verify HUID</p>'+
     link('Open official BIS Care',SOURCE.bis));
 }
 function etf(){
   const fundRows=Object.entries(ctx.funds?.funds||{}).sort((a,b)=>
     a[1].name.localeCompare(b[1].name));
   const list=fundRows.map(([key,v])=>
     '<div class="nt-line"><span><b>'+h(v.name)+'</b><small>'+
     h(v.kind)+' · AMFI '+h(v.nav_date)+'</small></span><strong>'+F(v.nav_inr_per_unit)+'</strong></div>').join('');
   return card('Gold & Silver ETF','<p class="nt-help">'+t('Not a live exchange price')+
     '. '+t('Expense ratio')+' / '+t('Tracking difference')+': '+t('Not available in current feed')+'</p>'+
     '<div class="nt-label">'+t('NAV per unit')+'</div>'+
     (list||'<p class="nt-empty">'+t('No price available')+'</p>')+
     '<form class="nt-form" id="nt-etf-form">'+
     select('etf-scheme','ETF / Fund scheme',fundRows.map(([k,v])=>[k,v.name]))+
     fld('etf-market','Enter exchange price (optional)','number','',.01,'min="0.01" required')+
     btn('Compare with NAV')+'</form><div id="nt-etf-result" class="nt-output" role="status"></div>'+
     link('Official fund documents',SOURCE.amfi));
 }
 function global(){
   const spot=ctx.rates?.spot||{},fx=ctx.rates?.fx;
   const gold=spot.XAU?.usd_per_troy_ounce;
   const silver=spot.XAG?.usd_per_troy_ounce;
   let indicative='—';
   if(Number.isFinite(gold)&&Number.isFinite(fx?.inr_per_usd))indicative=F(C.impliedSpotInr(gold,fx.inr_per_usd));
   const figures=[
     ['Gold spot (XAU)',Number.isFinite(gold)?'$'+gold.toLocaleString('en-US'):'—',spot.XAU?.as_of],
     ['Silver spot (XAG)',Number.isFinite(silver)?'$'+silver.toLocaleString('en-US'):'—',spot.XAG?.as_of],
     ['USD/INR',Number.isFinite(fx?.inr_per_usd)?fx.inr_per_usd.toFixed(3):'—',fx?.date],
     ['Indicative INR / 10g',indicative,ctx.rates?.india?.date]
   ];
   const rows=figures.map(([name,value,date])=>
     '<div class="nt-line"><span><b>'+t(name)+'</b><small>'+h(date||'')+'</small></span><strong>'+
     value+'</strong></div>').join('');
   return card('World Markets',rows+
     footer('Not an Indian retail price')+
     '<h3>LBMA · COMEX · MCX</h3>'+
     '<p class="nt-help">'+t('Reference only — official feeds not connected')+
     '. '+t('Not included in forecast model')+'</p>'+
     '<div class="nt-sources">'+link('LBMA',SOURCE.lbma)+link('COMEX',SOURCE.cme)+link('MCX',SOURCE.mcx)+'</div>'+
     '<p class="nt-help">'+t('Not included in forecast model')+'. '+t('Not a live exchange price')+'</p>'+
     link('View official source',SOURCE.ibja));
 }
 const modules={alerts,bill,accuracy,shops,portfolio,sell,hallmark,etf,global};
 function render(context){
   ctx=context;
   return '<div class="nt-app">'+header()+'<div class="nt-notice" role="status" aria-live="polite">'+
     h(notice)+'</div>'+modules[active]()+'</div>';
 }
 function field(form,name){return form.elements.namedItem(name)?.value}
 function num(form,name){return C.valid(field(form,name),name)}
 function say(message){notice=message;rerender?.()}
 function save(kind,record){
   const existing=C.localRead(kind);
   C.localWrite(kind,[...existing,record]);say(t('Saved successfully'));
 }
 function onSubmit(e){
   const form=e.target;
   if(!form.id?.startsWith('nt-'))return;
   e.preventDefault();
   try{
    const id=String(Date.now())+'-'+Math.random().toString(36).slice(2,8);
    if(form.id==='nt-alert-form'){
      const metal=field(form,'alert-metal'),grams=num(form,'alert-grams'),target=num(form,'alert-target');
      if(target<=0)throw new RangeError('Invalid target');
      if(!['gold22','gold24','silver'].includes(metal))throw new RangeError('Invalid metal');
      save('alerts',{id,city:ctx.city,metal,grams,target,direction:field(form,'alert-direction')});
    }else if(form.id==='nt-shop-form'){
      save('shops',{id,city:ctx.city,name:field(form,'shop-name').trim().slice(0,72),
        rate:num(form,'shop-rate'),grams:num(form,'shop-grams'),making:num(form,'shop-making'),
        date:field(form,'shop-date')});
    }else if(form.id==='nt-holding-form'){
      const type=field(form,'holding-type'),scheme=field(form,'holding-scheme');
      if(!['gold22','gold24','silver','etf','fund'].includes(type))throw new RangeError('Invalid type');
      if(['etf','fund'].includes(type)&&!ctx.funds?.funds?.[scheme])throw new RangeError('No valid fund');
      save('holdings',{id,type,scheme,quantity:num(form,'holding-qty'),
         paid:num(form,'holding-paid'),date:new Date().toISOString().slice(0,10)});
    }else if(form.id==='nt-bill-form'){
      const metal=field(form,'bill-purity');
      const base=reference(metal);
      if(!Number.isFinite(base.value)||base.value<=0)throw new Error('No dated price available');
      const q=C.jewelleryBill({ratePerGram:base.value,grams:num(form,'bill-grams'),
        making:num(form,'bill-making'),makingMode:field(form,'bill-mode'),
        wastagePct:num(form,'bill-waste')});
      const out=form.parentNode.querySelector('#nt-bill-result');
      out.innerHTML='<h3>'+t('Estimated bill')+': '+F(q.total)+'</h3>'+
       [[t('Metal value'),q.metal],[t('Wastage'),q.wastage],[t('Making'),q.makingCharge],
         [t('GST (3%)'),q.gst]].map(([k,v])=>'<div class="nt-pair"><span>'+k+'</span><b>'+F(v)+'</b></div>').join('')+
       '<small>'+t(base.source)+' · '+h(base.date||'')+'</small>';
    }else if(form.id==='nt-resale-form'){
      const type=field(form,'sell-metal'),base=C.metalRate(ctx.rates?.india,type);
      if(!Number.isFinite(base))throw new RangeError('No reference');
      const weight=num(form,'sell-grams');
      const credit=C.buyback({ratePerGram:base,grams:weight,deductionPct:num(form,'sell-deduction'),
        spreadPct:num(form,'sell-spread'),fee:num(form,'sell-fee')});
      const newWeight=num(form,'sell-new');
      const newBill=C.jewelleryBill({ratePerGram:base,grams:newWeight,making:0});
      const exchange=C.exchangeBill(newBill,credit);
      form.parentNode.querySelector('#nt-resale-result').innerHTML=
        '<h3>'+t('Old gold credit')+': '+F(credit.estimatedCredit)+'</h3>'+
        '<div class="nt-pair"><span>'+t('Net to pay')+'</span><strong>'+F(exchange.netPayable)+'</strong></div>'+
        '<small>Exchange excludes new making charges and jewellery-specific terms.</small>';
    }else if(form.id==='nt-etf-form'){
      const scheme=field(form,'etf-scheme'),nav=ctx.funds?.funds?.[scheme]?.nav_inr_per_unit;
      if(!Number.isFinite(nav))throw new RangeError('Missing NAV');
      const diff=C.percentDiff(num(form,'etf-market'),nav);
      form.parentNode.querySelector('#nt-etf-result').innerHTML='<h3>'+
        t('Premium / Discount')+': '+diff+'%</h3><small>Market price entered by you · AMFI NAV '+F(nav)+'</small>';
    }
   }catch(err){notice=t('Invalid input')+': '+err.message;rerender?.()}
 }
 function onClick(e){
   const tab=e.target.closest('[data-nt-module]');
   if(tab){active=tab.dataset.ntModule;notice='';rerender?.();return}
   const remove=e.target.closest('[data-nt-remove],[data-nt-remove-id]');
   if(remove){
     const kind=remove.dataset.ntRemove||remove.dataset.ntRemoveId;
     let records=C.localRead(kind);
     records=remove.dataset.ntRemoveId?records.filter(item=>item.id!==remove.dataset.id):
       records.filter((_,index)=>index!==Number(remove.dataset.index));
     try{C.localWrite(kind,records);say(t('Saved successfully'))}catch(err){say(err.message)}return;
   }
   if(e.target.closest('[data-nt-huid]')){
     const code=(document.getElementById('nt-huid')?.value||'').trim().toUpperCase();
     document.getElementById('nt-huid-result').textContent=/^[A-Z0-9]{6}$/.test(code)
       ? '6-character format only. Verify this HUID with BIS Care; it is not authenticated here.'
       : 'Enter a valid 6-character alphanumeric HUID. Only BIS Care can verify it.';
   }
   if(e.target.closest('[data-nt-export]')){
     const data={exportedAt:new Date().toISOString(),holdings:C.localRead('holdings')};
     const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
     const url=URL.createObjectURL(blob);
     const a=document.createElement('a');
     a.href=url;a.download='nextrate-holdings.json';a.click();
     setTimeout(()=>URL.revokeObjectURL(url),1000);
   }
   if(e.target.closest('[data-nt-alert-check]')){
     const records=C.localRead('alerts');
     const q=quotes();
     const hit=records.filter(a=>{
       const rate=q[a.metal];
       return a.city===ctx.city&&Number.isFinite(rate)&&C.statusMatch({
         key:'value',direction:a.direction,threshold:a.target},{value:rate*a.grams});
     });
     say(hit.length?hit.length+' alert(s) reached using currently published data.':
       'No matching alert at the current dated benchmark.');
   }
   if(e.target.closest('[data-nt-notifications]')){
     if(!('Notification' in root)){
       say('Browser notifications are unavailable. In-app checks work when open.');return
     }
     if(root.Notification.permission==='granted'){
       say('Browser permission enabled. Background push is not connected.');return
     }
     root.Notification.requestPermission().then(permission=>
       say(permission==='granted'?'Permission enabled; background push not connected.':
         'Notification permission not granted.'));
   }
 }
 function wire(container,context,refresh){
   ctx=context;rerender=refresh;
   const hub=container.querySelector('.nt-app');
   if(!hub)return;
   hub.addEventListener('submit',onSubmit);
   hub.addEventListener('click',onClick);
 }
 function open(which){if(MODULES.some(m=>m[0]===which))active=which}
 const api=Object.freeze({render,wire,open,items:MODULES,source:SOURCE});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.NextRateModules=api;
})(typeof window==='undefined'?globalThis:window);
