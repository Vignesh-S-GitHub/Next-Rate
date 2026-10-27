'use strict';
// Deterministic browser regressions. Live source/network checks run separately after deployment.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),endpoint='https://nextrate-scheduler.vigneshshanmugam.workers.dev';
const files=['latest.json','history.json','forecast.json','funds.json','cities.json','forecast_history.json'];
const documents=Object.fromEntries(files.map(f=>[f,JSON.parse(fs.readFileSync(path.join(root,'data',f)))]));
const clone=x=>JSON.parse(JSON.stringify(x));
const money=x=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:0,maximumFractionDigits:2}).format(Math.round((x+Number.EPSILON)*100)/100);
let browser,server,page,checks=0;
async function text(selector,pattern){await page.locator(selector).filter({hasText:pattern}).first().waitFor();checks++;}
async function value(selector,expected){await page.waitForFunction(({selector,expected})=>document.querySelector(selector)?.value===expected,{selector,expected});checks++;}
async function click(selector){await page.locator(selector).click();}
async function route(name){await page.locator('[data-route="'+name+'"]:visible').click();await page.waitForFunction(n=>document.title==='NextRate | '+n[0].toUpperCase()+n.slice(1),name);}
async function tool(name){await click('[data-tool-select="'+name+'"]');await page.locator('[data-tool-select="'+name+'"][aria-pressed="true"]').waitFor();}
async function choose(name,val){await click('[data-tool-picker]:has(input[name="'+name+'"]) [data-tool-picker-toggle]');await click('[data-tool-picker]:has(input[name="'+name+'"]) [data-value="'+val+'"]');}
async function refresh(){await page.clock.fastForward(60001);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));}
async function submit(kind){await page.locator('[data-feature-form="'+kind+'"] button[type="submit"]').click();}
async function layout(){const bounds=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.right>innerWidth+2;}).slice(0,8).map(el=>({tag:el.tagName,cls:el.className,right:Math.round(el.getBoundingClientRect().right)}))}));assert.ok(bounds.scroll<=bounds.width+2,'No horizontal page overflow: '+JSON.stringify(bounds));assert.doesNotMatch(await page.locator('#app').innerText(),/NaN|undefined|Invalid Date|Infinity/);checks+=2;}
async function alignedFields(){
 const boxes=await page.locator('.tool-form-grid>.tool-field').evaluateAll(fields=>fields.map(field=>{
  const c=field.querySelector('input:not([type="hidden"]),.tool-picker-trigger'),f=field.getBoundingClientRect(),r=c?.getBoundingClientRect();
  return {row:f.y,top:r?.top,bottom:r?.bottom,width:r?.width};
 }));
 for(let i=0;i+1<boxes.length;i+=2){const a=boxes[i],b=boxes[i+1];if(Math.abs(a.row-b.row)<2){
  assert.ok(Math.abs(a.top-b.top)<2,'Paired input tops align: '+JSON.stringify(boxes));
  assert.ok(Math.abs(a.bottom-b.bottom)<2,'Paired input bottoms align');checks+=2;
 }}
}
async function open(context,mode='ok',docs=documents,stored=null){
 page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page._errors=errors;
 await page.clock.install({time:new Date('2026-10-27T10:00:00Z')});
 if(stored)await page.addInitScript(s=>localStorage.setItem('nextrate-tools-v2',JSON.stringify(s)),stored);
 await page.route(endpoint+'/**',r=>mode==='offline'?r.abort():r.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({schema_version:1,revision:1,documents:docs})}));
 await page.goto(server.url);await page.locator('.home-actual strong').first().waitFor();return page;
}
async function audit(viewport){
 console.log('Audit viewport:',viewport.width);
 const context=await browser.newContext({viewport});await open(context);
 const indian=documents['latest.json'].india;
 await text('.home-actual',new RegExp(indian.gold24_inr_10g.toLocaleString('en-IN')));await layout();
 assert.equal(await page.locator('[data-refresh],.data-status,.home-source-note,.nr-small-details').count(),0);checks++;
 assert.equal(await page.locator('.home-actual .source-logo-link').count(),0);checks++;
 const periods=await page.locator('.home-change-periods').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,buttons:[...el.children].map(b=>{const p=b.getBoundingClientRect();return {left:p.left,right:p.right,width:p.width};})};});
 assert.ok(Math.abs(periods.buttons[0].left-periods.left)<1&&Math.abs(periods.buttons[3].right-periods.right)<1,'Period buttons fill the row');
 assert.ok(periods.buttons.every(b=>Math.abs(b.width-periods.buttons[0].width)<1),'Period buttons have equal widths');checks+=2;
 const quoteAlignment=await page.locator('.home-today-item').evaluateAll(rows=>rows.map(row=>{const a=row.querySelector(':scope>span').getBoundingClientRect(),b=row.querySelector('.home-today-values>strong').getBoundingClientRect();return Math.abs(a.top-b.top);}));
 assert.ok(quoteAlignment.every(d=>d<9),'Metal labels align with price line');checks++;

 const actualBox=await page.locator('.home-actual').boundingBox(),forecastBox=await page.locator('.forecast-shell').boundingBox();
 if(viewport.width<=900)assert.ok(actualBox.y+actualBox.height<=forecastBox.y,'Today precedes forecast on small screens');
 else assert.ok(Math.abs(actualBox.y-forecastBox.y)<2,'Both desktop columns begin together');checks++;
 const core=require('../features-core.js');
 const latestPrices=await page.locator('.home-today-values>strong').allTextContents();
 for(const days of [7,30,90,0]){
  await click('[data-price-days="'+days+'"]');
  await page.locator('[data-price-days="'+days+'"][aria-pressed="true"]').waitFor();
  assert.deepEqual(await page.locator('.home-today-values>strong').allTextContents(),latestPrices);checks++;
  for(const [index,metal]of ['gold24','gold22','silver'].entries()){
   const expected=core.publishedChange(documents['latest.json'],documents['history.json'],metal,days);
   const row=page.locator('.home-today-item').nth(index);
   if(expected){
    assert.ok((await row.locator('.home-actual-change').innerText()).includes(Math.abs(expected.percent).toFixed(2)+'%'));
    assert.ok((await row.locator('.home-actual-change').getAttribute('class')).includes('is-'+expected.direction));
    if(days)assert.ok((await row.locator('.home-actual-versus').innerText()).includes(money(expected.previous)));
   }else assert.match(await row.innerText(),/Not enough history|No earlier observation/);
   checks++;
  }
  await layout();
 }
 await click('[data-price-days="30"]');await click('[data-chart-days="90"]');
 await page.locator('[data-price-days="30"][aria-pressed="true"]').waitFor();checks++;
 await click('[data-language="ta"]');await text('.home-change-periods',/இன்று/);await layout();
 await refresh();await page.locator('[data-price-days="30"][aria-pressed="true"]').waitFor();checks++;
 await click('[data-language="en"]');await click('[data-price-days="0"]');
 for(const metal of ['gold24','gold22','silver']){await click('[data-forecast-metal="'+metal+'"]');await page.locator('[data-chart-svg]').press('End');await text('[data-chart-tooltip]',/Estimate/);}
 for(const days of [7,30,90]){await click('[data-chart-days="'+days+'"]');await page.locator('[data-chart-svg]').press('Home');await text('[data-chart-tooltip]',/Actual · (AM|PM)/);}
 await click('#home-weight-expand summary');await click('[data-weight-metal="silver"]');await page.locator('#custom-weight').fill('0.5');await click('[data-unit="kg"]');await text('#weight-result',new RegExp(money(indian.silver999_inr_kg*.5).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 await page.locator('#custom-weight').fill('-1');await text('#weight-error',/valid|weight|Enter/i);
 await click('#home-buy-expand summary');await click('[data-buy-metal="silver"]');await click('[data-buy-grams="1000"]');await text('.buy-table',/Metal \+ GST/);await layout();
 await route('markets');await text('.market-grid',/USD\/INR/);await layout();
 await route('compare');
 for(const metal of ['gold24','gold22','silver']){await click('[data-metal="'+metal+'"]');assert.equal(await page.locator('.city-rate-item').count(),5);checks++;}
 await click('#city-trigger');await click('[data-city="Delhi"]');await text('#selected-city',/Delhi/);await layout();
 await route('insights');for(const id of ['metal-purity-title','metal-drivers-title','metal-buying-title','metal-questions-title']){await click('[data-insight-jump="'+id+'"]');await page.locator('#'+id).waitFor();checks++;}await layout();
 await route('tools');
 assert.equal(await page.locator('[data-tool-select]').count(),3);checks++;
 for(const removed of ['alerts','jewellery','accuracy','shops','portfolio','signals']){assert.equal(await page.locator('[data-tool-select="'+removed+'"]').count(),0);checks++;}
 assert.equal(await page.locator('.tool-menu-item svg').count(),0);checks++;
 const tabs=await page.locator('.tool-menu-item').evaluateAll(items=>items.map(el=>el.getBoundingClientRect().height));assert.ok(Math.max(...tabs)-Math.min(...tabs)<1&&Math.max(...tabs)<=55,'Tool tabs are compact and equal height');checks++;
 await tool('resale');await alignedFields();await choose('purity','22');await submit('resale');await text('#resale-result',new RegExp(money(indian.gold22_inr_10g*.8*.98).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 await page.locator('input[name="grams"]').fill('12');await choose('purity','18');await refresh();await value('input[name="grams"]','12');await value('input[name="purity"]','18');await submit('resale');await text('#resale-result',/Estimated cash/);
 await tool('hallmark');await page.locator('input[name="code"]').fill('ABC123');await submit('huid');await text('#huid-result',/Not yet verified/);
 await tool('etfs');await alignedFields();
 const etfRows=await page.locator('.tool-etf-row').evaluateAll(rows=>rows.map(row=>({columns:row.children.length,top:Math.abs(row.querySelector('strong').getBoundingClientRect().top-row.querySelector('b').getBoundingClientRect().top)})));
 assert.ok(etfRows.every(r=>r.columns===2&&r.top<2),'Fund names and NAV values share two aligned columns');checks++;
 await page.locator('input[name="quote"]').fill('120');await submit('etf');await text('#etf-result',/Different dates — premium unavailable/);await layout();
 await tool('resale');await page.locator('input[name="grams"]').fill('15');await choose('purity','22');
 await click('[data-language="ta"]');await alignedFields();await value('input[name="grams"]','15');await value('input[name="purity"]','22');await layout();
 await click('[data-language="en"]');await value('input[name="grams"]','15');
 // Every route in Tamil must still render all data without clipping or a runtime failure.
 for(const language of ['ta','en']){await click('[data-language="'+language+'"]');for(const name of ['home','markets','compare','insights','tools']){await route(name);await layout();}}
 assert.deepEqual(page._errors,[]);checks++;await context.close();

}
(async()=>{
 server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),relative=name==='/'?'index.html':name.slice(1);
  if(relative.includes('..')||relative.startsWith('.')||!/^([\w-]+\.(?:html|js|css)|(?:assets|data)\/[\w./-]+)$/.test(relative)){res.writeHead(404).end();return;}
  const file=path.join(root,relative),mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'}[path.extname(file)];
  if(!fs.existsSync(file)){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime||'application/octet-stream'});fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));server.url='http://127.0.0.1:'+server.address().port+'/';
 browser=await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});
 console.log('Browser:',await browser.version());
 for(const viewport of [{width:1440,height:1000},{width:1024,height:900},{width:768,height:1024},{width:390,height:844},{width:360,height:800}])await audit(viewport);
 // Outage, corrupted optional feeds and local backups must fail gracefully on every tab.
 let context;
 // A short archive must not masquerade as a full 90-day return.
 const shortDocs=clone(documents);shortDocs['history.json'].india=shortDocs['history.json'].india.filter(r=>r.date>=shortDocs['latest.json'].india.date);
 context=await browser.newContext({viewport:{width:360,height:800}});await open(context,'ok',shortDocs);
 await click('[data-price-days="90"]');assert.equal(await page.locator('.home-actual-versus').filter({hasText:'Not enough history'}).count(),3);checks++;
 await layout();assert.deepEqual(page._errors,[]);await context.close();
 context=await browser.newContext({viewport:{width:390,height:844}});await open(context,'offline');await text('.data-warning',/dated backup/);await route('tools');await tool('resale');await layout();assert.deepEqual(page._errors,[]);await context.close();
 const broken=clone(documents);broken['cities.json'].dates={gold:'2099-01-01',silver:'2026-02-31'};broken['funds.json'].funds.goldbees.nav_inr_per_unit='116';broken['forecast_history.json'].forecasts=[null,{target_date:'bad'}];
 context=await browser.newContext();await open(context,'ok',broken,{version:2,preferred:'removed',etfQuotes:{goldbees:{quote:-1,date:'bad'}}});await route('compare');await text('.city-rate-list',/No published city rate/);await route('tools');await tool('etfs');await text('.tool-etf-list',/NAV \/ unit/);await layout();assert.deepEqual(page._errors,[]);await context.close();
 // A later failed API must not roll the app back to its committed dated backup.
 context=await browser.newContext();await open(context);const before=await page.locator('.home-actual').innerText();await page.unroute(endpoint+'/**');await page.route(endpoint+'/**',r=>r.abort());await refresh();await text('.data-warning',/Keeping the last verified prices/);assert.equal(await page.locator('.home-actual').innerText(),before);checks++;await context.close();
 // Exercise the market-adjusted publication, rather than only legacy fallback fixtures.
 const {generate}=await import('../cloudflare/nextrate-scheduler/forecast.mjs');
 const {captureAnchors,adjustForecast}=await import('../cloudflare/nextrate-scheduler/market-forecast.mjs');
 const marketDocs=clone(documents),reference=clone(documents['latest.json']);
 reference.india={...reference.india,date:'2026-10-27',session:'AM',gold24_inr_10g:141082,gold22_inr_10g:129231,silver999_inr_kg:192037};
 reference.checked_at='2026-10-27T08:00:00Z';reference.sources_checked={ibja:'ok',xau:'ok',xag:'ok',usd_inr:'ok'};
 for(const [symbol,price]of [['XAU',4000],['XAG',50]])reference.spot[symbol]={usd_per_troy_ounce:price,as_of:reference.checked_at,source_url:'https://gold-api.com/docs'};
 reference.fx={inr_per_usd:95,date:'2026-10-27',source_url:'https://frankfurter.dev/'};
 const current=clone(reference);current.checked_at='2026-10-27T10:00:00Z';current.fx.inr_per_usd=95.05;
 current.spot.XAU={...current.spot.XAU,usd_per_troy_ounce:4040,as_of:current.checked_at};
 current.spot.XAG={...current.spot.XAG,usd_per_troy_ounce:49,as_of:current.checked_at};
 marketDocs['latest.json']=current;marketDocs['history.json'].india.push(current.india);
 marketDocs['forecast.json']=adjustForecast(generate(current,marketDocs['history.json'].india,current.checked_at),current,captureAnchors(reference,current),marketDocs['history.json'].india,[],current.checked_at);
 for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:360,height:800}]){
  context=await browser.newContext({viewport});await open(context,'ok',marketDocs);
  await text('.forecast-drivers',/Global metal move/);
  for(const metal of ['gold24','gold22','silver']){
   await click('[data-forecast-metal="'+metal+'"]');
   const expected=marketDocs['forecast.json'].metals[metal].estimate;
   assert.ok((await page.locator('[data-forecast-metal="'+metal+'"] .forecast-metal-quote>strong').innerText()).includes(expected.toLocaleString('en-IN')));checks++;
   await text('.forecast-drivers',/USD \/ INR move/);await text('.forecast-range',/Scenario range/);await layout();
  }
  await click('[data-language="ta"]');await layout();await click('[data-language="en"]');
  assert.equal(await page.locator('.nr-small-details,.nr-prediction-proof').count(),0);checks++;
  assert.deepEqual(page._errors,[]);checks++;await context.close();
 }
 // A fully unavailable publication keeps learning/tools usable without fabricated values.
 context=await browser.newContext();page=await context.newPage();page._errors=[];page.on('pageerror',e=>page._errors.push(e.message));
 await page.route(endpoint+'/**',r=>r.abort());await page.route('**/data/*.json*',r=>r.abort());await page.goto(server.url);
 await text('#app',/Rates temporarily unavailable/);await route('insights');await text('#app',/Know your metal/);await route('tools');await tool('resale');await submit('resale');await text('#app',/IBJA reference unavailable/);await layout();assert.deepEqual(page._errors,[]);checks++;await context.close();
 console.log('BROWSER VERIFIED:',checks,'assertions across 5 viewports, 5 tabs, 3 tools, 2 languages and outage/malformed-data cases');
})().catch(async error=>{
 console.error(error);if(page&&!page.isClosed()){fs.mkdirSync(path.join(root,'test-results'),{recursive:true});await page.screenshot({path:path.join(root,'test-results','browser-failure.png'),fullPage:true}).catch(()=>{});console.error('Page:',await page.locator('#app').innerText().catch(()=>''));}process.exitCode=1;
}).finally(async()=>{await browser?.close();server?.close();});
