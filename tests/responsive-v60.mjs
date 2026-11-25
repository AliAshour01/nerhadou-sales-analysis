// DOM geometry checks at simulated card widths, not screenshots or device certification.
import './management-ui.mjs';
import assert from 'node:assert/strict';
const $=id=>document.getElementById(id);let viewport=375;
const boxWidth=()=>viewport<700?viewport-64:viewport<1000?viewport-72:Math.floor((viewport-300)/2)-32;
window.HTMLElement.prototype.getBoundingClientRect=function(){const width=['sales','workspace-sidebar'].includes(this.id)?viewport-32:boxWidth();return {width,height:300,x:0,y:0,left:0,right:width,top:0,bottom:300}};
const none={product:[],line:[],distributor:[],channel:[]},cfg={years:[2026],months:[1,2,3,4,5,6,7,8],periodMode:'ytd',targetBasis:'period',selection:none,section:'overview'};
const check=(id,height)=>{const svg=$(id).querySelector('svg.responsive-plot');assert(svg,id+' uses responsive renderer');const vb=svg.getAttribute('viewBox').split(' ').map(Number);assert(vb[2]>=260,id+' min width');assert(vb[3]>=height,id+' retains readable height');assert(svg.getAttribute('style').includes('width:'+vb[2]+'px'));for(const t of svg.querySelectorAll('text[font-size]'))assert(Number(t.getAttribute('font-size'))>=11,id+' has readable text');return svg;};
for(viewport of [320,375,768,1440]){
 await window.actualDashboard.apply(cfg);check('trend',220);const bridge=$('movement-chart');check('movement-chart',150);assert(bridge.querySelectorAll('g[data-tip]').length<=12,'Bridge bounded to 8, Other, residual, totals');assert(bridge.querySelector('.chart-scroll[tabindex="0"]'),'Keyboard-scrollable bridge');
 await window.actualDashboard.apply({...cfg,selection:{...none,product:['CALCITRON']}});check('trend',220);
 const py=document.querySelector('#panel-monthly [data-monthly-compare]');if(py){py.click();check('trend',220);py.click();}
}
const crowded=document.createElement('div');crowded.innerHTML=window.actualDashboard.monthlyChartHTML(Array.from({length:12},(_,i)=>({month:i+1,actual:90+i,target:100,pct:90+i})),'units',300);assert.equal(crowded.querySelectorAll('g[data-tip]').length,12,'Dense month labels never drop monthly data bars');assert(crowded.querySelectorAll('text[y="250"]').length<12,'Narrow 12-month axis reduces label density');
assert.equal(document.querySelector('.tab-scroll-help'),null,'Swipe hint removed; tabs fit');assert.equal(document.querySelector('#sales>.section-tabs').getAttribute('role'),'tablist');
let calls=0;const oldFetch=globalThis.fetch;globalThis.fetch=(...args)=>{calls++;return oldFetch(...args)};viewport=375;window.dispatchEvent(new window.Event('resize'));await new Promise(r=>setTimeout(r,400));check('trend',220);assert.equal(calls,0,'Resize never fetches or writes data');globalThis.fetch=oldFetch;
console.log('V60 geometry passed (V69 page): 320/375/768/1440 widths; company/product; monthly and bridge charts; fixed SVG pixel scale/font/height; bounded keyboard-scrollable bridge; dense axis; resize without network calls.');
