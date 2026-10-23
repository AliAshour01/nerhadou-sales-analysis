import assert from 'node:assert/strict';
import {effectiveRecords,previewLineAssignments,lineAssignmentKey,previewImport,applyImport,snapshotFrom} from '../public/data-core.js';
const row=(id,product,year,line,extra={})=>({id,series_id:id,product_id:id,product,year,month:1,dataset:'actual',line,channel:'PRIVATE',distributor:'D',units:10,value:100,coverage:'reporting-month',...extra});
const seed={version:'line-fixture',source:'test',prices:{},records:[
 row('a21','Product A',2021,'Old line'),row('a26','Product A',2026,'Wrong line'),
 row('a-alias',' product   A ',2025,'Old line'),row('t','Product A - TENDER',2026,'Tender line'),
 row('pack','Product A 30 CAPS',2026,'Pack line'),row('b','Product B',2026,'Correct line'),
]};
const frozen=JSON.stringify(seed),before={a26:{fields:{units:0,value:-5}},a21:{fields:{},excluded:true}},initial=structuredClone(before);
const p=previewLineAssignments(seed,before,{assignments:[{product:'Product A',line:'Correct line'}]});
assert.equal(p.changes.length,1);assert.deepEqual(p.changes[0].years,[2021,2025,2026]);
assert.equal(p.changes[0].records,3);
const next={...before,[p.changes[0].id]:p.changes[0].afterOverride};
const effective=effectiveRecords(seed,next,{includeExcluded:true});
for(const r of effective.filter(r=>['a21','a26','a-alias'].includes(r.id)))assert.equal(r.line,'Correct line');
assert.equal(effective.find(r=>r.id==='a26').source_line,'Wrong line');
assert.equal(effective.find(r=>r.id==='a26').units,0);assert.equal(effective.find(r=>r.id==='a26').value,-5);
assert.equal(effective.find(r=>r.id==='a21').excluded,true);
assert.equal(effective.find(r=>r.id==='t').line,'Tender line');assert.equal(effective.find(r=>r.id==='pack').line,'Pack line');
assert.equal(snapshotFrom(seed,next,{year:2026}).rows.find(r=>r.product==='Product A').line,'Correct line');
assert.deepEqual(next.a26,before.a26,'Line correction does not overwrite metric overrides');
assert.equal(JSON.stringify(seed),frozen);assert.deepEqual(before,initial);
assert.equal(previewLineAssignments(seed,next,{assignments:[{product:'Product A',line:'Correct line'}]}).changes.length,0);

// Original-sheet labels remain valid for imports, with IDs and without IDs.
for(const identity of [{record_id:'a26',line:'Wrong line'},{product_id:'a26',year:2026,month:2,dataset:'actual',line:'Wrong line'},{product:'Product A',channel:'PRIVATE',distributor:'D',line:'Wrong line',year:2026,month:1,dataset:'actual'}]){
 // Use a fixture containing one source series for name matching.
 const inputSeed=identity.product?{...seed,records:seed.records.filter(r=>r.id==='a26'||r.id==='b')}:seed;
 const imported=previewImport(JSON.stringify([{...identity,units:13}]),inputSeed,next);
 assert.deepEqual(imported.errors,[]);
 const importedState=applyImport(next,imported);
 assert(effectiveRecords(inputSeed,importedState).some(r=>r.product==='Product A'&&r.units===13&&r.line==='Correct line'));
 assert(importedState[lineAssignmentKey('Product A')]);
}
// Future years inherit the correction instead of borrowing another year's raw label.
const future=previewImport(JSON.stringify([{product_id:'a26',year:2030,month:1,units:50}]),seed,next);
assert.deepEqual(future.errors,[]);
const futureState=applyImport(next,future);
const futureRow=effectiveRecords(seed,futureState).find(r=>r.year===2030);
assert.equal(futureRow.line,'Correct line');assert.equal(futureRow.source_line,'Wrong line');
const reset=previewLineAssignments(seed,futureState,{assignments:[{product:'Product A',line:null}]});
const restored=structuredClone(futureState);delete restored[reset.changes[0].id];
assert.equal(effectiveRecords(seed,restored).find(r=>r.id==='a26').line,'Wrong line');
assert.equal(effectiveRecords(seed,restored).find(r=>r.id==='a26').value,-5);
assert.equal(effectiveRecords(seed,restored).find(r=>r.year===2030).units,50);

for(const input of [
 {assignments:[]},{year:2026,assignments:[{product:'Product A',line:'Correct line'}]},
 {assignments:[{product:'missing',line:'Correct line'}]},
 {assignments:[{product:'Product A',line:'New arbitrary line'}]},
 {assignments:[{product:'Product A',line:'Correct line'},{product:' product   A ',line:'Old line'}]},
 {assignments:[{product:'Product A',line:'Correct line',role:'owner'}]},
])assert.throws(()=>previewLineAssignments(seed,next,input));
console.log('Line assignments passed: all-year source identity, Tender/pack isolation, immutable figures/source, exclusions, future imports, original labels, reset and invalid batches.');
