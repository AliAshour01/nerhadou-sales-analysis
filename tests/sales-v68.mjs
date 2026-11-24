// V68 Sales UX acceptance checks in the real DOM fixture (linkedom; no layout engine). Browser-only checks live in the PR.
import './management-ui.mjs';
import assert from 'node:assert/strict';
import {checkTicks} from './tick-check.mjs';
const $=id=>document.getElementById(id),base=window.actualDashboard.read();
const cfg=(over={})=>({year:base.snapshot.year,months:[1,2,3,4,5,6,7,8],periodMode:'ytd',targetBasis:'period',selection:{product:[],line:[],distributor:[],channel:[]},section:'overview',...over});
// S-01 movement ticks
await window.actualDashboard.apply(cfg({section:'analysis'}));checkTicks($('movement-chart'),'#movement-chart');checkTicks($('breakdown-products-chart'),'#breakdown-products-chart (dashboard)');
// S-03 KPI labels follow the months chosen
await window.actualDashboard.apply(cfg({year:2024,months:[1,2,3,4,5,6,7,8,9,10,11,12]}));assert(/Full-year target/i.test($('kpis').textContent));assert(!/YTD target/i.test($('kpis').textContent),'2024 full year is not YTD');
await window.actualDashboard.apply(cfg());assert(/YTD target/i.test($('kpis').textContent));
await window.actualDashboard.apply(cfg({periodMode:'selected',months:[2,5]}));assert(/Selected-period target/i.test($('kpis').textContent));
// S-04 every — has a reason (PHARMA distributor view)
await window.actualDashboard.apply(cfg({selection:{product:[],line:[],distributor:['PHARMA'],channel:[]}}));
for(const card of $('kpis').querySelectorAll('.kpi')){const value=card.querySelector('strong')?.textContent.trim(),note=card.querySelector('small')?.textContent||'';if(value==='—')assert(note.length>10&&!/Provisional target/.test(note)&&note!=='—',`— KPI needs a reason: ${card.textContent}`)}
assert(!/Provisional target/.test($('kpis').textContent)||/\d/.test($('kpis').textContent),'Provisional target only beside a value');
window.actualDashboard.showSection('portfolio');for(const td of $('details').querySelectorAll('td'))if(td.textContent.trim()==='—')assert(td.getAttribute('title')?.length>10,'Portfolio — has a reason');
console.log('Sales V68 checks passed.');
