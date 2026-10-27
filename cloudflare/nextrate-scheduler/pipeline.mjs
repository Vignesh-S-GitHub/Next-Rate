import {IBJA,FX_URLS,CITY_URLS,CITIES,NAV_URL,NAV_PAGE,parseIBJA,parseFX,parseSpot,parseCities,parseNAV,merge,identity,isoDay,validDay,validRates,FIELDS,ageDays} from './market.mjs';
import {publishForecast,isClosed} from './forecast.mjs';
import {officialPDFURL,parseIBJAPDF} from './ibja-pdf.mjs';
export const KINDS=['ibja','fx','spot-xau','spot-xag','forecasts'];
export async function getBinary(url,fetcher=fetch,limit=1500000){
 const res=await fetcher(url,{headers:{'User-Agent':'NextRate/2.0 (+https://github.com/Vignesh-S-GitHub/Next-Rate; market reference)','Accept':'application/json,text/html,text/plain;q=0.9','Cache-Control':'no-cache'},signal:AbortSignal.timeout(25000),redirect:'follow'});
 if(!res.ok)throw Error('Source HTTP '+res.status);
 if(Number(res.headers.get('content-length'))>limit){await res.body?.cancel();throw Error('Source response too large');}
 const reader=res.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw Error('Source response too large');chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;}
 finally{await reader.cancel();}
}
export async function getText(url,fetcher=fetch,limit=1500000){return new TextDecoder().decode(await getBinary(url,fetcher,limit));}
export function sessionTarget(stamp){const d=new Date(+new Date(stamp)+19800000),minutes=d.getUTCHours()*60+d.getUTCMinutes();return {date:isoDay(stamp),session:minutes>=1155?'PM':minutes>=795?'AM':null};}
export function sessionHealth(latest,archives,target){
 if(!target.session)return false;
 if(latest.sources_checked?.ibja!=='ok'||!validRates(latest.india)||latest.india.date>target.date)return false;
 const due=Date.parse(target.date+'T'+(target.session==='AM'?'13:15':'19:15')+':00+05:30');
 if(Date.parse(latest.checked_at)<due)return false;
 if(isClosed(target.date))return true;
 if(latest.india.date!==target.date||(target.session==='PM'&&latest.india.session!=='PM'))return false;
 const rows=archives.ibja.filter(r=>r.date===target.date&&validRates(r));
 return rows.some(r=>r.session==='AM')&&(target.session==='AM'||rows.some(r=>r.session==='PM'));
}
function backfillRows(doc,metal,purity,multiplier,today){
 if(doc.metal!==metal||doc.purity!==purity||doc.unit!=='INR per gram'||doc.source!=='IBJA'||!Array.isArray(doc.rows))throw Error('Unexpected historical source/units');
 const values={};
 for(const r of doc.rows){if(!validDay(r.date)||r.date<'2020-01-01'||r.date>today||[0,6].includes(new Date(r.date).getUTCDay())||r.pm==null)continue;
  const v=Math.round(Number(r.pm)*multiplier+1e-7);if(Number.isFinite(v)&&(metal==='gold'?v>10000&&v<1000000:v>5000&&v<3000000))values[r.date]=v;
 }
 if(Object.keys(values).length<20)throw Error('Insufficient valid historical PM closes');return values;
}
function onePerDay(rows){const map=new Map();for(const r of rows)if(!map.has(r.date)||r.session==='PM')map.set(r.date,r);return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));}
export async function collect(previous,stored,now,fetcher=fetch){
 const docs=structuredClone(previous),archives=structuredClone(stored),latest=docs['latest.json'];
 latest.checked_at=new Date(now).toISOString();latest.sources_checked={};const errors={};
 // Up to six independent source requests; publication waits for every result.
 const tasks=[
  ['ibja',async()=>{
   const html=await getText(IBJA,fetcher);let parsed;try{parsed=parseIBJA(html,now);}catch(e){errors.ibja_html=e.message;parsed={rows:[],current:null};}
   const pdfURL=officialPDFURL(html),target=sessionTarget(now);
   const htmlFresh=parsed.current?.date===target.date&&(target.session!=='PM'||parsed.current.session==='PM');
   if(!htmlFresh&&pdfURL){try{
    const pdfRows=await parseIBJAPDF(await getBinary(pdfURL,fetcher,3000000),now,pdfURL);
    // Reject disagreement between official documents for an identical session.
    for(const row of pdfRows){const same=parsed.rows.find(h=>h.date===row.date&&h.session===row.session);if(same&&FIELDS.some(k=>same[k]!==row[k]))throw Error('Official HTML/PDF session disagreement');}
    parsed.rows=merge('ibja',parsed.rows,pdfRows);parsed.current=parsed.rows.at(-1);
   }catch(e){errors.ibja_pdf=e.message;}}
   if(!parsed.current)throw Error('No verified dated IBJA source observation');
   archives.ibja=merge('ibja',archives.ibja,parsed.rows);
   const canonical=archives.ibja.find(r=>identity('ibja',r)===identity('ibja',parsed.current));
   if(FIELDS.some(k=>canonical[k]!==parsed.current[k]))throw Error('Conflicting previously published IBJA values');
   if(latest.india&&(parsed.current.date<latest.india.date||(parsed.current.date===latest.india.date&&latest.india.session==='PM'&&parsed.current.session==='AM')))throw Error('IBJA source regressed');
   latest.india=parsed.current;
  }],
  ...['XAU','XAG'].map(sym=>[sym.toLowerCase(),async()=>{const r=parseSpot(JSON.parse(await getText('https://api.gold-api.com/price/'+sym,fetcher)),sym,now);
   if(latest.spot?.[sym]&&Date.parse(r.as_of)<Date.parse(latest.spot[sym].as_of))throw Error('Spot source regressed');
   latest.spot[sym]=r;archives['spot-'+sym.toLowerCase()]=merge('spot-'+sym.toLowerCase(),archives['spot-'+sym.toLowerCase()],[{date:isoDay(now),...r}]);}]),
  ['usd_inr',async()=>{for(const url of FX_URLS){try{const r=parseFX(JSON.parse(await getText(url,fetcher)),now);if(latest.fx&&r.date<latest.fx.date)throw Error('FX source regressed');latest.fx=r;archives.fx=merge('fx',archives.fx,[r]);return;}catch{ /* Try attributed fallback. */ }}throw Error('FX providers unavailable');}],
  ['cities',async()=>{
   const old=docs['cities.json'],days={...old.dates},prices=structuredClone(old.cities);let count=0;
   for(const [metal,url]of Object.entries(CITY_URLS)){try{const r=parseCities(await getText(url,fetcher),metal,now);if(days[metal]&&r.day<days[metal])throw Error('City source regressed');for(const city of CITIES)prices[city]={...prices[city],...r.rows[city]};days[metal]=r.day;count++;}catch(e){errors['city_'+metal]=e.message;}}
   docs['cities.json']={...old,checked_at:new Date(now).toISOString(),status:count===2?'ok':count?'partial':'source_unavailable',as_of:Object.values(days).filter(Boolean).sort().at(-1)||old.as_of,dates:days,cities:prices};
  }],
  ['nav',async()=>{const old=docs['funds.json'];try{const funds=parseNAV(await getText(NAV_URL,fetcher,5000000),now);
   for(const [k,v]of Object.entries(funds))if(old.funds?.[k]?.nav_date>v.nav_date)throw Error('NAV source regressed');
   docs['funds.json']={schema_version:1,checked_at:new Date(now).toISOString(),source:NAV_PAGE,status:'ok',funds};
  }catch(e){docs['funds.json']={...old,checked_at:new Date(now).toISOString(),status:'unavailable'};throw e;}}],
 ];
 await Promise.all(tasks.map(async([key,fn])=>{try{await fn();latest.sources_checked[key]='ok';}catch(e){latest.sources_checked[key]='unavailable';errors[key]=e.message;}}));
 if(!['ibja','xau','xag','usd_inr'].some(k=>latest.sources_checked[k]==='ok'))throw Error('All primary sources unavailable; previous publication retained');
 // Attributed secondary history enriches gaps; it never replaces direct rates.
 const feeds=[['gold24_inr_10g','gold/999.json','gold','999',10],['gold22_inr_10g','gold/916.json','gold','916',10],['silver999_inr_kg','silver.json','silver','999',1000]];
 for(const [key,path,metal,purity,multiplier]of feeds){try{const values=backfillRows(JSON.parse(await getText('https://trackliveprice.com/api/'+path,fetcher)),metal,purity,multiplier,isoDay(now));
  const rows=Object.entries(values).filter(([day])=>day<latest.india.date).map(([date,value])=>({date,session:'PM',[key]:value,source:'IBJA archive via TrackLivePrice',source_url:'https://trackliveprice.com/methodology/',source_precision:'INR 1 per 10g gold; silver converted from two-decimal INR/g'}));archives.ibja=merge('ibja',archives.ibja,rows);
 }catch(e){errors['backfill_'+key]=e.message;}}
 const india=onePerDay(archives.ibja),prediction=publishForecast(latest,india,archives.forecasts,now);archives.forecasts=prediction.issued;
 docs['forecast.json']=prediction.forecast;
 docs['forecast_history.json']={schema_version:1,forecasts:archives.forecasts.slice(-90),storage:{type:'recent-cache',archive_manifest:'Cloudflare D1 permanent observations'}};
 docs['history.json']={schema_version:1,india:india.slice(-120),fx:archives.fx.slice(-120),spot:{XAU:archives['spot-xau'].slice(-120),XAG:archives['spot-xag'].slice(-120)},storage:{type:'recent-cache',note:'Complete observations retained in Cloudflare D1; original migration archive retained in GitHub.'}};
 if(!validRates(latest.india)||!docs['history.json'].india.some(r=>r.date===latest.india.date&&FIELDS.every(k=>r[k]===latest.india[k])))throw Error('Snapshot/history publication mismatch');
 const target=sessionTarget(now);
 const session_complete=sessionHealth(latest,archives,target);
 if(!session_complete)errors.expected_session='Waiting for explicitly dated '+target.date+' '+target.session+' source observations';
 return {docs,archives,errors,target,session_complete};
}
