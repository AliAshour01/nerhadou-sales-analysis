import fs from 'node:fs';import assert from 'node:assert/strict';
import {effectiveRecords} from '../public/data-core.js';
import {summarize,deltaBetween,compareProducts,monthlyComparison,monthsFor,comparisonProduct} from '../public/compare-core.js';
const seed=JSON.parse(fs.readFileSync('private/seed.json')),records=effectiveRecords(seed),eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++},near=(a,b,m)=>{assert(Math.abs(a-b)<.01,m+': '+a+' vs '+b);checks++};let checks=0;
eq(monthsFor('ytd',3),[1,2,3],'YTD range');eq(monthsFor('month',8,[3,1,3,12,0]),[1,3,12],'Selected months de-duplicated');eq(monthsFor('annual').length,12,'Full year');
near(summarize(records,{year:2021,mode:'annual',metric:'units'}).total,12830318.083333334,'2021 annual units');
near(summarize(records,{year:2021,mode:'annual',metric:'value'}).total,451707406.27625,'2021 annual value');
const y21=summarize(records,{year:2021,mode:'ytd',month:12,metric:'units'});eq(y21.partial,false,'2021 confirmed blanks not missing');eq(y21.estimated,0,'2021 units not estimated');
const annual22=summarize(records,{year:2022,mode:'annual',metric:'units'});near(annual22.total,13187615.1,'2022 full year uses monthly sales, not wrong control');eq(annual22.annual,false,'2022 annual selects 12 months');
const units25=summarize(records,{year:2025,mode:'annual',metric:'units'});near(units25.total,27628835,'2025 actual units now complete');eq(units25.partial,false,'2025 units coverage complete');
const value25=summarize(records,{year:2025,mode:'annual',metric:'value'});near(value25.total,records.filter(r=>r.year===2025&&r.dataset==='actual'&&r.month>0).reduce((n,r)=>n+r.value,0),'2025 full-year follows monthly sales; annual rounding control remains separate');eq(value25.estimated,0,'2025 value reported');
near(summarize(records,{year:2024,mode:'annual',metric:'value'}).total,1767914132.5928493,'New 2024 annual source');
near(summarize(records,{year:2024,mode:'ytd',month:12,metric:'units'}).total,23058463,'2024 monthly units reconcile');
near(summarize(records,{year:2024,mode:'ytd',month:12,metric:'value'}).total,1767914132.5928493,'2024 estimated values reconcile');
const noest=summarize(records,{year:2024,mode:'ytd',month:8,metric:'value',includeEstimates:false});eq(noest.total,null,'Excluded estimates not turned into zero');
const one=summarize(records,{year:2024,mode:'month',selected:[4],metric:'units'}),manual=records.filter(r=>r.year===2024&&r.dataset==='actual'&&r.month===4).reduce((s,r)=>s+r.units,0);near(one.total,manual,'Single month selection');
const two=summarize(records,{year:2024,mode:'month',selected:[1,4,4],metric:'units'});near(two.total,records.filter(r=>r.year===2024&&r.dataset==='actual'&&[1,4].includes(r.month)).reduce((s,r)=>s+r.units,0),'Non-consecutive months once each');
eq(summarize(records,{year:2024,mode:'month',selected:[],metric:'units'}).empty,true,'Empty month selection');
eq(summarize(records,{year:2026,mode:'annual',metric:'units'}).partial,true,'2026 FY never represented as complete');
eq(summarize(records,{year:2026,mode:'ytd',month:8,metric:'units'}).partial,false,'Complete current-year reporting months');
eq(summarize(records,{year:2026,mode:'ytd',month:9,metric:'units'}).partial,true,'Missing September detected');
const review23=summarize(records,{year:2023,mode:'ytd',month:12,metric:'units'});eq(review23.review,true,'2023 review required');eq(deltaBetween(review23,y21).growth,null,'No growth on conflicting source scope');
eq(deltaBetween({...units25,total:null},y21).delta,null,'No delta on missing units');
eq(deltaBetween({...y21,total:0},y21).growth,null,'Zero baseline not divided');eq(deltaBetween({...y21,total:-10},y21).growth,null,'Negative baseline not growth');near(deltaBetween({...y21,total:100},{...y21,total:120}).growth,20,'Growth math');near(deltaBetween({...y21,total:100},{...y21,total:80}).delta,-20,'Signed decline');
const movers=compareProducts(records,{a:2024,b:2026,mode:'ytd',month:8,metric:'units',products:['ONDALENZ 8MG'],includeEstimates:true});eq(movers.length,1,'Exact selected product');eq(movers[0].product,'ONDALENZ 8MG','Strength mapping stable');
const absent=summarize(records,{year:2021,mode:'annual',metric:'units',products:['NONEXISTENT']});eq(absent.total,null,'Absent product is unknown');eq(deltaBetween(absent,y21).growth,null,'Absent product no fake launch growth');
eq(monthlyComparison(records,{a:2024,b:2026,mode:'month',selected:[1,4,8],metric:'units'}).map(r=>r.month),[1,4,8],'Monthly charts respect selected periods');
eq(records.some(r=>r.year===2025&&r.dataset==='actual'&&r.source.includes('Total 2025 Updated')),false,'Rejected 2025 excluded');
// No cross-scope residual allocation; Jan-Sep remains separate from FY.
eq(records.filter(r=>r.year===2023&&r.dataset==='actual'&&r.month>9).length,0,'2023 no unsupported Q4');
eq(records.filter(r=>r.year===2023&&r.dataset==='actual'&&r.month>0&&r.estimated.includes('units')).length,0,'2023 observed units only');
const methyl=records.filter(r=>r.year===2023&&r.dataset==='actual'&&r.month>0&&r.product.startsWith('METHYLTECHNO')&&r.product.includes('30'));
near(methyl.filter(r=>r.channel==='PRIVATE').reduce((n,r)=>n+r.units,0),3104037,'Methyl private Jan-Sep retained');
near(methyl.filter(r=>r.channel==='HOSPITALS / UPA').reduce((n,r)=>n+r.units,0),2013007,'Methyl UPA separately retained');
for(const a of records.filter(r=>r.year===2025&&r.dataset==='actual'&&r.month===0)){const ms=records.filter(r=>r.series_id===a.series_id&&r.month>0);eq(ms.length,12,'2025 twelve months');near(ms.reduce((n,r)=>n+r.units,0),a.units,'2025 per-line product units reconcile');}
for(let month=1;month<=12;month++){const m=summarize(records,{year:2025,mode:'month',selected:[month],metric:'units'});eq(m.partial,false,'2025 every month complete');}
// Source 2024 values must reconcile per source row, not merely company total.
for(const a of records.filter(r=>r.year===2024&&r.month===0&&r.dataset==='actual'))near(records.filter(r=>r.series_id===a.series_id&&r.month>0).reduce((s,r)=>s+(r.value??0),0),a.value,'2024 per-row value reconciliation');
const html=fs.readFileSync('public/index.html','utf8'),ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
for(const file of ['comparison.js','data-manager.js'])for(const m of fs.readFileSync('public/'+file,'utf8').matchAll(/\$\('([^']+)'\)/g))eq(ids.has(m[1]),true,'UI target '+m[1]+' exists');
console.log(checks+' comparison/source assertions passed');
