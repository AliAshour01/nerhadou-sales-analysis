export function monthsFor(mode,month=8,selected=[]){return mode==='annual'?Array.from({length:12},(_,i)=>i+1):mode==='month'?Array.from(new Set(selected)).filter(m=>Number.isInteger(m)&&m>=1&&m<=12).sort((a,b)=>a-b):Array.from({length:Math.max(0,Math.min(12,Number(month)))},(_,i)=>i+1)}
export const comparisonProduct=r=>r.comparison_product||r.product;
export function sourceRows(records,year,mode,months,products=[]){
 let rows=records.filter(r=>r.dataset==='actual'&&r.year===year&&(!products.length||products.includes(comparisonProduct(r))));
 const monthsPresent=new Set(rows.filter(r=>r.month>0).map(r=>r.month));
 // Complete monthly histories own annual totals, so backfills and edits update every aggregate.
 if(mode==='annual'&&year!==2022&&!(year!==2023&&monthsPresent.size===12)&&rows.some(r=>r.month===0))return {rows:rows.filter(r=>r.month===0),annual:true};
 return {rows:rows.filter(r=>r.month>0&&months.includes(r.month)),annual:false};
}
export function summarize(records,{year,mode='ytd',month=8,selected=[],metric='units',products=[],includeEstimates=true}){
 const months=monthsFor(mode,month,selected),source=sourceRows(records,year,mode,months,products),rows=source.rows;
 if(!months.length&&mode!=='annual')return {year,total:null,known:0,missing:0,estimated:0,absent:0,partial:true,review:false,rows:[],annual:false,empty:true};
 const monthly=records.filter(r=>r.dataset==='actual'&&r.year===year&&r.month>0&&(!products.length||products.includes(comparisonProduct(r))));
 const expected=(source.annual?[0]:months),present=new Set(rows.map(r=>r.series_id+'|'+r.month));
 // For annual-only source years, the annual catalog defines the expected products.
 const series=new Set((source.annual?rows:monthly.length?monthly:records.filter(r=>r.dataset==='actual'&&r.year===year&&r.month===0&&(!products.length||products.includes(comparisonProduct(r))))).map(r=>r.series_id));
 let absent=0;for(const sid of series)for(const m of expected)if(!present.has(sid+'|'+m))absent++;
 // Entire product absence is unknown, not a zero baseline.
 if(monthly.some(r=>r.coverage==='reporting-month'||r.report_group==='Current actual')&&!source.annual){const presentMonths=new Set(rows.map(r=>r.month));if(!products.length)absent=expected.filter(m=>!presentMonths.has(m)).length;else{absent=0;for(const p of products)for(const m of expected)if(!rows.some(r=>comparisonProduct(r)===p&&r.month===m))absent++;}}
 absent+=new Set(rows.filter(r=>products.length?r.reportingProductIncomplete:r.reportingIncomplete).map(r=>r.month)).size;
 const unavailableProducts=products.filter(p=>!rows.some(r=>comparisonProduct(r)===p)).length;
 const values=rows.filter(r=>typeof r[metric]==='number'&&Number.isFinite(r[metric])&&(includeEstimates||r.provenance?.[metric]!=='estimated'&&!r.estimated?.includes(metric)));
 const estimated=values.filter(r=>r.provenance?.[metric]==='estimated'||r.estimated?.includes(metric)).length;
 const missing=rows.length-values.length,total=values.length?values.reduce((s,r)=>s+r[metric],0):null,review=year===2023&&rows.length>0;
 return {year,total,known:values.length,missing,estimated,absent:absent+unavailableProducts,partial:missing>0||absent>0||unavailableProducts>0||!values.length,review,rows,annual:source.annual,empty:false};
}
export function deltaBetween(a,b){if(a.total==null||b.total==null||a.partial||b.partial||a.review||b.review)return {delta:null,growth:null,reason:'Incomplete or unverified scope'};return {delta:b.total-a.total,growth:a.total>0?(b.total-a.total)/a.total*100:null,reason:a.total<=0?'No positive baseline':null}}
export function compareProducts(records,settings){
 const products=settings.products?.length?settings.products:[...new Set(records.filter(r=>r.dataset==='actual'&&[settings.a,settings.b].includes(r.year)).map(comparisonProduct))].sort();
 return products.map(product=>{const a=summarize(records,{...settings,year:settings.a,products:[product]}),b=summarize(records,{...settings,year:settings.b,products:[product]});return {product,a,b,...deltaBetween(a,b)}});
}
export function monthlyComparison(records,settings){return monthsFor(settings.mode,settings.month,settings.selected).map(month=>{const a=summarize(records,{...settings,year:settings.a,mode:'month',selected:[month]}),b=summarize(records,{...settings,year:settings.b,mode:'month',selected:[month]});return {month,a,b,...deltaBetween(a,b)}})}
