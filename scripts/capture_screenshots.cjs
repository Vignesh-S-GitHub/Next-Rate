'use strict';
// Real screenshots of the committed, retired app. No external requests or mock prices.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/screenshots');
const checkOnly=process.argv.includes('--check-only');
const latest=JSON.parse(fs.readFileSync(path.join(root,'data/latest.json')));
const stamp=latest.checked_at;
const entries=[];
let checks=0,browser,server;
const views=[['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]];
async function capture(page,view,lang,name){
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('img').evaluateAll(items=>items.forEach(i=>i.loading='eager'));
 await page.waitForFunction(()=>[...document.images].every(i=>i.hidden||(i.complete&&i.naturalWidth>0)));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,view+' '+lang+' '+name+' overflow');
 assert.doesNotMatch(await page.locator('#app').innerText(),/NaN|undefined|Invalid Date|Infinity/);
 assert.equal(await page.locator('img').evaluateAll(items=>items.every(i=>i.hidden||(i.complete&&i.naturalWidth>0))),true,'Images loaded');
 checks+=3;
 const file=view+'-'+lang+'-'+name+'.jpg';
 if(!checkOnly)await page.screenshot({path:path.join(out,file),type:'jpeg',quality:85,fullPage:true,animations:'disabled'});
 entries.push({file,view,language:lang,screen:name});
 console.log(view,lang,name);
}
async function route(page,name){
 await page.locator('[data-route="'+name+'"]:visible').click();
 await page.waitForFunction(n=>document.title==='NextRate | '+n[0].toUpperCase()+n.slice(1),name);
}
(async()=>{
 if(!checkOnly)fs.mkdirSync(out,{recursive:true});
 server=http.createServer((req,res)=>{
  const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();
  const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'}[path.extname(file)];
  res.writeHead(200,{'Content-Type':mime||'application/octet-stream'});fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const options=process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']}:{};
 browser=await chromium.launch(options);
 for(const [view,viewport]of views)for(const lang of ['en','ta']){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,locale:'en-IN',timezoneId:'Asia/Kolkata'}),page=await context.newPage(),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{
   if(new URL(r.request().url()).origin!==origin){if(r.request().resourceType()!=='image')external.push(r.request().url());return r.abort();}
   return r.continue();
  });
  // Preserve the actual archived observation date; never relabel it as current.
  await page.clock.install({time:new Date(stamp)});
  await page.goto(origin);await page.locator('.home-actual strong').first().waitFor();
  await page.locator('[data-language="'+lang+'"]').click();
  assert.ok((await page.locator('.home-actual').innerText()).includes(latest.india.gold24_inr_10g.toLocaleString('en-IN')));checks++;
  await capture(page,view,lang,'home');
  for(const name of ['markets','compare','insights']){await route(page,name);await capture(page,view,lang,name);}
  await route(page,'tools');
  assert.equal(await page.locator('[data-tool-select]').count(),3);checks++;
  for(const name of ['resale','hallmark','etfs']){
   await page.locator('[data-tool-select="'+name+'"]').click();
   if(name==='resale')await page.locator('[data-feature-form="resale"] button[type="submit"]').click();
   if(name==='hallmark'){
    await page.locator('input[name="code"]').fill('ABC123');await page.locator('[data-feature-form="huid"] button[type="submit"]').click();
   }
   if(name==='etfs'){
    await page.locator('input[name="quote"]').fill('120');await page.locator('[data-feature-form="etf"] button[type="submit"]').click();
   }
   await capture(page,view,lang,'tools-'+name);
  }
  if(lang==='en'){
   await route(page,'home');
   for(const days of [7,30,90]){
    await page.locator('[data-price-days="'+days+'"]').click();await capture(page,view,lang,'home-change-'+days+'d');
   }
   await page.locator('[data-price-days="0"]').click();
   for(const days of [30,90]){
    await page.locator('[data-chart-days="'+days+'"]').click();await capture(page,view,lang,'home-chart-'+days+'d');
   }
   await page.locator('#home-weight-expand summary').click();await page.locator('#home-buy-expand summary').click();
   await capture(page,view,lang,'home-expanded');
  }
  assert.deepEqual(errors,[],'No JavaScript errors');assert.deepEqual(external,[],'No external services contacted');checks+=2;
  await context.close();
 }
 if(!checkOnly){
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({captured_on:'2026-10-30',snapshot_checked_at:stamp,source_commit_before_retirement:'bd56d566be890ca210b325a55d597a2f015a3dde',browser:await browser.version(),note:'Real archived app. Clock held at the saved publication time so dated forecasts remain reviewable. No fabricated prices or external data requests. Unavailable publisher emblems use the app’s text fallback.',screenshots:entries},null,2)+'\n');
  const screens=[...new Set(entries.map(e=>e.screen))];
  let gallery='# Application screenshots\n\nAll five tabs and three tools, in English and Tamil, on desktop (1440 × 1000) and mobile (390 × 844). These are full-page captures of the final saved publication; image links open at full size.\n\nData snapshot: **'+stamp+'**. The capture clock is fixed at that publication time. These are archived views, not live quotes. Publisher image requests are blocked; the app uses its existing text source badges.\n\n';
  for(const lang of ['en','ta']){
   gallery+='## '+(lang==='en'?'English':'Tamil')+'\n\n| Screen | Desktop | Mobile |\n|---|---|---|\n';
   for(const name of screens){
    if(!entries.some(e=>e.language===lang&&e.screen===name))continue;
    gallery+='| '+name+' | <a href="desktop-'+lang+'-'+name+'.jpg"><img src="desktop-'+lang+'-'+name+'.jpg" width="520" alt="'+name+' desktop '+lang+'"></a> | <a href="mobile-'+lang+'-'+name+'.jpg"><img src="mobile-'+lang+'-'+name+'.jpg" width="220" alt="'+name+' mobile '+lang+'"></a> |\n';
   }
   gallery+='\n';
  }
  gallery+='## Recreate\n\nRun `npm ci`, `npx playwright install chromium`, then `node scripts/capture_screenshots.cjs`. Use `npm run test:browser` to check every screen without replacing images. Optional `CHROMIUM_EXECUTABLE_PATH` selects an installed Chromium.\n';
  fs.writeFileSync(path.join(out,'README.md'),gallery);
 }
 console.log(JSON.stringify({screens:entries.length,checks,external_requests:0,mode:checkOnly?'check':'screenshots'}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)server.close();});
