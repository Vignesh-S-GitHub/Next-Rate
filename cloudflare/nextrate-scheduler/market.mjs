// Source-backed collectors. Dates and units follow scripts/update_*.py.
export const IBJA = 'https://www.ibjarates.com/';
export const FX_URLS = ['https://api.frankfurter.dev/v2/rate/usd/inr', 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR', 'https://open.er-api.com/v6/latest/USD'];
export const CITIES = ['Chennai','Mumbai','Delhi','Bengaluru','Hyderabad'];
export const CITY_URLS = {gold:'https://www.goodreturns.in/gold-rates/',silver:'https://www.goodreturns.in/silver-rates/'};
export const NAV_URL = 'https://portal.amfiindia.com/spages/NAVAll.txt';
export const NAV_PAGE = 'https://www.amfiindia.com/net-asset-value/nav-download';
export const SCHEMES = {
  goldbees:[140088,'Nippon India ETF Gold BeES','Gold ETF'],hdfcgold:[113049,'HDFC Gold ETF','Gold ETF'],
  sbigold:[111954,'SBI Gold ETF','Gold ETF'],goldfund:[120685,'ICICI Prudential Gold ETF FOF','Gold Fund'],
  silveretf:[149758,'Nippon India Silver ETF','Silver ETF'],hdfcsilver:[150556,'HDFC Silver ETF','Silver ETF'],
  silverfund:[152735,'SBI Silver ETF Fund of Fund','Silver Fund'],
};
const BY_CODE=Object.fromEntries(Object.entries(SCHEMES).map(([k,v])=>[v[0],[k,v]]));
export const FIELDS = ['gold24_inr_10g','gold22_inr_10g','silver999_inr_kg'];
export const isoDay = now => new Date(+new Date(now)+19800000).toISOString().slice(0,10);
export const ageDays = (a,b) => (Date.parse(a)-Date.parse(b))/86400000;
export function validDay(s) { return typeof s==='string' && /^20\d\d-\d\d-\d\d$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s; }
export function validRates(r) { return r && FIELDS.every(k=>Number.isInteger(r[k])) && r.gold24_inr_10g>10000 && r.gold24_inr_10g<1000000 && r.gold22_inr_10g/r.gold24_inr_10g>.87 && r.gold22_inr_10g/r.gold24_inr_10g<.97 && r.silver999_inr_kg>5000 && r.silver999_inr_kg<3000000; }
export function text(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]*>/g,' ').replace(/&#(x[\da-f]+|\d+);/gi,(_,v)=>{ const n=v[0].toLowerCase()==='x'?parseInt(v.slice(1),16):Number(v); return n<=0x10ffff?String.fromCodePoint(n):' '; })
    .replace(/&nbsp;|&amp;|&rupee;|&quot;|&#39;/g,s=>({'&amp;':'&','&rupee;':'₹','&quot;':'"','&#39;':"'"}[s]||' ')).replace(/\s+/g,' ').trim();
}
export function tableRows(html) {
  return [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)].map(m=>{
    const cells=[...m[1].matchAll(/<(?:td|th)\b([^>]*)>([\s\S]*?)<\/(?:td|th)\s*>/gi)];
    const labels=cells.flatMap(c=>[...c[1].matchAll(/\bdata-label\s*=\s*["']?\s*(AM|PM)\b/gi)].map(v=>v[1].toUpperCase()));
    return {cells:cells.map(c=>text(c[2])),session:new Set(labels).size===1?labels[0]:null};
  });
}
export function parseIBJA(html, now) {
  const today=isoDay(now), byKey=new Map();
  for (const {cells,session} of tableRows(html)) {
    if (!session) continue;
    const joined=cells.join(' '), match=joined.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
    if (!match) continue;
    const day=`${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`;
    if (!validDay(day)||day>today) continue;
    const nums=[...joined.slice(match.index+match[0].length).matchAll(/\b\d[\d,]{3,8}\b/g)].map(v=>Number(v[0].replaceAll(',','')));
    if(nums.length<6)continue;
    const row={date:day,session,gold24_inr_10g:nums[0],gold22_inr_10g:nums[2],silver999_inr_kg:nums[5]};
    if(!validRates(row))continue;
    const key=day+':'+session,old=byKey.get(key);
    if(old&&FIELDS.some(k=>old[k]!==row[k]))throw Error('Conflicting dated IBJA observations');
    byKey.set(key,row);
  }
  const rows=[...byKey.values()].sort((a,b)=>(a.date+':'+a.session).localeCompare(b.date+':'+b.session));
  const last=rows.at(-1);
  if(!last||ageDays(today,last.date)>14)throw Error('IBJA source has no valid recent dated market observations');
  const meta={source:'India Bullion and Jewellers Association (IBJA)',source_url:IBJA,retrieved_at:new Date(now).toISOString(),gst_included:false,making_charges_included:false,geography:'India national reference, not city retail'};
  return {current:{...last,...meta},rows:rows.map(r=>({...r,...meta}))};
}
export function parseSpot(item,symbol,now) {
  const price=Number(item.price),at=Date.parse(item.updatedAt),age=(+new Date(now)-at)/1000;
  if(item.symbol!==symbol||(item.currency||'USD')!=='USD'||!Number.isFinite(price)||price<=0||price>=100000||!Number.isFinite(at)||!/(?:Z|[+-]\d\d:\d\d)$/i.test(item.updatedAt)||age< -600||age>7*86400)throw Error('Invalid spot source symbol, value or timestamp');
  return {usd_per_troy_ounce:Math.round(price*10000)/10000,as_of:new Date(at).toISOString(),retrieved_at:new Date(now).toISOString(),source:'Gold API indicative spot',source_url:'https://gold-api.com/docs'};
}
export function parseFX(item,now) {
  let value,day,source='Frankfurter daily FX reference',source_url='https://frankfurter.dev/';
  if(item.result==='success'&&item.base_code==='USD') {
    value=Number(item.rates?.INR);day=new Date(Number(item.time_last_update_unix)*1000).toISOString().slice(0,10);
    source='ExchangeRate-API open access';source_url='https://www.exchangerate-api.com';
  } else if(item.base?.toUpperCase()==='USD'&&item.quote?.toUpperCase()==='INR'){value=Number(item.rate);day=item.date;}
  else if(item.base?.toUpperCase()==='USD'&&item.rates){value=Number(item.rates.INR);day=item.date;}
  if(!Number.isFinite(value)||value<=20||value>=250||!validDay(day)||ageDays(isoDay(now),day)<0||ageDays(isoDay(now),day)>10)throw Error('Invalid FX value or publication date');
  return {inr_per_usd:Math.round(value*100000)/100000,date:day,retrieved_at:new Date(now).toISOString(),source,source_url};
}
const MONTHS=['january','february','march','april','may','june','july','august','september','october','november','december'];
export function parseCities(html,metal,now) {
  const match=text(html).match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i);
  if(!match)throw Error('City source has no dated rate header');
  const day=`${match[3]}-${String(MONTHS.indexOf(match[2].toLowerCase())+1).padStart(2,'0')}-${match[1].padStart(2,'0')}`;
  if(!validDay(day)||ageDays(isoDay(now),day)<0||ageDays(isoDay(now),day)>7)throw Error('Invalid city publication date');
  const result={};
  for(const {cells} of tableRows(html)) {
    const city=cells[0]==='Bangalore'?'Bengaluru':cells[0];if(!CITIES.includes(city)||cells.length<4)continue;
    const nums=cells.slice(1,4).map(s=>{const m=s.match(/\d[\d,]*(?:\.\d+)?/);return m?Number(m[0].replaceAll(',','')):NaN;});
    const [a,b,c]=nums;let row;
    if(metal==='gold'&&a>2500&&a<200000&&b>2200&&b<a&&b/a>.875&&b/a<.965)row={gold24_inr_g:Math.round(a),gold22_inr_g:Math.round(b)};
    if(metal==='silver'&&a>100&&a<50000&&b>1000&&b<500000&&c>10000&&c<3000000&&Math.abs(a*100-c)<=c*.02&&Math.abs(b*10-c)<=c*.02)row={silver999_inr_kg:Math.round(c)};
    if(row){if(result[city]&&JSON.stringify(result[city])!==JSON.stringify(row))throw Error('Conflicting city rows');result[city]=row;}
  }
  if(Object.keys(result).length!==5)throw Error('Incomplete publisher city table');
  return {day,rows:result};
}
export function parseNAV(report,now) {
  const result={};
  for(const line of report.split('\n')) {
    const r=line.trim().replace(/^\uFEFF/,'').split(';');if(r.length!==8)continue;
    const entry=BY_CODE[Number(r[0])];if(!entry)continue;
    const [key,[scheme_code,name,kind]]=entry;
    if(r[3].trim().toLowerCase()!==name.toLowerCase())throw Error('Scheme name mismatch');
    const nav=Number(r[6]),d=r[7].trim().match(/^(\d{2})-([A-Za-z]{3})-(20\d\d)$/),month=d?MONTHS.findIndex(m=>m.slice(0,3)===d[2].toLowerCase())+1:0;
    const day=d?`${d[3]}-${String(month).padStart(2,'0')}-${d[1]}`:'';
    if(!Number.isFinite(nav)||nav<=.01||nav>=1000000||!validDay(day)||ageDays(isoDay(now),day)<0||ageDays(isoDay(now),day)>10)throw Error('Invalid NAV value/date');
    result[key]={scheme_code,name,kind,nav_inr_per_unit:Math.round(nav*10000)/10000,nav_date:day,source:'AMFI published NAV',source_url:NAV_PAGE,quote_type:'NAV, not exchange trading price'};
  }
  if(Object.keys(result).length<4)throw Error('Fewer than four valid selected AMFI NAVs');
  return result;
}
export function identity(kind,r){return kind==='ibja'?r.date+':'+r.session:kind==='forecasts'?r.issuance_key:kind==='fx'?r.date:r.as_of;}
function checkRow(kind,row){
  if(kind==='ibja'){
    if(!validDay(row.date)||!['AM','PM'].includes(row.session))throw Error('Invalid archive date/session');
    let count=0;for(const key of FIELDS)if(row[key]!=null){count++;if(!Number.isInteger(row[key])||row[key]<=(key===FIELDS[2]?5000:10000)||row[key]>=(key===FIELDS[2]?3000000:1000000))throw Error('Invalid archived metal price');}
    if(!count||(row.gold24_inr_10g&&row.gold22_inr_10g&&!(row.gold22_inr_10g/row.gold24_inr_10g>.87&&row.gold22_inr_10g/row.gold24_inr_10g<.97)))throw Error('Invalid archived purity ratio');
  }
}
export function merge(kind,older,incoming) {
  const map=new Map();
  for(const row of [...older,...incoming]) {
    checkRow(kind,row);const id=identity(kind,row);if(typeof id!=='string'||!id)throw Error('Missing archive identity');
    const old=map.get(id);if(!old){map.set(id,structuredClone(row));continue;}
    if(kind==='forecasts') {
      for(const k of ['issuance_key','issued_at','target_date','based_on_date','based_on_session','metals'])if(JSON.stringify(old[k])!==JSON.stringify(row[k]))throw Error('Attempt to rewrite issued forecast');
      if(old.evaluation&&row.evaluation&&JSON.stringify(old.evaluation)!==JSON.stringify(row.evaluation))throw Error('Conflicting forecast evaluation');
      if(!old.evaluation&&row.evaluation)map.set(id,{...old,evaluation:row.evaluation});
    } else if(kind==='ibja') {
      const direct=r=>r.source_url===IBJA||r.source?.includes('association (ibja)');
      if(direct(row)&&!direct(old))map.set(id,{...row});
      else {for(const k of FIELDS)if(old[k]==null&&row[k]!=null)old[k]=row[k];checkRow(kind,old);}
    }
  }
  return [...map.values()].sort((a,b)=>kind==='forecasts'?(a.target_date+(a.issued_at||'')+a.issuance_key).localeCompare(b.target_date+(b.issued_at||'')+b.issuance_key):identity(kind,a).localeCompare(identity(kind,b)));
}
