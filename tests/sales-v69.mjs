// V69 unified Sales page acceptance checks in the real DOM fixture (linkedom; no layout engine).
// Ports every V68 (S-xx) check that still applies; layout / screenshot checks live in tests/layout-v69.cjs.
import './management-ui.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checkTicks} from './tick-check.mjs';
import {categoryColor,CATEGORY_COLORS} from '../public/chart-utils.js';
const $=id=>document.getElementById(id),base=window.actualDashboard.read(),none={product:[],line:[],distributor:[],channel:[]},Y=base.snapshot.latestYear;
const cfg=(over={})=>({years:[Y],year:Y,months:[1,2,3,4,5,6,7,8],periodMode:'ytd',targetBasis:'period',selection:none,section:'overview',...over});
const visible=()=>[...$('overview-grid').querySelectorAll('.v69-panel:not([hidden])')].map(p=>p.dataset.panel);
// V72 R-11: unavailable tabs stay in the bar, disabled; "tabs" are the enabled ones.
const tabs=()=>[...document.querySelectorAll('.section-tabs [role="tab"]')].filter(t=>!t.hidden&&t.getAttribute('aria-disabled')!=='true').map(t=>t.dataset.section);
const strip=()=>$('overview-not-shown').hidden?'':$('overview-not-shown').textContent;
// A1 · 2026 YTD Aug, all products
await window.actualDashboard.apply(cfg());
assert.deepEqual(tabs(),['overview','portfolio','forecast']);assert.deepEqual(visible(),['monthly','attention','bridge','mixDistributor','mixChannel','mixLine','priceChanges']); // V80: Price increases (Calcitron, Ferrotron, Vitatron)
{const t=$('kpis').textContent;for(const v of ['21,599,730','22,310,000','97%','710,270','15,476,653','39.6%','33,465,000','65%'])assert(t.includes(v),'KPI shows '+v);assert.equal($('kpis').querySelectorAll('.kpi').length,4);assert($('kpis').querySelector('.pace-marker'))}
assert.equal($('company-ppg-chart'),null,'PPG panel removed');assert.equal(document.querySelector('[id$="-achievement-chart"]'),null);
{const marker=$('trend').querySelector('line.target-marker');assert.equal(marker.getAttribute('stroke'),'var(--ink)');const legend=$('panel-monthly').querySelector('.progress-legend');assert(legend.querySelector('.lg-swatch.over'))}
checkTicks($('movement-chart'),'#movement-chart');// V77 D-03: horizontal bridge from zero: no axis break, every row has its full label.
assert(!$('movement-chart').querySelector('.axis-break'));assert(!/Axis starts at/.test($('movement-chart').textContent));assert(!$('movement-chart').querySelector('.bridge-key'));
// S-35 attention: balanced, ranked, magnitude chips
{const items=[...$('attention-list').querySelectorAll('.attention-item')];assert(items.some(i=>i.dataset.tone==='positive'));assert(items.some(i=>i.dataset.tone==='negative'));const imp=items.map(i=>Number(i.dataset.impact));assert.deepEqual(imp,[...imp].sort((a,b)=>b-a));for(const i of items)assert(i.querySelector('.attention-chip').textContent.trim());assert(items.length<=4,'top 4 then Show all');assert($('view-overview').textContent.includes('do not establish the cause'))}
// S-15 one colour per category everywhere
// V72 R-16: mixes are horizontal bars; each bar carries its category colour.
// V77 D-05: a mix is one series, so every bar is the accent (grey only for Other / not provided).
{const colors=new Set();$('view-overview').querySelectorAll('#distributors [data-mix-color],#company-channels [data-mix-color]').forEach(g=>colors.add(g.dataset.mixColor));assert(colors.size>0);for(const c of colors)assert(['var(--accent)','var(--context)','var(--decrease)'].includes(c),c);assert.equal(categoryColor('NOT PROVIDED'),CATEGORY_COLORS['NOT PROVIDED'])}
// One global Measure toggle
assert.equal(document.querySelectorAll('[data-measure]').length,2);assert.equal(document.querySelector('[data-manager-metric],[data-bd-metric],[data-distributor-metric]'),null,'no per-panel measure toggles');
document.querySelector('[data-measure="value"]').click();assert(/EGP 2,033,569,691/.test($('kpis').textContent));document.querySelector('[data-measure="units"]').click();
// S-20 / 6.1 clicks: a mix slice filters with Undo and no scroll
{let scrolled=0;const orig=window.scrollTo;window.scrollTo=globalThis.scrollTo=()=>scrolled++;const before=JSON.stringify(window.actualDashboard.read().selection),d=$('view-overview').querySelector('[data-mix-focus]');const key=d.dataset.mixFocus,val=d.dataset.key;d.onclick();
 assert.deepEqual(window.actualDashboard.read().selection[key],[val]);assert.equal(scrolled,0);const t=$('undo-toast');assert.equal(t.hidden,false);assert.equal(t.getAttribute('role'),'status');assert(t.textContent.includes('Filtered to '+val));t.querySelector('button').click();assert.equal(JSON.stringify(window.actualDashboard.read().selection),before);window.scrollTo=orig}
