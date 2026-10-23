import assert from 'node:assert/strict';
import {previewImport,applyChanges,effectiveRecords} from '../public/data-core.js';
const records=Array.from({length:213},(_,i)=>({id:'P'+i+'-Jan',product_id:'P'+i,series_id:'S'+i,product:'Product '+i,channel:'PRIVATE',distributor:'PHARMA',line:'Line',year:2026,month:1,dataset:'actual',units:1,value:10}));const seed={records,prices:{}};
const rows=records.flatMap(r=>Array.from({length:9},(_,i)=>({product_id:r.product_id,year:2026,month:i+1,dataset:'actual',units:100+i,value:1000+i})));
const raw=JSON.stringify(rows),p=previewImport(raw,seed);assert.deepEqual(p.errors,[]);assert.equal(p.changes.length,3834,'January–September imports together, no seven files');assert.equal(effectiveRecords(seed,applyChanges({},p.changes)).filter(r=>r.month===9).length,213);
assert(previewImport(JSON.stringify(Array.from({length:10001},()=>rows[0])),seed).errors.some(e=>e.includes('10,000')),'Row ceiling retained');assert(previewImport('x'.repeat(2000001),seed).errors.some(e=>e.includes('2 million')),'Size guard retained');
const html=(await import('node:fs')).readFileSync('public/index.html','utf8');assert(html.includes('import-single-file'));assert(html.includes('10,000 rows'));
console.log('Bulk import passed: 1,917 rows / 3,834 cells, one January–September save, limits and single-file entry');
