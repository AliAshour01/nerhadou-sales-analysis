import {comparableSummary,scopeRecords,productName,productKey,targetSum} from './management-core.js?v=32';
export function breakdownModel(records,d,{metric='units',dimension='product'}={}){
 if(!['units','value'].includes(metric)||!['product','line'].includes(dimension))throw Error('Unsupported breakdown measure or grouping.');
 const months=[...new Set(d.months)],filters=d.selection||{},scoped=scopeRecords(records,filters).filter(r=>r.dataset==='actual'&&r.year===d.snapshot.year&&months.includes(r.month));
 const groups=new Map();for(const r of scoped){const name=dimension==='product'?productName(r):r.line||'NOT PROVIDED',key=dimension==='product'?productKey(name):name;if(!groups.has(key))groups.set(key,name)}
 const total=comparableSummary(records,d.snapshot.year,months,metric,filters),rows=[...groups.values()].map(name=>{
  const groupFilters={...filters,[dimension]:[name]},sales=comparableSummary(records,d.snapshot.year,months,metric,groupFilters);
  const products=[...new Map(scopeRecords(scoped,groupFilters).map(r=>[productKey(productName(r)),productName(r)])).values()];
  const target=targetSum(records,d.snapshot,products,months,metric,groupFilters,d.targetBasis==='annual'),actual=sales.value;
  return {name,actual,share:actual!=null&&total.value>0?actual/total.value*100:null,target,achievement:actual!=null&&target>0?actual/target*100:null,gap:actual!=null&&target!=null?Math.max(0,target-actual):null,variance:actual!=null&&target!=null?actual-target:null,estimated:!!sales.estimated,partial:!!sales.partial,reason:sales.reason||null};
 }).sort((a,b)=>a.actual==null?b.actual==null?a.name.localeCompare(b.name):1:b.actual==null?-1:b.actual-a.actual||a.name.localeCompare(b.name));
 const positiveGap=rows.reduce((s,r)=>s+(r.gap??0),0);for(const r of rows)r.gapShare=r.gap!=null&&positiveGap>0?r.gap/positiveGap*100:null;
 return {metric,dimension,rows,total:total.value,knownTotal:total.total,partial:!!total.partial,reason:total.reason,positiveGap,estimated:!!total.estimated,negative:rows.some(r=>r.actual<0)};
}
export function breakdownTop(model,mode='sales',limit=8){
 if(!['sales','gap'].includes(mode))throw Error('Unsupported ranking.');
 const items=model.rows.filter(r=>mode==='gap'?r.gap>0:r.actual!=null).sort((a,b)=>(mode==='gap'?b.gap-a.gap:b.actual-a.actual)||a.name.localeCompare(b.name));
 return {items:items.slice(0,limit),count:items.length,shown:Math.min(limit,items.length),coverage:mode==='sales'&&model.total>0?items.slice(0,limit).reduce((s,r)=>s+r.actual,0)/model.total*100:null};
}
