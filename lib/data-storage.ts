// Per-record D1 storage. Source records stay immutable; each saved edit is reversible.
export async function readWorkspace(db:any){
 for(let attempt=0;attempt<4;attempt++){
  let state=await db.prepare('SELECT * FROM workspace_state WHERE id=1').first();
  if(!state){await db.prepare('INSERT OR IGNORE INTO workspace_state (id,revision,payload) VALUES (1,0,?)').bind('{}').run();state=await db.prepare('SELECT * FROM workspace_state WHERE id=1').first()}
  // One-time conversion of the earlier JSON store; all statements run atomically.
  if(state.payload&&state.payload!=='{}'){
   await db.batch([
    db.prepare("DELETE FROM record_overrides WHERE EXISTS (SELECT 1 FROM workspace_state WHERE id=1 AND payload<>'{}')"),
    db.prepare("INSERT INTO record_overrides (record_id,payload) SELECT j.key,j.value FROM workspace_state s,json_each(s.payload) j WHERE s.id=1 AND s.payload<>'{}' ON CONFLICT(record_id) DO UPDATE SET payload=excluded.payload"),
    db.prepare("UPDATE workspace_state SET payload='{}' WHERE id=1 AND payload<>'{}'")
   ]);continue;
  }
  const rows=await db.prepare('SELECT record_id,payload FROM record_overrides').all();
  const after=await db.prepare('SELECT revision FROM workspace_state WHERE id=1').first();
  if(after.revision===state.revision)return {state,overrides:Object.fromEntries(rows.results.map((r:any)=>[r.record_id,JSON.parse(r.payload)]))};
 }
 throw Error('Data changed during loading. Please retry.');
}
export async function auditRecordChanges(db:any,audit:any){
 const legacy=JSON.parse(audit.changes||'[]');if(legacy.length)return legacy;
 const rows=await db.prepare('SELECT record_id,before_payload,after_payload FROM audit_changes WHERE audit_id=?').bind(audit.id).all();
 return rows.results.map((r:any)=>({id:r.record_id,beforeOverride:r.before_payload==null?null:JSON.parse(r.before_payload),afterOverride:r.after_payload==null?null:JSON.parse(r.after_payload)}));
}
export async function commitWorkspace(db:any,{expectedRevision,id,actor,time,note,changes}:any){
 const revision=expectedRevision+1;
 const guard='EXISTS (SELECT 1 FROM workspace_state WHERE id=1 AND revision=? AND last_change=?)';
 const statements=[db.prepare("UPDATE workspace_state SET payload='{}',revision=?,last_change=? WHERE id=1 AND revision=?").bind(revision,id,expectedRevision)];
 // Bound each SQL payload independently; large histories don't occupy a single D1 cell.
 for(let start=0;start<changes.length;start+=250){
  const part=JSON.stringify(changes.slice(start,start+250));
  statements.push(
   db.prepare(`DELETE FROM record_overrides WHERE record_id IN (SELECT json_extract(value,'$.id') FROM json_each(?) WHERE json_type(value,'$.afterOverride')='null') AND ${guard}`).bind(part,revision,id),
   db.prepare(`INSERT INTO record_overrides (record_id,payload) SELECT json_extract(value,'$.id'),json_extract(value,'$.afterOverride') FROM json_each(?) WHERE json_type(value,'$.afterOverride')<>'null' AND ${guard} ON CONFLICT(record_id) DO UPDATE SET payload=excluded.payload`).bind(part,revision,id),
   db.prepare(`INSERT INTO audit_changes (id,audit_id,record_id,before_payload,after_payload) SELECT ?||':'||json_extract(value,'$.id'),?,json_extract(value,'$.id'),json_extract(value,'$.beforeOverride'),json_extract(value,'$.afterOverride') FROM json_each(?) WHERE ${guard}`).bind(id,id,part,revision,id)
  );
 }
 statements.push(db.prepare(`INSERT INTO audit_log (id,revision,actor,created_at,changes,note) SELECT ?,?,?,?,'[]',? WHERE ${guard}`).bind(id,revision,actor,time,note,revision,id));
 const results=await db.batch(statements);return results[0].meta.changes===1;
}
