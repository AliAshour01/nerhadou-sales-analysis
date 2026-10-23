import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildFocusComparison,comparisonCSV} from '../public/focus-comparison-core.js';
import {effectiveRecords} from '../public/data-core.js';
import {comparisonProduct} from '../public/compare-core.js';
const row=(product,year,month,units,value,extra={})=>({dataset:'actual',product,comparison_product:product,series_id:product+year,year,month,units,value,...extra});
// Explicit Tender source sales retain their own historical identity across years.
const tenderRows=[
 row('SPASULANCE',2025,1,100,1000,{coverage:'reporting-month'}),
 row('SPASULANCE - Tender',2025,1,10,100,{comparison_product:'SPASULANCE',channel:'TENDER',coverage:'reporting-month'}),
 row('SPASULANCE',2026,1,120,1200,{coverage:'reporting-month'}),
 row('SPASULANCE - Tender',2026,1,15,150,{comparison_product:'SPASULANCE',channel:'TENDER',coverage:'reporting-month'}),
];
const tenderSettings={years:[2025,2026],mode:'month',selected:[1],growthBasis:'calendar'};
for(const metric of ['units','value']){
 const regular=buildFocusComparison(tenderRows,{...tenderSettings,metric,scope:'product',product:'SPASULANCE'});
 const tender=buildFocusComparison(tenderRows,{...tenderSettings,metric,scope:'product',product:'SPASULANCE - TENDER'});
 assert.deepEqual(regular.cells.map(c=>c.sales.total),metric==='units'?[100,120]:[1000,1200]);
 assert.deepEqual(tender.cells.map(c=>c.sales.total),metric==='units'?[10,15]:[100,150]);
 assert.equal(regular.cells[1].ppg,20);assert.equal(tender.cells[1].ppg,50);
 const company=buildFocusComparison(tenderRows,{...tenderSettings,metric,scope:'company'});
 assert.deepEqual(company.composition.items.map(r=>r.name),['SPASULANCE','SPASULANCE - TENDER']);
 assert.equal(company.cells[1].sales.total,regular.cells[1].sales.total+tender.cells[1].sales.total);
 if(metric==='value')assert(Math.abs(regular.cells[1].share+tender.cells[1].share-100)<1e-9);
}
assert.equal(comparisonProduct({product:'Spasulance-Tender',comparison_product:'SPASULANCE'}),'SPASULANCE - TENDER');
assert.equal(comparisonProduct({product:'SPASULANCE',comparison_product:'SPASULANCE',channel:'TENDER'}),'SPASULANCE - TENDER');
assert.equal(comparisonProduct({product:'SPASULANCE - TENDER',channel:'TENDER'}),'SPASULANCE - TENDER');
assert.equal(comparisonProduct({product:'SPASULANCE',channel:'HOSPITALS'}),'SPASULANCE','Hospitals are not inferred to be Tender');
const noTenderBaseline=buildFocusComparison(tenderRows.slice(2),{...tenderSettings,metric:'units',scope:'product',product:'SPASULANCE - TENDER'});
assert.equal(noTenderBaseline.cells[0].sales.total,null);assert.equal(noTenderBaseline.cells[1].ppg,null,'Regular sales cannot supply a missing Tender baseline');
const rr=[row('A',2021,1,10,100),row('B',2021,1,20,300),row('A',2022,1,15,200),row('B',2022,1,25,600),row('A',2024,1,30,300),row('B',2024,1,40,700),row('A',2025,1,40,600),row('B',2025,1,50,900)];
const settings={scope:'company',product:'A',metric:'units',years:[2021,2022,2024,2025],mode:'month',selected:[1],growthBasis:'calendar'};
let m=buildFocusComparison(rr,settings);
assert.deepEqual(m.cells.map(c=>c.sales.total),[30,40,70,90],'Company ignores the saved product choice');
assert(Math.abs(m.cells[1].ppg-100/3)<1e-9);assert.equal(m.cells[2].ppg,null,'Missing prior calendar year is not replaced by prior selected year');
assert.equal(m.composition.items.reduce((s,r)=>s+r.total,0),90,'Composition reconciles to company amount');
m=buildFocusComparison(rr,{...settings,scope:'product',metric:'value'});assert.deepEqual(m.cells.map(c=>c.sales.total),[100,200,300,600]);assert.deepEqual(m.cells.map(c=>c.share),[25,25,30,40]);assert.equal(m.cells[3].ppg,100);assert.equal(m.composition,null);
m=buildFocusComparison(rr,{...settings,scope:'product',metric:'units',years:[2021,2025],growthBasis:'selected'});assert.equal(m.cells[0].ppg,null);assert.equal(m.cells[1].priorYear,2021);assert.equal(m.cells[1].ppg,300);assert.equal(m.cells[1].share,null,'V% is a value measure, not units');
m=buildFocusComparison(rr,{...settings,scope:'product',product:'unknown'});assert(m.cells.every(c=>c.sales.total==null));
m=buildFocusComparison([...rr,row('C',2025,1,3,null)],{...settings,scope:'product',metric:'value',years:[2025]});assert.equal(m.cells[0].share,null,'Incomplete denominator suppresses V%');
m=buildFocusComparison([...rr,row('A',2023,1,25,250)],{...settings,years:[2023,2024]});assert(m.cells.every(c=>c.ppg!=null),'Confirmed 2023 monthly scope permits growth through September');
const beyondSep=buildFocusComparison([...rr,row('A',2023,1,25,250)],{...settings,years:[2023,2024],mode:'ytd',month:10});assert(beyondSep.cells.every(c=>c.ppg==null),'2023 approval does not extend into Q4');
m=buildFocusComparison(rr,{...settings,mode:'annual',years:[2025]});assert.equal(m.cells[0].sales.partial,true,'One monthly amount is not a full year');assert.equal(m.cells[0].ppg,null);
const adjusted=[row('A',2025,1,-10,-100),row('B',2025,1,20,1100)];m=buildFocusComparison(adjusted,{...settings,scope:'product',metric:'value',years:[2025]});assert.equal(m.cells[0].share,-10,'Signed adjustments retained');
const csv=comparisonCSV(m,'Jan');assert(csv.includes('2025 Value (EGP)'));assert(csv.includes('V% of company value'));assert(csv.includes('-100'));assert(csv.includes('PPG% vs 2024'));
const seed=JSON.parse(fs.readFileSync('private/seed.json')),records=effectiveRecords(seed);
m=buildFocusComparison(records,{...settings,years:[2024,2025,2026],mode:'ytd',month:8,metric:'value'});assert(m.cells.every(c=>c.sales.total>0));assert.equal(m.cells[1].sales.estimated,0);assert.equal(m.cells[2].sales.partial,false);assert(Math.abs(m.composition.items.reduce((s,r)=>s+r.total,0)-m.cells[2].sales.total)<.01);
m=buildFocusComparison(records,{...settings,years:[2025],mode:'annual'});assert.equal(m.cells[0].sales.total,27628835);
m=buildFocusComparison(records,{...settings,scope:'product',product:'ONDALENZ 8MG',metric:'value',years:[2025,2026],mode:'ytd',month:8});assert(m.cells.every(c=>c.sales.total>0));assert(m.cells.every(c=>c.share>0&&c.share<100));assert.equal(m.monthly[0].months.length,8);
console.log('Focus model passed: company/product isolation, units/value, both growth bases, V%, incomplete periods, 2023 scope, signed adjustments, export and live 2025/2026 reconciliation');
for(const month of [8,9]){
 const allowed=buildFocusComparison(records,{...settings,scope:'company',metric:'units',years:[2022,2023,2024],mode:'ytd',month});assert(allowed.cells.every(c=>c.ppg!=null),'Owner-approved units growth through '+month);assert.equal(allowed.cells[0].sales.ignored,7);
}
const companyValue=buildFocusComparison(records,{...settings,scope:'company',metric:'value',years:[2022,2023,2024],mode:'ytd',month:9});assert(companyValue.cells.every(c=>c.ppg!=null));assert(companyValue.cells[1].knownTotalGrowth);assert(companyValue.cells[2].knownTotalGrowth);assert(companyValue.cells[1].sales.partial,'Missing pack values remain identified; totals are not fabricated');
const full2023=buildFocusComparison(records,{...settings,scope:'company',metric:'units',years:[2023,2024],mode:'annual'});assert(full2023.cells.every(c=>c.ppg==null));
const q42023=buildFocusComparison(records,{...settings,scope:'company',years:[2023,2024],mode:'month',selected:[10]});assert(q42023.cells.every(c=>c.ppg==null));
console.log('Owner-approved coverage passed: 2022 seven cells ignored, 2023 Jan–Sep enabled, company-value approximation explicit, annual and Q4 restrictions retained');
for(const metric of ['units','value']){
 const all=buildFocusComparison(records,{...settings,scope:'company',metric,years:[2024,2025,2026],mode:'ytd',month:8,compositionYear:'all'});
 assert.equal(all.composition.year,'all');assert.equal(all.composition.years.length,3);
 assert(Math.abs(all.composition.sales.total-all.cells.reduce((n,c)=>n+c.sales.total,0))<.01,'All years sum selected periods once');
 assert(Math.abs(all.composition.items.reduce((n,r)=>n+(r.total??0),0)-all.composition.sales.total)<.01,'All product contributions reconcile');
 assert(all.composition.items.length>8);assert(!all.composition.items.some(r=>r.name.startsWith('Other products (')));
 assert(Math.abs(all.composition.items.reduce((n,r)=>n+(r.share??0),0)-100)<.00001,'All shares reconcile to 100% for both measures');
 for(let i=1;i<all.composition.items.length;i++)assert((all.composition.items[i-1].total??-Infinity)>=(all.composition.items[i].total??-Infinity));
 assert.equal(all.composition.items[0].rank,1);
}
console.log('Full product ranking passed: all-years periods, no top-N cutoff, ordering/rank, units/value shares and total reconciliation');
