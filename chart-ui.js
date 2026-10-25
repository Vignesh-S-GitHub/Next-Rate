/* Interactive IBJA chart UI.
 * Retains the original gold line, shaded actual area, dashed estimate and
 * gold forecast band. Values come only from dated published JSON observations.
 * SVG supports tap, keyboard arrows; scrubber allows exact 30D/90D access. */
(function(root){
'use strict';
const Model=root.NextRateChart ||
 (typeof module!=='undefined'?require('./chart-interaction.js'):null);
function fmt(ctx,n){return ctx.price(n);}
function isoLabel(iso){
 return new Date(iso+'T12:00:00+05:30').toLocaleDateString('en-IN',{
  day:'numeric',month:'short',timeZone:'Asia/Kolkata'});
}
function insightHtml(point,ctx){
 if(!point)return '<span>Published rate unavailable.</span>';
 const status=point.kind==='prediction'?'Estimate':'Actual';
 const date=isoLabel(point.date)+' '+point.date.slice(0,4);
 return '<span class="chart-inspect-kind'+(point.kind==='prediction'?' is-prediction':'')+'">'+status+' · '+date+'</span>'+
  '<strong class="chart-tooltip-price">'+fmt(ctx,point.value)+' <small>/ '+point.unit+'</small></strong>';
}
// Keep selection in a slim strip above the SVG, avoiding the data line entirely.
function tooltipPosition(pointX,pointY,plotWidth,plotHeight,tipWidth,tipHeight){
 const pad=5,w=Math.min(tipWidth,Math.max(0,plotWidth-pad*2)),half=w/2;
 const left=Math.max(half+pad,Math.min(plotWidth-half-pad,pointX));
 return {left,top:4,placement:'above',arrowX:Math.max(9,Math.min(w-9,pointX-left+half))};
}
function prepare(ctx){
 const d=ctx.forecast?.metals?.[ctx.metal], rows=Model?.observations(ctx.history,ctx.forecast,ctx.metal,ctx.days)||[];
 return {d,rows};
}
function render(ctx){
 const {d,rows}=prepare(ctx);
 if(!d||rows.length<2)return '<div class="empty-chart">At least two dated IBJA observations are needed to draw the chart.</div>';
 const name={gold24:'24K Gold',gold22:'22K Gold',silver:'Silver 999'}[ctx.metal];
 const n=rows.length,last=rows[n-1];
 const selected=Model.indexForDate(rows,ctx.selectedDate,ctx.forecast.target_date);
 const point=Model.displayPoint(rows,ctx.forecast,ctx.metal,selected);
 const smallest=Math.min(...rows.map(x=>x.value),d.low,d.estimate);
 const largest=Math.max(...rows.map(x=>x.value),d.high,d.estimate);
 const margin=Math.max((largest-smallest)*.12,largest*.003);
 const floor=smallest-margin,ceil=largest+margin;
 const y=v=>205-((v-floor)/(ceil-floor))*158;
 const x0=Model.X_FIRST,xEnd=Model.X_LAST,xPred=Model.X_PROJECTION;
 const pts=rows.map((r,i)=>({...r,x:Model.xForIndex(i,n),y:y(r.value)}));
 const color=ctx.metal==='silver'?'#7d8d9f':'#c49430';
 const fillColor=ctx.metal==='silver'?'#c7d0d9':'#efcf80';
 const line=pts.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
 const pathFill=line+' L'+xEnd+' 214 L'+x0+' 214 Z';
 const valLabel=v=>v>=100000?'₹'+(v/100000).toFixed(2)+'L':v>=1000?'₹'+(v/1000).toFixed(1)+'K':ctx.price(v);
 const axis=[0,.25,.5,.75,1].map(f=>{
  const v=floor+(ceil-floor)*f,yy=y(v);
  return '<line x1="55" y1="'+yy.toFixed(1)+'" x2="617" y2="'+yy.toFixed(1)+'" stroke="#ebedf2" stroke-width="1" pointer-events="none"/>'+
   '<text x="47" y="'+(yy+5).toFixed(1)+'" text-anchor="end" font-size="12" fill="#8a96a6">'+valLabel(v)+'</text>';
 }).join('');
 const markerStep=Math.max(1,Math.ceil(n/12));
 const candles=pts.filter((p,i)=>i%markerStep===0||i===n-1).map(p=>
  '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4" fill="#fff" stroke="'+color+'" stroke-width="2.5" pointer-events="none"/>').join('');
 const hits=pts.map((p,i)=>
  '<circle class="chart-hit" data-chart-point="'+i+'" cx="'+p.x.toFixed(1)+
  '" cy="'+p.y.toFixed(1)+'" r="12" fill="transparent">'+
  '<title>Actual · '+ctx.sourceDate(p.date)+' · '+ctx.price(p.value)+'</title></circle>').join('');
 const top=y(d.high),bottom=y(d.low),bandY=Math.min(top,bottom),bandH=Math.max(2,Math.abs(bottom-top));
 const predictedY=y(d.estimate);
 const direction=d.estimate>=last.value?'#12846b':'#cf5252';
 const selX=selected===n?xPred:pts[selected].x;
 const selY=selected===n?predictedY:pts[selected].y;
 const forecastText=ctx.sourceDate(ctx.forecast.target_date);
 return '<div class="market-chart-title"><div><strong>'+name+' Price Trend</strong>'+
  '<span>Actual → '+isoLabel(ctx.forecast.target_date)+' estimate</span></div>'+
  '<span class="market-chart-metadata">₹ / '+(ctx.metal==='silver'?'kg':'10 g')+'</span></div>'+
  '<div class="chart-plot" data-chart-plot><svg class="market-trend-svg chart-interactive" data-chart-svg viewBox="0 0 640 257" tabindex="0" role="group"'+
  ' aria-label="'+name+' actual dated IBJA close. Arrow keys explore dates; the dashed line is an unconfirmed estimate for '+
  forecastText+'.">'+
  '<defs><linearGradient id="market-actual-fill" x1="0" y1="0" x2="0" y2="1">'+
  '<stop offset="0" stop-color="'+fillColor+'" stop-opacity=".30"/>'+
  '<stop offset="1" stop-color="'+fillColor+'" stop-opacity="0"/></linearGradient></defs>'+
  axis+
  '<path d="'+pathFill+'" fill="url(#market-actual-fill)" pointer-events="none"/>'+
  '<path d="'+line+'" fill="none" stroke="'+color+'" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" pointer-events="none"/>'+
  candles+
  '<line x1="533" y1="40" x2="533" y2="218" stroke="#bbc3cf" stroke-width="1" stroke-dasharray="3 5" pointer-events="none"/>'+
  '<rect class="chart-range-band" data-chart-point="'+n+'" x="'+(xPred-16)+'" y="'+bandY.toFixed(1)+
    '" width="32" height="'+bandH.toFixed(1)+'" rx="5" fill="'+fillColor+
    '" fill-opacity=".45" stroke="#c7ac70" stroke-width="1"/>'+
  '<path d="M'+xEnd+' '+pts.at(-1).y.toFixed(1)+' L'+xPred+' '+predictedY.toFixed(1)+
    '" fill="none" stroke="'+direction+'" stroke-width="3" stroke-dasharray="6 5" stroke-linecap="round" pointer-events="none"/>'+
  '<circle cx="'+xPred+'" cy="'+predictedY.toFixed(1)+'" r="6" fill="'+direction+'" stroke="white" stroke-width="2" pointer-events="none"/>'+
  '<circle class="chart-hit chart-forecast-hit" data-chart-point="'+n+'" cx="'+xPred+
  '" cy="'+predictedY.toFixed(1)+'" r="16" fill="transparent">'+
   '<title>Estimate · '+forecastText+' · '+fmt(ctx,d.estimate)+'</title></circle>'+
  hits+
  '<line data-chart-hairline class="chart-inspect-hairline" x1="'+selX.toFixed(1)+'" x2="'+selX.toFixed(1)+
    '" y1="40" y2="218" stroke="'+color+'" stroke-dasharray="2 4" stroke-width="1.4" pointer-events="none"/>'+
  '<circle data-chart-ring class="chart-inspect-ring" cx="'+selX.toFixed(1)+'" cy="'+selY.toFixed(1)+
    '" r="9" fill="none" stroke="'+(selected===n?'#b67c22':color)+'" stroke-width="2.5" pointer-events="none"/>'+
  '<text x="'+x0+'" y="242" font-size="13" fill="#8492a3">'+isoLabel(rows[0].date)+'</text>'+
  '<text x="'+xEnd+'" y="242" text-anchor="middle" font-size="13" fill="#8492a3">'+isoLabel(last.date)+'</text>'+
  '<text x="'+xPred+'" y="242" text-anchor="middle" font-size="13" font-weight="700" fill="#aa7416">'+isoLabel(ctx.forecast.target_date)+'</text></svg><div class="chart-point-tooltip" data-chart-tooltip role="status" aria-live="polite" aria-atomic="true" hidden></div></div>'+
  '<div class="market-legend"><span><i class="market-legend-line"></i>Actual</span>'+
   '<span><i class="market-legend-dash"></i>Estimate</span>'+
   '<span><i class="market-legend-band"></i>Range</span></div>'+

  '<div class="chart-date-controls"><label class="chart-date-label"><span>Move slider</span>'+
  '<input type="range" data-chart-slider min="0" max="'+n+'" step="1" value="'+selected+
  '" aria-label="Choose an actual date or forecast" aria-valuetext="'+
  (point.kind==='prediction'?'Estimate ':'Actual ')+ctx.sourceDate(point.date)+' '+fmt(ctx,point.value)+'"></label></div>'+
  '<p class="chart-key">Estimate only · Not guaranteed</p>';
}
function wire(container,ctx,onSelectedDate){
 if(!container)return;
 const svg=container.querySelector('[data-chart-svg]');
 const slider=container.querySelector('[data-chart-slider]');
 const tooltip=container.querySelector('[data-chart-tooltip]');
 const plot=container.querySelector('[data-chart-plot]');
 if(!svg||!slider||!tooltip||!plot)return;
 const {d,rows}=prepare(ctx),n=rows.length;
 if(!d||n<2)return;
 const hair=svg.querySelector('[data-chart-hairline]'),ring=svg.querySelector('[data-chart-ring]');
 const low=Math.min(...rows.map(x=>x.value),d.low,d.estimate);
 const high=Math.max(...rows.map(x=>x.value),d.high,d.estimate);
 const margin=Math.max((high-low)*.12,high*.003);
 const y=v=>205-((v-(low-margin))/(high-low+margin*2))*158;
 const color=ctx.metal==='silver'?'#7d8d9f':'#c49430';
 function choose(index){
  const i=Model.clampIndex(index,n),point=Model.displayPoint(rows,ctx.forecast,ctx.metal,i);
  if(!point)return;
  onSelectedDate(point.date);
  tooltip.innerHTML=insightHtml(point,ctx);
  if(root.NextRateI18n)root.NextRateI18n.apply(tooltip,ctx.language);
  tooltip.hidden=false;
  const chartRect=svg.getBoundingClientRect(),plotRect=plot.getBoundingClientRect();
  const pointX=chartRect.left-plotRect.left+Model.xForIndex(i,n)*chartRect.width/640;
  const pointY=chartRect.top-plotRect.top+y(point.value)*chartRect.height/257;
  const pos=tooltipPosition(pointX,pointY,plotRect.width,plotRect.height,
    tooltip.offsetWidth,tooltip.offsetHeight);
  tooltip.style.left=pos.left.toFixed(1)+'px';
  tooltip.style.top=pos.top.toFixed(1)+'px';
  tooltip.style.setProperty('--chart-arrow-x',pos.arrowX.toFixed(1)+'px');
  tooltip.dataset.placement=pos.placement;
  slider.value=i;
  slider.setAttribute('aria-valuetext',(point.kind==='prediction'?'Estimate ':'Actual ')+ctx.sourceDate(point.date)+' '+fmt(ctx,point.value));
  const x=Model.xForIndex(i,n);
  hair.setAttribute('x1',x.toFixed(1));hair.setAttribute('x2',x.toFixed(1));
  ring.setAttribute('cx',x.toFixed(1));ring.setAttribute('cy',y(point.value).toFixed(1));
  ring.setAttribute('stroke',point.kind==='prediction'?'#b67c22':color);
 }
 svg.addEventListener('click',ev=>{
  const circle=ev.target.closest?.('[data-chart-point]');
  if(circle){choose(Number(circle.dataset.chartPoint));return;}
  const rect=svg.getBoundingClientRect();
  if(rect.width<=0)return;
  choose(Model.indexAtX((ev.clientX-rect.left)*640/rect.width,n));
 });
 svg.addEventListener('keydown',ev=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(ev.key))return;
  ev.preventDefault();
  choose(ev.key==='Home'?0:ev.key==='End'?n:Number(slider.value)+(ev.key==='ArrowRight'?1:-1));
 });
 slider.addEventListener('input',()=>choose(Number(slider.value)));
}
const api=Object.freeze({render,wire,insightHtml,tooltipPosition});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.NextRateChartUI=api;
})(typeof window==='undefined'?globalThis:window);
