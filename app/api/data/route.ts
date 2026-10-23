export const dynamic='force-dynamic';
import {env} from 'cloudflare:workers';
import seed from '../../../private/seed.json';
import {previewImport,applyImport,previewReportingCutoff} from '../../../public/data-core.js';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
import {approved,administrator} from '../../../lib/security/guard';
import {body as boundedBody,failure,SecurityError} from '../../../lib/security/config';
import {readWorkspace,auditRecordChanges,commitWorkspace} from '../../../lib/data-storage';
export async function GET(request:Request){
 let actor;try{actor=await approved(request,env)}catch(e){return failure(e)}
 try{const loaded=await readWorkspace(env.DB),s=loaded.state;const audits=['owner','admin'].includes(actor.role)?await env.DB.prepare('SELECT id,revision,actor,created_at,note FROM audit_log WHERE revision<=? ORDER BY revision DESC LIMIT 30').bind(s.revision).all():{results:[]};const latest=s.last_change?await env.DB.prepare('SELECT created_at FROM audit_log WHERE id=?').bind(s.last_change).first() as any:null;return json({seed,overrides:loaded.overrides,revision:s.revision,updatedAt:latest?.created_at??null,isAdmin:['owner','admin'].includes(actor.role),audit:audits.results});}catch{return json({error:'Shared data is unavailable. Please retry.'},503)}
}
export async function POST(request:Request){
 let actor;try{actor=await administrator(request,env,true)}catch(e){const result=failure(e);return result.status===401?json({error:'Only the administrator can edit data.'},403):result}
 if(request.headers.get('origin')!==new URL(request.url).origin||!request.headers.get('content-type')?.includes('application/json'))return json({error:'Invalid request origin or content type.'},403);
 if(Number(request.headers.get('content-length')||0)>3000000)return json({error:'Import is too large.'},413);
 try{
  const body=await boundedBody(request,3000000),loaded=await readWorkspace(env.DB),s=loaded.state;if(body.sourceVersion!==seed.version)return json({error:'Source data changed. Reload the page and preview again.'},409);if(!Number.isInteger(body.revision)||body.revision!==s.revision)return json({error:'Data changed in another session. Reload and preview again.'},409);
  const before=loaded.overrides;let next,changes,note;
  if(body.register){
   const input=body.register;
   if(!input||typeof input!=='object')return json({error:'Invalid product details.'},400);
   const product=String(input.product??'').trim(),channel=String(input.channel||'NOT PROVIDED').trim(),distributor=String(input.distributor||'NOT PROVIDED').trim(),line=String(input.line||'Not provided').trim();
   if(!product||[product,channel,distributor,line].some(v=>v.length>160||/[\r\n\x00-\x1f]/.test(v)))return json({error:'Use a name and dimensions below 160 characters without line breaks.'},400);
   const all=[...seed.records,...Object.values(before).map((o:any)=>o.record).filter(Boolean)];
   if(all.filter((r:any)=>r.dataset!=='retired').some((r:any)=>r.product.toLowerCase()===product.toLowerCase()&&r.channel.toLowerCase()===channel.toLowerCase()&&r.distributor.toLowerCase()===distributor.toLowerCase()&&r.line.toLowerCase()===line.toLowerCase()))return json({error:'This series already exists. Use its product_id from the catalog.'},400);
   const pid='CUSTOM_'+crypto.randomUUID().replaceAll('-','').slice(0,16),rid=pid+'-catalog';
   const record={id:rid,series_id:pid,product_id:pid,product,channel,distributor,line,year:0,month:0,dataset:'catalog',source:'Admin product registration',units:null,value:null,estimated:[]};
   next={...before,[rid]:{record,fields:{}}};changes=[{id:rid,beforeOverride:null,afterOverride:next[rid]}];note='Registered product series '+product;
  }else if(body.reportingCutoff){
   const input=body.reportingCutoff;let p;try{p=previewReportingCutoff(seed,before,input.year,input.throughMonth)}catch(e){return json({error:(e as Error).message},400)}
   if(!p.changes.length)return json({error:'This reporting range is already active.'},400);
   next=structuredClone(before);for(const c of p.changes){if(c.afterOverride===null)delete next[c.id];else next[c.id]=c.afterOverride}changes=p.changes.map(c=>({id:c.id,beforeOverride:c.beforeOverride,afterOverride:c.afterOverride}));note=`Reporting cutoff ${p.year}-${String(p.throughMonth).padStart(2,'0')}: ${p.hidden} records hidden, ${p.restored} restored`;
  }else if(body.undo){
   const a=await env.DB.prepare('SELECT * FROM audit_log WHERE id=? AND revision=?').bind(s.last_change,s.revision).first() as any;
   if(!a)return json({error:'No latest change to undo.'},400);
   const audit=await auditRecordChanges(env.DB,a);next=structuredClone(before);for(const c of audit){if(c.beforeOverride===null)delete next[c.id];else next[c.id]=c.beforeOverride}changes=audit.map((c:any)=>({id:c.id,beforeOverride:before[c.id]??null,afterOverride:next[c.id]??null}));note='Undo: '+a.note;
  }else{
   if(typeof body.raw!=='string')return json({error:'Paste data first.'},400);
   const p=previewImport(body.raw,seed,before,body.importOptions||{});if(p.errors.length)return json({error:'Import needs correction.',errors:p.errors},400);if(!p.changes.length)return json({error:'No changes to save.'},400);
   if(p.replacement&&body.confirmReplacement!==true)return json({error:'Review and confirm the full replacement before saving.'},400);
   const registrations=p.newSeries||[];
   const approved=body.approvedNewSeries;
   if(registrations.length&&(!Array.isArray(approved)||approved.length!==registrations.length||registrations.some((r:any)=>!approved.includes(r.product_id))))return json({error:'Review and approve the new product series before saving.'},400);
   next=applyImport(before,p);
   changes=[...new Set([...p.changes.map((c:any)=>c.id),...registrations.map((r:any)=>r.id),...(p.removals||[]).map((r:any)=>r.id)])].map(id=>({id,beforeOverride:before[id]??null,afterOverride:next[id]??null}));note=`${p.replacement?'Replaced sales '+p.replacement.year+'/'+p.replacement.fromMonth+'–'+p.replacement.toMonth+'; removed '+p.removals.length+' old records. ':''}Updated ${p.changes.length} cells in ${changes.length} records${registrations.length?'; registered '+registrations.length+' new series':''}`;
  }
  const id=crypto.randomUUID(),revision=s.revision+1,actorEmail=actor.email,time=new Date().toISOString();
  const committed=await commitWorkspace(env.DB,{expectedRevision:s.revision,id,actor:actorEmail,time,note,changes});
  if(!committed)return json({error:'Another session saved first. Reload and preview again.'},409);
  return json({revision,note});
 }catch(e){if(e instanceof SecurityError)return failure(e);return json({error:e instanceof SyntaxError?'Invalid request JSON.':'Unable to save data. No success was confirmed; reload to check the latest revision.'},500)}
}
