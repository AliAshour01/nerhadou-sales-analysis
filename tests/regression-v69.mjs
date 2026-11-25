// V69 port of tests/regression.cjs (retired: it drove the V18 DOM — data-global buttons, the app.js product table and comparison charts — that V69 removed).
// Keeps every invariant that still applies, against the real page fixture: monthly/YTD reconciliation with the source, target bases, no invented
// distributor targets, empty selections, HTML escaping, tooltip bounds, multi-select OR/AND, reset, and snapshot refresh.
import './management-ui.mjs';
import assert from 'node:assert/strict';
const $=id=>document.getElementById(id),A=window.actualDashboard,none={product:[],line:[],distributor:[],channel:[]};let passed=0;
const equal=(a,b,l)=>{assert.equal(a,b,l);passed++},near=(a,b,l)=>{assert(Math.abs(a-b)<0.01,l+': '+a+' vs '+b);passed++},ok=(v,l)=>{assert(v,l);passed++};
const go=(over={})=>A.apply({years:[2026],months:[1,2,3,4,5,6,7,8],periodMode:'ytd',targetBasis:'period',selection:none,section:'overview',...over});
const sum=(rows,k)=>rows.reduce((s,r)=>s+(r[k]||0),0),actual=()=>monthlyData().reduce((s,r)=>s+(r.actual||0),0);
await go();const rows=D.rows;equal(D.year,2026,'Latest year loaded');equal(periodMonths().length,8,'Latest month selected dynamically');ok(!$('kpis').textContent.includes('Unable'),'KPIs render');
for(let m=1;m<=8;m++){await go({months:[m],periodMode:'selected'});near(actual(),sum(rows.filter(r=>r.month===m),'units'),'Monthly units '+m);A.setMeasure('value');render();near(actual(),sum(rows.filter(r=>r.month===m),'value'),'Monthly value '+m);A.setMeasure('units');render();
 await go({months:Array.from({length:m},(_,i)=>i+1)});near(actual(),sum(rows.filter(r=>r.month<=m),'units'),'YTD units '+m);}
