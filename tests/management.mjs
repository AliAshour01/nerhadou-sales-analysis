import assert from 'node:assert/strict';
import fs from 'node:fs';
import {effectiveRecords,snapshotFrom,previewImport,applyImport} from '../public/data-core.js';
import {comparableSummary,changeBetween,movement,commonAvailableMonths,targetSum,portfolioTarget,runRateProjection,stockReadiness,scopeRecords} from '../public/management-core.js';
const row=(product,year,month,units,value,extra={})=>({id:`${product}-${year}-${month}`,series_id:product,product,product_id:product,year,month,dataset:'actual',units,value,line:'L1',distributor:'D1',channel:'PRIVATE',coverage:'reporting-month',...extra});
const rows=[row('A',2025,1,100,1000),row('A',2026,1,150,1800),row('B',2025,1,200,2000),row('B',2026,1,180,1800)];
const model=movement(rows,{a:2025,b:2026,months:[1],metric:'units'});assert.equal(model.delta,30);assert.equal(model.items.reduce((s,r)=>s+r.delta,0),30);assert.equal(model.items.find(r=>r.name==='A').delta,50);assert.equal(model.items.find(r=>r.name==='B').delta,-20);
assert.equal(changeBetween({value:10},{value:0}).ppg,null);assert.equal(changeBetween({value:-5},{value:10}).ppg,-150);
assert.equal(comparableSummary([...rows,row('A',2026,2,null,20)],2026,[1,2]).value,null);
assert.equal(comparableSummary(rows,2026,[1,2]).value,null,'Missing entire month is unknown');
assert.equal(comparableSummary(rows,2026,[]).value,null);
assert.deepEqual(commonAvailableMonths([...rows,row('A',2026,2,3,30)], [2025,2026],[1,2]),[1]);
const newSeries=movement([...rows,row('C',2026,1,20,40)],{a:2025,b:2026,months:[1],metric:'units'});assert.equal(newSeries.delta,50);assert.equal(newSeries.items.find(r=>r.name==='C').delta,20);assert.equal(newSeries.items.find(r=>r.name==='C').newSales,true);assert.equal(newSeries.items.find(r=>r.name==='C').ppg,null);assert.equal(newSeries.unmatched.length,0);
const stock=[{dataset:'stock',year:2026,month:1,product:'A',distributor:'D1',channel:'PRIVATE',stock:30}];assert.equal(stockReadiness(stock,2026).ready,true);assert.equal(stockReadiness([...stock,...stock],2026).ready,false);
const t={dataset:'target',year:2026,month:0,product:'A',target_units:1200,target_value:12000};const records=[...rows,t];assert.equal(portfolioTarget(records,{year:2026},'A',[1,2],'units'),200);assert.equal(portfolioTarget([...records,row('A',2026,1,20,20,{line:'L2'})],{year:2026},'A',[1],'units',{line:['L1']}),null,'No target allocated to partial line');
const schedule=[{...t,month:1,target_units:40},{...t,month:2,target_units:70}];assert.equal(portfolioTarget([...rows,...schedule],{year:2026},'A',[1,2],'units'),110);assert.equal(portfolioTarget([...rows,...schedule],{year:2026},'A',[3],'units'),null);assert.equal(targetSum(records,{year:2026},['A','B'],[1],'units'),null,'Unknown product targets withhold total');
const proj=runRateProjection([1,2,3].map(m=>row('A',2026,m,100,1000)),2026);assert.equal(proj.value,1200);assert.equal(runRateProjection([row('A',2026,1,100,1000)],2026).value,1200);
assert.equal(scopeRecords([row('Raw',2026,1,1,1,{comparison_product:'Canonical'})],{product:['Raw']}).length,1);assert.equal(scopeRecords([row('Raw',2026,1,1,1,{comparison_product:'Canonical'})],{product:['Canonical']}).length,0);
const seed=JSON.parse(fs.readFileSync('private/seed.json')),real=effectiveRecords(seed);for(const metric of ['units','value']){const result=movement(real,{a:2025,b:2026,months:[1,2,3,4,5,6,7,8],metric});assert(result.delta!=null);assert(Math.abs(result.delta-result.items.reduce((s,r)=>s+r.delta,0))<.001)}
const minimal={records:rows,prices:{},source:'test',version:1};const p=previewImport('record_id,units\nA-2026-1,170',minimal);assert.equal(p.errors.length,0);const override=applyImport({},p);assert.equal(comparableSummary(effectiveRecords(minimal,override),2026,[1],'units').value,350,'Manual changes flow through summaries');
const before=JSON.stringify(seed);snapshotFrom(seed);assert.equal(JSON.stringify(seed),before);
console.log('Management calculations passed: signed reconciliation, absent baselines, common months, missing vs zero, manual overrides, source names, target allocation/schedules, stock duplicates, run-rate and real-data bridges.');

