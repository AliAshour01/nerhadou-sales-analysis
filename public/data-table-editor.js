import {METRICS,previewImport,previewLineAssignments,lineProductKey} from './data-core.js?v=32';

export function createDataEditors({getState,getRecords,getRawRecords,isBusy,save,renderTable,status,html,fmt}){
 const $=id=>document.getElementById(id),labels={units:'Units',value:'Value',target_units:'Target units',target_value:'Target value',stock:'Stock'};
 const cells=new Map(),lines=new Map();let cellRevision=null,lineRevision=null,gridPreview=null,linePreview=null,linePage=0;
 const context=()=>JSON.stringify([getState()?.revision,getState()?.seed.version]);
 const stale=revision=>revision!==null&&revision!==context();
 const allowed=(r,m)=>r.dataset==='actual'?['units','value'].includes(m):r.dataset==='target'?m.startsWith('target_'):r.dataset==='stock'&&m==='stock';
 const value=v=>v===null||v===undefined?'':String(v);
 function cell(r,m){
  const key=JSON.stringify([r.id,m]),draft=cells.get(key),editable=getState()?.isAdmin&&allowed(r,m);
  return (editable?`<input class="data-grid-input${draft?' is-dirty':''}" type="text" inputmode="decimal" value="${html(draft?draft.value:value(r[m]))}" placeholder="Unknown" aria-label="${html(labels[m]+' — '+r.product+' — '+r.year+'/'+r.month)}" data-grid-record="${html(r.id)}" data-grid-metric="${m}" ${isBusy()?'disabled':''}>`:`<span>${fmt(r[m])}</span>`)+(r[m]!=null?`<small class="origin ${html(r.provenance[m])}">${html(r.provenance[m]||'source')}</small>`:'');
 }
 function gridActions(){
  const invalid=stale(cellRevision),busy=isBusy();
  $('grid-edit-status').textContent=invalid?'Shared data changed. Discard these edits and reload before editing again.':`${cells.size} unsaved cells across all table pages. Empty = unknown; 0 = zero; RESET = restore source.`;
  $('grid-review').disabled=!cells.size||busy||invalid||!getState()?.isAdmin;
  $('grid-discard').disabled=!cells.size||busy;
  $('grid-save').disabled=!gridPreview||invalid||busy;
 }
 function clearGrid(){cells.clear();cellRevision=null;gridPreview=null;$('grid-review-panel').hidden=true;gridActions();renderTable()}
 $('data-rows').addEventListener('input',event=>{
  const el=event.target,{gridRecord:id,gridMetric:metric}=el.dataset||{};
  if(!id||!METRICS.includes(metric)||isBusy()||!getState()?.isAdmin)return;
  const row=getRecords().find(r=>r.id===id);if(!row||!allowed(row,metric))return;
  if(cellRevision===null)cellRevision=context();
  const key=JSON.stringify([id,metric]);
  if(el.value===value(row[metric]))cells.delete(key);else cells.set(key,{record_id:id,metric,value:el.value});
  if(!cells.size)cellRevision=null;
  el.classList.toggle('is-dirty',cells.has(key));gridPreview=null;$('grid-review-panel').hidden=true;gridActions();
 });
 $('grid-discard').onclick=clearGrid;
 $('grid-review').onclick=()=>{
  if(!cells.size||stale(cellRevision)||isBusy())return;
  const raw=JSON.stringify([...cells.values()].map(c=>({...c,value:c.value.trim()===''?'CLEAR':c.value}))),p=previewImport(raw,getState().seed,getState().overrides,{mode:'update'});
  gridPreview=p.errors.length||!p.changes.length?null:{raw,revision:cellRevision};
  $('grid-review-panel').hidden=false;
  $('grid-review-summary').textContent=p.errors.length?p.errors.join(' '):`${p.changes.length} metric changes. ${p.warnings.join(' ')}`;
  $('grid-review-rows').innerHTML=p.changes.slice(0,500).map(c=>`<tr><td>${html(c.product)}<small>${c.year}/${c.month}</small></td><td>${html(labels[c.metric])}</td><td>${fmt(c.before)}</td><td>${c.reset?'Original source':c.value===null?'Unknown':fmt(c.value)}</td></tr>`).join('');gridActions();
 };
 $('grid-save').onclick=async()=>{
  if(!gridPreview||stale(gridPreview.revision)||isBusy())return;
  if(await save({raw:gridPreview.raw,importOptions:{mode:'update'}}))clearGrid();else{gridPreview=null;gridActions()}
 };
 function sourceRows(){return getRawRecords().filter(r=>!['retired','catalog'].includes(r.dataset))}
 function groups(){const result=new Map();for(const r of sourceRows().filter(r=>r.dataset==='actual'&&r.month>0)){const item=result.get(lineProductKey(r.product))||{...r,members:[]};item.members.push(r);result.set(lineProductKey(r.product),item)}return [...result.values()].sort((a,b)=>a.product.localeCompare(b.product)||a.distributor.localeCompare(b.distributor))}
 function lineActions(){
  const invalid=stale(lineRevision);$('line-edit-status').textContent=invalid?'Shared data changed. Discard these changes and review the latest data.':`${lines.size} unsaved products. Line corrections affect ALL years and future imports of the same source product.`;
  $('line-review').disabled=!lines.size||invalid||isBusy()||!getState()?.isAdmin;
  $('line-discard').disabled=!lines.size||isBusy();$('line-save').disabled=!linePreview||invalid||isBusy();
 }
 function renderLines(){
  if(!getState())return;
  const all=sourceRows(),known=[...new Set(all.flatMap(r=>[r.line,r.source_line]).filter(Boolean))].sort(),old=$('assignment-line-filter').value;
  $('assignment-line-filter').innerHTML='<option value="">All lines</option>'+known.map(l=>`<option value="${html(l)}">${html(l)}</option>`).join('');$('assignment-line-filter').value=known.includes(old)?old:'';
  const needle=$('line-search').value.toLowerCase(),filtered=groups().filter(r=>(!$('assignment-line-filter').value||r.members.some(x=>x.line===$('assignment-line-filter').value))&&[r.product,...r.members.map(x=>x.line)].join(' ').toLowerCase().includes(needle));
  const max=Math.max(1,Math.ceil(filtered.length/30));linePage=Math.min(linePage,max-1);
  $('line-count').textContent=filtered.length+' products across all years. Different source names, packs and Tender remain separate.';
  $('line-page').textContent=`Page ${linePage+1} of ${max}`;$('line-prev').disabled=linePage===0;$('line-next').disabled=linePage>=max-1;
  $('line-rows').innerHTML=filtered.slice(linePage*30,linePage*30+30).map(r=>{
   const current=[...new Set(r.members.map(x=>x.line))],original=[...new Set(r.members.map(x=>x.source_line))],selected=lines.has(r.product)?lines.get(r.product):(current.length===1?current[0]:'');
   const options=[['','Choose a line'],...known.map(l=>[l,l]),['__SOURCE__','Restore source line']];
   return `<tr><td><b>${html(r.product)}</b><small>Years: ${html([...new Set(r.members.map(x=>x.year))].sort().join(", "))}</small></td><td>${html(original.join(' / '))}</td><td>${html(current.join(' / '))}</td><td><select data-line-product="${html(r.product)}" aria-label="${html('Line for '+r.product+' in all years')}" ${isBusy()||!getState().isAdmin?'disabled':''}>${options.map(([v,l])=>`<option value="${html(v)}" ${v===selected?'selected':''}>${html(l)}</option>`).join('')}</select></td></tr>`;
  }).join('')||'<tr><td colspan="4">No product series match.</td></tr>';lineActions();
 }
 function clearLines(){lines.clear();lineRevision=null;linePreview=null;$('line-review-panel').hidden=true;renderLines()}
 $('line-rows').addEventListener('change',event=>{
  const el=event.target,id=el.dataset?.lineProduct;if(!id||isBusy()||!getState()?.isAdmin)return;
  if(lineRevision===null)lineRevision=context();
  if(!el.value)lines.delete(id);else lines.set(id,el.value);
  if(!lines.size)lineRevision=null;linePreview=null;$('line-review-panel').hidden=true;lineActions();
 });
 $('line-discard').onclick=clearLines;
 $('assignment-line-filter').onchange=()=>{linePage=0;renderLines()};$('line-search').oninput=()=>{linePage=0;renderLines()};
 $('line-prev').onclick=()=>{linePage--;renderLines()};$('line-next').onclick=()=>{linePage++;renderLines()};
 $('line-review').onclick=()=>{
  if(!lines.size||stale(lineRevision)||isBusy())return;
  const input={assignments:[...lines].map(([product,line])=>({product,line:line==='__SOURCE__'?null:line}))};
  try{const p=previewLineAssignments(getState().seed,getState().overrides,input);linePreview=p.changes.length?{input,revision:lineRevision}:null;
   $('line-review-panel').hidden=false;$('line-review-summary').textContent=`${p.changes.length} source products across ALL years. Sales amounts remain unchanged.`;
   $('line-review-rows').innerHTML=p.changes.map(c=>`<tr><td>${html(c.product)}<small>Years: ${html(c.years.join(", "))}</small></td><td>${html(c.beforeLines.join(' / '))}</td><td>${c.line===null?'Original source line':html(c.line)}</td><td>${c.records}</td></tr>`).join('');
  }catch(e){linePreview=null;status(e.message,true)}lineActions();
 };
 $('line-save').onclick=async()=>{
  if(!linePreview||stale(linePreview.revision)||isBusy())return;
  if(await save({lineAssignments:linePreview.input}))clearLines();else{linePreview=null;lineActions()}
 };
 function refresh(){
  if(!getState())return;
  if(stale(cellRevision)){gridPreview=null;$('grid-review-panel').hidden=true}if(stale(lineRevision)){linePreview=null;$('line-review-panel').hidden=true}
  gridActions();renderLines();
 }
 return {cell,refresh,actions:()=>{gridActions();lineActions()}};
}
