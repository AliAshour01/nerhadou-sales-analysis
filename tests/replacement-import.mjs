import assert from 'node:assert/strict';
import {previewImport,applyImport,effectiveRecords,previewReportingCutoff} from '../public/data-core.js';
const seed={prices:{S1:10},records:[
{id:'S1-2025-01-actual',series_id:'S1',product_id:'P1',product:'Product A',channel:'PRIVATE',distributor:'EGY',line:'Line A',dataset:'actual',year:2025,month:1,units:100,value:1000,estimated:['value']},
{id:'S2-2025-01-actual',series_id:'S2',product_id:'P2',product:'Product B',channel:'PRIVATE',distributor:'EGY',line:'Line A',dataset:'actual',year:2025,month:1,units:200,value:2000},
{id:'S1-2025-02-actual',series_id:'S1',product_id:'P1',product:'Product A',channel:'PRIVATE',distributor:'EGY',line:'Line A',dataset:'actual',year:2025,month:2,units:300,value:3000},
{id:'FY',series_id:'S1',product_id:'P1',product:'Product A',channel:'PRIVATE',distributor:'EGY',line:'Line A',dataset:'actual',year:2025,month:0,units:400,value:4000},
{id:'TARGET',series_id:'S1',product_id:'P1',product:'Product A',dataset:'target',year:2025,month:0,target_units:1200},
{id:'STOCK',series_id:'S1',product_id:'P1',product:'Product A',dataset:'stock',year:2025,month:1,stock:100},
{id:'NEXT',series_id:'S1',product_id:'P1',product:'Product A',dataset:'actual',year:2026,month:1,units:55,value:550}
]};
const options={mode:'replace',year:2025,fromMonth:1,toMonth:1};
let raw='product_id,year,month,dataset,units,value\nP1,2025,1,actual,120,';
let p=previewImport(raw,seed,{},options);assert.deepEqual(p.errors,[]);assert.equal(p.removals.filter(r=>!r.annual).length,1);assert.equal(p.removals.filter(r=>r.annual).length,1);
let overrides=applyImport({},p),records=effectiveRecords(seed,overrides);assert.equal(records.find(r=>r.id==='S1-2025-01-actual').units,120);assert.equal(records.find(r=>r.id==='S1-2025-01-actual').value,null,'Blank replacement Value clears old and estimated value');assert(!records.some(r=>r.id==='S2-2025-01-actual'),'Omitted old product removed');assert(!records.some(r=>r.id==='FY'),'Stale annual control removed');for(const id of ['TARGET','STOCK','NEXT','S1-2025-02-actual'])assert(records.some(r=>r.id===id),'Other scope retained: '+id);assert(!records.some(r=>r.reportingIncomplete),'Replacement removal is not a partial reporting cutoff');
const cutoff=previewReportingCutoff(seed,overrides,2025,12);assert(!cutoff.changes.some(c=>c.id==='S2-2025-01-actual'||c.id==='FY'),'Cutoff cannot resurrect replaced rows');
let update=previewImport('record_id,units\nS2-2025-01-actual,5',seed,overrides);assert.deepEqual(update.errors,[]);records=effectiveRecords(seed,applyImport(overrides,update));assert(records.some(r=>r.id==='S2-2025-01-actual'&&r.units===5),'Explicit reimport may restore a replaced record');
p=previewImport(raw,seed,{}, {mode:'replace',year:2025,fromMonth:1,toMonth:12});assert(p.removals.some(r=>r.month===2),'Whole-year replacement removes omitted months');
assert(previewImport(raw,seed,{}, {...options,year:2026}).errors.length,'Out-of-scope rows block entire save');assert(previewImport(raw,seed,{}, {...options,fromMonth:4,toMonth:1}).errors.length,'Reversed range rejected');assert(previewImport('record_id,units\nTARGET,5',seed,{},options).errors.length,'Target cannot be replaced as sales');assert(previewImport(raw.replace('120,',','),seed,{},options).errors.length,'Blank template cannot replace company sales');assert(previewImport(raw.replace('120,','RESET,'),seed,{},options).errors.length,'Reset rejected in replacement');assert(previewImport(raw+'\nP1,2025,1,actual,5,50',seed,{},options).errors.length,'Duplicate replacement rows rejected');
p=previewImport(raw,seed);assert.deepEqual(p.errors,[]);records=effectiveRecords(seed,applyImport({},p));assert(records.some(r=>r.id==='S2-2025-01-actual'),'Update still preserves omitted rows');assert.equal(records.find(r=>r.id==='S1-2025-01-actual').value,1200,'Update still estimates omitted Value');
console.log('Replacement passed: scope, row removals, annual controls, blank vs zero, estimates, cutoff isolation, explicit restore and update compatibility');
