import {summarize,deltaBetween,monthsFor,comparisonProduct} from './compare-core.js?v=32';

export function buildFocusComparison(records,settings){
 const allActual=records.filter(r=>r.dataset==='actual'),actual=settings.line?allActual.filter(r=>r.line===settings.line):allActual;
 const years=[...new Set(settings.years)].sort((a,b)=>a-b);
 const {scope='company',product='',metric='units',growthBasis='calendar'}=settings;
 const products=scope==='product'?[product]:[];
 const months=monthsFor(settings.mode,settings.month,settings.selected);
 const cache=new Map();
 const get=(year,overrides={})=>{
  const opts={...settings,products,year,metric,...overrides};
  const key=JSON.stringify([year,opts.metric,opts.mode,opts.month,opts.selected,opts.products,opts.includeEstimates,opts.fullCompany]);
  if(!cache.has(key)){
   const source=opts.fullCompany?allActual:actual;let result=applyApprovedCoverage(summarize(source,opts),source,opts);
   if(opts.products.length&&opts.products.every(p=>allActual.some(r=>comparisonProduct(r)===p))&&(result.absent>0||!result.rows.length)&&!result.review&&result.missing===0&&!result.rows.some(r=>r.reportingIncomplete||r.reportingProductIncomplete)){const company=applyApprovedCoverage(summarize(allActual,{...opts,products:[],scope:'company'}),allActual,{...opts,products:[],scope:'company'}),lineKnown=!settings.line||actual.some(r=>r.year===year);
    if(lineKnown&&!company.review&&(!company.partial||company.approvedKnownTotal)&&company.total!=null)result={...result,total:result.rows.length?result.total:0,partial:false,review:false,absent:0,missing:0,noActivity:!result.rows.length};
   }
   cache.set(key,result);
  }
  return cache.get(key);
 };
 const cells=years.map((year,index)=>{
  const sales=get(year),priorYear=growthBasis==='selected'?(index?years[index-1]:null):year-1;
  const previous=priorYear==null?null:get(priorYear);
  const forGrowth=r=>r?.approvedKnownTotal?{...r,partial:false}:r;
  const change=previous?deltaBetween(forGrowth(previous),forGrowth(sales)):{growth:null,delta:null,reason:'No earlier selected year'};
  if(change.growth==null)change.reason=growthExplanation(sales,previous,priorYear,metric);
  const company=scope==='product'?get(year,{products:[],fullCompany:true}):null;
  const share=company&&!sales.partial&&!sales.review&&!company.partial&&!company.review&&company.total>0&&sales.total!=null?sales.total/company.total*100:null;
  const newSales=!!previous?.noActivity&&sales.total>0&&!sales.partial&&!sales.review;
  return {year,sales,priorYear,comparisonSales:previous,newSales,ppg:change.growth,delta:change.delta,reason:change.reason,knownTotalGrowth:change.growth!=null&&!!(sales.approvedKnownTotal||previous?.approvedKnownTotal),estimatedGrowth:!!(sales.estimated||previous?.estimated),share:metric==='value'?share:null,unitShare:metric==='units'?share:null};
 });
 const monthly=years.map(year=>({year,months:months.map(month=>({month,sales:get(year,{mode:'month',selected:[month]})}))}));
 const compositionYear=settings.compositionYear==='all'?'all':years.includes(settings.compositionYear)?settings.compositionYear:years.at(-1);
 let composition=null;
 if(scope==='company'&&compositionYear!=null){
  const compositionYears=compositionYear==='all'?years:[compositionYear],parts=compositionYears.map(year=>get(year));
  const sales={total:parts.some(s=>s.total!=null)?parts.reduce((n,s)=>n+(s.total??0),0):null,rows:parts.flatMap(s=>s.rows),partial:parts.some(s=>s.partial),review:parts.some(s=>s.review),estimated:parts.reduce((n,s)=>n+s.estimated,0)};
  const grouped=new Map();
  for(const r of sales.rows){const name=comparisonProduct(r);if(!grouped.has(name))grouped.set(name,{name,total:null,missing:0,estimated:0});const g=grouped.get(name),estimated=r.provenance?.[metric]==='estimated'||r.estimated?.includes(metric);
   if(typeof r[metric]==='number'&&Number.isFinite(r[metric])&&(settings.includeEstimates!==false||!estimated)){g.total=(g.total??0)+r[metric];g.estimated+=estimated?1:0}else g.missing++;
  }
  const items=[...grouped.values()].sort((a,b)=>a.total==null?b.total==null?a.name.localeCompare(b.name):1:b.total==null?-1:b.total-a.total||a.name.localeCompare(b.name));
  composition={year:compositionYear,years:compositionYears,sales,items:items.map((r,i)=>({...r,rank:r.total==null?null:i+1,share:sales.total>0&&r.total!=null?r.total/sales.total*100:null,shareApproximate:sales.partial||sales.review||r.missing>0}))};
 }

 return {scope,product,metric,years,months,cells,monthly,composition,growthBasis,line:settings.line||null};
}

