const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const fixture=JSON.parse(fs.readFileSync(__dirname+'/fixtures/ibja-20261027-items.json'));
const now=new Date('2026-10-27T09:45:00Z');
function pdfBytes(){
 const center=(text,x,y)=>`BT /F1 6 Tf 1 0 0 1 ${x-text.length*1.8} ${y} Tm (${text.replaceAll('(','\\(').replaceAll(')','\\)')}) Tj ET\n`;
 let stream='';const names=['Gold 999','Gold 999','Gold 995','Gold 995','Gold 916','Gold 916','Gold 750','Gold 750','Gold 585','Gold 585','Silver 999','Silver 999'];
 for(let c=0;c<12;c++){const x=90+42*c;stream+=center(names[c],x,740)+center(c%2?'(PM Price)':'(AM Price)',x,730)+center(c<10?'10 Gms':'1 Kg',x,710);}
 stream+=center('27-Oct-26',35,690);for(const [i,v]of [141082,140517,129231,105812,82533,192037].entries())stream+=center(String(v),90+84*i,690);
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 650 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`];
 let doc='%PDF-1.4\n',offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(doc));doc+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
 const xref=Buffer.byteLength(doc);doc+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 return new Uint8Array(Buffer.from(doc));
}

test('Official PDF values update AM while blank PM cells remain absent',async()=>{
 const {parsePDFItems}=await import('../cloudflare/nextrate-scheduler/ibja-pdf.mjs');const rows=parsePDFItems(fixture.items,now,fixture.source_url);
 const r=rows.at(-1);assert.equal(r.date,'2026-10-27');assert.equal(r.session,'AM');assert.equal(r.gold24_inr_10g,141082);assert.equal(r.gold22_inr_10g,129231);assert.equal(r.silver999_inr_kg,192037);
 assert.ok(!rows.some(r=>r.date==='2026-10-27'&&r.session==='PM'));assert.equal(rows.find(r=>r.date==='2026-10-26'&&r.session==='PM').gold24_inr_10g,141710);assert.equal(r.source_document_url,fixture.source_url);
});
test('Only allow official rate-document URLs, never arbitrary or insecure hosts',async()=>{
 const {officialPDFURL}=await import('../cloudflare/nextrate-scheduler/ibja-pdf.mjs');
 assert.ok(officialPDFURL('<a href="../UploadedFiles/30DaysPdf/dated file.pdf">Previous 30 Days</a>').startsWith('https://www.ibjarates.com/UploadedFiles/30DaysPdf/'));
 for(const href of ['https://evil.test/UploadedFiles/30DaysPdf/a.pdf','http://www.ibjarates.com/UploadedFiles/30DaysPdf/a.pdf','https://user:pass@www.ibjarates.com/UploadedFiles/30DaysPdf/a.pdf'])assert.equal(officialPDFURL(`<a href="${href}">Rates</a>`),null);
});
test('Future rows, ambiguous headers and inconsistent units do not certify today',async()=>{
 const {parsePDFItems}=await import('../cloudflare/nextrate-scheduler/ibja-pdf.mjs');
 const future=parsePDFItems(fixture.items,new Date('2026-10-26T14:00:00Z'),fixture.source_url);assert.equal(future.at(-1).date,'2026-10-26');
 assert.throws(()=>parsePDFItems(fixture.items.map(i=>({...i,str:i.str==='(AM Price)'?'(PM Price)':i.str})),now,fixture.source_url),/header/);
 assert.throws(()=>parsePDFItems(fixture.items.map(i=>({...i,str:i.str==='1 Kg'?'10 Gms':i.str})),now,fixture.source_url),/unit/);
});
test('Binary PDF decoding works without canvas, DOM, images or code evaluation',async()=>{
 const {parseIBJAPDF}=await import('../cloudflare/nextrate-scheduler/ibja-pdf.mjs');const rows=await parseIBJAPDF(pdfBytes(),now,fixture.source_url);
 assert.equal(rows.length,1);assert.equal(rows[0].gold24_inr_10g,141082);assert.equal(rows[0].session,'AM');
 await assert.rejects(parseIBJAPDF(new TextEncoder().encode('not a PDF'),now,fixture.source_url),/Invalid/);
});
test('Collector prefers the dated official PDF when HTML history trails today',async()=>{
 const {collect}=await import('../cloudflare/nextrate-scheduler/pipeline.mjs');
 const root=require('node:path').resolve(__dirname,'..'),docs=Object.fromEntries(['latest','history','forecast','forecast_history','cities','funds'].map(n=>[n+'.json',JSON.parse(fs.readFileSync(root+'/data/'+n+'.json'))]));
 const stored=Object.fromEntries(['ibja','fx','spot-xau','spot-xag','forecasts'].map(k=>[k,JSON.parse(fs.readFileSync(root+'/data/archive/'+k+'/2026.json')).records]));
 const html='<a href="/UploadedFiles/30DaysPdf/current.pdf">Previous 30 Days</a><table><tr><td data-label="PM">26/10/2026</td><td>141710</td><td>141143</td><td>129806</td><td>106283</td><td>82900</td><td>194479</td></tr></table>';
 const result=await collect(docs,stored,now,async url=>url==='https://www.ibjarates.com/'?new Response(html):url.endsWith('/current.pdf')?new Response(pdfBytes()):new Response('unavailable',{status:503}));
 assert.equal(result.docs['latest.json'].india.date,'2026-10-27');assert.equal(result.session_complete,true);assert.equal(result.docs['forecast.json'].based_on_session,'AM');assert.equal(result.docs['history.json'].india.at(-1).gold24_inr_10g,141082);
});
