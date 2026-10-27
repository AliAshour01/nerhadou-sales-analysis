import {buildFocusComparison} from './focus-comparison-core.js?v=32';
import {comparisonProduct} from './compare-core.js?v=32';
export const finite=Number.isFinite;
// Actual identity preserves source products/packs/channels. Historical comparison opts into its reviewed mapping separately.
export const productName=r=>r.product;
export const productKey=name=>String(name??'').replace(/\s+/g,'').toUpperCase();
export function scopeRecords(records,filters={}){
 return records.filter(r=>Object.entries(filters).every(([key,values])=>!values?.length||(key==='product'?values.some(name=>productKey(name)===productKey(r.product)):values.includes(r[key]))));
}
export function comparableSummary(records,year,months,metric='units',filters={}){
 const selected=[...new Set(months)].filter(m=>Number.isInteger(m)&&m>=1&&m<=12).sort((a,b)=>a-b);
 const yearRecords=records.filter(r=>r.year===year),scoped=scopeRecords(yearRecords,filters);
 // Current Actual is a sparse monthly transaction report. Sum its recorded numeric rows,
 // checking company file coverage before dimension filters; never manufacture absent rows.
 const companyMonthly=yearRecords.filter(r=>r.dataset==='actual'&&r.month>0);
 const transactionReport=companyMonthly.some(r=>r.coverage==='reporting-month'||r.report_group==='Current actual');
 if(transactionReport){
  const rows=scoped.filter(r=>r.dataset==='actual'&&selected.includes(r.month)),values=rows.filter(r=>finite(r[metric]));
  const available=new Set(companyMonthly.map(r=>r.month)),absent=selected.filter(m=>!available.has(m)).length;
  const interrupted=companyMonthly.some(r=>selected.includes(r.month)&&r.reportingIncomplete),missing=rows.length-values.length;
  const estimated=values.filter(r=>r.provenance?.[metric]==='estimated'||r.estimated?.includes(metric)).length;
  const total=values.length?values.reduce((n,r)=>n+r[metric],0):null,partial=!selected.length||!rows.length||absent>0||interrupted||missing>0;
  return {year,rows,total,value:partial?null:total,known:values.length,missing,absent,estimated,partial,review:false,approximate:false,annual:false,reason:!selected.length?'Select months':absent||interrupted?'Reporting month unavailable or excluded':!rows.length?'No source sales rows for this selection':missing?`Missing ${metric} in source rows`:null};
 }
 const cell=buildFocusComparison(scoped,{years:[year],scope:'company',mode:'month',selected,metric,includeEstimates:true}).cells[0];
 const s=cell.sales,hasSubset=Object.values(filters).some(v=>v?.length),allYearProducts=new Set(records.filter(r=>r.dataset==='actual'&&r.year===year&&r.month>0).map(productName)),approved=!!s.approvedKnownTotal&&!hasSubset&&allYearProducts.size>1;
 const value=(!s.partial||approved)&&!s.review?s.total:null;
 return {...s,value,approximate:approved,reason:value!=null?null:!selected.length?'Select months':s.review?'Source period is not verified':!s.rows.length?'No matching records':`Incomplete ${metric} or period coverage`};
}
export function changeBetween(current,previous){
 const delta=finite(current?.value)&&finite(previous?.value)?current.value-previous.value:null;
 return {delta,ppg:delta!=null&&previous.value>0?delta/previous.value*100:null,estimated:!!(current?.estimated||previous?.estimated),approximate:!!(current?.approximate||previous?.approximate)};
}
// Owner-confirmed sparse sales rule, scoped to Movement: absent rows mean no activity
// only when the complete company report covers every selected month. Explicit nulls stay unknown.
function movementSummary(records,year,months,metric,filters){
 const s=comparableSummary(records,year,months,metric,filters);if(s.value!=null||!months.length)return s;
 const company=comparableSummary(records,year,months,metric,{}),report=records.filter(r=>r.dataset==='actual'&&r.year===year&&months.includes(r.month));
 if(company.value==null||months.some(m=>!report.some(r=>r.month===m))||report.some(r=>r.reportingIncomplete))return s;
 const rows=scopeRecords(report,filters);if(rows.some(r=>!finite(r[metric])))return s;
 return {...s,rows,value:rows.reduce((n,r)=>n+r[metric],0),partial:false,reason:null,absentIsZero:true};
}
export function movement(records,{a,b,months,metric='units',dimension='product',filters={}}){
 const scoped=scopeRecords(records,filters),current=movementSummary(records,b,months,metric,filters),previous=movementSummary(records,a,months,metric,filters);
 const total=changeBetween(current,previous);
 if(total.delta==null)return {a,b,current,previous,...total,items:[],reason:`${a}: ${previous.reason||'available'}; ${b}: ${current.reason||'available'}`};
 const candidates=scoped.filter(r=>r.dataset==='actual'&&[a,b].includes(r.year)&&months.includes(r.month)).sort((x,y)=>(x.year===b)-(y.year===b)),names=[...new Map(candidates.map(r=>{const name=dimension==='product'?productName(r):r[dimension]||'NOT PROVIDED';return [dimension==='product'?productKey(name):name,name]})).values()];
 const items=[],unmatched=[];
 for(const name of names){const groupFilters={...filters,[dimension]:[name]},old=movementSummary(records,a,months,metric,groupFilters),now=movementSummary(records,b,months,metric,groupFilters),change=changeBetween(now,old);
  if(change.delta==null)unmatched.push(name);else {const newSales=old.value===0&&now.value>0&&!old.rows?.length;items.push({name,current:now.value,previous:old.value,...change,newSales,activity:newSales?(dimension==='channel'||filters.channel?.length?'New channel':dimension==='product'?'New product':'New sales'):null});}
 }
 items.sort((x,y)=>Math.abs(y.delta)-Math.abs(x.delta)||x.name.localeCompare(y.name));
 const residual=total.delta-items.reduce((n,r)=>n+r.delta,0);
 // Retain a residual only for genuinely unavailable detail or aggregate reconciliation.
 const roundingTolerance=Math.max(1e-7,Number.EPSILON*Math.max(1,Math.abs(current.value),Math.abs(previous.value),items.reduce((n,r)=>n+Math.abs(r.delta),0))*32);
 if(unmatched.length||Math.abs(residual)>roundingTolerance)items.push({name:'Unmatched / unavailable detail',delta:residual,residual:true,unmatched});
 return {a,b,current,previous,...total,items,unmatched,reason:null};
}
export function commonAvailableMonths(records,years,requested,metric='units',filters={}){
 return requested.filter(month=>years.every(year=>comparableSummary(records,year,[month],metric,filters).value!=null));
}
export function runRateProjection(records,year,metric='units',filters={}){
 const months=Array.from({length:12},(_,i)=>i+1),sums=months.map(m=>comparableSummary(records,year,[m],metric,filters));
 const end=sums.findLastIndex(s=>s.value!=null)+1;
 if(end<1||end===12||sums.slice(0,end).some(s=>s.value==null))return {value:null,reason:'Needs complete consecutive months from January and a remaining year period.'};
 const observed=sums.slice(0,end).reduce((n,s)=>n+s.value,0),last=sums.slice(0,end);
 if(last.some(s=>s.value<0||s.estimated))return {value:null,reason:'Selected YTD months contain negative net sales or estimated amounts; projection withheld.'};
 const monthly=observed/end;
 return {value:observed+monthly*(12-end),observed,monthly,through:end,remaining:12-end,reason:null,method:'Actual YTD + average of all complete months from January through the selected cutoff × remaining months. No seasonality adjustment; scenario, not a commitment.'};
}
export function seasonalProjection(records,year,cutoff,metric='units',filters={}){
 const fail=reason=>({value:null,reason});if(!Number.isInteger(cutoff)||cutoff<1||cutoff>=12)return fail('Choose an incomplete year with a YTD cutoff from January to November.');
 const months=Array.from({length:12},(_,i)=>i+1),prior=months.map(m=>comparableSummary(records,year-1,[m],metric,filters)),current=months.slice(0,cutoff).map(m=>comparableSummary(records,year,[m],metric,filters));
 const verified=s=>finite(s.value)&&s.value>=0&&!s.estimated&&!s.approximate&&!s.review;
 if(current.some(s=>!verified(s)))return fail('Needs complete nonnegative actual sales from January through the cutoff; estimated or unverified amounts are excluded.');
 if(prior.some(s=>!verified(s)))return fail('Needs a complete prior year for the same selection: 12 monthly actuals, without missing, estimated or unverified amounts. New products without a prior year cannot use this method.');
 const priorFull=prior.reduce((n,s)=>n+s.value,0),priorYTD=prior.slice(0,cutoff).reduce((n,s)=>n+s.value,0),observed=current.reduce((n,s)=>n+s.value,0);
 if(priorFull<=0||priorYTD<=0)return fail('Prior-year full sales and same-period YTD must both be positive.');
 const share=priorYTD/priorFull;return {value:observed/share,observed,priorFull,priorYTD,share,priorYear:year-1,through:cutoff,reason:null,method:'Current YTD actual divided by the share of prior-year annual sales earned in the same months. Assumes the prior-year seasonal pattern repeats; exceptional tenders, launches or other one-off sales can distort the result. Scenario, not a commitment.'};
}
export function portfolioTarget(records,snapshot,product,chosen,metric,filters={},annual=false){
 const members=records.filter(r=>r.dataset==='actual'&&r.year===snapshot.year&&productKey(r.product)===productKey(product));
 if(['distributor','channel','line'].some(k=>filters[k]?.length&&members.some(r=>!filters[k].includes(r[k]))))return null;
 const targets=records.filter(r=>r.dataset==='target'&&r.year===snapshot.year&&productKey(r.product)===productKey(product)),key=metric==='value'?'target_value':'target_units',ms=annual?Array.from({length:12},(_,i)=>i+1):chosen;
 const scheduled=targets.filter(r=>r.month>0);
 if(scheduled.length){const values=ms.map(m=>{const rows=scheduled.filter(r=>r.month===m);return rows.length===1?rows[0][key]:null});return values.every(finite)?values.reduce((a,b)=>a+b,0):null;}
 const full=targets.filter(r=>r.month===0);return full.length===1&&finite(full[0][key])?full[0][key]/12*ms.length:null;
}
export function targetSum(records,snapshot,products,chosen,metric,filters={},annual=false){
 if(!products.length||!chosen.length)return null;const values=products.map(p=>portfolioTarget(records,snapshot,p,chosen,metric,filters,annual));
 return values.every(finite)?values.reduce((a,b)=>a+b,0):null;
}
export function stockReadiness(records,year,filters={}){
 const all=scopeRecords(records,filters).filter(r=>r.dataset==='stock'&&r.year===year&&r.month>0),month=Math.max(0,...all.map(r=>r.month));
 if(!month)return {ready:false,reason:'No dated stock snapshot for the selected year.'};
 const rows=all.filter(r=>r.month===month),keys=new Set();for(const r of rows){const key=[productName(r),r.distributor,r.channel].join('|');if(keys.has(key)||!finite(r.stock))return {ready:false,month,reason:'Stock has repeated product/distributor/channel totals or missing amounts; review before coverage calculations.'};keys.add(key)}
 return {ready:true,month,rows,reason:'Latest dated snapshot only. Confirm that source quantities represent distinct stock positions before relying on coverage.'};
}