// A2 · one product
await window.actualDashboard.apply(cfg({selection:{...none,product:['ONDALENZ 8MG']}}));
assert.deepEqual(tabs(),['overview','forecast']);assert.deepEqual(visible(),['monthly','productFacts','bridge','mixDistributor','mixChannel']);assert.equal($('movement-dimension').value,'month');assert(![...$('movement-dimension').options].some(o=>o.value==='product'),'no 1-bar product bridge');
assert(!document.body.textContent.includes('PRODUCT DETAIL'));assert(!/Viewing:/.test($('sales').textContent));assert(/Average price/.test($('kpis').textContent));assert(/Rank among products/.test($('product-facts').textContent));
// A3 · three products: split by product
await window.actualDashboard.apply(cfg({selection:{...none,product:['ONDALENZ 8MG','CALCITRON','FERROTRON']}}));assert(document.querySelector('[data-monthly-split="on"]'),'Split by product offered');assert(tabs().includes('portfolio'));
// A4 · distributor PHARMA: no-target KPI set, no bare dash, no single-slice donut
await window.actualDashboard.apply(cfg({selection:{...none,distributor:['PHARMA']}}));
for(const card of $('kpis').querySelectorAll('.kpi'))assert.notEqual(card.querySelector('strong').textContent.trim(),'—','no bare dash KPI');assert(/Share of company/.test($('kpis').textContent));assert(!/achievement/i.test($('kpis').textContent));
assert(visible().every(id=>id!=='mixDistributor'),'single distributor is a fact, not a donut');assert(/Only one distributor/.test(strip()));
// A5 · one month: comparison card
await window.actualDashboard.apply(cfg({periodMode:'selected',months:[8]}));assert($('trend').querySelector('.month-card'));assert($('panel-monthly').classList.contains('span-6'));
// A6 · 2025 full year
await window.actualDashboard.apply(cfg({years:[2025],year:2025,months:[1,2,3,4,5,6,7,8,9,10,11,12],periodMode:'full'}));
assert.deepEqual(tabs(),['overview','portfolio']);assert(/Average per month/.test($('kpis').textContent));assert(!/achievement/i.test($('kpis').textContent));assert(document.querySelector('[data-monthly-compare="py"]'));assert.deepEqual([...$('movement-dimension').options].map(o=>o.value).sort(),['month','product'].sort().concat([...$('movement-dimension').options].map(o=>o.value).filter(v=>!['month','product'].includes(v))).sort());assert(![...$('movement-dimension').options].some(o=>o.value==='line'),'2024 has no lines');
// S-03 KPI labels follow the months chosen
await window.actualDashboard.apply(cfg());assert(/YTD achievement/i.test($('kpis').textContent));await window.actualDashboard.apply(cfg({periodMode:'selected',months:[2,5]}));assert(/Selected-period achievement/i.test($('kpis').textContent));
// A7 · 2023: source note, bridge and recorded same-month growth
await window.actualDashboard.apply(cfg({years:[2023],year:2023,months:[1,2,3,4,5,6,7,8,9]}));
assert($('data-health').querySelector('.health-warning'));assert(visible().includes('bridge'));assert(/[▲▼] \d/.test($('kpis').textContent));assert.deepEqual(tabs(),['overview','portfolio']);assert($('trend').querySelector('svg'),'Monthly chart is not empty');
// A8 · 2021–2026: multi-year
const ALL=base.snapshot.availableYears.slice().sort((a,b)=>a-b);
await window.actualDashboard.apply(cfg({years:ALL}));assert.deepEqual(tabs(),['overview','portfolio']);assert(visible().includes('salesByYear')&&visible().includes('monthly')&&visible().includes('bridge'));
{const labels=[...$('sales-by-year').querySelectorAll('g[data-focus-year]')].map(g=>g.textContent);assert(labels.find(t=>t.includes('2023')).includes('%'));assert(labels.find(t=>t.includes('2024')).includes('%'));assert(/2025 → 2026/.test($('kpis').textContent))}
assert($('trend').querySelectorAll('polyline').length>=ALL.length,'one line per year');
// A9 · multi-year one product: Share by year, bridge by month, no Products tab
{const p=window.actualDashboard.translateProducts(['ONDALENZ 8MG'],'multi',Y);await window.actualDashboard.apply(cfg({years:ALL,selection:{...none,product:p}}));assert.deepEqual(tabs(),['overview']);assert(visible().includes('shareByYear'));assert.equal($('movement-dimension').value,'month');assert(/Share of company/.test($('kpis').textContent))}
// A8b · V69.1: with 3+ years selected the KPI cards summarise the whole selected range, not only the previous year.
{const cards=()=>[...$('kpis').querySelectorAll('.kpi')].map(k=>k.textContent.replace(/\s+/g,' ').trim());
await window.actualDashboard.apply(cfg({years:ALL}));let c=cards();assert.equal(c.length,4);
assert(c[1].startsWith('Sales 2021'),'card 2 = first selected year');assert(c[2].startsWith('Change 2021 → 2026')&&c[2].includes('+13,357,562'),'change first → last');assert(c[2].includes('vs 2025: +6,123,077'),'previous-year change kept as subtitle');
assert(c[3].startsWith('Avg yearly growth 2021 → 2026')&&c[3].includes('+21.2%')&&c[3].includes('Total +162.1% over 5 years')&&c[3].includes('2025 → 2026: +39.6%'),'CAGR + total + last-year growth');
const p=window.actualDashboard.translateProducts(['ONDALENZ 8MG'],'multi',Y);await window.actualDashboard.apply(cfg({years:ALL,selection:{...none,product:p}}));c=cards();
assert(/was [\d.]+% in 2021/.test(c[1])&&c[1].startsWith('Share of company 2026'),'one product: share vs first year');assert(c[2].includes('Change 2021 → 2026')&&c[2].includes('+1,089,160'));assert(c[3].includes('Avg yearly growth 2021 → 2026')&&c[3].includes('+60.0%')&&c[3].includes('2025 → 2026: +100.9%'));
// A range starting in 2023 uses the recorded 2023 baseline.
await window.actualDashboard.apply(cfg({years:[2023,2024,2025,2026]}));c=cards();assert(c[1].startsWith('Sales 2023'));assert(c[3].includes('2023 → 2026'));
// 2023 can also be used as the previous-year comparison inside the range.
await window.actualDashboard.apply(cfg({years:[2022,2023,2024],year:2024}));c=cards();assert(c[2].startsWith('Change 2022 → 2024')&&/vs 2023: [−+]\d/.test(c[2]));assert(/2023 → 2024: [−+]\d/.test(c[3]));
// Two selected years keep the plain pair comparison; single year is unchanged.
await window.actualDashboard.apply(cfg({years:[2025,2026]}));c=cards();assert(c[1].startsWith('Sales 2025'));assert(c[3].startsWith('Growth 2025 → 2026')&&c[3].includes('+39.6%'));assert(!/Avg yearly growth/.test(c.join(' ')));
await window.actualDashboard.apply(cfg());assert(!/Avg yearly growth|Change 20/.test($('kpis').textContent));}
// A10 · 2025+2026 Line: Gyn line works for both years; Line disabled for 2021–2024
await window.actualDashboard.apply(cfg({years:[2025,2026],selection:{...none,line:['Gyn line']}}));assert.deepEqual(window.actualDashboard.read().selection.line,['Gyn line']);assert(/Gyn line/.test($('page-subtitle').textContent));
await window.actualDashboard.apply(cfg({years:[2021,2022,2023,2024]}));assert(document.querySelector('[data-multi="line"]').classList.contains('not-recorded'));assert(/Not recorded for 2021–2024/.test($('line-summary').textContent));
// A11 · 2022+2023 full-year request compares the nine shared months by default.
await window.actualDashboard.apply(cfg({years:[2022,2023],year:2023,months:[1,2,3,4,5,6,7,8,9,10,11,12],periodMode:'full'}));assert(visible().includes('bridge'));assert($('kpis').textContent.includes('Growth 2022 → 2023'));assert.deepEqual(window.actualDashboard.context().droppedMonths,[10,11,12]);
// S-11 filters: chips, reset, summary
await window.actualDashboard.apply(cfg());assert.equal($('reset').hidden,true,'Reset hidden at defaults');
await window.actualDashboard.apply(cfg({selection:{product:['CALCITRON','ZINCTRON','FERROTRON','ONDALENZ 8MG'],line:[],distributor:['PHARMA'],channel:[]}}));assert($('active-filters').textContent.includes('Products: CALCITRON, ZINCTRON +2'));assert($('active-filters').textContent.includes('Distributor: PHARMA'));assert.equal($('reset').hidden,false);
assert.equal($('filter-summary-text').textContent,Y+' · YTD Aug · CALCITRON +3 · 1 filter');$('active-filters').querySelector('[data-clear-filters]').click();assert.equal(window.actualDashboard.read().selection.distributor.length,0);
// S-18 Products table: pinned Total = KPI, inline share bars, top 15 + Show all, search
await window.actualDashboard.apply(cfg({section:'portfolio'}));{const total=$('details').querySelector('tr.pinned-total');assert(total.textContent.includes('21,599,730'));assert($('details').querySelector('.sales-bar'));assert(/^15 of 64 products/.test($('rowcount').textContent));assert($('pt-more').querySelector('[data-pt-all="on"]'));
 for(const td of $('details').querySelectorAll('td'))if(td.textContent.trim()==='—')assert(td.getAttribute('title')?.length>8,'— has a reason');
 $('search').value='calci';$('search').oninput();await new Promise(r=>setTimeout(r,220));const [a,b]=$('rowcount').textContent.match(/^(\d+) of (\d+)/).slice(1).map(Number);assert(a>=1&&a<b);assert.equal($('search-clear').hidden,false);$('search').value='';$('search').oninput();await new Promise(r=>setTimeout(r,220))}
