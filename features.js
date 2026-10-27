/* NextRate: resale, official hallmark guidance and dated ETF comparison. */
(function(root) {
'use strict';
const C=root.NextRateCore || (typeof module!=='undefined'?require('./features-core.js'):null);
const KEY='nextrate-tools-v2';
const SECTIONS=[
 ['resale','Sell / Exchange'],
 ['hallmark','Verify Hallmark'],
 ['etfs','ETF Comparison']
];
let memory={etfQuotes:{},preferred:'resale'},message='',ctxCache=null,storageUnavailable=false;
try{
 const data=JSON.parse(root.localStorage.getItem(KEY)||root.localStorage.getItem('nextrate-tools-v1')||'null');
 if(data)memory=C.storedState(data);
}catch{storageUnavailable=true;}
function save(){
 try{root.localStorage.setItem(KEY,JSON.stringify({version:2,...memory}));storageUnavailable=false;}
 catch{storageUnavailable=true;}
}
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
    ' data-label="'+h(v[1])+'" data-value="'+h(v[0])+'" aria-selected="'+(i===0)+'" tabindex="'+(i===0?0:-1)+'">'+h(v[1])+'</button>').join('')+
  '</div></div></div>';
};
const btn=(label)=>'<button type="submit" class="tool-primary">'+h(label)+'</button>';
const note=(text)=>'<p class="tool-note">'+text+'</p>';
const link=(label,url)=>'<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+h(label)+' ↗</a>';
function context(){return ctxCache||{};}
function date(){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const part=n=>parts.find(p=>p.type===n)?.value;return part('year')+'-'+part('month')+'-'+part('day');}
function validBenchmark(kind){
 const rate=C.publishedRate(context().rates,kind),day=context().rates?.india?.date;
 return rate&&C.ageDays(day)>=0&&C.ageDays(day)<=7?{rate,date:day}:null;
}
function formData(form){return Object.fromEntries([...new FormData(form)].map(([k,v])=>[k,String(v).trim()]));}
function showBanner(){return (message?'<p class="tool-banner" role="status">'+h(message)+'</p>':'')+
 (storageUnavailable?'<p class="tool-banner" role="status">Browser storage unavailable. Changes last only for this visit.</p>':'');}
