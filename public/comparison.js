import {commonAvailableMonths} from './management-core.js?v=32';
import {buildFocusComparison} from './focus-comparison-core.js?v=32';
import {comparisonWorkbook} from './comparison-xlsx.js?v=32';
import {comparisonProduct} from './compare-core.js?v=32';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const palette=['#8070a0','#ba8d4d','#98a3ac','#406c9a','#d59a65','#245fa7'];
const number=n=>n==null?'—':n.toLocaleString('en-US',{maximumFractionDigits:0});
const compact=n=>n==null?'—':Math.abs(n)>=1e9?(n/1e9).toFixed(1)+'B':Math.abs(n)>=1e6?(n/1e6).toFixed(1)+'M':Math.abs(n)>=1e3?(n/1e3).toFixed(0)+'K':number(n);
const percent=n=>n==null?'—':(Math.abs(n)<.05?0:n).toFixed(1)+'%';
const signedPercent=n=>n==null?'—':(n>0?'+':'')+percent(n);
const mark=s=>(s.partial&&s.total!=null?' *':'')+(s.estimated?' †':'');
const measure=metric=>metric==='value'?'Value · EGP':'Units';
let matchedMonths=null;
let payload=null,allYears=[],productNames=[],model=null,modelKey='',modelRecords=null,defaultMonth=8,followAllYears=true,followLatestThrough=true;
const state={scope:'company',metrics:{company:'units',product:'units'},product:'',years:new Set(),mode:'ytd',month:8,selected:new Set([8]),growthBasis:'calendar',compositionYear:null};
const currentMetric=()=>state.metrics[state.scope];
const color=year=>palette[Math.max(0,allYears.indexOf(year))%palette.length];
const focusName=()=>state.scope==='company'?'Total company':state.product;
function period(){if(matchedMonths!==null)return 'Common months: '+(matchedMonths.map(m=>months[m-1]).join(', ')||'none');return state.mode==='annual'?'Full year':state.mode==='ytd'?'YTD Jan–'+months[state.month-1]:[...state.selected].sort((a,b)=>a-b).map(m=>months[m-1]).join(', ')}
function amountTip(year,sales){return `${focusName()} · ${year} · ${period()} · ${currentMetric()==='value'?'EGP ':''}${number(sales.total)}${sales.partial?' · Incomplete data':''}${sales.estimated?' · Includes estimated value':''}${sales.review?' · Source scope needs review':''}`}
function tipAttrs(text){return `tabindex="0" data-focus-tip="${esc(text)}" aria-label="${esc(text)}"`}
function chartStart(w,h,label){return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">`}
function scale(values){const finite=values.filter(Number.isFinite);let min=Math.min(0,...finite),max=Math.max(0,...finite);if(max===min)max=min+1;const raw=(max-min)/4,p=10**Math.floor(Math.log10(raw)),q=raw/p,step=(q<=1?1:q<=2?2:q<=5?5:10)*p;min=Math.floor(min/step)*step;max=Math.ceil(max/step)*step;return {min,max,ticks:Array.from({length:Math.round((max-min)/step)+1},(_,i)=>min+i*step)}}
function emptyChart(id,text){$(id).innerHTML=`<p class="empty-chart">${esc(text)}</p>`}
function hideTip(){$('tooltip').style.display='none'}
function wireTips(){document.querySelectorAll('[data-focus-tip]').forEach(el=>{const show=(x,y)=>{const t=$('tooltip');t.textContent=el.dataset.focusTip;t.style.display='block';t.style.left=Math.max(12,Math.min(x+12,innerWidth-t.offsetWidth-12))+'px';t.style.top=Math.max(12,Math.min(y+14,innerHeight-t.offsetHeight-12))+'px'};el.onmousemove=e=>show(e.clientX,e.clientY);el.onmouseleave=hideTip;el.onfocus=()=>{const r=el.getBoundingClientRect();show(r.left,r.bottom)};el.onblur=hideTip;el.onkeydown=e=>{if(e.key==='Escape')hideTip()}})}
function renderYears(){
 $('focus-years').innerHTML=allYears.map(y=>`<button data-focus-year="${y}" aria-pressed="${state.years.has(y)}" class="${state.years.has(y)?'selected':''}" style="--year-color:${color(y)}">${y}</button>`).join('');
 document.querySelectorAll('[data-focus-year]').forEach(b=>b.onclick=()=>{const year=Number(b.dataset.focusYear);followAllYears=false;state.years.has(year)?state.years.delete(year):state.years.add(year);renderYears();render()});
}
function render(){
 if(!payload)return;
 hideTip();matchedMonths=null;const metric=currentMetric(),years=[...state.years].sort((a,b)=>a-b);
 document.querySelectorAll('[data-focus-scope]').forEach(b=>{const selected=b.dataset.focusScope===state.scope;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected))});
 document.querySelectorAll('[data-focus-metric]').forEach(b=>{const selected=b.dataset.focusMetric===metric;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected))});
 $('focus-product-label').hidden=state.scope!=='product';$('focus-through-label').hidden=state.mode!=='ytd';$('focus-month-picker').hidden=state.mode!=='month';$('focus-month-count').textContent=state.selected.size+' selected';
 $('focus-context').textContent=`${focusName()} · ${period()||'No months selected'} · ${years.length} year${years.length===1?'':'s'}`;
 $('comparison-revision').textContent='Revision '+payload.revision;$('comparison-revision').setAttribute('data-owner-only','');$('comparison-revision').hidden=window.nerhadouSecurity?.me?.user?.role!=='owner';
 const message=!years.length?'Select one or more years above.':state.mode==='month'&&!state.selected.size?'Select at least one month.':state.scope==='product'&&!state.product?'Select a product to compare.':'';
 $('focus-empty').hidden=!message;$('focus-empty').textContent=message;$('focus-content').hidden=!!message;$('focus-export').disabled=!!message;
 if(message){model=null;modelKey='';return}
 if(state.compositionYear!=='all'&&!years.includes(state.compositionYear))state.compositionYear=years.at(-1);
 const settings={scope:state.scope,product:state.product,metric,years,mode:state.mode,month:state.month,selected:[...state.selected].sort((a,b)=>a-b),growthBasis:state.growthBasis,compositionYear:state.compositionYear,includeEstimates:true};
 if($('focus-common-months')?.checked){const requested=state.mode==='annual'?Array.from({length:12},(_,i)=>i+1):state.mode==='ytd'?Array.from({length:state.month},(_,i)=>i+1):[...state.selected];matchedMonths=commonAvailableMonths(payload.records.map(r=>({...r,product:comparisonProduct(r)})),years,requested,metric,state.scope==='product'?{product:[state.product]}:{});settings.mode='month';settings.selected=matchedMonths;$('focus-context').textContent=focusName()+' · '+period()+' · '+years.length+' years';}
 const key=JSON.stringify(settings);if(key!==modelKey||modelRecords!==payload.records){model=buildFocusComparison(payload.records,settings);modelKey=key;modelRecords=payload.records}
 renderTable();
 const subject=focusName();$('focus-sales-title').textContent=metric==='value'?'Sales value by year':'Sales units by year';$('focus-trend-title').textContent=metric==='value'?'Monthly value · EGP':'Monthly units';
 $('focus-growth-note').textContent=state.growthBasis==='calendar'?'Each year vs the previous calendar year, for the same period.':'Each year vs the preceding selected year, for the same period.';
 columns('focus-sales-chart',model.cells.map(c=>({year:c.year,value:c.sales.total,partial:c.sales.partial,estimated:c.sales.estimated,tip:amountTip(c.year,c.sales)})),false);
 columns('focus-growth-chart',model.cells.map(c=>({year:c.year,value:c.ppg,approximate:c.knownTotalGrowth,estimated:c.estimatedGrowth,tip:`${subject} · ${c.year} vs ${c.priorYear??'—'} · PPG ${signedPercent(c.ppg)}${c.ppg==null?' · '+(c.reason||'Unavailable'):''}${c.estimatedGrowth?' · Includes estimated value':''}`})),true);
 monthlyTrend();monthlyTable();
 $('focus-company-panel').hidden=state.scope!=='company';$('focus-share-panel').hidden=!(state.scope==='product'&&metric==='value');
 if(state.scope==='company'){
  $('focus-composition-year').innerHTML='<option value="all">All years</option>'+years.map(y=>`<option value="${y}">${y}</option>`).join('');$('focus-composition-year').value=String(state.compositionYear);compositionChart();
 }else if(metric==='value')shareChart();
 renderNotes();wireTips();window.dispatchEvent?.(new CustomEvent('commercial:comparison',{detail:{model,records:payload.records}}));
}
function renderTable(){
 const share=model.scope==='product'&&model.metric==='value';
 $('focus-table-title').textContent=focusName()+' · '+measure(model.metric);
 $('focus-table-subtitle').textContent=period()+' in every selected year';
 const headers='<tr><th scope="col">Year</th><th scope="col">'+(model.metric==='value'?'Value · EGP':'Units')+'</th><th scope="col">PPG%</th>'+(share?'<th scope="col">V%</th>':'')+'</tr>';
 const rows=model.cells.map(c=>{const tip=`${c.year} vs ${c.priorYear??'—'} · PPG ${signedPercent(c.ppg)}${c.ppg==null?' · '+c.reason:''}${c.knownTotalGrowth?' · Based on available totals':''}`;return `<tr><th scope="row">${c.year}</th><td ${tipAttrs(amountTip(c.year,c.sales))}>${number(c.sales.total)}<small>${mark(c.sales).trim()}</small></td><td ${tipAttrs(tip)} class="${c.ppg==null?'unavailable':c.ppg<0?'negative':'positive'}">${c.knownTotalGrowth?'≈ ':''}${signedPercent(c.ppg)}</td>${share?'<td>'+percent(c.share)+'</td>':''}</tr>`}).join('');
 $('focus-table').innerHTML=`<table class="focus-matrix focus-vertical-table"><thead>${headers}</thead><tbody>${rows}</tbody></table>`;
 const notes=[];if(model.cells.some(c=>c.sales.estimated))notes.push('† Estimated value using the approved average-price method.');if(model.cells.some(c=>c.sales.partial&&c.sales.total!=null))notes.push('* Incomplete period or data.');notes.push('— = unavailable, not zero.');if(share)notes.push('V% = product value ÷ total company value.');
 $('focus-table-note').textContent=notes.join(' ');
}
function columns(id,rows,isGrowth){
 if(!rows.some(r=>r.value!=null)){emptyChart(id,isGrowth?'PPG% is unavailable for these years. Both periods must have complete, comparable data and a positive baseline.':'No sales amounts available for this selection.');return}
 const a=scale(rows.map(r=>r.value)),L=65,R=530,T=38,B=260,Y=v=>B-(v-a.min)/(a.max-a.min)*(B-T),zero=Y(0),step=(R-L)/rows.length,w=Math.min(48,step*.6);let svg=chartStart(590,320,isGrowth?'Sales growth by year':'Sales amount by year');
 for(const tick of a.ticks)svg+=`<line x1="${L}" x2="${R}" y1="${Y(tick)}" y2="${Y(tick)}" stroke="${tick===0?'#bacbd1':'#e7edef'}"/><text x="${L-10}" y="${Y(tick)+4}" text-anchor="end" font-size="10" fill="#718994">${isGrowth?compact(tick)+'%':compact(tick)}</text>`;
 rows.forEach((r,i)=>{const x=L+step*(i+.5),c=isGrowth?(r.value<0?'#bd7869':'#245fa7'):color(r.year);if(r.value!=null){const y=Math.min(zero,Y(r.value)),h=Math.max(1,Math.abs(Y(r.value)-zero));svg+=`<g ${tipAttrs(r.tip)}><rect x="${x-w/2}" y="${y}" width="${w}" height="${h}" rx="2" fill="${r.partial?'#e3ebee':c}" stroke="${c}" stroke-dasharray="${r.partial||r.estimated?'4 3':'0'}"/><text x="${x}" y="${r.value<0?y+h+15:y-10}" text-anchor="middle" font-size="11" font-weight="600" fill="#405b78">${isGrowth?(r.approximate?'≈ ':'')+signedPercent(r.value):compact(r.value)}${!isGrowth&&r.partial?'*':''}${!isGrowth&&r.estimated?'†':''}</text></g>`}else svg+=`<text x="${x}" y="${zero-10}" text-anchor="middle" font-size="13" fill="#93a7b0">—</text>`;svg+=`<text x="${x}" y="${B+38}" text-anchor="middle" font-size="12" fill="#405b78">${r.year}</text>`});
 $(id).innerHTML=svg+'</svg>';
}
function monthlyTrend(){
 const series=model.monthly,ms=model.months;if(!series.some(s=>s.months.some(r=>r.sales.total!=null))){emptyChart('focus-trend-chart','No monthly sales amounts for the selected period.');return}
 const a=scale(series.flatMap(s=>s.months.map(r=>r.sales.total))),L=75,R=930,T=28,B=260,X=i=>ms.length===1?(L+R)/2:L+i*(R-L)/(ms.length-1),Y=v=>B-(v-a.min)/(a.max-a.min)*(B-T);let svg=chartStart(1000,310,'Monthly sales by selected year');
 for(const tick of a.ticks)svg+=`<line x1="${L}" x2="${R}" y1="${Y(tick)}" y2="${Y(tick)}" stroke="#e7edef"/><text x="${L-12}" y="${Y(tick)+4}" text-anchor="end" font-size="11" fill="#718994">${compact(tick)}</text>`;
 ms.forEach((m,i)=>svg+=`<text x="${X(i)}" y="${B+28}" text-anchor="middle" font-size="12" fill="#718994">${months[m-1]}</text>`);
 series.forEach(s=>s.months.forEach((r,i)=>{const v=r.sales,prev=s.months[i-1];if(v.total==null)return;if(prev?.sales.total!=null&&r.month===prev.month+1)svg+=`<line x1="${X(i-1)}" x2="${X(i)}" y1="${Y(prev.sales.total)}" y2="${Y(v.total)}" stroke="${color(s.year)}" stroke-width="2.7" stroke-dasharray="${v.partial||prev.sales.partial||v.estimated||prev.sales.estimated?'6 4':'0'}"/>`;const tip=`${focusName()} · ${months[r.month-1]} ${s.year} · ${currentMetric()==='value'?'EGP ':''}${number(v.total)}${v.partial?' · Incomplete':''}${v.estimated?' · Estimated value':''}`;svg+=`<circle ${tipAttrs(tip)} cx="${X(i)}" cy="${Y(v.total)}" r="5" fill="${v.partial?'white':color(s.year)}" stroke="${color(s.year)}" stroke-width="2"/>` }));
 $('focus-trend-chart').innerHTML='<div class="focus-legend">'+series.map(s=>`<span><i style="background:${color(s.year)}"></i>${s.year}</span>`).join('')+'</div><div class="focus-trend-scroll">'+svg+'</svg></div><p class="chart-note">Open dots = incomplete amounts. Dashed lines = estimated or incomplete amounts. Missing months break the line.</p>';
}
function monthlyTable(){
 $('focus-month-table').innerHTML='<table class="focus-month-matrix"><thead><tr><th>Month</th>'+model.years.map(y=>'<th>'+y+'</th>').join('')+'</tr></thead><tbody>'+model.months.map((m,i)=>'<tr><th>'+months[m-1]+'</th>'+model.monthly.map(s=>'<td>'+number(s.months[i].sales.total)+mark(s.months[i].sales)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
}
function compositionChart(){
 const c=model.composition,rows=c?.items||[];if(!rows.length){emptyChart('focus-composition-chart','No product sales available in this year.');$('focus-composition-note').textContent='';return}
 const a=scale(rows.map(r=>r.total)),L=330,R=650,T=58,rowH=42,B=T+rowH*rows.length,X=v=>L+(v-a.min)/(a.max-a.min)*(R-L),zero=X(0);let svg=chartStart(1000,B+40,'All products ranked by company sales contribution');
 svg+='<text x="22" y="20" font-size="11" fill="#718994">Rank</text><text x="77" y="20" font-size="11" fill="#718994">Product</text><text x="835" y="20" text-anchor="end" font-size="11" fill="#718994">'+(currentMetric()==='value'?'Value · EGP':'Units')+'</text><text x="975" y="20" text-anchor="end" font-size="11" fill="#718994">% of total</text>';
 for(const tick of a.ticks)svg+=`<line x1="${X(tick)}" x2="${X(tick)}" y1="35" y2="${B}" stroke="${tick===0?'#bacbd1':'#e7edef'}"/><text x="${X(tick)}" y="${B+24}" text-anchor="middle" font-size="10" fill="#718994">${compact(tick)}</text>`;
 rows.forEach((r,i)=>{const y=T+i*rowH,periodYear=c.year==='all'?'All selected years ('+c.years.join(', ')+')':c.year,tip=`${r.name} · ${periodYear} · ${currentMetric()==='value'?'EGP ':''}${number(r.total)} · ${percent(r.share)} of ${currentMetric()==='value'?'company value':'company units'}${r.shareApproximate?' · Based on available amounts':''}`;svg+=`<g ${tipAttrs(tip)}><text x="39" y="${y+4}" text-anchor="middle" font-size="12" font-weight="600" fill="#718994">${r.rank??'—'}</text><text x="77" y="${y+4}" font-size="12" fill="#405b78">${esc(r.name.length>29?r.name.slice(0,28)+'…':r.name)}</text>${r.total==null?'':`<rect x="${Math.min(zero,X(r.total))}" y="${y-9}" width="${Math.max(.5,Math.abs(X(r.total)-zero))}" height="18" rx="2" fill="${r.total<0?'#bd7869':'#245fa7'}"/>`}<text x="835" y="${y+4}" text-anchor="end" font-size="12" fill="#405b78">${number(r.total)}</text><text x="975" y="${y+4}" text-anchor="end" font-size="12" fill="#245fa7">${r.shareApproximate&&r.share!=null?'≈ ':''}${percent(r.share)}</text></g>`});
 $('focus-composition-chart').innerHTML=svg+'</svg>';
 $('focus-composition-note').textContent=(c.year==='all'?'All selected years ('+c.years.join(', ')+') · the selected period is summed once per year':String(c.year))+' · '+period()+' · '+measure(currentMetric())+'. Percentages use '+(currentMetric()==='value'?'company value':'company units')+' for the same selection.'+(c.sales.partial||c.sales.review?' ≈ Based on available amounts.':'')+' Negative adjustments are retained.';
}

function shareChart(){
 const cells=model.cells;if(!cells.some(c=>c.share!=null)){emptyChart('focus-share-chart','V% needs complete product and company value for the same period.');return}
 const a=scale(cells.map(c=>c.share)),L=70,R=925,T=35,B=235,X=i=>cells.length===1?(L+R)/2:L+i*(R-L)/(cells.length-1),Y=v=>B-(v-a.min)/(a.max-a.min)*(B-T);let svg=chartStart(1000,290,'Product share of company sales value');
 for(const tick of a.ticks)svg+=`<line x1="${L}" x2="${R}" y1="${Y(tick)}" y2="${Y(tick)}" stroke="#e7edef"/><text x="${L-10}" y="${Y(tick)+4}" text-anchor="end" font-size="11" fill="#718994">${percent(tick)}</text>`;
 cells.forEach((c,i)=>{const prev=cells[i-1];if(c.share!=null){if(prev?.share!=null)svg+=`<line x1="${X(i-1)}" x2="${X(i)}" y1="${Y(prev.share)}" y2="${Y(c.share)}" stroke="#245fa7" stroke-width="3"/>`;const tip=`${state.product} · ${c.year} · V% ${percent(c.share)}${c.sales.estimated?' · Estimated value included':''}`;svg+=`<g ${tipAttrs(tip)}><circle cx="${X(i)}" cy="${Y(c.share)}" r="6" fill="#245fa7"/><text x="${X(i)}" y="${Y(c.share)-15}" text-anchor="middle" font-size="12" font-weight="600" fill="#405b78">${percent(c.share)}</text></g>`}else svg+=`<text x="${X(i)}" y="${B-10}" text-anchor="middle" fill="#93a7b0">—</text>`;svg+=`<text x="${X(i)}" y="${B+28}" text-anchor="middle" font-size="12" fill="#718994">${c.year}</text>`});
 $('focus-share-chart').innerHTML=svg+'</svg>';
}
function renderNotes(){
 const list=['PPG% = (sales in this year ÷ sales in the comparison year − 1) × 100. The table identifies the comparison year under each PPG% column. The same selected months are used in both years.','V% = product sales value ÷ total company sales value × 100. It is an internal company contribution, not IMS market share. Units and Value tabs use their own sales measure for PPG%.','Missing data is not zero. Growth requires complete comparable periods and a positive baseline. Negative adjustments are retained.'];
 for(const c of model.cells){const details=[];if(c.ppg==null)details.push('PPG% unavailable: '+c.reason);else details.push('PPG% vs '+c.priorYear);if(c.sales.ignored)details.push(c.sales.ignored+' blank / inactive cells excluded');if(c.knownTotalGrowth)details.push('growth uses available totals, excluding missing pack values');if(c.sales.partial)details.push('the amount is incomplete or unavailable');if(c.sales.estimated)details.push('value includes average-price estimates');if(c.sales.review)details.push('source scope needs review; growth is withheld');if(details.length)list.push(c.year+': '+details.join('; ')+'.')}
 if(model.years.includes(2023))list.push('2023 January–September monthly scope is approved for comparison. Blank no-activity cells are excluded. Company value growth uses available totals when pack values are missing, as identified in the table. Full-year 2023 and October–December remain unverified.');
 if(state.mode==='annual')list.push('Where 12 monthly periods exist, annual sales are summed from the current monthly records. Original annual controls remain separate in Data management. Small source rounding differences are retained.');
 if(model.years.includes(2022)&&state.mode==='annual')list.push('Full-year 2022 uses the sum of the 12 monthly amounts, as agreed.');
 $('focus-data-notes').innerHTML=list.map(text=>'<p>'+esc(text)+'</p>').join('');
}

window.updateComparison=data=>{
 const first=!payload;payload=data;allYears=[...new Set(data.records.filter(r=>r.dataset==='actual'&&r.month>0).map(r=>r.year))].sort((a,b)=>a-b);productNames=[...new Set(data.records.filter(r=>r.dataset==='actual').map(comparisonProduct))].sort();
 const latest=allYears.at(-1);defaultMonth=Math.max(1,...data.records.filter(r=>r.dataset==='actual'&&r.year===latest&&r.month>0).map(r=>r.month));
 if(first){state.years=new Set(allYears);state.month=defaultMonth;state.selected=new Set([defaultMonth]);state.product=productNames.includes('ONDALENZ 8MG')?'ONDALENZ 8MG':productNames[0]||'';state.compositionYear=latest;}
 else {state.years=followAllYears?new Set(allYears):new Set([...state.years].filter(y=>allYears.includes(y)));if(followLatestThrough&&followAllYears)state.month=defaultMonth;if(!productNames.includes(state.product))state.product=productNames[0]||'';}
 syncControls();$('focus-product').innerHTML=productNames.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');$('focus-product').value=state.product;modelKey='';renderYears();render();
};
window.comparisonLoadError=message=>{$('focus-content').hidden=true;$('focus-empty').hidden=false;$('focus-empty').textContent=message;$('focus-export').disabled=true};
function syncControls(){
 $('focus-period').value=state.mode;$('focus-through').value=String(state.month);$('focus-growth-basis').value=state.growthBasis;$('focus-product').value=state.product;
 $('focus-month-options').innerHTML=months.map((m,i)=>`<label><input type="checkbox" value="${i+1}" ${state.selected.has(i+1)?'checked':''}>${m}</label>`).join('');
 $('focus-month-options').querySelectorAll('input').forEach(input=>input.onchange=()=>{const m=Number(input.value);input.checked?state.selected.add(m):state.selected.delete(m);render()});
}
$('focus-through').innerHTML=months.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('');
for(const b of document.querySelectorAll('[data-focus-scope]'))b.onclick=()=>{state.scope=b.dataset.focusScope;render()};
for(const b of document.querySelectorAll('[data-focus-metric]'))b.onclick=()=>{state.metrics[state.scope]=b.dataset.focusMetric;render()};
$('focus-period').onchange=()=>{state.mode=$('focus-period').value;render()};
$('focus-through').onchange=()=>{followLatestThrough=false;state.month=Number($('focus-through').value);render()};
$('focus-product').onchange=()=>{state.product=$('focus-product').value;render()};
$('focus-growth-basis').onchange=()=>{state.growthBasis=$('focus-growth-basis').value;render()};
$('focus-composition-year').onchange=()=>{state.compositionYear=$('focus-composition-year').value==='all'?'all':Number($('focus-composition-year').value);render()};
$('focus-all-years').onclick=()=>{followAllYears=true;state.years=new Set(allYears);renderYears();render()};
$('focus-clear-years').onclick=()=>{followAllYears=false;state.years.clear();renderYears();render()};
$('focus-reset').onclick=()=>{followAllYears=true;followLatestThrough=true;state.years=new Set(allYears);state.mode='ytd';state.month=defaultMonth;state.selected=new Set([defaultMonth]);state.growthBasis='calendar';state.metrics[state.scope]='units';state.compositionYear=allYears.at(-1);syncControls();renderYears();render()};
$('focus-export').onclick=()=>{if(!model)return;const blob=new Blob([comparisonWorkbook(model,period())],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`nerhadou-${state.scope}-${currentMetric()}-${model.years.join('-')}.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};

window.comparisonDashboard={render,capture:()=>({...state,years:[...state.years],selected:[...state.selected],commonMonths:!!$('focus-common-months')?.checked}),restore:config=>{if(!config||!payload)return;state.scope=config.scope==='product'?'product':'company';if(productNames.includes(config.product))state.product=config.product;if(Array.isArray(config.years))state.years=new Set(config.years.filter(y=>allYears.includes(y)));if(['ytd','month','annual'].includes(config.mode))state.mode=config.mode;if(Number.isInteger(config.month)&&config.month>=1&&config.month<=12)state.month=config.month;if(Array.isArray(config.selected))state.selected=new Set(config.selected.filter(m=>Number.isInteger(m)&&m>=1&&m<=12));if(['selected','calendar'].includes(config.growthBasis))state.growthBasis=config.growthBasis;for(const scope of ['company','product'])if(['units','value'].includes(config.metrics?.[scope]))state.metrics[scope]=config.metrics[scope];if($('focus-common-months'))$('focus-common-months').checked=!!config.commonMonths;followAllYears=false;followLatestThrough=false;syncControls();renderYears();render()}};
