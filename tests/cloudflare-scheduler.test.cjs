const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {DatabaseSync}=require('node:sqlite');
const root=require('node:path').resolve(__dirname,'..');
function database(){
 const sql=new DatabaseSync(':memory:');sql.exec(fs.readFileSync(root+'/cloudflare/nextrate-scheduler/schema.sql','utf8'));
 const documents=Object.fromEntries(['latest','history','forecast','forecast_history','cities','funds'].map(n=>[n+'.json',JSON.parse(fs.readFileSync(root+'/tests/fixtures/legacy-publication/'+n+'.json'))]));
 sql.prepare('INSERT INTO publication VALUES(1,0,?)').run(JSON.stringify({documents,receipts:{}}));
 for(const kind of ['ibja','fx','spot-xau','spot-xag','forecasts'])for(const row of JSON.parse(fs.readFileSync(root+'/tests/fixtures/legacy-publication/archive/'+kind+'/2026.json')).records){const id=kind==='ibja'?row.date+':'+row.session:kind==='forecasts'?row.issuance_key:kind==='fx'?row.date:row.as_of;sql.prepare('INSERT INTO observations VALUES(?,?,?)').run(kind,id,JSON.stringify(row));}
 const prepare=text=>{let args=[];const stmt=sql.prepare(text);return {bind(...a){args=a;return this;},async first(){return stmt.get(...args)||null;},async all(){return {results:stmt.all(...args)};},async run(){return stmt.run(...args);},execute(){return stmt.all(...args);}};};
 const db={prepare,async batch(stmts){sql.exec('BEGIN');try{const out=stmts.map(s=>s.execute());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 return {sql,db,documents};
}
function ibja(date='26/10/2026',gold=141710){return '<table>'+['AM','PM'].map(s=>`<tr><td data-label="${s}">${date}</td><td>${gold}</td><td>141143</td><td>129806</td><td>106000</td><td>82700</td><td>194479</td></tr>`).join('')+'</table>';}
function sources(html=ibja()) {return async url=>{assert.ok(!url.includes('api.github.com'));if(url==='https://www.ibjarates.com/')return new Response(html);return new Response('unavailable',{status:503});};}
const controller={scheduledTime:Date.parse('2026-10-26T13:45:00Z'),cron:'45 7,13 * * *'};
const clock=()=>new Date('2026-10-26T14:00:00Z');

test('Real SQLite publication transaction preserves all archives and records the Cloudflare receipt',async()=>{
 const {refresh}=await import('../cloudflare/nextrate-scheduler/runtime.mjs'),{sql,db}=database();
 const before=sql.prepare('SELECT count(*) n FROM observations').get().n;
 await refresh(controller,{DB:db},sources(),clock);
 const pub=sql.prepare('SELECT * FROM publication').get(),value=JSON.parse(pub.payload);
 assert.equal(pub.revision,1);assert.equal(value.receipts['2026-10-26:PM'].trigger,'cloudflare');assert.equal(value.receipts['2026-10-26:PM'].published,true);
 assert.equal(value.documents['latest.json'].india.gold24_inr_10g,141710);assert.ok(sql.prepare('SELECT count(*) n FROM observations').get().n>=before);
 assert.equal(sql.prepare('SELECT status FROM refresh_runs').get().status,'published');assert.equal(sql.prepare('SELECT count(*) n FROM refresh_lease').get().n,0);
 // Recovery does no network collection after verified publication.
 await refresh(controller,{DB:db},()=>{throw Error('unexpected recollection');},clock);assert.equal(sql.prepare('SELECT revision FROM publication').get().revision,1);
});

test('Delayed source keeps real quote date, publishes attributed checks and does not suppress recovery',async()=>{
 const {refresh}=await import('../cloudflare/nextrate-scheduler/runtime.mjs'),{sql,db}=database();
 const event={scheduledTime:Date.parse('2026-10-27T07:45:00Z'),cron:'45 7,13 * * *'},now=()=>new Date('2026-10-27T08:00:00Z');
 await refresh(event,{DB:db},sources(),now);
 const pub=JSON.parse(sql.prepare('SELECT payload FROM publication').get().payload);
 assert.equal(pub.documents['latest.json'].india.date,'2026-10-26');assert.equal(pub.receipts['2026-10-27:AM'].session_verified,false);
 assert.equal(sql.prepare('SELECT status FROM refresh_runs').get().status,'waiting_source');
 await refresh(event,{DB:db},sources(),now);assert.equal(sql.prepare('SELECT revision FROM publication').get().revision,2);
});

test('Complete upstream outage preserves the entire published bundle',async()=>{
 const {refresh}=await import('../cloudflare/nextrate-scheduler/runtime.mjs'),{sql,db}=database(),old=sql.prepare('SELECT payload FROM publication').get().payload;
 await assert.rejects(refresh(controller,{DB:db},async()=>new Response('offline',{status:503}),clock),/All primary sources unavailable/);
 assert.equal(sql.prepare('SELECT payload FROM publication').get().payload,old);assert.equal(sql.prepare('SELECT status FROM refresh_runs').get().status,'failed');
});

test('Expired writer is fenced out and the SQLite batch rolls back every change',async()=>{
 const {refresh}=await import('../cloudflare/nextrate-scheduler/runtime.mjs'),{sql,db}=database(),before=sql.prepare('SELECT count(*) n FROM observations').get().n;let calls=0;
 const longClock=()=>new Date(calls++===0?'2026-10-26T14:00:00Z':'2026-10-26T14:10:00Z');
 await assert.rejects(refresh(controller,{DB:db},sources(),longClock),/CHECK constraint/);
 assert.equal(sql.prepare('SELECT revision FROM publication').get().revision,0);assert.equal(sql.prepare('SELECT count(*) n FROM observations').get().n,before);
});

test('Existing active lease skips overlapping timer before network access',async()=>{
 const {refresh}=await import('../cloudflare/nextrate-scheduler/runtime.mjs'),{sql,db}=database();sql.prepare('INSERT INTO refresh_lease VALUES(1,?,?)').run('other',+clock()+60000);
 await refresh(controller,{DB:db},()=>{throw Error('unexpected request');},clock);assert.equal(sql.prepare('SELECT revision FROM publication').get().revision,0);
});

test('Public API is read-only and exposes a single consistent bundle with CORS',async()=>{
 const {default:worker}=await import('../cloudflare/nextrate-scheduler/worker.mjs'),{db}=database();
 const res=await worker.fetch(new Request('https://example.test/bundle.json'),{DB:db});assert.equal(res.status,200);assert.equal(res.headers.get('access-control-allow-origin'),'https://vignesh-s-github.github.io');assert.equal((await res.json()).revision,0);
 assert.equal((await worker.fetch(new Request('https://example.test/refresh',{method:'POST'}),{DB:db})).status,405);
 assert.equal((await worker.fetch(new Request('https://example.test/data/../secret'),{DB:db})).status,404);
});

test('Undated source quotes, conflicting rows and future FX values are rejected',async()=>{
 const {parseIBJA,parseFX}=await import('../cloudflare/nextrate-scheduler/market.mjs');
 assert.throws(()=>parseIBJA('<td>Today</td><td>141710</td>',clock()));
 assert.throws(()=>parseIBJA(ibja().replaceAll('data-label="AM"','data-label="AM extra"').replaceAll('data-label="PM"','data-label="PM-extra"'),clock()));
 assert.throws(()=>parseIBJA(ibja()+ibja('26/10/2026',142000),clock()),/Conflicting/);
 assert.throws(()=>parseFX({base:'USD',quote:'INR',rate:94,date:'2026-10-27'},clock()));
});

test('Source response size is bounded before parsing',async()=>{
 const {getText}=await import('../cloudflare/nextrate-scheduler/pipeline.mjs');
 await assert.rejects(getText('https://example.test',async()=>new Response('too large'),3),/too large/);
});

test('a later recovery timer refreshes global inputs even after the IBJA session is verified',async()=>{
 const {refresh}=await import('../cloudflare/nextrate-scheduler/runtime.mjs'),{sql,db}=database();
 await refresh(controller,{DB:db},sources(),clock);
 const event={scheduledTime:Date.parse('2026-10-26T14:15:00Z'),cron:'15,45 8,14 * * *'};
 await refresh(event,{DB:db},sources(),()=>new Date('2026-10-26T14:20:00Z'));
 assert.equal(sql.prepare('SELECT revision FROM publication').get().revision,2);
 assert.equal(sql.prepare('SELECT count(*) n FROM refresh_runs').get().n,2);
 assert.equal(JSON.parse(sql.prepare('SELECT payload FROM publication').get().payload).documents['forecast.json'].model_version,4);
});

test('morning market timer refreshes overnight prices without claiming an IBJA AM publication',async()=>{
 const {refresh}=await import('../cloudflare/nextrate-scheduler/runtime.mjs'),{sql,db}=database();
 const time='2026-10-28T02:45:00Z';
 const fetcher=async url=>{
  if(url==='https://www.ibjarates.com/')return new Response(ibja());
  if(url==='https://api.gold-api.com/price/XAU/INR')return Response.json({symbol:'XAU',currency:'INR',price:4000*96,exchangeRate:96,updatedAt:time});
  if(url==='https://api.gold-api.com/price/XAU')return Response.json({symbol:'XAU',price:4000,updatedAt:time});
  if(url==='https://api.gold-api.com/price/XAG')return Response.json({symbol:'XAG',price:50,updatedAt:time});
  return new Response('unavailable',{status:503});
 };
 await refresh({scheduledTime:Date.parse(time),cron:'45 2,7,13,16,17 * * *'},{DB:db},fetcher,()=>new Date(time));
 const value=JSON.parse(sql.prepare('SELECT payload FROM publication').get().payload);
 assert.equal(value.receipts['2026-10-28:MARKET'].session_verified,true);
 assert.equal(value.documents['latest.json'].india.date,'2026-10-26');
 assert.equal(value.documents['latest.json'].forecast_fx.inr_per_usd,96);
 assert.equal(value.documents['forecast.json'].target_date,'2026-10-28');
 assert.equal(sql.prepare("SELECT count(*) n FROM observations WHERE kind='conversion-fx'").get().n,1);
 const before=sql.prepare('SELECT revision FROM publication').get().revision;
 await refresh({scheduledTime:Date.parse(time),cron:'45 2,7,13,16,17 * * *'},{DB:db},async()=>{throw Error('duplicate');},()=>new Date(time));
 assert.equal(sql.prepare('SELECT revision FROM publication').get().revision,before);
});
