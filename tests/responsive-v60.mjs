// DOM geometry checks at simulated card widths, not screenshots or device certification.
import './management-ui.mjs';
import assert from 'node:assert/strict';
const $=id=>document.getElementById(id);let viewport=375;
const boxWidth=()=>viewport<700?viewport-64:viewport<1000?viewport-72:Math.floor((viewport-300)/2)-32;
window.HTMLElement.prototype.getBoundingClientRect=function(){const width=['sales','workspace-sidebar'].includes(this.id)?viewport-32:boxWidth();return {width,height:300,x:0,y:0,left:0,right:width,top:0,bottom:300}};
const base=window.actualDashboard.read(),cfg={year:base.snapshot.year,months:base.months,periodMode:'ytd',targetBasis:'period',selection:{product:[],line:[],distributor:[],channel:[]},section:'overview'};
const check=(id,height)=>{const svg=$(id).querySelector('svg.responsive-plot');assert(svg,id+' uses responsive renderer');const vb=svg.getAttribute('viewBox').split(' ').map(Number);assert.equal(vb[2],Math.max(260,boxWidth()),id+' matches card pixel width');assert(vb[3]>=height,id+' retains readable height');assert(svg.getAttribute('style').includes('width:'+vb[2]+'px'));for(const t of svg.querySelectorAll('text[font-size]'))assert(Number(t.getAttribute('font-size'))>=11,id+' has readable text');return svg;};
for(viewport of [320,375,768,1440]){
 await window.actualDashboard.apply(cfg);check('trend',250);check('company-achievement-chart',180);check('company-ppg-chart',180);
 window.actualDashboard.showSection('analysis');check('timeline',380);check('breakdown-products-chart',250);check('breakdown-lines-chart',250);
 assert($('breakdown-lines-count').textContent.startsWith(viewport<700?'Top 5':'Top 6'));const bridge=$('movement-chart');assert(bridge.querySelectorAll('g[data-tip]').length<=12,'Bridge bounded to 8, Other, residual, totals');assert(bridge.querySelector('.chart-scroll[tabindex="0"]'),'Keyboard-scrollable bridge');assert(bridge.textContent.includes('Other'),'Grouped contributions remain discoverable');
 $('bd-lines-all').click();assert($('bd-full-chart').querySelectorAll('[data-bd-line]').length>4,'View all keeps full line list');$('bd-close').click();
 await window.actualDashboard.apply({...cfg,selection:{...cfg.selection,product:['CALCITRON']}});check('single-chart',250);check('single-achievement-chart',180);check('single-ppg-chart',180);
 document.querySelector('#single-product-overview [data-monthly-py="on"]').click();check('single-chart',250);document.querySelector('#single-product-overview [data-monthly-py="off"]').click();
}
const crowded=document.createElement('div');crowded.innerHTML=window.actualDashboard.monthlyChartHTML(Array.from({length:12},(_,i)=>({month:i+1,actual:90+i,target:100,pct:90+i})),'units',300);assert.equal(crowded.querySelectorAll('g[data-tip]').length,12,'Dense month labels never drop monthly data bars');assert(crowded.querySelectorAll('text[y="250"]').length<12,'Narrow 12-month axis reduces label density');
assert(document.querySelector('.tab-scroll-help').textContent.includes('Swipe tabs'));assert.equal(document.querySelector('#sales>.section-tabs').getAttribute('tabindex'),'0');
let calls=0;const oldFetch=globalThis.fetch;globalThis.fetch=(...args)=>{calls++;return oldFetch(...args)};viewport=375;window.dispatchEvent(new window.Event('resize'));await new Promise(r=>setTimeout(r,400));check('single-chart',250);assert.equal(calls,0,'Resize never fetches or writes data');globalThis.fetch=oldFetch;
console.log('V60 geometry passed: 320/375/768/1440 widths; company/product; target and PY charts; fixed SVG pixel scale/font/height; top5 lines/full detail; bounded bridge; keyboard regions; resize without network calls. Browser/mobile visual QA remains separate.');
