import {collect,KINDS,sessionTarget} from './pipeline.mjs';
import {identity} from './market.mjs';

const HEADERS={'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'https://vignesh-s-github.github.io','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
async function load(db){const row=await db.prepare('SELECT revision,payload FROM publication WHERE id=1').first();if(!row)throw Error('Market data has not been initialized');return {revision:row.revision,...JSON.parse(row.payload)};}
export async function refresh(controller,env,fetcher=fetch,clock=()=>new Date()){
 const now=clock(),scheduled=new Date(controller.scheduledTime),id=crypto.randomUUID();
 if(!Number.isFinite(+scheduled)||+scheduled>+now+60000||+now-+scheduled>3*3600000)throw Error('Invalid or stale Cloudflare timer');
 const target=sessionTarget(scheduled);if(!target.session)throw Error('Before AM collection cutoff');
 const lease=await env.DB.prepare('INSERT INTO refresh_lease(id,owner,expires_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE refresh_lease.expires_at<? RETURNING owner').bind(id,+now+300000,+now).first();
 if(lease?.owner!==id){console.log(JSON.stringify({event:'refresh_skipped',reason:'Another refresh is active'}));return;}
 try{
  const old=await load(env.DB),key=target.date+':'+target.session;
  if(old.receipts?.[key]?.published&&old.receipts[key].session_verified===true&&
    Date.parse(old.documents['latest.json'].checked_at)>=+scheduled&&old.documents['forecast.json'].model_version===4){console.log(JSON.stringify({event:'refresh_skipped',session:key,reason:'This timer already has a verified market publication'}));return;}
  const result=await env.DB.prepare('SELECT kind,id,payload FROM observations ORDER BY kind,id').all();
  const archives=Object.fromEntries(KINDS.map(k=>[k,[]]));const original=new Map();
  for(const row of result.results){archives[row.kind].push(JSON.parse(row.payload));original.set(row.kind+'|'+row.id,row.payload);}
  const fresh=await collect(old.documents,archives,now,fetcher),completed=clock().toISOString();
  // The event target comes from Cloudflare, not the completion-time clock.
  if(fresh.target.date!==target.date||fresh.target.session!==target.session)throw Error('Timer crossed into another collection session; await the next timer');
  const receipt={trigger:'cloudflare',scheduled_at:scheduled.toISOString(),cron:controller.cron,completed_at:completed,published:true,session_verified:fresh.session_complete,session:target.session,target_date:target.date,quote_date:fresh.docs['latest.json'].india.date,quote_session:fresh.docs['latest.json'].india.session,run_id:id,source_errors:fresh.errors};
  const receipts={...old.receipts,[key]:receipt};for(const k of Object.keys(receipts))if(k.slice(0,10)<new Date(+now-30*86400000).toISOString().slice(0,10))delete receipts[k];
  const changes=[env.DB.prepare('INSERT OR REPLACE INTO write_fence(id,ok) VALUES(1,CASE WHEN (SELECT revision FROM publication WHERE id=1)=? AND (SELECT owner FROM refresh_lease WHERE id=1)=? AND (SELECT expires_at FROM refresh_lease WHERE id=1)>? THEN 1 ELSE 0 END)').bind(old.revision,id,+clock())];for(const kind of KINDS)for(const row of fresh.archives[kind]){const rid=identity(kind,row),payload=JSON.stringify(row);if(payload!==original.get(kind+'|'+rid))changes.push(env.DB.prepare('INSERT INTO observations(kind,id,payload) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET payload=excluded.payload').bind(kind,rid,payload));}
  // D1 batch is transactional: readers never see half of a publication.
  changes.push(env.DB.prepare('UPDATE publication SET revision=revision+1,payload=? WHERE id=1 AND revision=?').bind(JSON.stringify({documents:fresh.docs,receipts}),old.revision));
  changes.push(env.DB.prepare('INSERT INTO refresh_runs(id,scheduled_at,completed_at,status,payload) VALUES(?,?,?,?,?)').bind(id,receipt.scheduled_at,completed,fresh.session_complete?'published':'waiting_source',JSON.stringify(receipt)));
  await env.DB.batch(changes);
  const verified=await load(env.DB);if(verified.receipts?.[key]?.run_id!==id)throw Error('Publication receipt verification failed');
  console.log(JSON.stringify({event:'refresh_published',...receipt}));
 }catch(e){await env.DB.prepare('INSERT INTO refresh_runs(id,scheduled_at,completed_at,status,payload) VALUES(?,?,?,?,?)').bind(id,scheduled.toISOString(),clock().toISOString(),'failed',JSON.stringify({error:e.message,cron:controller.cron,target})).run();console.error(JSON.stringify({event:'refresh_failed',id,error:e.message}));throw e;}
 finally{await env.DB.prepare('DELETE FROM refresh_lease WHERE id=1 AND owner=?').bind(id).run();}
}
export async function respond(request,env){
  const path=new URL(request.url).pathname;
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:HEADERS});
  if(!['GET','HEAD'].includes(request.method))return reply({error:'Read-only data API'},405);
  try{
   if(path==='/health')return reply({status:'ok',scheduler:'cloudflare',storage:'D1',github_actions_refresh:false});
   if(path==='/status.json'){const runs=await env.DB.prepare('SELECT id,scheduled_at,completed_at,status,payload FROM refresh_runs ORDER BY completed_at DESC LIMIT 12').all();const current=await load(env.DB);return reply({revision:current.revision,receipts:current.receipts||{},runs:runs.results.map(r=>({...r,details:JSON.parse(r.payload),payload:undefined}))});}
   const current=await load(env.DB);
   if(path==='/bundle.json')return reply({schema_version:1,revision:current.revision,documents:current.documents});
   const file=path.replace(/^\/data\//,'');
   if(path.startsWith('/data/')&&Object.hasOwn(current.documents,file))return reply(current.documents[file]);
   return reply({error:'Not found'},404);
  }catch{ return reply({error:'Verified market data temporarily unavailable'},503); }
}