export function comparisonCSV(model,periodLabel){
 const measure=model.metric==='value'?'Value (EGP)':'Units',headers=['Scope','Period'];
 for(const c of model.cells)headers.push(`${c.year} ${measure}`,`${c.year} PPG% vs ${c.priorYear??'none'}`,...(model.scope==='product'&&model.metric==='value'?[`${c.year} V% of company value`]:[]),`${c.year} Amount status`);
 const row=[model.scope==='company'?'Total company':model.product,periodLabel];
 for(const c of model.cells)row.push(c.sales.total,c.ppg,...(model.scope==='product'&&model.metric==='value'?[c.share]:[]),[c.sales.partial?'Incomplete':'',c.sales.estimated?'Estimated value':'',c.sales.review?'Source scope needs review':''].filter(Boolean).join('; ')||'Source data');
 const quote=v=>'"'+String(typeof v==='string'&&/^\s*[=+@\-]/.test(v)?"'"+v:v??'').replaceAll('"','""')+'"';
 return '\ufeff'+[headers,row].map(r=>r.map(quote).join(',')).join('\n');
}

function growthExplanation(current,previous,priorYear,metric){
 if(priorYear==null)return 'No earlier selected year';
 if(previous.total==null)return `${priorYear}: ${previous.rows.length?'sales amount unavailable':'no data available'}`;
 if(current.total==null)return `${current.year}: sales amount unavailable`;
 if(current.review||previous.review)return '2023: source scope needs review';
 const incomplete=[previous,current].filter(r=>r.partial).map(r=>{const details=[];if(r.missing)details.push(`${r.missing} missing ${metric==='value'?'value':'units'} cells`);if(r.absent)details.push(`${r.absent} missing period / product entries`);return `${r.year}: ${details.join(', ')||'incomplete data'}`});
 if(incomplete.length)return incomplete.join('; ');
 if(previous.total<=0)return `${priorYear}: ${previous.total===0?'zero':'negative'} baseline`;
 return 'Comparable data unavailable';
}

// Comparison-only decisions confirmed by the workspace owner. Raw cells are retained.
function applyApprovedCoverage(summary,records,opts){
 const metric=opts.metric,months=monthsFor(opts.mode,opts.month,opts.selected);
 const approved23=opts.year===2023&&!summary.annual&&months.length>0&&months.every(m=>m<=9);
 const sourceZeroSeries=new Set();
 if(opts.year===2022&&metric==='value')for(const annual of records.filter(r=>r.year===2022&&r.month===0&&r.units===0&&r.value===0)){
  const monthly=records.filter(r=>r.series_id===annual.series_id&&r.month>0);
  if(monthly.length===12&&monthly.every(r=>r.units===0&&(r.value==null||r.value===0)))sourceZeroSeries.add(annual.series_id);
 }
 const ignored=summary.rows.filter(r=>r[metric]==null&&(
  (opts.year===2022&&r.series_id==='P2022_033'&&r.month>=1&&r.month<=7&&r.units==null)||
  (opts.year===2022&&metric==='value'&&sourceZeroSeries.has(r.series_id))||
  (approved23&&(r.units==null||(metric==='value'&&r.units===0)))
 )).length;
 const missing=summary.missing-ignored,partial=missing>0||summary.absent>0||!summary.known;
 // The confirmed 2023 company period may use known value totals, without inventing missing pack values.
 const approvedKnownTotal=approved23&&opts.scope==='company'&&metric==='value'&&summary.total!=null&&summary.absent===0&&missing>0;
 return {...summary,missing,partial,review:approved23?false:summary.review,ignored,approvedKnownTotal};
}