const P='ZOLMSOLAN 2.5MG';await go({months:[1,2,3],selection:{...none,product:[P]}});equal(actual(),18803,'March YTD units');near(A.target(P,'units'),25000,'March YTD target');near(A.target(P,'value'),1296000,'Value target');
const monthly=JSON.stringify(monthlyData()),svg=$('trend').innerHTML;A.setTargetBasis('annual');equal(JSON.stringify(monthlyData()),monthly,'Annual target cannot affect monthly data');equal($('trend').innerHTML,svg,'Annual target cannot affect monthly chart');near(A.target(P,'units'),100000,'Full-year denominator');equal(actual(),18803,'Annual target leaves actual unchanged');A.setTargetBasis('period');
await go({months:[3],periodMode:'selected',selection:{...none,product:[P]}});equal(actual(),10074,'March single month');equal(monthlyData().length,1,'One selected month only');near(monthlyData()[0].target,100000/12,'Monthly denominator');ok(!$('trend').innerHTML.includes('NaN'),'No NaN');
A.setMeasure('value');render();near(monthlyData()[0].target,432000,'Monthly value target');A.setMeasure('units');render();
await go({selection:{...none,distributor:['IBN SINA']}});equal(unavailableTarget(),true,'No invented distributor targets');ok(/not allocated/.test($('kpis').textContent+$('overview-not-shown').textContent)||!$('kpis').textContent.includes('achievement'),'Target absence explained');
{const other=[...new Set(D.rows.map(r=>r.line))].find(l=>!D.rows.some(r=>r.product===P&&r.line===l));await go({selection:{...none,product:[P],line:[other]}});}ok(!$('kpis').textContent.includes('NaN')&&!$('trend').innerHTML.includes('NaN'),'No NaN in zero-data selection');ok(!$('no-sales').hidden||$('kpis').textContent.includes('No'),'Empty selection visible');
// Tooltip bounds
$('tooltip').getBoundingClientRect=()=>({width:220,height:65});window.innerWidth=globalThis.innerWidth=800;window.innerHeight=globalThis.innerHeight=600;
showTooltip({dataset:{tip:'One tooltip only'}},790,590);equal($('tooltip').textContent,'One tooltip only','Single tooltip text');ok(parseFloat($('tooltip').style.left)<=572,'Tooltip inside right edge');ok(parseFloat($('tooltip').style.top)<=527,'Tooltip inside bottom edge');hideTooltip();equal($('tooltip').style.display,'none','Tooltip hides');
for(const id of ['trend','movement-chart'])ok(!$(id).innerHTML.includes('<title>'),'No native SVG title in '+id);
// Multi-selection: OR within a filter, AND across filters, non-consecutive months, period target counts selected months only
const two=['ZOLMSOLAN 2.5MG','ZOLMSOLAN 5MG'];await go({months:[1,3,5],periodMode:'selected',selection:{...none,product:two}});equal(periodMonths().join(','),'1,3,5','Nonconsecutive month selection');
const exp=rows.filter(r=>two.includes(r.product)&&[1,3,5].includes(r.month));near(actual(),sum(exp,'units'),'Two-product selected-month units');equal(monthlyData().map(r=>r.month).join(','),'1,3,5','Monthly chart includes only selected months');
near(two.reduce((s,p)=>s+A.target(p,'units'),0),two.reduce((s,p)=>s+D.targets[p].monthly*3,0),'Period target covers three months, not five');
await go({months:[1,3,5],periodMode:'selected',selection:{...none,product:two,distributor:['IBN SINA','PHARMA']}});near(actual(),sum(exp.filter(r=>['IBN SINA','PHARMA'].includes(r.distributor)),'units'),'Multiple distributors use OR within a filter');equal(unavailableTarget(),true,'Partial distributor selection cannot fabricate targets');
const lines=[...new Set(rows.map(r=>r.line))].slice(0,2),chans=[...new Set(rows.map(r=>r.channel))].slice(0,2);await go({selection:{...none,line:lines,channel:chans}});near(actual(),sum(rows.filter(r=>lines.includes(r.line)&&chans.includes(r.channel)),'units'),'Line and sales type combine with AND');
// Product names are HTML-escaped in the Products table
await go({section:'portfolio'});ok(!$('details').innerHTML.includes('<img'),'Product names escaped');
// Reset
$('reset').click();await new Promise(setImmediate);const r=A.read();equal(r.periodMode,'ytd','Reset restores YTD');equal(Object.values(r.selection).flat().length,0,'Reset clears every dimension');equal(r.months.length,8,'Reset restores latest YTD');
// Snapshot refresh: horizon follows the data; explicit cutoff survives; a correction flows through; missing months stay unknown
const orig=globalThis.fetch,base=structuredClone(D);let next=null;globalThis.fetch=async(url,...a)=>url.startsWith('/api/snapshot')&&next?{ok:true,status:200,json:async()=>structuredClone(next)}:orig(url,...a);
next={...base,rows:base.rows.filter(r=>r.month<=6)};await window.refreshSalesSnapshot();equal(periodMonths().at(-1),6,'Cutoff through June follows refreshed data');
const jan=base.rows.find(r=>r.month===1);next={...base,rows:[...base.rows,...[9,10,11,12].map(month=>({...jan,month,units:100,value:1000}))]};await window.refreshSalesSnapshot();equal(periodMonths().at(-1),12,'Following latest extends through December');equal(monthlyData().length,12,'Monthly chart receives twelve periods');
await go({months:[1,2,3,4,5,6]});const before=actual();next.rows.find(r=>r.month===1).units+=10;await window.refreshSalesSnapshot();equal(periodMonths().at(-1),6,'Explicit June choice survives refresh');near(actual(),before+10,'A correction flows through the totals');
next={...base,rows:[...base.rows.filter(r=>r.month<=6),{...jan,month:12,units:1,value:10}]};await go({months:[1,2,3,4,5,6,7,8,9,10,11,12]});await window.refreshSalesSnapshot();ok(missingReportingMonths().includes(7),'Unreported months are not zeros');equal(monthlyData().find(r=>r.month===7)?.actual??null,null,'Missing month stays unknown');
globalThis.fetch=orig;
console.log(passed+' V69 regression assertions passed. No source workbook or data snapshot changed.');
