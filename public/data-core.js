export const METRICS=['units','value','target_units','target_value','stock'];
const owns=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export function effectiveRecords(seed,overrides={},options={}){
 const base=new Map(seed.records.map(r=>[r.id,r]));
 for(const [id,o] of Object.entries(overrides))if(o.record&&!base.has(id))base.set(id,o.record);
 const excludedPeriods=new Set(),excludedProductPeriods=new Set();for(const r of base.values())if(r.dataset==='actual'&&r.month>0&&overrides[r.id]?.excluded&&!overrides[r.id]?.replacedByImport){excludedPeriods.add(r.year+'|'+r.month);excludedProductPeriods.add(r.year+'|'+r.month+'|'+(r.comparison_product||r.product))}
 return [...base.values()].filter(r=>options.includeExcluded||(!overrides[r.id]?.excluded&&!overrides[r.id]?.replacedByImport)).map(r=>{
  const o=overrides[r.id]?.fields||{},out={...r,excluded:!!overrides[r.id]?.excluded,replacedByImport:!!overrides[r.id]?.replacedByImport,reportingIncomplete:excludedPeriods.has(r.year+'|'+r.month),reportingProductIncomplete:excludedProductPeriods.has(r.year+'|'+r.month+'|'+(r.comparison_product||r.product)),provenance:{},estimated:[...(r.estimated||[])]};
  for(const m of METRICS){
   if(owns(o,m)){out[m]=o[m];out.provenance[m]='manual';out.estimated=out.estimated.filter(x=>x!==m)}
   else out.provenance[m]=(r.estimated||[]).includes(m)?'estimated':(r.confirmed||[]).includes(m)?'user confirmed':'source';
  }
  if(r.dataset==='actual'&&r.month>0&&Number.isFinite(seed.prices[r.series_id])&&!owns(o,'value')&&(r.estimated?.includes('value')||r.value==null)){
   out.value=typeof out.units==='number'?out.units*seed.prices[r.series_id]:null;out.provenance.value='estimated';if(!out.estimated.includes('value'))out.estimated.push('value');
  }
  return out;
 });
}
function csvRows(text,delimiter){
 const rows=[];let row=[],cell='',quoted=false,ended=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++}else{quoted=false;ended=true}}else cell+=c;continue}
  if(c==='"'){if(cell.trim()||ended)throw Error('Unexpected quote. Quote the entire CSV cell.');quoted=true;continue}
  if(c===delimiter){row.push(cell);cell='';ended=false}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';ended=false}
  else{if(ended&&!/\s/.test(c))throw Error('Unexpected text after closing quote.');cell+=c}
 }
 if(quoted)throw Error('Unclosed quote.');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