// Every source product must reconcile with the existing Actual table, including Tender and sparse recorded sales.
const snapshot=snapshotFrom(seed),chosen=snapshot.availableMonths,sourceProducts=[...new Set(snapshot.rows.map(r=>r.product))];
for(const metric of ['units','value']){
 let aggregate=0,targetAggregate=0;
 for(const product of sourceProducts){
  const expected=snapshot.rows.filter(r=>r.product===product&&chosen.includes(r.month)).reduce((n,r)=>n+r[metric],0);
  const actual=comparableSummary(real,snapshot.year,chosen,metric,{product:[product]});
  assert(actual.value!=null,product+' '+metric+' must display its recorded actual');
  assert(Math.abs(actual.value-expected)<.001,product+' matches original Actual source exactly');aggregate+=actual.value;
  const expectedTarget=metric==='units'?snapshot.targets[product].monthly*chosen.length:snapshot.targets[product].monthlyValue*chosen.length;
  const target=portfolioTarget(real,snapshot,product,chosen,metric);assert(target!=null,product+' source target is present');assert(Math.abs(target-expectedTarget)<.001,product+' target identity must not merge Tender');targetAggregate+=target;
 }
 assert(Math.abs(aggregate-comparableSummary(real,snapshot.year,chosen,metric).value)<.001,'Product totals reconcile to company '+metric);
 assert(Math.abs(targetAggregate-targetSum(real,snapshot,sourceProducts,chosen,metric))<.001,'Targets reconcile to company '+metric);
}
assert.equal(portfolioTarget(real,snapshot,'ONDALENZ 8MG',chosen,'units'),600000);
assert(Math.abs(portfolioTarget(real,snapshot,'ONDALENZ 8MG - TENDER',chosen,'units')-80000/12*8)<.001);
const regular=scopeRecords(real,{product:['ONDALENZ 8MG']}).filter(r=>r.year===2026&&r.dataset==='actual');assert(regular.every(r=>r.product==='ONDALENZ 8MG'),'Regular selection never includes Tender');
const sparse=[row('A',2026,2,7,70),row('B',2026,1,10,100),row('B',2026,2,10,100)];assert.equal(comparableSummary(sparse,2026,[1,2],'units',{product:['A']}).value,7,'Sparse transaction totals sum recorded rows without inventing months');assert.equal(comparableSummary(sparse,2026,[1],'units',{product:['A']}).value,null,'No source rows remains unavailable');
const alias=movement([row('A - Tender',2025,1,100,100),row('A-TENDER',2026,1,120,120)],{a:2025,b:2026,months:[1],metric:'units'});assert.equal(alias.delta,20);assert.equal(alias.items.length,1,'Spacing aliases appear once in the bridge');
console.log(`${sourceProducts.length} source products reconciled individually for Units, Value and both targets; company totals and Tender separation verified.`);
if(process.argv[2]){
 const backup=JSON.parse(fs.readFileSync(process.argv[2])),overrides=Object.fromEntries(backup.tables.record_overrides.rows.map(r=>[r.record_id,JSON.parse(r.payload)])),effective=effectiveRecords(seed,overrides),snap=snapshotFrom(seed,overrides),products=[...new Set(snap.rows.map(r=>r.product))];
 for(const metric of ['units','value']){
  for(const product of products){const rows=snap.rows.filter(r=>r.product===product&&snap.availableMonths.includes(r.month)),expected=rows.some(r=>r[metric]==null)?null:rows.reduce((n,r)=>n+r[metric],0),actual=comparableSummary(effective,snap.year,snap.availableMonths,metric,{product:[product]}).value;if(expected!=null){assert(actual!=null);assert(Math.abs(actual-expected)<.001,product+' reconciles with saved overrides for '+metric)}const expectedTarget=(metric==='units'?snap.targets[product].monthly:snap.targets[product].monthlyValue)*snap.availableMonths.length,actualTarget=portfolioTarget(effective,snap,product,snap.availableMonths,metric);assert(actualTarget!=null);assert(Math.abs(actualTarget-expectedTarget)<.001,product+' target reconciles with saved overrides');}
  const expected=snap.rows.filter(r=>snap.availableMonths.includes(r.month)).reduce((n,r)=>n+r[metric],0),actual=comparableSummary(effective,snap.year,snap.availableMonths,metric).value;assert(actual!=null);assert(Math.abs(actual-expected)<.001,'Saved company '+metric+' reconciles');
 }
 console.log(`Saved revision ${backup.tables.workspace_state.rows[0].revision}: ${products.length} products / ${snap.availableMonths.length} reporting months reconciled with overrides, including both targets.`);
}

assert.equal(runRateProjection([100,200,300,400,500].map((v,i)=>row('A',2026,i+1,v,v)),2026).value,3600,'YTD average includes every observed month');

const tender=movement([...rows,row('A',2026,1,30,300,{channel:'TENDER'})],{a:2025,b:2026,months:[1],metric:'units',filters:{channel:['TENDER']}});assert.equal(tender.delta,30);assert.equal(tender.items[0].activity,'New channel');
const launch=movement([...rows,row('A',2025,2,10,100),row('A',2026,2,10,100),row('C',2026,2,20,200)],{a:2025,b:2026,months:[1,2],metric:'units'});assert.equal(launch.items.find(r=>r.name==='C').current,20);assert.equal(launch.items.find(r=>r.name==='C').previous,0);
const unknown=movement([...rows,row('C',2025,1,null,100),row('C',2026,1,20,200)],{a:2025,b:2026,months:[1],metric:'units'});assert.equal(unknown.delta,null,'Explicit null is not zero');
assert.equal(movement(rows,{a:2025,b:2026,months:[1,2]}).delta,null,'Missing company month is not zero');