// S-19 forecast vs FY target, required pace, cumulative path
await window.actualDashboard.apply(cfg({section:'forecast'}));{const fy=33465000,ytd=21599730;const gaps=[...$('view-forecast').querySelectorAll('.forecast-vs-line')];assert.equal(gaps.length,2);const need=Number($('forecast-required').querySelector('[data-required]').dataset.required);assert(Math.abs(need*4-(fy-ytd))<1);for(const c of ['fc-actual','fc-runrate','fc-seasonal','fc-target'])assert($('forecast-chart').querySelector('.'+c),c)}
// 4.9: no targets (PHARMA) → no Required card, reason in the strip
await window.actualDashboard.apply(cfg({section:'forecast',selection:{...none,distributor:['PHARMA']}}));assert($('fc-required').hidden);assert(/Required to hit target/.test($('forecast-not-shown').textContent));
// S-33 data notes one click away
await window.actualDashboard.apply(cfg());{const link=$('data-health').querySelector('[data-open-notes]');assert(link);link.onclick();assert($('sales-data-notes').open);$('sales-data-notes').open=false}
// S-30 contrast tokens and grey text
{const lum=h=>{const v=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(c=>c<=.03928?c/12.92:((c+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2]},ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05)},greyish=h=>{const v=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));return Math.max(...v)-Math.min(...v)<64};
 for(const f of ['app','management','products-table'])for(const m of fs.readFileSync(`public/${f}.js`,'utf8').matchAll(/<text\b[^>]*fill="(#[0-9a-fA-F]{6})"/g))if(greyish(m[1]))assert(ratio(m[1],'#ffffff')>=4.5,f+' svg text '+m[1]);
 for(const f of ['tokens','app'])for(const m of fs.readFileSync(`public/${f}.css`,'utf8').matchAll(/(?<![-\w])color:\s*(#[0-9a-fA-F]{6})\b/g))if(greyish(m[1])&&ratio(m[1],'#ffffff')>1.6)assert(ratio(m[1],'#eef2f7')>=4.5,f+'.css color '+m[1])}
// S-37 / 6.3 state in the URL
{const pushes=history.pushes;window.actualDashboard.showSection('portfolio');assert(location.search.includes('tab=products'));assert(history.pushes>pushes);await window.actualDashboard.apply(cfg({section:'portfolio',selection:{...none,distributor:['PHARMA']}}));const q=new URLSearchParams(location.search);assert(q.getAll('d').includes('PHARMA'));assert.equal(q.get('years'),String(Y));assert.equal(q.get('through'),'8')}
// S-36 loading / error / freshness
{const html=fs.readFileSync('public/index.html','utf8'),app=fs.readFileSync('public/app.js','utf8');assert.equal((html.match(/class="kpi skeleton"/g)||[]).length,4);assert(app.includes('id="load-retry"')&&app.includes('initialLoad()'))}
// S-32 every chart has a Table view whose rows equal the tooltips
await window.actualDashboard.apply(cfg());for(const [section,ids] of [['overview',['trend','distributors','company-channels','movement-chart']],['forecast',['forecast-chart']]]){window.actualDashboard.showSection(section);for(const id of ids){const btn=document.querySelector(`[data-chart-table="${id}"]`);assert(btn,id+' toggle');btn.onclick();assert.equal(btn.getAttribute('aria-pressed'),'true');assert($(id).hidden);assert($(id+'-table').querySelector('caption'));btn.onclick();assert.equal($(id).hidden,false)}}
await window.actualDashboard.apply(cfg());
console.log('Sales V69 checks passed: A1–A11 states, KPI sets, Products table, Forecast rules, clicks, URL, contrast, table views.');
