// V68 Sales UX acceptance checks in the real DOM fixture (linkedom; no layout engine). Browser-only checks live in the PR.
import './management-ui.mjs';
import assert from 'node:assert/strict';
import {checkTicks} from './tick-check.mjs';
const $=id=>document.getElementById(id),base=window.actualDashboard.read();
const cfg=(over={})=>({year:base.snapshot.year,months:[1,2,3,4,5,6,7,8],periodMode:'ytd',targetBasis:'period',selection:{product:[],line:[],distributor:[],channel:[]},section:'overview',...over});
// S-01 movement ticks
await window.actualDashboard.apply(cfg({section:'analysis'}));checkTicks($('movement-chart'),'#movement-chart');checkTicks($('breakdown-products-chart'),'#breakdown-products-chart (dashboard)');
// S-03 KPI labels follow the months chosen
await window.actualDashboard.apply(cfg({year:2024,months:[1,2,3,4,5,6,7,8,9,10,11,12]}));assert(/Full-year achievement/i.test($('kpis').textContent));assert(!/YTD achievement/i.test($('kpis').textContent),'2024 full year is not YTD');
await window.actualDashboard.apply(cfg());assert(/YTD achievement/i.test($('kpis').textContent));
await window.actualDashboard.apply(cfg({periodMode:'selected',months:[2,5]}));assert(/Selected-period achievement/i.test($('kpis').textContent));
// S-04 every — has a reason (PHARMA distributor view)
await window.actualDashboard.apply(cfg({selection:{product:[],line:[],distributor:['PHARMA'],channel:[]}}));
for(const card of $('kpis').querySelectorAll('.kpi')){const value=card.querySelector('strong')?.textContent.trim(),note=card.querySelector('small')?.textContent||'';if(value==='—')assert(note.length>10&&!/Provisional target/.test(note)&&note!=='—',`— KPI needs a reason: ${card.textContent}`)}
assert(!/Provisional target/.test($('kpis').textContent)||/\d/.test($('kpis').textContent),'Provisional target only beside a value');
window.actualDashboard.showSection('portfolio');for(const td of $('details').querySelectorAll('td'))if(td.textContent.trim()==='—')assert(td.getAttribute('title')?.length>10,'Portfolio — has a reason');
// S-10 header
await window.actualDashboard.apply(cfg());assert.equal($('sales').querySelector('.heading .eyebrow'),null);assert.equal($('period-explanation'),null);assert($('sales').querySelector('.heading .manager-actions #meeting-open'),'actions on the H1 row');assert($('data-health').textContent.includes('Actual data Jan–Aug '+base.snapshot.year),'month range in health strip');assert($('data-health').querySelector('.target-definition'),'provisional targets ⓘ in strip');
for(const id of ['saved-view','view-name','save-view','delete-view','share-view','meeting-open'])assert($(id),id+' reachable');
// S-11 filters
const years=[...$('actual-year').querySelectorAll('option')].map(o=>o.textContent);assert.equal(years[0],base.snapshot.latestYear+' (latest)');assert.equal(new Set(years.map(y=>y.slice(0,4))).size,years.length,'no duplicate year');
await window.actualDashboard.apply(cfg());assert.equal($('reset').hidden,true,'Reset hidden at defaults');assert.equal($('reset').textContent,'Reset filters');
await window.actualDashboard.apply(cfg({selection:{product:['CALCITRON','ZINCTRON','FERROTRON','ONDALENZ 8MG'],line:[],distributor:['PHARMA'],channel:[]}}));
assert($('active-filters').textContent.includes('Products: CALCITRON, ZINCTRON +2'));assert($('active-filters').textContent.includes('Distributor: PHARMA'));assert($('active-filters').querySelector('[data-clear-filters]'));assert.equal($('reset').hidden,false);
assert.equal($('filter-summary-text').textContent,base.snapshot.year+' · YTD Aug · CALCITRON +3 · 1 filter');
$('active-filters').querySelector('[data-clear-filters]').click();assert.equal(window.actualDashboard.read().selection.distributor.length,0);
// S-12 four cards equal V67 figures for 2026 YTD Aug
await window.actualDashboard.apply(cfg());{const t=$('kpis').textContent;for(const v of ['21,599,730','22,310,000','97%','710,270','15,476,653','39.6%','33,465,000','65%'])assert(t.includes(v),'KPI shows '+v);assert.equal($('kpis').querySelectorAll('.kpi').length,4);assert($('kpis').querySelector('.pace-marker'));assert(/On pace|Ahead|Behind/.test(t));assert($('kpis').querySelector('[data-kpi="achievement"]').dataset.status==='warn','97% is amber')}
console.log('Sales V68 checks passed.');