const headerAliases={actual_units:'units',actual_value:'value',lc_value:'value',target_val:'target_value',id:'record_id'};
const allowed=new Set(['record_id','product_id','year','month','dataset','metric','units','value','target_units','target_value','stock','channel','distributor','product','line']);
function normalizeHeader(s){s=String(s).replace(/^\uFEFF/,'').trim().toLowerCase().replace(/\s+/g,'_');return headerAliases[s]||s}
function parseRows(raw){
 const text=raw.replace(/^\uFEFF/,'').replace(/^[\r\n]+|[\r\n]+$/g,'');if(!text.trim())throw Error('Paste data first.');if(text.length>2000000)throw Error('This import exceeds 2 million characters. Use a smaller reporting scope.');
 if(text.trimStart()[0]==='['||text.trimStart()[0]==='{'){
  let parsed;try{parsed=JSON.parse(text)}catch{throw Error('Invalid JSON. Use an array of row objects.');}
  const rows=Array.isArray(parsed)?parsed:parsed.rows;
  if(!Array.isArray(rows))throw Error('JSON must be an array or an object with rows.');
  return rows.map(r=>{if(!r||Array.isArray(r)||typeof r!=='object')throw Error('Each JSON row must be an object.');const o={};for(const [k,v] of Object.entries(r)){const h=normalizeHeader(k);if(!allowed.has(h))throw Error('Unknown column: '+k);if(owns(o,h))throw Error('Duplicate column: '+h);o[h]=v}return o});
 }
 const first=text.split(/\r?\n/,1)[0],delim=first.includes('\t')?'\t':',';
 const rows=csvRows(text,delim);const headers=(rows.shift()||[]).map(normalizeHeader);
 if(new Set(headers).size!==headers.length)throw Error('Repeated column names.');
 for(const h of headers)if(!allowed.has(h))throw Error('Unknown column: '+h);
 return rows.map((r,i)=>{if(r.length!==headers.length)throw Error(`Row ${i+2}: ${r.length} cells for ${headers.length} columns. Quote numbers containing commas.`);return Object.fromEntries(headers.map((h,j)=>[h,r[j]]))});
}
function numberCell(v){
 if(v===null||v===undefined||String(v).trim()===''||String(v).trim()==='-')return {skip:true};
 if(String(v).trim().toUpperCase()==='CLEAR')return {value:null};
 if(String(v).trim().toUpperCase()==='RESET')return {reset:true};
 const s=String(v).trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[٬,\s]/g,'').replace(/٫/g,'.');
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))throw Error('Invalid number: '+String(v).slice(0,50));
 const n=Number(s);if(!Number.isFinite(n)||Math.abs(n)>1e14)throw Error('Number is outside the supported range.');return {value:n};
}
const monthNames=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
function monthNumber(v){const s=String(v??'').trim().toLowerCase();if(['0','fy','annual'].includes(s))return 0;if(/^\d+$/.test(s)&&Number(s)>=1&&Number(s)<=12)return Number(s);const m=monthNames.indexOf(s);if(m>=0)return m+1;throw Error('Month must be 1–12, Jan–Dec, or FY.');}
const cleanName=v=>String(v??'').trim().replace(/\s+/g,' ').toLocaleLowerCase();
function seriesKey(r){return JSON.stringify(['product','channel','distributor','line'].map(k=>cleanName(r[k])))}
function newSeriesId(key){let a=2166136261,b=5381;for(const c of key){a=Math.imul(a^c.codePointAt(0),16777619);b=Math.imul(b,33)^c.codePointAt(0)}return 'CUSTOM_IMPORT_'+(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0')}
export function previewImport(raw,seed,overrides={},options={}){
 const replacing=options.mode==='replace';
 if(options.mode&& !['update','replace'].includes(options.mode))return {changes:[],errors:['Choose update or replace.'],warnings:[]};
 if(replacing&&(!Number.isInteger(options.year)||options.year<2000||options.year>2100||!Number.isInteger(options.fromMonth)||!Number.isInteger(options.toMonth)||options.fromMonth<1||options.toMonth>12||options.fromMonth>options.toMonth))return {changes:[],errors:['Choose the replacement year and a valid month range.'],warnings:[]};
 const current=effectiveRecords(seed,overrides,{includeExcluded:true}),byId=new Map(current.map(r=>[r.id,r])),catalog=new Map(current.map(r=>[r.product_id,r]));
 let rows;try{rows=parseRows(raw)}catch(e){return {changes:[],errors:[e.message],warnings:[]}}
 const changes=[],errors=[],seen=new Set(),warnings=[],newSeries=new Map(),incomingIds=new Set();
 if(rows.length>10000)return {changes:[],errors:['Use at most 10,000 rows per import.'],warnings:[]};
 for(let i=0;i<rows.length;i++){
  const row=rows[i];try{
   let record;
   if(row.record_id){record=byId.get(String(row.record_id).trim());if(!record)throw Error('Unknown record_id. Copy it from Data tables.');
    for(const k of ['product_id','year','dataset','channel','distributor','product','line'])if(row[k]!=null&&String(row[k]).trim()!==''&&String(record[k])!==String(row[k]).trim())throw Error(k+' conflicts with record_id.');
    if(row.month!=null&&String(row.month).trim()!==''&&record.month!==monthNumber(row.month))throw Error('month conflicts with record_id.');
   }else{
    const pid=String(row.product_id??'').trim();let template=catalog.get(pid),nameMatched=false;
    if(pid&&!template)throw Error('Unknown product_id. For a new series leave product_id blank and supply product, channel, distributor and line.');
    if(!pid){
     for(const k of ['product','channel','distributor'])if(!String(row[k]??'').trim())throw Error('Without an ID, supply product, channel and distributor.');
     for(const k of ['product','channel','distributor','line'])if(String(row[k]??'').trim().length>160||/[\r\n\x00-\x1f]/.test(String(row[k]??'')))throw Error('Names must be below 160 characters without line breaks.');
     const candidates=[...new Map(current.filter(r=>r.dataset!=='retired'&&['product','channel','distributor'].every(k=>cleanName(r[k])===cleanName(row[k]))&&(!String(row.line??'').trim()||cleanName(row.line)===cleanName(r.line))).map(r=>[r.product_id,r])).values()];
     if(candidates.length>1)throw Error('Several catalog series match. Supply the exact product_id from the catalog.');
     template=candidates[0];nameMatched=!!template;
     if(!template){
      if(!String(row.line??'').trim())throw Error('A new series also needs line. Use NOT PROVIDED if unknown.');
      const details=Object.fromEntries(['product','channel','distributor','line'].map(k=>[k,String(row[k]).trim()])),key=seriesKey(details),newId=newSeriesId(key);
      if(catalog.has(newId)&&seriesKey(catalog.get(newId))!==key)throw Error('Series identifier collision. Register this series in Data tables.');
      template={...details,id:newId+'-catalog',series_id:newId,product_id:newId,year:0,month:0,dataset:'catalog',source:'Admin-reviewed import registration',units:null,value:null,estimated:[]};
     }
    }

    const year=Number(row.year);if(!Number.isInteger(year)||year<2000||year>2100)throw Error('Year must be 2000–2100.');
    const month=monthNumber(row.month),dataset=String(row.dataset||(template.dataset==='catalog'?'actual':template.dataset)).trim();if(!['actual','target','stock'].includes(dataset))throw Error('dataset must be actual, target or stock.');
    for(const k of ['channel','distributor','product','line'])if(row[k]&&cleanName(row[k])!==cleanName(template[k]))throw Error(k+' differs from the catalog. Choose the correct product_id.');
    const matching=nameMatched?current.filter(r=>r.product_id===template.product_id&&r.year===year&&r.month===month&&r.dataset===dataset):[];
    if(matching.length>1)throw Error('Several records match this period. Use the exact record_id from Data tables.');
    const id=matching[0]?.id||`${template.series_id}-${year}-${String(month).padStart(2,'0')}-${dataset}`;
    record=byId.get(id)||{...template,id,year,month,dataset,coverage:template.coverage||(template.report_group==='Current actual'||template.dataset==='catalog'?'reporting-month':undefined),units:null,value:null,target_units:null,target_value:null,stock:null,estimated:[],provenance:{},source:'Manual entry'};
    if(!catalog.has(template.product_id))record.newSeriesDetails=template;
   }
   if(record.dataset==='retired')throw Error('This source was superseded. Reload and use the current record ID.');
   if(record.dataset==='target'){
    if(record.month!==0)throw Error('Target entries currently use annual totals: month=FY.');
    const existing=current.find(r=>r.dataset==='target'&&r.year===record.year&&r.month===0&&r.product===record.product&&r.id!==record.id);
    if(existing)throw Error('A target already exists for this product/year. Use record_id '+existing.id+'.');
   }
   let cells;
   if(replacing){
    if(record.dataset!=='actual'||record.month===0)throw Error('Full replacement accepts monthly actual sales only. Targets, stock and annual totals must be imported separately.');
    if(record.year!==options.year||record.month<options.fromMonth||record.month>options.toMonth)throw Error('This row falls outside the selected replacement period.');
    if(row.metric)throw Error('Use units/value columns for full replacement, not metric/value rows.');
    if(METRICS.some(m=>!['units','value'].includes(m)&&owns(row,m)))throw Error('Full replacement only accepts Units and Value.');
    incomingIds.add(record.id);
    cells=['units','value'].map(m=>[m,row[m]]);
   }else if(row.metric){const m=normalizeHeader(row.metric);if(!METRICS.includes(m))throw Error('Unknown metric.');if(METRICS.some(k=>k!=='value'&&owns(row,k)))throw Error('Use either metric/value or wide metric columns.');cells=[[m,row.value]]}
   else cells=METRICS.filter(m=>owns(row,m)).map(m=>[m,row[m]]);
   if(!cells.length)throw Error('No metric columns supplied.');
   for(const [metric,v] of cells){let cell=numberCell(v);if(replacing){if(cell.reset)throw Error('RESET is not allowed in full replacement.');if(cell.skip)cell={value:null}}else if(cell.skip)continue;
    if(record.dataset==='actual'&&!['units','value'].includes(metric)||record.dataset==='target'&&!metric.startsWith('target_')||record.dataset==='stock'&&metric!=='stock')throw Error('Metric '+metric+' does not belong to '+record.dataset+'.');
    if(record.dataset==='stock'&&record.month===0)throw Error('Stock requires a month (dated snapshot).');
    const key=record.id+'|'+metric;if(seen.has(key))throw Error('Duplicate record/metric in this paste.');seen.add(key);
    if(cell.reset&&!owns(overrides[record.id]?.fields||{},metric)){continue}
    if(!replacing&&!cell.reset&&record[metric]===cell.value&&record.provenance?.[metric]==='manual'&&!overrides[record.id]?.excluded&&!overrides[record.id]?.replacedByImport)continue;
    if(record.newSeriesDetails){newSeries.set(record.product_id,record.newSeriesDetails);delete record.newSeriesDetails}
    changes.push({id:record.id,restoreExcluded:!!overrides[record.id]?.excluded,restoreReplaced:!!overrides[record.id]?.replacedByImport,metric,before:record[metric]??null,value:cell.value??null,reset:!!cell.reset,record:!byId.has(record.id)?record:undefined,product:record.product,year:record.year,month:record.month});
   }
  }catch(e){errors.push(`Row ${i+1}: ${e.message}`)}
 }
 if(changes.length>20000)errors.push('Use at most 20,000 cell changes per import.');
 if(changes.some(c=>c.restoreExcluded))warnings.push('Supplied data restores period records previously hidden by the reporting cutoff.');
 if(changes.some(c=>c.value<0))warnings.push('Negative amounts are retained as signed adjustments.');
 if(!replacing&&changes.some(c=>c.record))warnings.push('New period records will be created. Unprovided metrics remain unknown.');
 if(!replacing&&changes.some(c=>c.metric==='units'&&Number.isFinite(seed.prices[(byId.get(c.id)||c.record)?.series_id])))warnings.push('Changing units recalculates estimated value using the fixed original annual average price; manual values stay unchanged.');
 const registrations=[...newSeries.values()].filter(r=>changes.some(c=>c.record?.product_id===r.product_id));
 for(const r of registrations){const related=[...new Set(current.filter(x=>x.dataset!=='retired'&&(cleanName(x.product)===cleanName(r.product)||cleanName(x.product).replace(/[^a-z0-9\u0600-\u06ff]/g,'')===cleanName(r.product).replace(/[^a-z0-9\u0600-\u06ff]/g,''))).map(x=>x.product+' · '+x.channel+' · '+x.distributor+' · '+x.line))].slice(0,5);r.related=related}
 if(registrations.length)warnings.push('New series require explicit approval. Check spelling, strength, channel and distributor; similar names are never merged automatically.');
 const removals=[];
 if(replacing){
  if(!changes.some(c=>typeof c.value==='number'))errors.push('A replacement must contain at least one numeric sales amount. Empty templates cannot replace data.');
  if(!errors.length){
   for(const record of current)if(record.dataset==='actual'&&record.year===options.year&&!record.replacedByImport&&(record.month===0||record.month>=options.fromMonth&&record.month<=options.toMonth)&&!incomingIds.has(record.id))removals.push({id:record.id,product:record.product,year:record.year,month:record.month,units:record.units,value:record.value,annual:record.month===0});
   warnings.push('FULL REPLACEMENT: all company sales in the selected months are replaced. Omitted rows are removed from reporting; blank or omitted Units/Value become unknown. Targets and stock are unchanged. Old annual controls for this year are set aside to avoid stale totals.');
  }
 }
 return {changes,errors,warnings,newSeries:registrations,removals,replacement:replacing?{year:options.year,fromMonth:options.fromMonth,toMonth:options.toMonth}:null};
}
export function applyChanges(overrides,changes){const next=structuredClone(overrides);for(const c of changes){const item=next[c.id]??={fields:{}};if(c.record)item.record=c.record;if(c.restoreExcluded)delete item.excluded;if(c.restoreReplaced)delete item.replacedByImport;if(c.reset)delete item.fields[c.metric];else item.fields[c.metric]=c.value;if(!Object.keys(item.fields).length&&!item.excluded)delete next[c.id]}return next}
export function applyImport(overrides,preview){
 const next=applyChanges(overrides,preview.changes);
 for(const r of preview.removals||[]){const item=next[r.id]??={fields:{}};item.replacedByImport=true;delete item.excluded}
 for(const r of preview.newSeries||[]){const {related,...record}=r;next[record.id]={record,fields:{}}}
 return next;
}
export function actualYears(records){return [...new Set(records.filter(r=>r.dataset==='actual'&&r.month>0).map(r=>r.year))].sort((a,b)=>a-b)}
export function snapshotFrom(seed,overrides={},options={}){
 const records=effectiveRecords(seed,overrides),availableYears=actualYears(records),latestYear=availableYears.at(-1)??null,year=options.year??latestYear;
 const rows=records.filter(r=>r.dataset==='actual'&&r.year===year&&r.month>0).map(r=>({month:r.month,product:r.product,line:r.line,distributor:r.distributor,channel:r.channel,units:r.units,value:r.value,reportingIncomplete:r.reportingIncomplete}));
 const targets=Object.fromEntries(records.filter(r=>r.dataset==='target'&&r.year===year&&r.month===0).map(r=>[r.product,{monthly:r.target_units==null?null:r.target_units/12,monthlyValue:r.target_value==null?null:r.target_value/12,price:r.target_units>0&&r.target_value!=null?r.target_value/r.target_units:r.target_units===0&&r.target_value===0?(r.source_price??0):null}]));
 const monthlyTargets=Object.create(null);for(const r of records.filter(r=>r.dataset==='target'&&r.year===year&&r.month>0)){const p=monthlyTargets[r.product]??={};p[r.month]={target_units:r.target_units,target_value:r.target_value}}
 return {rows,targets,monthlyTargets,source:seed.source,year,latestYear,availableYears,availableMonths:[...new Set(rows.map(r=>r.month))].sort((a,b)=>a-b),incompleteMonths:[...new Set(rows.filter(r=>r.reportingIncomplete).map(r=>r.month))].sort((a,b)=>a-b)};
}
export function previewReportingCutoff(seed,overrides,year,throughMonth){
 if(!Number.isInteger(year)||!Number.isInteger(throughMonth)||throughMonth<1||throughMonth>12)throw Error('Choose a valid year and reporting month.');
 const rows=effectiveRecords(seed,overrides,{includeExcluded:true}).filter(r=>r.dataset==='actual'&&r.year===year&&!r.replacedByImport);
 if(!rows.some(r=>r.month>0))throw Error('No monthly actual data exists in this year.');
 const changes=[];for(const r of rows){const excluded=r.month===0?throughMonth<12:r.month>throughMonth;if(excluded!==!!overrides[r.id]?.excluded){const beforeOverride=overrides[r.id]??null,next=structuredClone(beforeOverride||{fields:{}});if(excluded)next.excluded=true;else delete next.excluded;changes.push({id:r.id,product:r.product,month:r.month,excluded,beforeOverride,afterOverride:!Object.keys(next.fields||{}).length&&!next.record&&!next.excluded?null:next})}}
 return {year,throughMonth,changes,hidden:changes.filter(c=>c.excluded).length,restored:changes.filter(c=>!c.excluded).length};
}
export function periodTemplate(seed,overrides,{sourceYear,year,month,batch=0}){
 if(!Number.isInteger(year)||year<2000||year>2100||!Number.isInteger(month)||month<1||month>12)throw Error('Choose a valid year and month.');
 const rows=effectiveRecords(seed,overrides,{includeExcluded:true}).filter(r=>(r.dataset==='actual'&&r.year===sourceYear&&r.month>0)||r.dataset==='catalog'),series=[...new Map(rows.map(r=>[r.product_id,r])).values()].sort((a,b)=>[a.product,a.distributor,a.channel,a.line].join('|').localeCompare([b.product,b.distributor,b.channel,b.line].join('|')));
 if(!series.length)throw Error('No source series available for this year.');
 const size=250,batches=Math.ceil(series.length/size);if(!Number.isInteger(batch)||batch<0||batch>=batches)throw Error('Choose a valid batch.');
 return {total:series.length,batches,rows:series.slice(batch*size,(batch+1)*size).map(r=>({product_id:r.product_id,product:r.product,distributor:r.distributor,channel:r.channel,line:r.line,year,month,dataset:'actual',units:'',value:''}))};
}
