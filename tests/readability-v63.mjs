// Behavioral/geometry evidence only (linkedom, simulated card widths). Browser screenshots live in tests/layout-v69.cjs.
import './management-ui.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';
const $=id=>document.getElementById(id);let viewport=390;
const width=()=>viewport<700?viewport-64:viewport<1100?viewport-80:Math.floor((viewport-300)/2)-32;
window.HTMLElement.prototype.getBoundingClientRect=function(){return {width:width(),height:300,x:0,y:0,left:0,right:width(),top:0,bottom:300}};
const none={product:[],line:[],distributor:[],channel:[]},cfg=(over={})=>({years:[2026],months:[1,2,3,4,5,6,7,8],periodMode:'ytd',targetBasis:'period',selection:none,section:'overview',...over});
window.nerhadouSecurity.me={user:{role:'owner',status:'active'}};
const evidence=[];
function inspect(id){const svg=$(id).querySelector('svg.responsive-plot');assert(svg,id+' SVG');const box=svg.getAttribute('viewBox').split(' ').map(Number);assert(box[2]>=260,id+' min width');assert(box[3]>=150,id+' height');const sizes=[...svg.querySelectorAll('text')].map(t=>Number(t.getAttribute('font-size')||12));assert(sizes.every(s=>s>=11),id+' font >=11px');evidence.push({viewport,chart:id,width:box[2],height:box[3],minimumFont:Math.min(...sizes)});}
for(viewport of [1440,1024,768,390,360]){
 await window.actualDashboard.apply(cfg());inspect('trend');inspect('movement-chart');assert($('movement-chart').querySelectorAll('g[data-tip]').length<=12,'Bridge bounded');
 assert.equal($('manager-headline'),null,'Unselected manager-headline addition is removed');
 await window.actualDashboard.apply(cfg({years:[2024,2025,2026]}));inspect('sales-by-year');inspect('trend');
 await window.actualDashboard.apply(cfg({years:[2025,2026],selection:{...none,product:['ONDALENZ 8MG']}}));inspect('trend');
 await window.actualDashboard.apply(cfg({selection:{...none,product:['CALCITRON']}}));inspect('trend');assert($('product-facts'),'Product facts panel');
}
let calls=0;const old=globalThis.fetch;globalThis.fetch=(...args)=>{calls++;return old(...args)};viewport=360;window.dispatchEvent(new window.Event('resize'));await new Promise(r=>setTimeout(r,450));assert.equal(calls,0,'Resize is presentation only');globalThis.fetch=old;
const html=fs.readFileSync('public/index.html','utf8'),config=JSON.parse(fs.readFileSync('release.config.json'));for(const m of html.matchAll(/(?:src|href)="[^"?]+\.(?:js|css|png)\?v=([^"&]+)/g))assert.equal(m[1],config.assetToken,'Central cache token');
assert.equal(document.querySelector('#sales h1').textContent,document.querySelector('[data-page="sales"] span').textContent,'Page title matches sidebar name');
const output=process.env.V63_GEOMETRY_REPORT;if(output)fs.writeFileSync(output,JSON.stringify(evidence,null,2));
console.log('V'+config.version+' readability passed: '+evidence.length+' simulated chart measurements at 1440/1024/768/390/360; company, multi-year, one product; resize without network; central cache token. Browser screenshots: tests/layout-v69.cjs.');
