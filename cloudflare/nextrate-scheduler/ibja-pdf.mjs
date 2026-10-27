// Parse the official, explicitly dated IBJA document. Column geometry preserves
// missing PM cells; never assign a date to the undated current HTML quote table.
import {getDocument} from 'unpdf/pdfjs';
import {IBJA,FIELDS,isoDay,ageDays,validDay,validRates} from './market.mjs';
const MONTHS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const NAMES=['Gold 999','Gold 999','Gold 995','Gold 995','Gold 916','Gold 916','Gold 750','Gold 750','Gold 585','Gold 585','Silver 999','Silver 999'];
export function officialPDFURL(html){
 const links=[...html.matchAll(/\bhref\s*=\s*["']([^"']+\.pdf)["']/gi)].map(m=>m[1].replaceAll('&amp;','&'));
 for(const link of links){const url=new URL(link,IBJA);if(url.protocol==='https:'&&['www.ibjarates.com','ibjarates.com'].includes(url.hostname)&&!url.username&&!url.password&&url.pathname.startsWith('/UploadedFiles/30DaysPdf/'))return url.href;}
 return null;
}
const xcenter=i=>i.transform[4]+i.width/2;
function column(item,centers){const x=xcenter(item);let best=0;for(let j=1;j<centers.length;j++)if(Math.abs(x-centers[j])<Math.abs(x-centers[best]))best=j;return Math.abs(x-centers[best])<=18?best:-1;}
export function parsePDFItems(items,now,url){
 const clean=items.filter(i=>typeof i.str==='string'&&i.str.trim()&&Array.isArray(i.transform)&&Number.isFinite(i.width));
 // PDF.js may split a cell into separate words; join only a matching unit
 // pair on the same baseline, never text across adjacent price columns.
 const units=clean.flatMap(i=>{
  const value=i.str.trim();if(/^(?:10 Gms|1 Kg)$/.test(value))return [i];
  if(!['10','1'].includes(value))return [];
  const end=clean.find(j=>j.str.trim()===(value==='10'?'Gms':'Kg')&&Math.abs(j.transform[5]-i.transform[5])<1.5&&j.transform[4]>=i.transform[4]+i.width-.5&&j.transform[4]<=i.transform[4]+i.width+10);
  return end?[{...i,str:value+' '+end.str.trim(),width:end.transform[4]+end.width-i.transform[4]}]:[];
 }).sort((a,b)=>xcenter(a)-xcenter(b));
 if(units.length!==12||units.some((u,i)=>u.str.trim()!==(i<10?'10 Gms':'1 Kg'))||units.some(u=>Math.abs(u.transform[5]-units[0].transform[5])>2))throw Error('Unrecognized IBJA PDF unit columns');
 const centers=units.map(xcenter),unitY=units[0].transform[5];
 const headers=clean.filter(i=>i.transform[5]>unitY+2&&i.transform[5]<unitY+70);
 for(let c=0;c<12;c++){
  const cells=headers.filter(i=>column(i,centers)===c).map(i=>i.str.trim());
  if(!cells.join(' ').includes(NAMES[c])||!cells.some(s=>new RegExp('^\\('+(c%2?'PM':'AM')+'\\b').test(s)))throw Error('Unrecognized IBJA PDF purity/session header');
 }
 const byKey=new Map(),today=isoDay(now);
 for(const cell of clean){
  const m=cell.str.trim().match(/^(\d{2})-([A-Za-z]{3})-(\d{2})$/);if(!m||cell.transform[5]>=unitY)continue;
  const month=MONTHS.indexOf(m[2].toLowerCase())+1,day=`20${m[3]}-${String(month).padStart(2,'0')}-${m[1]}`;
  if(!validDay(day)||day>today||day<'2020-01-01')continue;
  const values=new Map();
  for(const item of clean){if(Math.abs(item.transform[5]-cell.transform[5])>2||!/^\d[\d,]{2,8}$/.test(item.str.trim()))continue;
   const c=column(item,centers);if(c<0)continue;const value=Number(item.str.trim().replaceAll(',',''));
   if(values.has(c)&&values.get(c)!==value)throw Error('Conflicting PDF price cell');values.set(c,value);
  }
  for(const [session,offset]of [['AM',0],['PM',1]]){
   const row={date:day,session,gold24_inr_10g:values.get(offset),gold22_inr_10g:values.get(4+offset),silver999_inr_kg:values.get(10+offset)};
   if(!validRates(row))continue;
   const key=day+':'+session,prior=byKey.get(key);if(prior&&FIELDS.some(k=>prior[k]!==row[k]))throw Error('Conflicting dated PDF session');
   byKey.set(key,row);
  }
 }
 const rows=[...byKey.values()].sort((a,b)=>(a.date+':'+a.session).localeCompare(b.date+':'+b.session));
 if(!rows.length||ageDays(today,rows.at(-1).date)>14)throw Error('Official PDF has no recent dated session');
 const meta={source:'India Bullion and Jewellers Association (IBJA)',source_url:IBJA,source_document_url:url,retrieved_at:new Date(now).toISOString(),gst_included:false,making_charges_included:false,geography:'India national reference, not city retail'};
 return rows.map(r=>({...r,...meta}));
}
export async function parseIBJAPDF(bytes,now,url){
 if(!(bytes instanceof Uint8Array)||bytes.length>3000000||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('Invalid official PDF response');
 const task=getDocument({data:bytes,isEvalSupported:false,useSystemFonts:false,disableFontFace:true,useWorkerFetch:false,stopAtErrors:true,verbosity:0});
 try{const doc=await task.promise;if(doc.numPages!==1)throw Error('Unexpected official rate document page count');const page=await doc.getPage(1),content=await page.getTextContent();return parsePDFItems(content.items,now,url);}
 finally{await task.destroy();}
}
