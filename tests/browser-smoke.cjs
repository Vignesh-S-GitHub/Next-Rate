'use strict';
// Deterministic browser regressions. Live source/network checks run separately after deployment.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),endpoint='https://nextrate-scheduler.vigneshshanmugam.workers.dev';
const files=['latest.json','history.json','forecast.json','funds.json','cities.json','forecast_history.json'];
const documents=Object.fromEntries(files.map(f=>[f,JSON.parse(fs.readFileSync(path.join(root,'data',f)))]));
const clone=x=>JSON.parse(JSON.stringify(x));
const money=x=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Math.round((x+Number.EPSILON)*100)/100);
let browser,server,page,checks=0;
async function text(selector,pattern){await page.locator(selector).filter({hasText:pattern}).first().waitFor();checks++;}
async function value(selector,expected){await page.waitForFunction(({selector,expected})=>document.querySelector(selector)?.value===expected,{selector,expected});checks++;}
async function click(selector){await page.locator(selector).click();}
async function route(name){await page.locator('[data-route="'+name+'"]:visible').click();await page.waitForFunction(n=>document.title==='NextRate | '+n[0].toUpperCase()+n.slice(1),name);}
async function tool(name){await click('[data-tool-select="'+name+'"]');await page.locator('[data-tool-select="'+name+'"][aria-pressed="true"]').waitFor();}
async function choose(name,val){await click('[data-tool-picker]:has(input[name="'+name+'"]) [data-tool-picker-toggle]');await click('[data-tool-picker]:has(input[name="'+name+'"]) [data-value="'+val+'"]');}
async function submit(kind){await page.locator('[data-feature-form="'+kind+'"] button[type="submit"]').click();}
async function layout(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'No horizontal page overflow');assert.doesNotMatch(await page.locator('#app').innerText(),/NaN|undefined|Invalid Date|Infinity/);checks+=2;}
async function open(context,mode='ok',docs=documents,stored=null){
 page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page._errors=errors;
 await page.clock.install({time:new Date('2026-10-27T10:00:00Z')});
 if(stored)await page.addInitScript(s=>localStorage.setItem('nextrate-tools-v1',JSON.stringify(s)),stored);
 await page.route(endpoint+'/**',r=>mode==='offline'?r.abort():r.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({schema_version:1,revision:1,documents:docs})}));
 await page.goto(server.url);await page.locator('.home-actual strong').first().waitFor();return page;
}
async function audit(viewport){
 const context=await browser.newContext({viewport});await open(context);
 const indian=documents['latest.json'].india;
 await text('.home-actual',new RegExp(indian.gold24_inr_10g.toLocaleString('en-IN')));await layout();
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
 await tool('alerts');await page.locator('input[name="target"]').fill('999999');await submit('alert');await text('.tool-list',/Reached/);assert.equal(await page.locator('[data-delete-kind="alerts"]').count(),1);checks++;
 await tool('jewellery');await page.locator('input[name="grams"]').fill('10');await submit('jewellery');await text('#jewellery-result',new RegExp(money(indian.gold22_inr_10g*1.1*1.03).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 await page.locator('input[name="grams"]').fill('12');await choose('metal','gold24');await click('[data-refresh]');await value('input[name="grams"]','12');await value('input[name="metal"]','gold24');await submit('jewellery');await text('#jewellery-result',/Estimated total/);
 await tool('shops');await page.locator('input[name="name"]').fill('Test jeweller');await submit('shops');await text('.tool-list',/Test jeweller/);assert.doesNotMatch(await page.locator('.tool-list').innerText(),/Lowest/);checks++;
 await tool('portfolio');await page.locator('input[name="name"]').fill('Test gold');await page.locator('input[name="qty"]').fill('0.001');await submit('holdings');await text('.tool-list',/Test gold/);await text('.tool-list-tail',/₹14\.17/);
 await tool('resale');await choose('purity','22');await submit('resale');await text('#resale-result',new RegExp(money(indian.gold22_inr_10g*.8*.98).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 await tool('hallmark');await page.locator('input[name="code"]').fill('ABC123');await submit('huid');await text('#huid-result',/Not yet verified/);
 await tool('etfs');await page.locator('input[name="quote"]').fill('120');await submit('etf');await text('#etf-result',/Different dates — premium unavailable/);
 await tool('accuracy');await text('.tool-accuracy',/Issued forecast error/);
 await tool('signals');await text('.tool-signals',/IST/);await layout();
 // Inputs and custom selections survive both language changes and data refresh.
 await tool('jewellery');await page.locator('input[name="grams"]').fill('15');await choose('metal','gold24');
 await click('[data-language="ta"]');await value('input[name="grams"]','15');await value('input[name="metal"]','gold24');await layout();
 await click('[data-language="en"]');await value('input[name="grams"]','15');await text('.tool-picker-trigger',/24K Gold/);
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
 browser=await chromium.launch();
 for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:360,height:800}])await audit(viewport);
 // Outage, corrupted optional feeds and local backups must fail gracefully on every tab.
 let context=await browser.newContext({viewport:{width:390,height:844}});await open(context,'offline');await text('.data-status',/dated backup/);await route('tools');await tool('portfolio');await layout();assert.deepEqual(page._errors,[]);await context.close();
 const broken=clone(documents);broken['cities.json'].dates={gold:'2099-01-01',silver:'2026-02-31'};broken['funds.json'].funds.goldbees.nav_inr_per_unit='116';broken['forecast_history.json'].forecasts=[null,{target_date:'bad'}];
 context=await browser.newContext();await open(context,'ok',broken,{version:1,alerts:[null],shops:[{}],holdings:[null,{qty:-1}],preferred:'portfolio'});await route('compare');await text('.city-rate-list',/No published city rate/);await route('tools');await tool('portfolio');await text('.tool-list',/No holdings saved/);await tool('accuracy');await layout();assert.deepEqual(page._errors,[]);await context.close();
 // A later failed API must not roll the app back to its committed dated backup.
 context=await browser.newContext();await open(context);const before=await page.locator('.home-actual').innerText();await page.unroute(endpoint+'/**');await page.route(endpoint+'/**',r=>r.abort());await click('[data-refresh]');await text('.data-status',/Keeping the last verified prices/);assert.equal(await page.locator('.home-actual').innerText(),before);checks++;await context.close();
 console.log('BROWSER VERIFIED:',checks,'assertions across 3 viewports, 5 tabs, 9 tools, 2 languages and outage/malformed-data cases');
})().catch(async error=>{
 console.error(error);if(page&&!page.isClosed()){fs.mkdirSync(path.join(root,'test-results'),{recursive:true});await page.screenshot({path:path.join(root,'test-results','browser-failure.png'),fullPage:true}).catch(()=>{});console.error('Page:',await page.locator('#app').innerText().catch(()=>''));}process.exitCode=1;
}).finally(async()=>{await browser?.close();server?.close();});
