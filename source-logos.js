/* NextRate source identity and official destination links.
   Only render a third-party image when the original publisher hosts it
   and it identifies data already displayed in NextRate.
   BIS and AMFI marks are intentionally NOT reproduced: their published
   logo policies require prior permission for outside websites. */
(function(root){
'use strict';
const PROVIDERS=Object.freeze({
  ibja:Object.freeze({
    label:'IBJA', url:'https://www.ibjarates.com/',
    image:'https://www.ibja.co/images/IBJA_logo-big.png',
    alt:'IBJA source emblem', fallback:'IBJA',
    provenance:'Image hosted by India Bullion and Jewellers Association'
  }),
  goodreturns:Object.freeze({
    label:'Goodreturns',url:'https://www.goodreturns.in/gold-rates/',
    image:'https://images.goodreturns.in/images/goodreturns-og-image-1727936148894.jpg',
    alt:'Goodreturns publisher identity',fallback:'GR',
    provenance:'Image hosted by Goodreturns'
  }),
  nse:Object.freeze({
    label:'NSE',url:'https://www.nseindia.com/market-data/exchange-traded-funds-etf',
    image:'https://nsearchives.nseindia.com/web/sites/default/files/2019-07/NSE%404x-100.jpg',
    alt:'National Stock Exchange of India logo',fallback:'NSE',
    provenance:'Image published on NSE Media Resources'
  }),
  biscare:Object.freeze({
    label:'BIS Care App',url:'https://www.bis.gov.in/bis-apps/?lang=en',
    image:null,alt:'',fallback:'✓',
    provenance:'Official app link; BIS mark requires prior approval'
  }),
  amfi:Object.freeze({
    label:'AMFI',url:'https://www.amfiindia.com/',
    image:null,alt:'',fallback:'NAV',
    provenance:'Official industry-body link; AMFI logo requires permission'
  })
});
function escape(value){
 return String(value??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function badge(provider,{label=null,href=null,compact=false}={}){
 const p=PROVIDERS[provider];
 if(!p)throw new RangeError('Unknown trusted source');
 // Link destinations are never accepted from arbitrary caller input.
 const address=href&&/^https:\/\/(www\.)?goodreturns\.in\/(gold-rates|silver-rates)\/?$/.test(href)&&provider==='goodreturns'
   ?href:p.url;
 const title=label||p.label;
 const image=p.image?
   '<img class="source-logo-img" loading="lazy" decoding="async" referrerpolicy="no-referrer" '+
   'src="'+escape(p.image)+'" alt="" onerror="this.hidden=true" />':'';
 return '<a class="source-logo-link source-logo-link--'+provider+
   (compact?' source-logo-link--compact':'')+
   '" href="'+escape(address)+'" target="_blank" rel="noopener noreferrer" '+
   'aria-label="Open official '+escape(p.label)+' source" title="'+escape(p.provenance)+'">'+
   '<span class="source-logo-symbol" aria-hidden="true">'+
   '<span class="source-logo-fallback">'+escape(p.fallback)+'</span>'+image+'</span>'+
   '<span class="source-logo-label">'+escape(title)+'</span>'+
   '<span class="source-logo-external" aria-hidden="true">↗</span></a>';
}
const api=Object.freeze({badge,providers:PROVIDERS});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.NextRateSources=api;
})(typeof window==='undefined'?globalThis:window);
