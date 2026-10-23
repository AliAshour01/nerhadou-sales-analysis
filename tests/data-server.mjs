import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new DatabaseSync(':memory:');for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+file,'utf8'));
const stmt=(sql,args=[])=>({bind(...a){return stmt(sql,a)},async first(){return db.prepare(sql).get(...args)??null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}}},_sql:sql,_args:args});
globalThis.__testenv={AUTH_MODE:'platform',APP_ORIGIN:'https://nerhadou-commercial-hub.royal-fly-3435.chatgpt.site',PLATFORM_OWNER_EMAIL:'ali.ashour01@gmail.com',DB:{prepare:stmt,async batch(stmts){db.exec('BEGIN IMMEDIATE');try{const results=[];for(const s of stmts)results.push({meta:{changes:Number(db.prepare(s._sql).run(...s._args).changes)}});db.exec('COMMIT');return results}catch(e){db.exec('ROLLBACK');throw e}}}};
async function route(entry){const result=await build({entryPoints:[entry],bundle:true,format:'esm',platform:'node',write:false,plugins:[{name:'test-env',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const env = globalThis.__testenv;',loader:'js'}))}}]});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'))}
const api=await route('app/api/data/route.ts'),snapshot=await route('app/api/snapshot/route.ts'),seed=JSON.parse(readFileSync('private/seed.json'));
const headers={'oai-authenticated-user-id':'owner-site-id','oai-authenticated-user-email':'ali.ashour01@gmail.com'},base='https://nerhadou-commercial-hub.royal-fly-3435.chatgpt.site';
function req(method,body,h=headers){return new Request(base+'/api/data',{method,headers:{...h,...(body?{'content-type':'application/json',origin:base}:{})},...(body?{body:JSON.stringify({...body,sourceVersion:seed.version})}:{})})}
let checks=0;const eq=(a,b,msg)=>{assert.deepEqual(a,b,msg);checks++};
eq((await api.GET(req('GET',null,{}))).status,401,'Anonymous read denied');
eq((await api.POST(req('POST',{revision:0,raw:''},{}))).status,403,'Anonymous mutation denied');
eq((await api.POST(req('POST',{revision:0,raw:''},{...headers,'oai-authenticated-user-email':'viewer@example.com'}))).status,403,'Viewer mutation denied');
const cross=req('POST',{revision:0,raw:''});cross.headers.set('origin','https://evil.example');eq((await api.POST(cross)).status,403,'Cross-origin denied');
let data=await (await api.GET(req('GET'))).json();eq(data.revision,0,'Initial state');eq(data.isAdmin,true,'Owner is admin');
const row=seed.records.find(r=>r.year===2026&&r.dataset==='actual'&&r.month>0),raw=`record_id,units,value\n${row.id},123,`;
eq((await api.POST(req('POST',{revision:5,raw}))).status,409,'Stale revision rejected');
eq((await api.POST(req('POST',{revision:0,raw:'record_id,units\nUNKNOWN,5'}))).status,400,'Invalid import rejected');
eq(Number(db.prepare('SELECT count(*) AS n FROM audit_log').get().n),0,'Rejected import writes no audit');
let save=await api.POST(req('POST',{revision:0,raw}));eq(save.status,200,'Import saved');
data=await (await api.GET(req('GET'))).json();eq(data.revision,1,'Revision incremented');eq(data.overrides[row.id].fields.units,123,'Units persisted');eq(Object.hasOwn(data.overrides[row.id].fields,'value'),false,'Omitted value not overwritten');eq(data.audit.length,1,'Audit saved');
const snap=await (await snapshot.GET(req('GET'))).json();eq(snap.rows.find(r=>r.month===row.month&&r.product===row.product&&r.distributor===row.distributor&&r.channel===row.channel&&r.line===row.line).units,123,'Dashboard sees saved override');
eq((await api.POST(req('POST',{revision:1,undo:true}))).status,200,'Undo succeeded');
data=await (await api.GET(req('GET'))).json();eq(data.revision,2,'Undo new revision');eq(data.overrides,{},'Undo restores original source');
const race=await Promise.all([api.POST(req('POST',{revision:2,raw})),api.POST(req('POST',{revision:2,raw}))]);eq(race.map(r=>r.status).sort(),[200,409],'Concurrent writers cannot overwrite each other');
eq(Number(db.prepare('SELECT count(*) AS n FROM audit_log').get().n),3,'Only successful writer has audit');
eq((await api.POST(req('POST',{revision:3,register:{product:'TEST PRODUCT',channel:'PRIVATE',distributor:'TEST',line:'Test line'}}))).status,200,'Product registration saved');
data=await (await api.GET(req('GET'))).json();const custom=Object.values(data.overrides).find(o=>o.record?.product==='TEST PRODUCT');eq(custom.record.dataset,'catalog','Registration adds no fake sales');
eq((await api.POST(req('POST',{revision:4,register:{product:'TEST PRODUCT',channel:'PRIVATE',distributor:'TEST',line:'Test line'}}))).status,400,'Duplicate registration prevented');
eq((await api.POST(req('POST',{revision:4,raw:`product_id,year,month,dataset,value\n${custom.record.product_id},2026,Aug,actual,456`}))).status,200,'New series receives partial actual record');
const partial=await (await snapshot.GET(req('GET'))).json(),customrow=partial.rows.find(r=>r.product==='TEST PRODUCT');eq(customrow.value,456,'Partial value saved');eq(customrow.units,null,'Missing units remain null');
eq((await snapshot.GET(req('GET',null,{}))).status,401,'Anonymous snapshot denied');
console.log(checks+' server/storage assertions passed (real SQLite, authenticated route handlers)');

// Exercise genuine saves, reads, annual targets, backfills, cutoff and undo against SQLite.
async function saveFresh(body){const latest=await (await api.GET(req('GET'))).json();const response=await api.POST(req('POST',{revision:latest.revision,...body}));eq(response.status,200,'Dynamic update saved');return response.json()}
const snapshotYear=year=>snapshot.GET(new Request(base+'/api/snapshot'+(year?'?year='+year:''),{headers}));
const source=seed.records.find(r=>r.dataset==='actual'&&r.year===2026&&r.month===1);
await saveFresh({raw:`product_id,year,month,dataset,units,value\n${source.product_id},2026,Sep,actual,17,1700`});
let dynamic=await (await snapshotYear(2026)).json();eq(dynamic.availableMonths.includes(9),true,'September becomes available');
await saveFresh({raw:`product_id,year,month,dataset,units,value\n${source.product_id},2026,Dec,actual,29,2900`});
dynamic=await (await snapshotYear(2026)).json();eq(dynamic.availableMonths.includes(12),true,'December becomes available');eq(dynamic.availableMonths.includes(10),false,'October not fabricated from December upload');
await saveFresh({raw:`product_id,year,month,dataset,units,value\n${source.product_id},2027,Jan,actual,40,400`});
dynamic=await (await snapshotYear()).json();eq(dynamic.year,2027,'Latest year advances to 2027');eq(dynamic.rows[0].units,40,'2027 actual received');eq(Object.keys(dynamic.targets).length,0,'Previous-year targets never copied into new year');
await saveFresh({raw:`product_id,year,month,dataset,target_units,target_value\n${source.product_id},2027,FY,target,1200,12000`});
dynamic=await (await snapshotYear(2027)).json();eq(dynamic.targets[source.product].monthly,100,'New-year target units use that year');eq(dynamic.targets[source.product].monthlyValue,1000,'New-year value target received');
const past=seed.records.find(r=>r.dataset==='actual'&&r.year===2025&&r.month===6);
await saveFresh({raw:`record_id,units,value\n${past.id},12,120`});
const history=await (await snapshotYear(2025)).json();eq(history.rows.find(r=>r.product===past.product&&r.month===6&&r.line===past.line).units,12,'Old-month correction visible in selected year');eq((await (await snapshotYear()).json()).year,2027,'Backfill does not change latest-year routing');
const beforeCutoff=await (await snapshotYear(2026)).json();
await saveFresh({reportingCutoff:{year:2026,throughMonth:6}});dynamic=await (await snapshotYear(2026)).json();eq(dynamic.availableMonths,[1,2,3,4,5,6],'Data can be restricted through June');eq(Object.keys(dynamic.targets).sort(),Object.keys(beforeCutoff.targets).sort(),'Cutoff retains targets');
await saveFresh({undo:true});dynamic=await (await snapshotYear(2026)).json();eq(dynamic.availableMonths,beforeCutoff.availableMonths,'Undo restores later periods');
await saveFresh({reportingCutoff:{year:2026,throughMonth:6}});
const july=seed.records.find(r=>r.dataset==='actual'&&r.year===2026&&r.month===7);
await saveFresh({raw:`record_id,units,value\n${july.id},999,888`});dynamic=await (await snapshotYear(2026)).json();eq(dynamic.availableMonths.includes(7),true,'Reimport restores a hidden period record');eq(dynamic.incompleteMonths.includes(7),true,'Partially restored month remains labelled incomplete');
await saveFresh({reportingCutoff:{year:2026,throughMonth:12}});dynamic=await (await snapshotYear(2026)).json();eq(dynamic.incompleteMonths,[],'Restoring the full range clears incomplete-period flags');eq(dynamic.rows.find(r=>r.product===july.product&&r.month===7&&r.channel===july.channel&&r.distributor===july.distributor&&r.line===july.line).units,999,'Range restore keeps explicit correction');
eq((await snapshotYear(1999)).status,400,'Bad year parameter rejected');eq((await snapshotYear(2099)).status,404,'No fabricated data for unavailable year');
const revisionNow=(await (await api.GET(req('GET'))).json()).revision;eq((await api.POST(req('POST',{revision:revisionNow,reportingCutoff:{year:2026,throughMonth:13}}))).status,400,'Invalid cutoff rejected');
eq((await api.POST(req('POST',{revision:revisionNow,reportingCutoff:{year:2026,throughMonth:6}},{...headers,'oai-authenticated-user-email':'viewer@example.com'}))).status,403,'Viewer cannot change reporting coverage');
console.log(checks+' server/storage assertions passed including persisted dynamic year/month updates, backfill, targets, cutoff and undo');

// Migrate the previous payload format and grow beyond the former whole-JSON limit.
const beforeMigration=await (await api.GET(req('GET'))).json();
db.prepare('UPDATE workspace_state SET payload=? WHERE id=1').run(JSON.stringify(beforeMigration.overrides));db.exec('DELETE FROM record_overrides');
const migrated=await (await api.GET(req('GET'))).json();eq(migrated.overrides,beforeMigration.overrides,'Legacy overrides migrate without changing fields');eq(migrated.revision,beforeMigration.revision,'Storage migration does not invent a business revision');eq(db.prepare('SELECT payload FROM workspace_state WHERE id=1').get().payload,'{}','Legacy blob is cleared after successful atomic migration');
const storage=await route('lib/data-storage.ts'),scaleId='test-scale-'+crypto.randomUUID(),scaleChanges=Array.from({length:2200},(_,i)=>({id:'SCALE_'+i,beforeOverride:null,afterOverride:{record:{id:'SCALE_'+i,product_id:'SCALE_'+i,series_id:'SCALE_'+i,product:'Scale fixture '+i,year:0,month:0,dataset:'catalog',source:'x'.repeat(700)},fields:{}}}));
eq(await storage.commitWorkspace(globalThis.__testenv.DB,{expectedRevision:migrated.revision,id:scaleId,actor:headers['oai-authenticated-user-email'],time:new Date().toISOString(),note:'Scale fixture',changes:scaleChanges}),true,'Larger state commits atomically in bounded record chunks');
const larger=await storage.readWorkspace(globalThis.__testenv.DB);eq(JSON.stringify(larger.overrides).length>1400000,true,'Workspace grows beyond former 1.4MB whole-state cap');eq(Number(db.prepare('SELECT count(*) AS n FROM audit_changes WHERE audit_id=?').get(scaleId).n),2200,'Large audit changes stored per record');
await saveFresh({undo:true});const restored=await (await api.GET(req('GET'))).json();eq(restored.overrides,migrated.overrides,'Large update undo restores exact earlier state');
console.log(checks+' server/storage assertions passed including legacy migration and multi-megabyte state/undo');
const revAPI=await route('app/api/revision/route.ts');eq((await revAPI.GET(req('GET',null,{}))).status,401,'Revision polling requires sign-in');const latestRevision=await (await revAPI.GET(req('GET'))).json();eq(latestRevision.revision,(await (await api.GET(req('GET'))).json()).revision,'Lightweight polling reports saved shared revision');
console.log(checks+' final server/storage assertions passed');

// Register new dimensions and sales in one reviewed, reversible transaction.
const {previewImport:previewNew}=await import('../public/data-core.js');
const newRaw=JSON.stringify([{product:'NEW IMPORT PRODUCT 10MG',channel:'TENDER',distributor:'EGY',line:'Test line',year:2026,month:9,dataset:'actual',units:23,value:230}]);
let fresh=await (await api.GET(req('GET'))).json(),proposal=previewNew(newRaw,seed,fresh.overrides);
eq(proposal.newSeries.length,1,'New series proposed');
eq((await api.POST(req('POST',{revision:fresh.revision,raw:newRaw}))).status,400,'New series requires explicit approval on server');
eq((await (await api.GET(req('GET'))).json()).revision,fresh.revision,'Rejected unapproved import has no effects');
await saveFresh({raw:newRaw,approvedNewSeries:proposal.newSeries.map(r=>r.product_id)});
fresh=await (await api.GET(req('GET'))).json();const registered=Object.values(fresh.overrides).filter(o=>o.record?.product==='NEW IMPORT PRODUCT 10MG');eq(registered.length,2,'Catalog and sales persist together');eq(registered.find(o=>o.record.dataset==='actual').fields.units,23,'New-series sales persisted');
const afterFirst=structuredClone(fresh.overrides);
await saveFresh({raw:newRaw.replace('"units":23','"units":24')});
fresh=await (await api.GET(req('GET'))).json();eq(Object.values(fresh.overrides).filter(o=>o.record?.product==='NEW IMPORT PRODUCT 10MG').length,2,'Repeated name import does not duplicate');
await saveFresh({undo:true});fresh=await (await api.GET(req('GET'))).json();eq(fresh.overrides,afterFirst,'Undo reimport restores exact prior data');
// Undo the undo redoes the latest operation; use another new series to test creation rollback.
const otherRaw=newRaw.replace('NEW IMPORT PRODUCT 10MG','SECOND IMPORT PRODUCT');proposal=previewNew(otherRaw,seed,fresh.overrides);
const beforeCreate=structuredClone(fresh.overrides);await saveFresh({raw:otherRaw,approvedNewSeries:proposal.newSeries.map(r=>r.product_id)});await saveFresh({undo:true});fresh=await (await api.GET(req('GET'))).json();eq(fresh.overrides,beforeCreate,'One undo removes newly registered series and its sales atomically');
console.log(checks+' final server assertions including approved new series, repeat updates and atomic undo');
const {periodTemplate:bulkTemplate}=await import('../public/data-core.js');
fresh=await (await api.GET(req('GET'))).json();const bulkBefore=structuredClone(fresh.overrides),bulkRows=Array.from({length:9},(_,i)=>bulkTemplate(seed,fresh.overrides,{sourceYear:2026,year:2028,month:i+1}).rows.filter(r=>!r.product.startsWith('TEST')&&!r.product.startsWith('NEW')&&!r.product.startsWith('SECOND')).map(r=>({...r,units:75,value:750}))).flat();
eq(bulkRows.length>500,true,'Full reporting range exceeds old row limit');eq(JSON.stringify(bulkRows).length>300000,true,'Full import exceeds former request size limit');await saveFresh({raw:JSON.stringify(bulkRows)});dynamic=await (await snapshotYear(2028)).json();eq(dynamic.availableMonths,[1,2,3,4,5,6,7,8,9],'Full January–September imported in one API save');eq(dynamic.rows.length,bulkRows.length,'No bulk rows truncated');await saveFresh({undo:true});fresh=await (await api.GET(req('GET'))).json();eq(fresh.overrides,bulkBefore,'One undo restores full multi-month import');
console.log(checks+' server assertions including single-save bulk reporting range above former limits');
// Full replacement must remove omitted old rows and metrics, while preserving unrelated datasets and periods.
fresh=await (await api.GET(req('GET'))).json();const untouched2026=await (await snapshotYear(2026)).json();const replaceBefore=structuredClone(fresh.overrides),replaceOptions={mode:'replace',year:2025,fromMonth:1,toMonth:12};const replaceRow=seed.records.find(r=>r.dataset==='actual'&&r.year===2025&&r.month===1);const replaceRaw=`record_id,units,value\n${replaceRow.id},120,`;
eq((await api.POST(req('POST',{revision:fresh.revision,raw:replaceRaw,importOptions:replaceOptions}))).status,400,'Replacement requires explicit server confirmation');eq((await (await api.GET(req('GET'))).json()).revision,fresh.revision,'Unconfirmed replacement leaves all data intact');
await saveFresh({raw:replaceRaw,importOptions:replaceOptions,confirmReplacement:true});let replacedSnap=await (await snapshotYear(2025)).json();eq(replacedSnap.rows.length,1,'Full-year replacement removes omitted products and months');eq(replacedSnap.rows[0].units,120,'Replacement final units saved');eq(replacedSnap.rows[0].value,null,'Replacement blank value clears original value and estimate');
let replaceState=await (await api.GET(req('GET'))).json();eq(Object.values(replaceState.overrides).some(o=>o.replacedByImport),true,'Old rows retained only for reversible audit, excluded from reporting');eq((await (await snapshotYear(2026)).json()).rows,untouched2026.rows,'Other year sales unchanged');
await saveFresh({undo:true});fresh=await (await api.GET(req('GET'))).json();eq(fresh.overrides,replaceBefore,'Undo replacement restores every old record and metric exactly');
eq((await api.POST(req('POST',{revision:fresh.revision,raw:replaceRaw,importOptions:{...replaceOptions,year:2026},confirmReplacement:true}))).status,400,'Server rejects out-of-scope replacement');
eq((await api.POST(req('POST',{revision:fresh.revision,raw:`record_id,units,value\n${replaceRow.id},,`,importOptions:replaceOptions,confirmReplacement:true}))).status,400,'Empty replacement cannot wipe data');
console.log(checks+' server assertions including confirmed full-year replacement and exact undo');