function goldReferences(){
 const a=validBenchmark('gold24'),b=validBenchmark('gold22');
 return '<p class="tool-reference">IBJA · '+h(a?.date||b?.date||'not available')+
  ' · 24K / 10g: '+(a?m(a.rate):'Unavailable')+' · 22K / 10g: '+(b?m(b.rate):'Unavailable')+'</p>';
}
function resalePanel(){
 return '<div class="tool-feature-heading"><h2>Sell / Exchange Gold</h2><p>Estimate resale proceeds.</p></div>'+
  goldReferences()+
  '<form data-feature-form="resale"><div class="tool-form-grid">'+
    opt('purity',[['24','24K'],['22','22K'],['18','18K (derived)']],'Purity')+
    field('grams','Net gold (g)','8','number','min="0.01" max="10000" step="any" inputmode="decimal"')+
    field('deduction','Buyer deduction (%)','2','number','min="0" max="100" step="any" inputmode="decimal"')+
    field('fixedFee','Testing / other fee (₹)','0','number','min="0" max="10000000" step="any" inputmode="decimal"')+
    '</div>'+btn('Estimate resale')+'</form>'+
  '<div class="tool-result" id="resale-result"><p>Your estimated proceeds will appear here.</p></div>'+
  note('Dealer deductions may differ. 18K is derived from the 24K reference.');
}
function hallmarkPanel(){
 return '<div class="tool-feature-heading"><h2>Verify Hallmark</h2><p>Open the official BIS Care app.</p></div>'+
  '<div class="tool-hallmark">'+
  '<div class="tool-hallmark-body"><strong>Check gold jewellery HUID</strong>'+
   '<p>Use Verify HUID in the official BIS Care app. Only BIS can confirm whether an ID is valid.</p>'+
   '<div class="tool-app-links">'+
    link('Android · Google Play','https://play.google.com/store/apps/details?id=com.bis.bisapp')+
    link('iPhone · App Store','https://apps.apple.com/in/app/bis-care-app/id6443724891')+
    '</div></div></div>'+

  '<form data-feature-form="huid"><div class="tool-form-grid">'+
    field('code','6-character HUID','', 'text','maxlength="6" minlength="6" pattern="[A-Za-z0-9]{6}" placeholder="HUID"')+
    '</div>'+btn('Copy HUID to check in BIS Care')+'</form>'+
  '<div class="tool-result" id="huid-result"><p>NextRate cannot verify HUID by itself.</p></div>'+
  note(link('BIS consumer guidance','https://www.bis.gov.in/hallmarking-overview/consumer-protection/?lang=en'));
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
   '<div><b>'+m(nav)+'</b><small>NAV / unit</small>'+
   (premiumValue===null?'':'<small class="tool-etf-premium">'+(premiumValue>0?'+':'')+premiumValue.toFixed(2)+'% · Manual premium</small>')+'</div></div>';
 }).join('');
 const products=all.map(([id,row])=>[id,row.name]);
 return '<div class="tool-feature-heading"><h2>ETF Comparison</h2><p>Published AMFI NAV. Trade price may differ.</p></div>'+

  '<div class="tool-etf-list">'+(table||'<p class="tool-note">AMFI feed unavailable.</p>')+'</div>'+
  (products.length?'<form data-feature-form="etf"><div class="tool-form-grid">'+
    opt('fund',products,'ETF / Fund')+
    field('quote','Exchange price entered by you (₹)','', 'number','min="0.01" max="10000000" step="any" inputmode="decimal"')+
    '</div>'+btn('Compare to NAV')+'</form>':'')+
  '<div class="tool-result" id="etf-result"><p>Enter an exchange quote from your broker to estimate its premium or discount.</p></div>'+
  note('NAV is not a trade price. Premium requires matching dates. '+
   link('AMFI NAV','https://www.amfiindia.com/net-asset-value/nav-download')+' · '+
   link('NSE ETF market data','https://www.nseindia.com/market-data/exchange-traded-funds-etf'));
}
const panels={resale:resalePanel,hallmark:hallmarkPanel,etfs:etfPanel};
function page(ctx){
 ctxCache=ctx||ctxCache||{};
 const links=SECTIONS.map(([id,label])=>
  '<button type="button" class="tool-menu-item'+(memory.preferred===id?' active':'')+
  '" data-tool-select="'+id+'" aria-pressed="'+(memory.preferred===id)+'">'+
   '<strong>'+label+'</strong></button>').join('');
 return '<div class="toolspage"><div class="tools-header"><h1>Gold Tools</h1></div>'+
  '<div class="tools-layout"><nav class="tools-menu" aria-label="Gold tools">'+links+'</nav>'+
  '<section class="tools-panel" aria-live="polite">'+showBanner()+
  (panels[memory.preferred]||resalePanel)()+'</section></div></div>';
}
function refresh(){ctxCache?.refresh?.();}
function onSubmit(event){
 const form=event.target.closest('form[data-feature-form]');if(!form)return;
 event.preventDefault();const v=formData(form),kind=form.dataset.featureForm,ctx=context();
 try{
  if(kind==='resale'){
   let rate=null;
   if(v.purity==='22')rate=validBenchmark('gold22')?.rate;
   else if(v.purity==='24')rate=validBenchmark('gold24')?.rate;
   else if(v.purity==='18')rate=(validBenchmark('gold24')?.rate||0)*.75;
   if(!rate)throw new Error('IBJA reference unavailable.');
   const result=C.resaleQuote({ratePer10g:rate,grams:v.grams,
     purity:v.purity,deductionPct:v.deduction,fixedFee:v.fixedFee});
   const container=form.parentElement.querySelector('#resale-result');
   if(container)container.innerHTML='<span>Estimated cash / exchange value</span>'+
    '<strong>'+m(result.proceeds)+'</strong><small>'+h(v.purity)+'K · IBJA '+h(ctx.rates.india.date)+' · Metal '+m(result.metal)+
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
   const q=C.number(v.quote,.01,1e7);
   if(C.ageDays(fund.nav_date)<0||C.ageDays(fund.nav_date)>10)throw new Error('Current NAV unavailable.');
   const pct=date()===fund.nav_date?C.premium(q,fund.nav_inr_per_unit):null;
   const stamped=date(),out=form.parentElement.querySelector('#etf-result');
   memory.etfQuotes[v.fund]={quote:q,date:stamped};
   save();
   if(out)out.innerHTML='<span>Manually entered price vs dated NAV</span>'+
   '<strong>'+(pct===null?'Different dates — premium unavailable':(pct>0?'+':'')+pct.toFixed(2)+'%')+'</strong>'+
   '<small>Entered '+h(stamped)+'; NAV '+h(fund.nav_date)+
   (stamped===fund.nav_date?' (same day)':' (different dates: not a comparable trading premium)')+'</small>';
  }
  root.NextRateI18n?.apply(form.parentElement,ctx.language);
 }catch(e){message=e.message||'Check the entered values.';refresh();}
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
  const input=picker.querySelector('input[type="hidden"]');
  input.value=pickerOption.dataset.value;
  const current=picker.querySelector('.tool-picker-trigger>span:first-child');
  if(current){current.textContent=pickerOption.dataset.label;root.NextRateI18n?.apply(current,context().language);}
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
 const t=event.target.closest('[data-tool-select]');
 if(t&&SECTIONS.some(x=>x[0]===t.dataset.toolSelect)){
  memory.preferred=t.dataset.toolSelect;message='';save();refresh();
 }
}
function mount(container,ctx){
 ctxCache=ctx;if(!container)return;
 container.addEventListener('click',onClick);
 container.addEventListener('keydown',onPickerKey);
 container.addEventListener('submit',onSubmit);
}
if(root.document)root.document.addEventListener('pointerdown',event=>{
 if(!event.target.closest?.('[data-tool-picker]'))closeAllPickers();
});
const api=Object.freeze({page,mount,sections:SECTIONS,
 select(id){if(SECTIONS.some(x=>x[0]===id)){memory.preferred=id;message='';save();}},
 getState(){return JSON.parse(JSON.stringify(memory));}});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.NextRateFeatures=api;
})(typeof window==='undefined'?globalThis:window);
