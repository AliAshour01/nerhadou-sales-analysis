// Behavioral/geometry evidence only. No browser screenshots or physical CSS measurements.
import './management-ui.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';
const $=id=>document.getElementById(id),base=window.actualDashboard.read();let viewport=390;
const width=()=>viewport<700?viewport-64:viewport<1100?viewport-80:Math.floor((viewport-300)/2)-32;
window.HTMLElement.prototype.getBoundingClientRect=function(){return {width:width(),height:300,x:0,y:0,left:0,right:width(),top:0,bottom:300}};
const cfg={year:base.snapshot.year,months:base.months,periodMode:'ytd',targetBasis:'period',selection:{product:[],line:[],distributor:[],channel:[]},section:'overview'};
window.nerhadouSecurity.me={user:{role:'owner',status:'active'}};
const evidence=[];
function inspect(id){const svg=$(id).querySelector('svg.responsive-plot');assert(svg,id+' SVG');const box=svg.getAttribute('viewBox').split(' ').map(Number);assert.equal(box[2],Math.max(260,width()),id+' exact container width');assert(box[3]>=180,id+' height');const sizes=[...svg.querySelectorAll('text')].map(t=>Number(t.getAttribute('font-size')||12));assert(sizes.every(s=>s>=11),id+' font >=11px');evidence.push({viewport,chart:id,width:box[2],height:box[3],minimumFont:Math.min(...sizes)});}
for(viewport of [1440,1024,768,390,360]){
 await window.actualDashboard.apply(cfg);inspect('trend');inspect('company-achievement-chart');inspect('company-ppg-chart');
 assert.equal($('manager-headline'),null,'Unselected manager-headline addition is removed');
 window.actualDashboard.showSection('analysis');inspect('movement-chart');assert($('movement-chart').querySelectorAll('g[data-tip]').length<=12);
 inspect('timeline');inspect('breakdown-products-chart');inspect('breakdown-lines-chart');
 if(viewport<700){assert($('breakdown-lines-count').textContent.startsWith('Top 5'));assert($('movement-chart').querySelector('.bridge-key'));}
 // Historical redraw without network/data writes; select known complete comparable pair.
 window.comparisonDashboard.restore({scope:'company',years:[2024,2025],mode:'ytd',month:8,commonMonths:true,metrics:{company:'units',product:'units'}});
 for(const id of ['focus-sales-chart','focus-growth-chart','focus-trend-chart','focus-composition-chart'])inspect(id);
 assert.equal($('historical-contribution-panel').querySelectorAll('article').length,0,'Unified contribution panel has no nested duplicate panels');
 const legend=$('focus-trend-chart').querySelector('.focus-legend');assert(legend.querySelector('svg line[stroke-dasharray]'),'Year patterns visible in legend');
 window.comparisonDashboard.restore({scope:'product',product:'ONDALENZ 8MG',years:[2024,2025],mode:'ytd',month:8,commonMonths:true});inspect('focus-share-chart');assert(!$('historical-scope-chip').hidden);$('clear-historical-product').click();assert($('historical-scope-chip').hidden);assert(!$('focus-company-panel').hidden);
 await window.actualDashboard.apply({...cfg,selection:{...cfg.selection,product:['CALCITRON']}});inspect('single-chart');inspect('single-achievement-chart');inspect('single-ppg-chart');assert(!$('product-scope-chip').hidden);
}
window.comparisonDashboard.restore({scope:'company',years:[2023,2025],mode:'annual',commonMonths:true});assert.equal($('historical-coverage').querySelector('.coverage-alert'),null,'Unselected extra coverage banner is removed; original coverage notes stay');
let calls=0;const old=globalThis.fetch;globalThis.fetch=(...args)=>{calls++;return old(...args)};viewport=360;window.dispatchEvent(new window.Event('resize'));await new Promise(r=>setTimeout(r,450));assert.equal(calls,0,'Resize is presentation only');globalThis.fetch=old;
const html=fs.readFileSync('public/index.html','utf8'),config=JSON.parse(fs.readFileSync('release.config.json'));for(const m of html.matchAll(/(?:src|href)="[^"?]+\.(?:js|css|png)\?v=([^"&]+)/g))assert.equal(m[1],config.assetToken,'Central cache token');
assert.equal(document.querySelector('#comparison h1').textContent,document.querySelector('[data-page="comparison"] span').textContent);
const output=process.env.V63_GEOMETRY_REPORT;if(output)fs.writeFileSync(output,JSON.stringify(evidence,null,2));
console.log('V'+config.version+' readability passed: '+evidence.length+' simulated chart measurements; 1440/1024/768/390/360; company/product, selected scope, original coverage notes, scope clear, unified panel, year patterns and resize without network. Browser screenshots unverified.');
