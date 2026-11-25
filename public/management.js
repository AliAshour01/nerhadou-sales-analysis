import {comparisonProduct} from './compare-core.js?v=sales-comparison-v71';
import {comparableSummary,changeBetween,movement,movementTotals,commonAvailableMonths,productName,targetSum,portfolioTarget,scopeRecords,runRateProjection,seasonalProjection,growthAllowed,PROVISIONAL_YEARS} from './management-core.js?v=sales-comparison-v71';
import {tableWorkbook} from './comparison-xlsx.js?v=sales-comparison-v71';
import {resolveViewContext,knownCategory,yearSpan,comparisonRecords,translateProducts} from './view-context.js?v=sales-comparison-v71';
import {PANELS,layout} from './panel-registry.js?v=sales-comparison-v71';
import {productsTableData,productsTableHTML,sortOptions} from './products-table.js?v=sales-comparison-v71';
import {niceAxis,axisTicks,tickLabel,compact,achStatus,ACH_THRESHOLDS,categoryColor,truncate} from './chart-utils.js?v=sales-comparison-v71';
const $=id=>document.getElementById(id),e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ms=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const n=v=>v==null?'—':Number(v).toLocaleString('en-US',{maximumFractionDigits:0}),pct=v=>v==null?'—':`${v>0?'+':''}${v.toFixed(1)}%`,amt=(v,m)=>v==null?'—':(m==='value'?'EGP ':'')+n(v),short=v=>compact(v);
let payload=window.commercialAnalysisData||null,cache=new Map(),contextKey='',restorePending=null,restored=false,storageKey=null;
const ui={monthlyCumulative:false,monthlyCompare:null,monthlySplit:false,bridgeDimension:'product',forecastCutoff:null};
// V69 U-03: ui.metric is the global Measure owned by app.js (filter bar); every panel reads it.
Object.defineProperty(ui,'metric',{get:()=>window.actualDashboard?.measure?.()||'units',set:v=>window.actualDashboard?.setMeasure?.(v),enumerable:true});
let chartResizeFrame=null,chartWidthSignature='';

const plotWidth=(id,fallback=640)=>window.actualDashboard.chartWidth(id,fallback);
const svgPlot=(w,h,label,extra='')=>window.actualDashboard.plotSVG(w,h,label,extra);
const labelStride=(count,width)=>window.actualDashboard.monthStride(count,width);
function dashboard(){return window.actualDashboard?.read()}
function records(){return payload?.records||[]}
function summary(year,chosen,metric,filters=dashboard()?.selection||{}){const key=JSON.stringify([year,chosen,metric,filters]);if(!cache.has(key))cache.set(key,comparableSummary(records(),year,chosen,metric,filters));return cache.get(key)}
function selectedProducts(d=dashboard(),filters=d.selection){return [...new Set(scopeRecords(records(),filters).filter(r=>r.dataset==='actual'&&r.year===d.snapshot.year&&r.month>0).map(productName))].sort()}
function target(products,metric,chosen=dashboard().months,annual=dashboard().targetBasis==='annual',filters=dashboard().selection){return targetSum(records(),dashboard().snapshot,products,chosen,metric,filters,annual)}
function scopeText(filters=dashboard().selection){return Object.entries(filters).filter(([,v])=>v.length).map(([k,v])=>`${k}: ${v.join(', ')}`).join(' · ')||'Total company'}
function periodLabel(d=dashboard(),chosen=viewCtx?.months||d.months,year=null){const y=year??(viewCtx?.yearMode==='multi'?yearSpan(viewCtx.years):viewCtx?.focusYear??d.snapshot.year);if(!chosen.length)return 'No months selected';if(chosen.length===12)return 'Full year '+y;const end=Math.max(...chosen);return (d.periodMode==='ytd'&&chosen.length===end&&chosen.every((m,i)=>m===i+1)?'YTD '+ms[end-1]:chosen.map(m=>ms[m-1]).join(', '))+' '+y}
function pairs(metric=ui.metric,filters=dashboard().selection){const d=dashboard(),current=summary(d.snapshot.year,d.months,metric,filters),previous=summary(d.snapshot.year-1,d.months,metric,filters);return {current,previous,...growth(current,previous,d.snapshot.year-1,d.snapshot.year)}}
// Year-over-year comparisons use same-period amounts.
function growth(current,previous,a,b){const allowed=growthAllowed(a,b);return allowed.ok?{...changeBetween(current,previous),unavailable:null}:{delta:null,ppg:null,estimated:false,approximate:false,unavailable:allowed.reason}}
function provisional(year){return PROVISIONAL_YEARS.has(Number(year))}
function provisionalNote(){return '2023 comparisons use recorded figures for the same months. The original monthly source covers January–September and includes estimated sales values. Annual controls are a separate reporting scope.'}
function badge(s){return [s.estimated?'Estimated value included':'',s.approximate?'Available totals · approved scope':'',s.value==null?s.reason:''].filter(Boolean).join(' · ')}
function buttons(id,items,chosen,attr){return `<div class="control-group" role="group" aria-label="${e(id)}">${items.map(([v,label])=>`<button class="choice ${chosen===v?'chosen':''}" aria-pressed="${chosen===v}" ${attr}="${e(v)}">${e(label)}</button>`).join('')}</div>`}
// V68 S-32: every chart has a Table view built from the chart's own tooltips, so the values are identical.
const CHART_TABLES=[['trend','Monthly performance'],['distributors','Distributor mix'],['company-channels','Sales-type mix'],['line-mix','Sales by line'],['movement-chart','What drove the change'],['forecast-chart','Cumulative path, Jan–Dec']],tableViews=new Set();
function chartTableHTML(id,caption){if(id==='trend')return monthlyTableHTML();const host=$(id),tips=[...new Set([...host.querySelectorAll('[data-tip]')].map(el=>el.dataset.tip))],rows=tips.map(t=>t.split(' · ')),cols=Math.max(1,...rows.map(r=>r.length));if(!rows.length)return `<p class="chart-note">No plotted values to tabulate.</p>`;return `<div class="table-wrap chart-table-wrap"><table class="chart-table"><caption>${e(caption)} · plotted values</caption><thead><tr><th scope="col">Item</th>${Array.from({length:cols-1},(_,i)=>`<th scope="col">${i===0?'Value':'Detail '+i}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${e(r[0])}</th>${Array.from({length:cols-1},(_,i)=>`<td>${e(r[i+1]??'—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function applyChartTables(){for(const [id,caption]of CHART_TABLES){const host=$(id);if(!host)continue;const card=host.closest('.forecast-chart-wrap,article,.panel,.bd-card')||host.parentElement;let btn=card.querySelector(`[data-chart-table="${id}"]`);if(!btn){const head=card.querySelector(':scope > .panel-title, :scope > .bd-card-head, :scope > .bd-card-title')||null;const html=`<button type="button" class="chart-table-toggle" data-chart-table="${id}" aria-pressed="false" aria-controls="${id}-table">Table</button>`;if(head)head.insertAdjacentHTML('beforeend',html);else host.insertAdjacentHTML('beforebegin',html);btn=card.querySelector(`[data-chart-table="${id}"]`);btn.onclick=()=>{tableViews.has(id)?tableViews.delete(id):tableViews.add(id);applyChartTables()}}
  const on=tableViews.has(id);btn.setAttribute('aria-pressed',String(on));btn.textContent=on?'Chart':'Table';let table=$(id+'-table');if(!table){host.insertAdjacentHTML('afterend',`<div id="${id}-table" class="chart-table-host" hidden></div>`);table=$(id+'-table')}host.hidden=on;table.hidden=!on;if(on)table.innerHTML=chartTableHTML(id,caption)}}
function panel(title,content,id=''){return `<article class="panel"${id?` id="${id}"`:''}><div class="panel-title"><div><h2>${title}</h2></div></div>${content}</article>`}
// V68 S-14: the legend shows the exact swatches used by the monthly chart.
const MONTHLY_LEGEND='<span class="lg-item"><i class="lg-swatch toward"></i>Toward target</span><span class="lg-item"><i class="lg-swatch over"></i>Above target</span><span class="lg-item"><svg class="lg-line" width="22" height="10" aria-hidden="true"><line x1="1" x2="21" y1="5" y2="5" stroke="#1f3555" stroke-width="2"/></svg>Monthly target</span>';
// V68 S-10: the actions cluster sits on the H1 row of the Sales page; Historical keeps its V67 position above the page.
function placeActions(page){const actions=document.querySelector('.manager-actions');if(!actions)return;if(page==='sales'){$('sales').querySelector('.heading').append(actions)}else document.querySelector('main').insertBefore(actions,$('sales'))}
function mount(){
 $('summary-context').insertAdjacentHTML('beforebegin',`<div class="manager-actions"><button id="actions-toggle" class="actions-toggle" aria-expanded="false" aria-controls="actions-cluster" aria-label="Views, link and report actions">⋯</button><div id="actions-cluster" class="actions-cluster"><details class="views-menu"><summary>Views <span aria-hidden="true">▾</span></summary><div class="saved-view-tools views-menu-body"><label class="sr-only" for="saved-view">Saved views</label><select id="saved-view"><option value="">Saved views…</option></select><input id="view-name" maxlength="70" aria-label="Name this view" placeholder="Name this view…"><div class="views-menu-buttons"><button id="save-view">Save view</button><button id="delete-view" disabled>Delete</button></div></div></details><button id="share-view">Copy link</button><button id="meeting-open" class="primary-action">Meeting report</button></div></div><p id="manager-status" class="manager-status" role="status"></p><div id="data-health" class="data-health" aria-live="polite"></div>`);


 const tabs=$('sales').querySelector('.section-tabs');
 tabs.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>window.actualDashboard.showSection(b.dataset.section));
 mountOverviewGrid();
 // V69 U-18: on phones the filter card collapses to 'Filters (n)' with the selection summary; tap to open it.
 const fbar=$('sales').querySelector('.filters'),ftitle=fbar.querySelector('.filter-bar-title');ftitle.insertAdjacentHTML('beforeend','<button type="button" id="filters-toggle" class="filters-toggle" aria-expanded="false" aria-controls="sales-filters-body">Filters</button><span id="filters-summary" class="filters-summary"></span>');fbar.id='sales-filters-body';fbar.classList.add('collapsed');
 $('filters-toggle').onclick=()=>{const open=fbar.classList.toggle('collapsed')===false;$('filters-toggle').setAttribute('aria-expanded',String(open))};


 $('sales').querySelector('.methodology').insertAdjacentHTML('beforebegin',`<section id="view-forecast" hidden><article class="panel"><div class="panel-title"><div><h2>Year-end forecast scenarios</h2><p>Scenario estimates · not reported actuals · entire YTD in selected year</p></div><label>Forecast as of<select id="forecast-cutoff"></select></label></div><div class="chart-grid forecast-grid"><article id="fc-runrate"><h3>YTD Average Forecast</h3><div id="run-rate"></div><div id="run-rate-vs" class="forecast-vs"></div></article><article id="fc-seasonal"><h3>Historical Seasonality Forecast</h3><div id="target-forecast"></div><div id="seasonal-vs" class="forecast-vs"></div></article><article id="fc-required"><h3>Required to hit target</h3><div id="forecast-required"></div></article></div><div class="forecast-chart-wrap"><h3>Cumulative path, Jan–Dec</h3><p class="chart-note">Scenario estimates, not reported actuals. Solid = actual through the cutoff; dashed = scenarios; navy = cumulative target.</p><div id="forecast-chart" class="wide-chart"></div></div></article><details id="forecast-not-shown" class="not-shown" hidden><summary></summary><ul></ul></details></section>`);
 for(const [id,tab]of [['view-overview','tab-overview'],['view-portfolio','tab-portfolio'],['view-forecast','tab-forecast']]){const view=$(id);if(view){view.setAttribute('role','tabpanel');view.setAttribute('aria-labelledby',tab)}}
 document.body.insertAdjacentHTML('beforeend',`<dialog id="report-dialog" class="report-dialog" aria-labelledby="report-heading"><div class="report-controls"><button id="report-print">Print / Save PDF</button><button id="report-close">Close ×</button></div><div id="meeting-report"></div></dialog>`);
 
 // Controls are delegated once; no duplicate handlers accumulate on shared refresh.
 document.addEventListener('click',onClick);document.addEventListener('change',onChange);
 $('save-view').onclick=saveView;$('delete-view').onclick=deleteView;$('share-view').onclick=shareView;$('meeting-open').onclick=openReport;
 $('report-close').onclick=()=>$('report-dialog').close();$('report-print').onclick=()=>{document.body.classList.add('printing-report');window.print()};window.addEventListener('afterprint',()=>document.body.classList.remove('printing-report'));
 $('saved-view').onchange=async()=>{const item=savedViews().find(r=>r.id===$('saved-view').value);$('delete-view').disabled=!item;if(item)await restore(item.config)};
 const actions=document.querySelector('.manager-actions');placeActions('sales');document.querySelector('main').insertBefore($('manager-status'),$('sales'));
 // V68 S-10: no duplicate eyebrow (the logo already names the company); source bar and period paragraph merge into the data-health strip.
 $('sales').querySelector('.heading .eyebrow')?.remove();$('sales').querySelector('.source').hidden=true;$('period-explanation')?.remove();const periods=$('sales').querySelector('.global-periods');if(periods&&!periods.querySelector('button,select,input'))periods.hidden=true;
 $('actions-toggle').onclick=()=>{const open=$('actions-toggle').getAttribute('aria-expanded')!=='true';$('actions-toggle').setAttribute('aria-expanded',String(open));actions.classList.toggle('open',open)};
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&actions.classList.contains('open')){actions.classList.remove('open');$('actions-toggle').setAttribute('aria-expanded','false');$('actions-toggle').focus()}});
 window.actualDashboard.notify=render;window.actualDashboard.multiOptions=multiOptions;window.actualDashboard.translateProducts=(names,mode,year)=>translateProducts(records(),names,mode,year);window.actualDashboard.context=()=>payload&&dashboard()?viewContext():null;window.actualDashboard.priorMonthly=(metric,chosen)=>{const d=dashboard();if(!d||!payload)return null;const ok=growthAllowed(d.snapshot.year-1,d.snapshot.year);if(!ok.ok)return {unavailable:ok.reason};const values=chosen.map(m=>summary(d.snapshot.year-1,[m],metric,d.selection).value);return values.some(v=>v!=null)?{year:d.snapshot.year-1,values}:null};window.actualDashboard.sectionChanged=()=>{renderSection();wireDrilldowns();applyChartTables();syncUrl()};
 window.addEventListener('popstate',()=>{const config=urlConfig();if(config){urlRestoring=true;restore(config).finally(()=>{urlRestoring=false;lastUrlSection=dashboard()?.section})}});
 if(payload)render();
}
function render(){
 const d=dashboard();if(!d||!payload)return;
 // Never mix an old snapshot with a newly refreshed record revision.
 if(d.snapshot.revision!==payload.revision){$('data-health').textContent='Synchronising analysis with shared data…';return}
 const key=JSON.stringify([payload.revision,d.snapshot.year,d.months,d.selection]);if(key!==contextKey){cache.clear();contextKey=key}
 // V69 U-01: one context object; every renderer reads it instead of re-deriving conditions.
 viewCtx=viewContext(d);
 syncTabs(viewContext(d));renderHealth();renderSummary();renderSection();

 window.updateWorkspaceVisibility?.();window.actualDashboard.wire();wireDrilldowns();
 if(!restored&&storageKey){restored=true;readLink()}
 applyChartTables();syncUrl();
}
// V69 U-02: Overview panels live in one 12-column grid; the registry (public/panel-registry.js) decides visibility and spans.
const PANEL_BODIES={
 attention:()=>panel('Needs attention','<p class="chart-note">Rules describe the selected data. They do not establish the cause.</p><div id="attention-list" class="attention-list"></div>'),
 bridge:()=>panel('What drove the change',`<div class="analysis-toolbar bridge-toolbar"><label>Break down by<select id="movement-dimension"></select></label><span id="bridge-years" hidden><label>From<select id="bridge-from"></select></label><label>To<select id="bridge-to"></select></label></span></div><p id="movement-context" class="analysis-context"></p><div id="movement-chart" class="wide-chart"></div><p id="movement-note" class="chart-note"></p><details id="movement-unmatched" hidden><summary>Products / groups without comparable detail</summary><div id="movement-unmatched-list"></div></details><details class="bridge-numbers"><summary>View contribution numbers</summary><div id="movement-table" class="table-wrap"></div></details>`),
 mixDistributor:()=>panel('Distributor mix','<p class="mix-context chart-note"></p><div id="distributors"></div>'),
 mixChannel:()=>panel('Sales-type mix','<p class="mix-context chart-note"></p><div id="company-channels"></div>'),
 salesByYear:()=>panel('Sales by year','<p id="years-context" class="chart-note"></p><div id="sales-by-year"></div>'),
 shareByYear:()=>panel('Share of company by year','<p class="chart-note">Product sales ÷ company sales, same months each year.</p><div id="share-by-year"></div>'),
 mixLine:()=>panel('Sales by line','<p class="mix-context chart-note"></p><div id="line-mix"></div>'),
 productFacts:()=>panel('Product facts','<ul id="product-facts" class="facts-list"></ul>')
};
const RENDERERS={
 productsTable:ctx=>renderProductsTable(ctx),
 salesByYear:ctx=>renderSalesByYear(ctx),
 shareByYear:ctx=>renderShareByYear(ctx),
 monthly:ctx=>renderMonthlyPanel(ctx),
 attention:()=>renderAttention(),
 bridge:ctx=>renderBridge(ctx),
 mixDistributor:ctx=>renderMixChart('distributors','distributor',ctx),
 mixChannel:ctx=>renderMixChart('company-channels','channel',ctx),
 mixLine:ctx=>renderLineMix(ctx),
 productFacts:ctx=>renderProductFacts(ctx)
};
const layoutApi={renderers:RENDERERS,attentionCount,factCount:ctx=>productFacts(ctx).length,shareYears,bridgeOptions,bridgeGap};
function mountOverviewGrid(){
 const overview=$('view-overview'),old=overview.querySelector('.chart-grid'),monthly=$('trend').closest('article');
 overview.insertAdjacentHTML('afterbegin','<div id="overview-grid" class="v69-grid"></div><details id="overview-not-shown" class="not-shown" hidden><summary></summary><ul></ul></details>');
 const grid=$('overview-grid');
 for(const entry of PANELS.filter(p=>p.tab==='overview'&&RENDERERS[p.id])){
  let node;
  if(entry.id==='monthly')node=monthly;
  else{const holder=document.createElement('div');holder.innerHTML=PANEL_BODIES[entry.id]();node=holder.firstElementChild}
  node.id='panel-'+entry.id;node.dataset.panel=entry.id;node.classList.add('v69-panel');node.hidden=true;grid.append(node);
 }
 if(old&&!old.children.length)old.remove();
}
let lastExcluded=new Map();
function isMobile(){return (window.innerWidth||1280)<700}
// Overview also lists unavailable comparisons inside visible panels.
function layoutFor(tab,ctx,mobile=false,excluded=lastExcluded){if(excluded!==lastExcluded)lastExcluded=excluded;const result=layout(tab,ctx,layoutApi,{mobile,excluded});if(tab==='overview'&&ctx.hasData&&ctx.compareYear!=null&&!ctx.growthOk)result.hidden.push({id:'previousYear',title:'Previous-year comparison',reason:ctx.growthReason});return result}
// V72 R-02: a renderer that has nothing to draw returns {empty: reason}; the panel then moves to "Not shown"
// and the row is laid out again without it, so an empty panel can never be left on the page.
function applyLayout(tab,ctx){
 const grid=$(tab+'-grid');if(!grid)return;
 const excluded=new Map();let result;
 for(let pass=0;pass<4;pass++){
  result=layoutFor(tab,ctx,isMobile(),excluded);let again=false;
  for(const entry of PANELS.filter(p=>p.tab===tab&&RENDERERS[p.id])){const node=$('panel-'+entry.id);if(node)node.hidden=!result.visible.includes(entry.id)}
  for(const row of result.rows)for(const p of row.panels){const node=$('panel-'+p.id);node.classList.remove('span-4','span-6','span-8','span-12','span-3','span-5','span-7');node.classList.add('span-'+p.span);node.dataset.row=row.row;grid.append(node);const out=RENDERERS[p.id](ctx,node);if(out?.empty&&!excluded.has(p.id)){excluded.set(p.id,out.empty);again=true}}
  if(!again)break;
 }
 const strip=$(tab+'-not-shown');if(strip){strip.hidden=!result.hidden.length;strip.querySelector('summary').textContent=`Not shown for this selection (${result.hidden.length})`;strip.querySelector('ul').innerHTML=result.hidden.map(h=>`<li><b>${e(h.title)}</b> ${e(h.reason)}</li>`).join('')}
 return result;
}
// V69 U-08: tabs appear only when they have content (plan 2.3). A hidden active tab falls back to Overview with a toast;
// a lone Overview tab renders as a plain section title.
function tabVisible(tab,ctx){if(tab==='overview')return true;if(tab==='portfolio')return layout('products',ctx,{renderers:null,attentionCount,factCount:()=>1,shareYears:()=>0,bridgeOptions}).visible.includes('productsTable');if(tab==='forecast')return window.nerhadouSecurity?.me?.user?.status==='active'&&layout('forecast',ctx,{renderers:null}).visible.length>0;return false}
function syncTabs(ctx){
 const bar=$('sales').querySelector('.section-tabs');let shown=0;
 for(const b of bar.querySelectorAll('[data-section]')){const on=tabVisible(b.dataset.section,ctx);b.hidden=!on;if(on)shown++}
 bar.classList.toggle('single-tab',shown===1);
 const d=dashboard();if(d.section!=='overview'&&bar.querySelector(`[data-section="${d.section}"]`)?.hidden){window.actualDashboard.showSection('overview');window.actualDashboard.toast?.(ctx.productMode==='one'?'Showing '+ctx.product+' on Overview':'Showing Overview for this selection')}
}
// V69 U-13: multi-year filter options come from the records of the selected years (products by comparison name).
let optionsCache={key:'',value:null};
function multiOptions(key,years){const k=JSON.stringify([payload?.revision,key,years]);if(optionsCache.key===k)return optionsCache.value;const wanted=new Set(years),rows=comparisonRecords(records()).filter(r=>r.dataset==='actual'&&r.month>0&&wanted.has(r.year));const value=key==='months'?[...new Set(rows.map(r=>r.month))].sort((a,b)=>a-b):[...new Set(rows.map(r=>r[key]))].filter(v=>v&&knownCategory(v)).sort();optionsCache={key:k,value};return value}
// V69 U-01: the selection context (public/view-context.js), cached per state key.
let viewCtx=null,viewCtxKey='';
function viewContext(d=dashboard()){const state={years:d.years||[d.snapshot.year],focusYear:d.focusYear,months:d.months,periodMode:d.periodMode,selection:d.selection,measure:ui.metric,growthBasis:d.growthBasis,commonMonths:d.commonMonths},key=JSON.stringify([payload?.revision,state]);if(key!==viewCtxKey||!viewCtx){viewCtx=resolveViewContext(records(),state);viewCtxKey=key}return viewCtx}
function renderSection(){
 const d=dashboard();if(!d||!payload||d.snapshot.revision!==payload.revision)return;
 if(d.section==='forecast')renderPlanning();
 scheduleChartReflow();if(d.section==='overview')applyLayout('overview',viewContext(d));else if(d.section==='portfolio')renderProductsTable(viewContext(d));window.actualDashboard.wire();wireDrilldowns();
}
// V68 S-10: month ranges read "Jan–Aug" and "Jan–Mar, May".
function monthRange(list){const out=[];for(let i=0;i<list.length;){let j=i;while(j+1<list.length&&list[j+1]===list[j]+1)j++;out.push(j>i?ms[list[i]-1]+'–'+ms[list[j]-1]:ms[list[i]-1]);i=j+1}return out.join(', ')}
function renderHealth(){
 const d=dashboard(),u=summary(d.snapshot.year,d.months,'units'),v=summary(d.snapshot.year,d.months,'value'),definition=$('sales').querySelector('.target-definition'),all=records().filter(r=>r.dataset==='actual'&&r.year===d.snapshot.year&&r.month>0),last=Math.max(0,...all.map(r=>r.month));
 const sourceMonths=[...new Set(all.map(r=>r.month))].sort((a,b)=>a-b);
 $('data-health').innerHTML=`<span class="health-source"><span class="dot" aria-hidden="true"></span><b>Actual data</b> ${sourceMonths.length?e(monthRange(sourceMonths)+' '+d.snapshot.year):'—'}</span><span><b>Selected scope</b> ${e(scopeText())}</span><span class="${u.value==null||v.value==null?'health-warning':'health-good'}"><b>Coverage</b> ${u.value==null||v.value==null?'Incomplete / unavailable':'Available'}${v.estimated?' · Estimated value included':''}${u.approximate||v.approximate?' · Recorded subtotal':''}</span><span><b>Last saved</b> ${payload.updatedAt?e(new Date(payload.updatedAt).toLocaleString()):'No manual update recorded'}<span data-owner-only hidden> · Rev ${payload.revision}</span></span><span class="health-targets">Provisional targets <span id="health-target-slot"></span></span><button type="button" class="data-notes-link" aria-controls="sales-data-notes" data-open-notes>ⓘ Data notes</button>${provisional(d.snapshot.year)?`<span class="health-warning provisional-chip" title="${e(provisionalNote())}"><b>2023 source coverage</b> Recorded monthly figures</span>`:''}`;
 if(definition)$('health-target-slot').append(definition);
 $('data-health').querySelector('[data-open-notes]').onclick=()=>{const notes=$('sales-data-notes');notes.open=true;notes.scrollIntoView?.({block:'start',behavior:'smooth'});notes.querySelector('summary')?.focus()};
}
// V68 S-03: the KPI label follows the months actually chosen, not the period mode.
function periodKind(chosen){const m=[...new Set(chosen)].sort((a,b)=>a-b);return m.length===12?'Full-year':m.length&&m.every((x,i)=>x===i+1)?'YTD':'Selected-period'}
// V68 S-04: every unavailable figure carries a specific reason.
const REASON_DIMENSION='Targets are product-level and are not allocated to distributor or sales-type filters.',REASON_SHARED_LINE='Target is shared with another line and isn’t split.';
function targetReason(f,products,metric){const d=dashboard();if(['distributor','channel'].some(k=>f[k]?.length))return REASON_DIMENSION;if(f.line?.length&&products.some(p=>records().some(r=>r.dataset==='actual'&&r.year===d.snapshot.year&&productName(r)===p&&!f.line.includes(r.line))))return REASON_SHARED_LINE;if(!products.length)return 'No products in this selection.';return `No complete ${metric==='value'?'value':'unit'} target for every selected product.`}

function renderProvisionalBadge(d=dashboard()){const h1=$('sales').querySelector('h1');let badge=$('provisional-badge');if(!badge){h1.insertAdjacentHTML('afterend','<span id="provisional-badge" class="provisional-badge" tabindex="0" hidden>Provisional data</span>');badge=$('provisional-badge')}badge.hidden=!(viewCtx?viewCtx.provisionalYears.length||provisional(viewCtx.compareYear):provisional(d.snapshot.year));badge.textContent='2023 data notes';badge.title=provisionalNote();badge.setAttribute('aria-label',provisionalNote())}
// V69 U-13: one page title; the subtitle names the selection (plan 2.2).
function selectionSubtitle(ctx){const c=ctx.months,end=c.length?Math.max(...c):0,ytd=c.length===end&&c.every((m,i)=>m===i+1),period=!c.length?'No months':c.length===12?'Full year':ytd?'YTD '+ms[end-1]:c.length<=3?c.map(m=>ms[m-1]).join(', '):c.length+' months',p=ctx.selection.product,products=!p.length?'All products':p.length===1?p[0]:p.length+' products',dims=['line','distributor','channel'].filter(k=>ctx.selection[k].length).map(k=>ctx.selection[k].length===1?ctx.selection[k][0]:ctx.selection[k].length+' '+(k==='channel'?'sales types':k+'s'));return [yearSpan(ctx.years),period,products,...dims,ctx.measure==='value'?'Value':'Units'].join(' · ')}
function renderSummary(){const d=dashboard(),ctx=viewContext(d);if(!$('sales').hidden)$('chrome-page-label').textContent='Sales performance';const nav=document.querySelector('[data-page="sales"] span');if(nav)nav.textContent='Sales performance';$('sales').querySelector('h1').textContent='Sales performance';if($('page-subtitle'))$('page-subtitle').textContent=selectionSubtitle(ctx);if($('filters-toggle')){const count=(ctx.years.length!==1||ctx.focusYear!==ctx.latestYear?1:0)+(d.periodMode!=='ytd'?1:0)+Object.values(ctx.selection).filter(v=>v.length).length+(ctx.measure!=='units'?1:0);$('filters-toggle').textContent=count?`Filters (${count})`:'Filters';$('filters-summary').textContent=selectionSubtitle(ctx)}renderProvisionalBadge(d);$('summary-context').textContent=periodLabel()+' · '+scopeText()+' · '+ui.metric;
 const empty=!ctx.hasData&&ctx.monthCount>0;$('kpis').hidden=empty;let none=$('no-sales');if(!none){$('kpis').insertAdjacentHTML('afterend','<div id="no-sales" class="no-sales" hidden><p></p><button type="button" id="no-sales-reset">Reset filters</button></div>');none=$('no-sales');$('no-sales-reset').onclick=()=>$('reset').click()}none.hidden=!empty;none.querySelector('p').textContent='No sales recorded for '+selectionSubtitle(ctx).replace(/ · (Units|Value)$/,'')+'.';if(empty)return;
 $('kpis').innerHTML=kpiCards(ctx);}
function deltaChip(change,year){if(change.unavailable)return `<span class="delta-chip neutral" title="${e(change.unavailable)}">Growth unavailable · ${e(change.unavailable)}</span>`;if(change.ppg==null)return change.gap?`<span class="delta-chip neutral" title="${e(change.gap)}">— no comparison · ${e(change.gap)}</span>`:'<span class="delta-chip neutral">— no comparison</span>';if(Math.abs(change.ppg)<0.05)return `<span class="delta-chip neutral">Flat <span class="sr-only">vs ${year}</span></span>`;const up=change.ppg>=0;return `<span class="delta-chip ${up?'up':'down'}"><span aria-hidden="true">${up?'▲':'▼'}</span> ${up?'Up':'Down'} ${Math.abs(change.ppg).toFixed(1)}% <span class="sr-only">vs ${year}</span></span>`}
function progressBar(pct,status,marker=null){const width=pct==null?0:Math.max(0,Math.min(100,pct));return `<div class="kpi-progress ${status}" aria-hidden="true"><span style="width:${width}%"></span>${marker==null?'':`<i class="pace-marker" style="left:${Math.max(0,Math.min(100,marker))}%"></i>`}</div>`}
function statusWord(status){return {good:'On or above target',warn:'Within 10% of target',bad:'More than 10% below target',unknown:'Status unavailable'}[status]}

// ── V69 U-12: KPI card sets (plan 4.1). Each slot has an ordered fallback list so no card is a bare "—". ──
// V72 R-04: a value longer than 14 characters is shown compact (EGP 1.75B, +EGP 215.7M) on every viewport;
// the exact value stays in the title and in screen-reader text, and CSS ellipsis is only a safety net.
function kpiValueHTML(value){const text=String(value),m=text.match(/^([+−-]?)(EGP )?([\d,]+(?:\.\d+)?)$/);if(!m||text.length<=14)return m&&m[2]?`${m[1]}<span class="kpi-unit">EGP</span> ${e(m[3])}`:e(text);const num=Number(m[3].replace(/,/g,'')),short=compact(num,Math.abs(num)>=1e9?2:1);return `<span class="kpi-value" aria-hidden="true">${m[1]}${m[2]?'<span class="kpi-unit">EGP</span> ':''}${e(short)}</span><span class="sr-only">${e(text)}</span>`}
function kpiCard(key,label,value,body,extra='',labelHTML=''){return `<div class="kpi kpi-${key}" data-kpi="${key}"${extra}><div class="label">${e(label)}${labelHTML}</div><strong title="${e(value)}" data-exact="${e(value)}">${kpiValueHTML(value)}</strong>${body}</div>`}
function kpiCandidates(ctx){
 // V72 R-02: single-year cards use the focus year's recorded months (2023 Full year = Jan–Sep) and compare the months
 // both years record (ctx.compareMonths), the same months the Monthly chart and the bridge use.
 const m=ctx.measure,o=ctx.other,fy=ctx.focusYear,cy=ctx.compareYear,f=ctx.selection,chosen=ctx.yearMode==='single'?ctx.dataMonths:ctx.months,cmp=ctx.yearMode==='single'?ctx.compareMonths:ctx.months,partial=ctx.yearMode==='single'&&ctx.comparePartial,missing=ctx.yearMode==='single'&&!!ctx.missingNote,unit=v=>v==='value'?'EGP':'units',S=(year,metric,months=chosen,filters=f)=>year==null?null:ctxSummary(ctx,year,months,metric,filters).value,estimateLabel=(year,metric)=>year===2023&&ctxSummary(ctx,year,chosen,metric).estimated?' (includes estimates)':'',cyLabel=estimateLabel(cy,m);
 const chg=(cur,prev)=>cy==null?{ppg:null,unavailable:null}:ctx.filterCompareGap?{delta:null,ppg:null,unavailable:null,gap:ctx.filterCompareGap.short}:ctx.growthOk?{...changeBetween({value:cur},{value:prev}),unavailable:null}:{delta:null,ppg:null,unavailable:ctx.growthReason};
 const cur=S(fy,m),prev=S(cy,m,cmp),oCur=S(fy,o),oPrev=S(cy,o,cmp),curC=partial?S(fy,m,cmp):cur,oCurC=partial?S(fy,o,cmp):oCur,label=missing?monthRange(chosen)+' '+fy:periodLabel(dashboard(),chosen),one=ctx.productMode==='one',vsText=(year,value,metric,extra='')=>`vs ${year}${partial?' '+monthRange(cmp):''}: ${amt(value,metric)}${extra}`,partialNote=partial?`<small class="kpi-compare-note">${e(ctx.compareNote)}</small>`:'',recordedLabel=missing?' '+monthRange(chosen)+' '+fy:'',provisionalChip=missing&&provisional(fy)?'<span class="kpi-provisional" title="'+e(provisionalNote())+'">Provisional</span>':'';
 const C={};
 C.sales=cur==null?null:()=>kpiCard('sales','Sales'+recordedLabel+' · '+unit(m),amt(cur,m),`<small>${missing?e(ctx.missingNote)+' · ':''}${e(prev!=null?vsText(cy,prev,m,cyLabel):label)}${one&&oCur!=null&&ctx.slot4Price?' · '+e(amt(oCur,o)):''}</small>${missing?'':partialNote}${deltaChip(chg(curC,prev),cy)}`,' style="--kpi-accent:1"',provisionalChip);
 C.other=oCur==null?null:()=>kpiCard('other',(o==='value'?'Sales value':'Sales')+recordedLabel+(o==='value'?' · EGP':' · units'),amt(oCur,o),`<small>${e(oPrev!=null?vsText(cy,oPrev,o,estimateLabel(cy,o)):label)}</small>${deltaChip(chg(oCurC,oPrev),cy)}`);
 if(ctx.yearMode==='single'){
  const t=ctx.hasTargets?tgt(ctx,ctx.products,m,chosen):null,annual=ctx.hasTargets?tgt(ctx,ctx.products,m,chosen,true):null,ach=cur!=null&&t>0?cur/t*100:null,fy100=cur!=null&&annual>0?cur/annual*100:null;
  const end=chosen.length?Math.max(...chosen):0,ytd=chosen.length===end&&chosen.every((x,i)=>x===i+1),pace=ytd?end/12*100:null,gapPts=fy100!=null&&pace!=null?fy100-pace:null,paceWord=gapPts==null?null:Math.abs(gapPts)<=3?'On pace':gapPts>0?'Ahead':'Behind',paceStatus=paceWord==null?'unknown':paceWord==='Behind'?(gapPts<-10?'bad':'warn'):'good',achS=achStatus(ach),gap=cur!=null&&t!=null?cur-t:null,kind=periodKind(chosen);
  C.ach=ach==null?null:()=>kpiCard('achievement',kind+' achievement',n(ach)+'%',`${progressBar(ach,achS)}<small>Target ${e(amt(t,m))} · ${gap>=0?e(amt(gap,m))+' above target':e(amt(-gap,m))+' to go'}</small><span class="status-word ${achS}">${e(statusWord(achS))}</span>`,` data-status="${achS}"`);
  // V72 R-03: full-year progress only for a contiguous Jan…n period; otherwise the next candidate fills the slot.
  C.fy=fy100==null||!ctx.isOpenYear||!ytd?null:()=>kpiCard('fy','Full-year progress',n(fy100)+'%',`${progressBar(fy100,paceStatus,pace)}<small>FY target ${e(amt(annual,m))}${pace==null?'':' · pace '+pace.toFixed(1)+'%'}</small>${paceWord?`<span class="status-word ${paceStatus}">${paceWord}${pace==null?'':' · '+(gapPts>=0?'+':'−')+Math.abs(gapPts).toFixed(1)+' pts vs pace'}</span>`:''}`,` data-status="${paceStatus}"`);
  const avg=cur!=null&&chosen.length>=2?cur/chosen.length:null,pAvg=prev!=null?prev/cmp.length:null,avgC=curC!=null?curC/cmp.length:null;
  C.avgMonth=avg==null?null:()=>kpiCard('avg',missing?'Average per recorded month':'Average per month',amt(avg,m),`<small>${e(pAvg!=null?vsText(cy,pAvg,m,cyLabel):`${chosen.length} ${missing?'recorded ':''}months · ${unit(m)}`)}</small>${deltaChip(chg(avgC,pAvg),cy)}`);
  const company=S(fy,m,chosen,{}),share=cur!=null&&company>0&&!ctx.companyScope?cur/company*100:null,pShare=(()=>{if(cy==null||!ctx.growthOk||ctx.filterCompareGap||share==null)return null;const a=S(cy,m,cmp),b=S(cy,m,cmp,{});return a!=null&&b>0?a/b*100:null})();
  C.share=share==null?null:()=>kpiCard('share','Share of company',share.toFixed(1)+'%',`<small>${e(pShare!=null?`${share-pShare>=0?'+':'−'}${Math.abs(share-pShare).toFixed(1)} pts vs ${cy}`:'of company '+unit(m)+' · '+label)}</small>`);
  const monthly=chosen.map(x=>({x,v:S(fy,m,[x])})).filter(r=>Number.isFinite(r.v)),best=monthly.length>=2?monthly.reduce((a,b)=>b.v>a.v?b:a):null;
  C.bestMonth=best==null?null:()=>kpiCard('best','Best month',ms[best.x-1]+' '+fy,`<small>${e(amt(best.v,m))} · ${monthly.length} months with data</small>`);
  const u=S(fy,'units'),v=S(fy,'value'),pu=S(cy,'units',cmp),pv=S(cy,'value',cmp),uC=partial?S(fy,'units',cmp):u,vC=partial?S(fy,'value',cmp):v,price=u>0&&v!=null?v/u:null,priceC=uC>0&&vC!=null?vC/uC:null,pPrice=pu>0&&pv!=null?pv/pu:null,fmtP=x=>'EGP '+(x>=100?n(x):x.toFixed(1));
  C.price=!one||price==null?null:()=>kpiCard('price','Average price · EGP/unit',fmtP(price),`<small>${e(pPrice!=null?`vs ${cy}${partial?' '+monthRange(cmp):''}: ${fmtP(pPrice)}${cyLabel}`:label)}</small>${deltaChip(chg(priceC,pPrice),cy)}`);
 }else{
  // V69.1: with 3+ years selected the cards summarise the whole selected range (first comparable selected year → focusYear),
  // not just the previous year. The previous-year figure stays visible as a subtitle. Two selected years keep the plain pair comparison.
  const range=multiYearRange(ctx,S),base=range?range.start:cy,baseCur=S(base,m);
  const unavailable=range?null:!ctx.growthOk?ctx.growthReason:null,prev=baseCur,delta=cur!=null&&prev!=null?cur-prev:null,ppg=delta!=null&&prev>0?delta/prev*100:null;
  const lastYear=range&&cy!=null?(ctx.growthOk?(()=>{const p=S(cy,m),d=cur!=null&&p!=null?cur-p:null;return d==null?null:{delta:d,ppg:p>0?d/p*100:null}})():{unavailable:ctx.growthReason}):null;
  const vsLast=(kind)=>!lastYear?'':lastYear.unavailable?` · vs ${cy}: ${lastYear.unavailable}`:kind==='delta'?` · vs ${cy}: ${(lastYear.delta<0?'−':'+')+amt(Math.abs(lastYear.delta),m)}`:lastYear.ppg==null?'':` · ${cy} → ${fy}: ${pct(lastYear.ppg)}`;
  C.salesFocus=cur==null?null:()=>kpiCard('sales',`Sales ${fy} · ${unit(m)}`,amt(cur,m),`<small>${e(label.replace(yearSpan(ctx.years),String(fy)))}</small>`,' style="--kpi-accent:1"');
  C.salesCompare=prev==null?null:()=>kpiCard('compare',`Sales ${base} · ${unit(m)}`,amt(prev,m),`<small>${e(range?(base===ctx.years[0]?'First selected year · same months':`First comparable year · ${ctx.years.filter(y=>y<base).join(', ')} unavailable for this period`):'Same months as '+fy)}</small>`);
  C.change=base==null||(delta==null&&!unavailable)?null:()=>unavailable?kpiCard('change',`Change ${base} → ${fy}`,'Not comparable',`<small>${e(unavailable)}</small>`):kpiCard('change',`Change ${base} → ${fy}`,(delta<0?'−':'+')+amt(Math.abs(delta),m),`<small>${e(unit(m)+' · same months'+vsLast('delta'))}</small>`,range?` data-range="${base}-${fy}"`:'');
  if(range){
   const yrs=fy-base,cagr=cur>0&&prev>0?(Math.pow(cur/prev,1/yrs)-1)*100:null;
   C.growth=cagr==null&&ppg==null?null:()=>kpiCard('growth',cagr!=null?`Avg yearly growth ${base} → ${fy}`:`Growth ${base} → ${fy}`,pct(cagr??ppg),`<small>${e((cagr!=null&&ppg!=null?`Total ${pct(ppg)} over ${yrs} years`:`${yrs} years`)+vsLast('ppg'))}</small>`,` data-range="${base}-${fy}"`);
  }else C.growth=cy==null||(ppg==null&&!unavailable)?null:()=>unavailable?kpiCard('growth',`Growth ${cy} → ${fy}`,'Not comparable',`<small>${e(unavailable)}</small>`):kpiCard('growth',`Growth ${cy} → ${fy}`,pct(ppg),`<small>${e(DIM_YEARS_NOTE(ctx))}</small>`);
  const shareOf=year=>{const a=S(year,m),b=S(year,m,chosen,{});return a!=null&&b>0?a/b*100:null},sF=one?shareOf(fy):null,sC=one&&base!=null?shareOf(base):null;
  C.shareYears=sF==null?null:()=>kpiCard('share',`Share of company ${fy}`,sF.toFixed(1)+'%',`<small>${e(sC==null?'of company '+unit(m):unavailable?`${base}: ${sC.toFixed(1)}% · change unavailable`:`${sF-sC>=0?'+':'−'}${Math.abs(sF-sC).toFixed(1)} pts vs ${base}`)}</small>`);
 }
 C.products=()=>kpiCard('products','Products with sales',String(ctx.productCount),`<small>${e(label)}</small>`);
 // V72 R-02: "Months selected" is never shown while some selected months are not recorded.
 C.months=missing?null:()=>kpiCard('months','Months selected',String(chosen.length),`<small>${e(label)}</small>`);
 return C;
}
// V69.1: range start for 3+ selected years = earliest selected year before focusYear eligible for comparison with the focus year
// and that has a positive figure in the measure for the same months. null → the cards fall back to the compareYear pair.
function multiYearRange(ctx,S){if(ctx.yearMode!=='multi'||ctx.years.length<3)return null;const start=ctx.years.find(y=>y<ctx.focusYear&&growthAllowed(y,ctx.focusYear).ok&&S(y,ctx.measure)>0);return start==null?null:{start}}
const DIM_YEARS_NOTE=ctx=>ctx.growthBasis==='selected'?'vs previous selected year':'vs previous year';
function kpiSlots(ctx){
 if(ctx.yearMode==='multi')return ctx.productMode==='one'?[['salesFocus','other'],['shareYears','salesCompare'],['change','salesCompare'],['growth','other']]:[['salesFocus','other'],['salesCompare','other'],['change','other'],['growth','other']];
 const one=ctx.productMode==='one',last=one?['price','other','share']:['other','share','bestMonth'];
 if(ctx.hasTargets)return [['sales','other'],['ach','share','avgMonth','bestMonth'],ctx.isOpenYear?['fy','avgMonth','bestMonth']:['avgMonth','bestMonth'],last];
 return [['sales','other'],ctx.companyScope?['avgMonth','bestMonth']:['share','avgMonth','bestMonth'],['bestMonth','avgMonth'],last];
}
function kpiCards(ctx){
 const slots=kpiSlots(ctx),probe={...ctx,slot4Price:false},C0=kpiCandidates(probe),used=new Set(),picks=[];
 for(const list of slots){const k=[...list,'products','months','avgMonth','bestMonth','other'].find(x=>C0[x]&&!used.has(x));if(k){used.add(k);picks.push(k)}}
 const C=picks[3]==='price'?kpiCandidates({...ctx,slot4Price:true}):C0;
 return `<div class="kpi-group-label sr-only">Performance · ${e(periodLabel(dashboard(),ctx.months))}</div>`+picks.filter(k=>k&&C[k]).map(k=>C[k]()).join('');
}
function drawBridge(id,result,metric,dimension='product'){const cap=isMobile()?6:8;
 const node=$(id);if(result.delta==null){node.innerHTML=`<p class="empty-chart">${e(result.reason||'Comparable periods unavailable.')}</p>`;return}
 let items=result.items;
 const matched=result.ordered?items.filter(x=>!x.residual):items.filter(x=>!x.residual).slice().sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)),other=result.ordered&&matched.length<=12?[]:matched.slice(cap);if(other.length)items=[...matched.slice(0,cap),{name:`Other (${other.length})`,delta:other.reduce((n,r)=>n+r.delta,0)},...items.filter(x=>x.residual)];
 let running=result.previous.value;const bars=[{name:String(result.a),from:0,to:running,total:true}];for(const item of items){bars.push({...item,from:running,to:running+item.delta});running+=item.delta}bars.push({name:String(result.b),from:0,to:result.current.value,total:true});
 // V68 S-17: start the value axis at a nice value just below every running total so small changes stay visible;
 // total bars keep their true values on the truncated axis and an axis-break marker + note say so.
 const points=bars.flatMap(b=>b.total?[b.to]:[b.from,b.to]),cut=niceAxis(points,4,{includeZero:false}),truncated=points.every(v=>v>0)&&cut.min>0,axis=truncated?cut:niceAxis(bars.flatMap(b=>[b.from,b.to]),4);for(const b of bars)if(b.total&&truncated)b.from=axis.min;
 const lo=axis.min,hi=axis.max,range=hi-lo||1,W=plotWidth(id,900),dense=W<1050,L=58,R=W-30,T=35,B=260,H=B+40,Y=v=>B-(v-lo)/range*(B-T),step=(R-L)/bars.length,bw=Math.min(48,step*.65),maxChars=Math.max(4,Math.floor((step-6)/6.6));
 let svg=svgPlot(W,H,`Contribution bridge from ${result.a} to ${result.b}; ${metric}${truncated?'; axis starts at '+tickLabel(axis.min,axis):''}`);
 if(truncated)svg+=`<path class="axis-break" d="M${L-7},${B-2} l4,-5 l4,5 l4,-5" fill="none" stroke="#1f3555" stroke-width="1.5"/><text class="axis-break-note" x="${L}" y="16" font-size="12" fill="#5b6b7f">Axis starts at ${tickLabel(axis.min,axis)} · bars are not drawn from zero</text>`;
 for(const v of axisTicks(axis)){svg+=`<line x1="${L}" x2="${R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e5edf5"/><text class="axis-tick" data-tick="${v}" x="${L-10}" y="${Y(v)+4}" text-anchor="end" font-size="12" fill="#5b6b7f">${tickLabel(v,axis)}</text>`}
 bars.forEach((b,i)=>{const x=L+step*(i+.5),value=b.total?b.to:b.delta,displayName=dense?(b.total?b.name:String(i)):b.name,tip=`${b.name} · ${amt(value,metric)}${b.residual?' · Detail unavailable; not assigned to a product':b.newSales?' · '+b.activity+'; prior sales = 0; PPG: New':''}`;const clickable=!b.total&&!b.residual&&!/^Other \(/.test(b.name)&&dimension!=='month';svg+=`<g ${clickable?`role="button" data-bridge-dim="${dimension}" data-key="${e(b.name)}"`:'role="img"'} data-tip="${e(tip)}" tabindex="0" aria-label="${e(tip)}"><rect x="${x-bw/2}" y="${Math.min(Y(b.from),Y(b.to))}" width="${bw}" height="${Math.max(.8,Math.abs(Y(b.to)-Y(b.from)))}" fill="${b.total?'#245fa7':b.residual?'#a1aebd':b.delta<0?'#bc665b':'#39836e'}"/><text x="${x}" y="${Math.min(Y(b.from),Y(b.to))-9}" text-anchor="middle" font-size="12" fill="#254365">${dense?'':(!b.total&&value>0?'+':'')+short(value)}</text><text x="${x}" y="${B+22}" text-anchor="middle" font-size="12" fill="#536c86">${e(truncate(String(displayName),maxChars))}</text></g>`;if(i&& !b.total)svg+=`<line x1="${x-step+bw/2}" x2="${x-bw/2}" y1="${Y(b.from)}" y2="${Y(b.from)}" stroke="#94a7b8" stroke-dasharray="3 3"/>`});
 node.innerHTML='<div class="chart-scroll bridge-fit" tabindex="0" role="region" aria-label="Contribution bridge">'+svg+'</svg></div>'+(dense?'<ol class="bridge-key">'+bars.filter(b=>!b.total).map(b=>'<li><span>'+e(b.name)+'</span><strong>'+e(amt(b.delta,metric))+'</strong></li>').join('')+'</ol>':'')+(other.length?'<details class="bridge-other-detail"><summary>Other: '+other.length+' smaller contributions</summary>'+table(['Product / group','Change'],other.map(r=>[e(r.name),amt(r.delta,metric)]))+'</details>':'');
}
function table(headers,rows){return `<table><thead><tr>${headers.map(h=>`<th scope="col">${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>'<tr'+(row[0]==='Total'?' class="total-row"':'')+'>'+row.map(v=>`<td>${v}</td>`).join('')+'</tr>').join('')}</tbody></table>`}
// ── V69 U-06: one 'What drove the change' panel on Overview (replaces Sales Analysis Movement and Historical Contribution to change) ──
const DIM_LABEL={product:'Products',line:'Lines',distributor:'Distributors',channel:'Sales types',month:'Month'};
function bridgePair(ctx){
 if(ctx.yearMode==='single')return ctx.compareYear!=null&&ctx.growthOk?[ctx.compareYear,ctx.focusYear]:null;
 const ok=ctx.years;let b=ok.includes(ui.bridgeTo)?ui.bridgeTo:ok.includes(ctx.focusYear)?ctx.focusYear:ok.at(-1);let a=ok.includes(ui.bridgeFrom)&&ui.bridgeFrom<b?ui.bridgeFrom:ctx.compareYear!=null&&ok.includes(ctx.compareYear)&&ctx.compareYear<b?ctx.compareYear:ok.filter(y=>y<b).at(-1);
 return a!=null&&b!=null&&growthAllowed(a,b).ok?[a,b]:null;
}
// V72 R-01 / R-02: the bridge is drawn only when both period totals are measurable; otherwise the reason goes to "Not shown".
// V72 R-02: single-year bridges compare the months both years record (2024 vs 2023 = Jan–Sep), like the KPI cards.
const bridgeMonths=ctx=>ctx.yearMode==='single'?ctx.compareMonths:ctx.months;
function bridgeGap(ctx){
 const pair=bridgePair(ctx);if(!pair||!ctx.hasData)return null;const [a,b]=pair,key=JSON.stringify(['bridgeGap',ctx.yearMode,a,b,ui.metric,bridgeMonths(ctx),ctx.selection]);
 if(!cache.has(key)){const t=movementTotals(ctx.records,{a,b,months:bridgeMonths(ctx),metric:ui.metric,filters:ctx.selection}),gap=t.previous.dimensionGap?{...t.previous.dimensionGap,year:a}:t.current.dimensionGap?{...t.current.dimensionGap,year:b}:null,picked=gap&&ctx.selection[gap.key];
  cache.set(key,t.delta!=null?null:gap?`${gap.year} does not record ${gap.word}, so the change for ${picked.length===1?picked[0]:'the selected '+gap.word+'s'} can’t be measured.`:`${a} → ${b} can’t be compared for this selection (${t.reason}).`)}
 return cache.get(key);
}
function bridgeOptions(ctx){
 const pair=bridgePair(ctx);if(!pair||!ctx.hasData)return [];
 const opts=[];
 if(ctx.productMode!=='one'&&ctx.productCount>=2)opts.push('product');
 for(const k of ['line','distributor','channel'])if(ctx.dims[k].comparable&&ctx.dims[k].categories>=2&&!(k==='line'&&ctx.productMode==='one'))opts.push(k);
 if(bridgeMonths(ctx).length>=2)opts.push('month');
 return opts;
}
function bridgeResult(ctx,a,b,dimension,metric=ui.metric){
 const months=bridgeMonths(ctx),key=JSON.stringify(['bridge',ctx.yearMode,a,b,dimension,metric,months,ctx.selection]);if(cache.has(key))return cache.get(key);
 let result;
 if(dimension==='month'){
  result=movement(ctx.records,{a,b,months,metric,dimension:'product',filters:ctx.selection});
  if(result.delta!=null){const parts=months.map(m=>({m,r:movement(ctx.records,{a,b,months:[m],metric,dimension:'product',filters:ctx.selection})}));
   if(parts.some(p=>p.r.delta==null))result={...result,delta:null,reason:'Monthly change needs comparable data in each selected month.'};
   else{const items=parts.map(p=>({name:ms[p.m-1],month:p.m,delta:p.r.delta,previous:p.r.previous.value,current:p.r.current.value,ppg:p.r.ppg})),residual=result.delta-items.reduce((s,r)=>s+r.delta,0);if(Math.abs(residual)>Math.max(1e-4,Math.abs(result.delta)*1e-12))items.push({name:'Unallocated monthly detail',delta:residual,residual:true});result={...result,items,ordered:true}}}
 }else result=movement(ctx.records,{a,b,months,dimension,metric,filters:ctx.selection});
 cache.set(key,result);return result;
}
function renderBridge(ctx){
 const opts=bridgeOptions(ctx),pair=bridgePair(ctx);if(!opts.length||!pair)return;
 if(!opts.includes(ui.bridgeDimension))ui.bridgeDimension=ctx.productMode==='one'?'month':opts[0];
 const [a,b]=pair,dimension=ui.bridgeDimension,metric=ui.metric,result=bridgeResult(ctx,a,b,dimension,metric);
 $('movement-dimension').innerHTML=opts.map(o=>`<option value="${o}">${DIM_LABEL[o]}</option>`).join('');$('movement-dimension').value=dimension;
 const yearPick=$('bridge-years');yearPick.hidden=ctx.yearMode!=='multi';
 if(ctx.yearMode==='multi'){const ok=ctx.years;$('bridge-from').innerHTML=ok.filter(y=>y<b).map(y=>`<option value="${y}">${y}</option>`).join('');$('bridge-from').value=String(a);$('bridge-to').innerHTML=ok.filter(y=>ok.some(x=>x<y)).map(y=>`<option value="${y}">${y}</option>`).join('');$('bridge-to').value=String(b)}
 if(result.delta==null)return {empty:result.reason||'Comparable periods unavailable.'};
 drawBridge('movement-chart',result,metric,dimension);
 $('movement-context').textContent=`${a} → ${b} · ${ctx.yearMode==='single'&&ctx.comparePartial?ctx.compareNote:periodLabel()+' in both years'} · ${metric==='value'?'EGP value':'Units'} · ${scopeText()}${result.estimated?' · Estimated value included':''}${result.approximate?' · Recorded subtotals included':''}`;
 $('movement-unmatched').hidden=!result.unmatched?.length;$('movement-unmatched-list').innerHTML=(result.unmatched||[]).map(name=>`<p>${e(name)} — a comparable amount is unavailable in one of the periods; no zero baseline is assumed.</p>`).join('');
 $('movement-note').textContent=(dimension==='month'?'Each bar is one month’s contribution to the change. ':'')+'Blue: period totals. Green/red: signed change. New: absent activity in a complete prior report counts as zero sales. Grey: unavailable detail. Contributions reconcile to the total difference; smaller items are grouped into Other.';
 $('movement-table').innerHTML=table([DIM_LABEL[dimension]==='Month'?'Month':'Product / group',String(a),String(b),'Change','Growth (PPG%)'],result.items.map(r=>[e(r.name),n(r.previous),n(r.current),n(r.delta),r.newSales?'New':pct(r.ppg)]));
}

function rankedHTML(items,metric,click=true,chartId=null){
 if(!items.length)return '<p class="empty-chart">No comparable detail for this selection.</p>';
 const W=plotWidth(chartId,640),mobile=W<520,axis=niceAxis(items.map(r=>r.value),3),lo=axis.min,hi=axis.max,range=hi-lo||1,L=mobile?24:Math.round(W*.34),R=W-145,rowH=mobile?85:52,H=65+items.length*rowH,X=v=>L+(v-lo)/range*(R-L),zero=X(0);let svg=svgPlot(W,H,'Ranked signed '+metric,'comparison-svg');
 items.forEach((r,i)=>{const y=35+i*rowH,barY=y+(mobile?22:-9),tip=`${r.name} · ${amt(r.value,metric)}${r.note?' · '+r.note:''}`,maxChars=Math.max(15,Math.floor((mobile?W-40:L-50)/6.8));svg+=`<g tabindex="0" ${click?`role="button" data-select-product="${e(r.name)}"`:'role="img"'} data-tip="${e(tip)}" aria-label="${e(tip)}"><text x="5" y="${y+4}" font-size="12" fill="#789">${i+1}</text><text x="30" y="${y+4}" font-size="12" fill="#284362">${e(r.name.length>maxChars?r.name.slice(0,maxChars-1)+'…':r.name)}</text><rect x="${Math.min(zero,X(r.value))}" y="${barY}" width="${Math.max(.5,Math.abs(X(r.value)-zero))}" height="18" fill="${r.value<0?'#bc665b':'#245fa7'}"/><text x="${W-8}" y="${mobile?y+35:y+4}" text-anchor="end" font-size="12" fill="#284362">${n(r.value)}</text>${r.note?`<text x="${W-8}" y="${mobile?y+58:y+22}" text-anchor="end" font-size="12" fill="#5b6b7f">${e(r.note)}</text>`:''}</g>`});
 for(const v of axisTicks(axis)){svg+=`<text class="axis-tick" data-tick="${v}" x="${X(v)}" y="${H-8}" text-anchor="middle" font-size="12" fill="#789">${tickLabel(v,axis)}</text>`}return svg+'</svg>';
}
// V69 U-07: the composition row (Distributor mix · Sales-type mix · Sales by line) for one year, in the global measure.
// E-rule 2: a panel needs 2+ known categories and 50%+ of selected sales in known categories (the registry checks ctx.dims).
function compositionYear(ctx){if(ctx.yearMode==='single')return ctx.focusYear;const withData=compositionYears(ctx);return withData.includes(ui.compositionYear)?ui.compositionYear:withData.includes(bridgePair(ctx)?.[1])?bridgePair(ctx)[1]:withData.includes(ctx.focusYear)?ctx.focusYear:withData.at(-1)??ctx.focusYear}
function compositionYears(ctx){return ctx.years.filter(y=>['distributor','channel','line'].some(k=>!ctx.dims[k].notRecorded.includes(y)&&new Set(ctx.records.filter(r=>r.dataset==='actual'&&r.year===y&&ctx.dataMonths.includes(r.month)&&knownCategory(r[k])).map(r=>r[k])).size>=2))}
function mixPeriod(ctx,year){return ctx.missingNote&&ctx.yearMode==='single'?`${monthRange(ctx.dataMonths)} ${year} · ${ctx.missingNote}`:periodLabel(dashboard(),ctx.months,year)}
function mixItems(ctx,key,year,metric=ui.metric){
 const scoped=scopeRecords(ctx.records,ctx.selection).filter(r=>r.dataset==='actual'&&r.year===year&&ctx.dataMonths.includes(r.month)),names=[...new Set(scoped.map(r=>r[key]||'NOT PROVIDED'))];
 return names.map(name=>({name,value:ctxSummary(ctx,year,ctx.dataMonths,metric,{...ctx.selection,[key]:[name]}).value})).filter(r=>r.value!=null).sort((a,b)=>b.value-a.value);
}
function renderMixChart(id,key,ctx){
 const year=compositionYear(ctx),metric=ui.metric,total=ctxSummary(ctx,year,ctx.dataMonths,metric).value,items=mixItems(ctx,key,year,metric);
 if(!items.length||total==null)return {empty:`${key==='distributor'?'Distributor':'Sales type'} amounts are not available for ${periodLabel(dashboard(),ctx.dataMonths,year)}.`};
 $(id).innerHTML=productMixDonut(items,metric,total,id,key);
 const ctxLine=$(id).closest('article').querySelector('.mix-context');if(ctxLine)ctxLine.textContent=`${mixPeriod(ctx,year)} · ${metric==='value'?'EGP':'Units'} · % of selected sales`;
}
function renderLineMix(ctx){
 const year=compositionYear(ctx),metric=ui.metric,total=ctxSummary(ctx,year,ctx.dataMonths,metric).value,items=mixItems(ctx,'line',year,metric);if(!items.length)return {empty:`Line amounts are not available for ${periodLabel(dashboard(),ctx.dataMonths,year)}.`};const W=plotWidth('line-mix',520),mobile=W<420,cap=isMobile()?5:8,shown=items.slice(0,cap),rest=items.slice(cap);
 if(rest.length)shown.push({name:`Other (${rest.length})`,value:rest.reduce((a,r)=>a+r.value,0),other:true});
 const max=Math.max(1,...shown.map(r=>Math.abs(r.value))),labelW=mobile?0:Math.min(170,Math.round(W*.36)),rowH=mobile?46:30,H=shown.length*rowH+6,valueW=mobile?0:118,L=mobile?4:labelW+8,R=W-(mobile?4:valueW);
 let svg=svgPlot(W,H,'Sales by line in '+(metric==='value'?'EGP':'units'));
 shown.forEach((r,i)=>{const y=i*rowH+4,share=total>0?r.value/total*100:null,tip=`${r.name} · ${amt(r.value,metric)} · ${share==null?'—':share.toFixed(1)+'%'} of selected sales`,w=Math.max(.5,Math.abs(r.value)/max*(R-L)),name=truncate(r.name,mobile?40:Math.floor(labelW/6.6)),barY=mobile?y+18:y+6,color=knownCategory(r.name)?'#5e85c9':'#9aa5b4';
  svg+=`<g tabindex="0" ${r.other||!knownCategory(r.name)?'role="img"':`role="button" data-mix-focus="line" data-key="${e(r.name)}"`} data-tip="${e(tip)}" aria-label="${e(tip)}"><rect x="0" y="${y}" width="${W}" height="${rowH-2}" fill="transparent"/><text x="${mobile?L:0}" y="${mobile?y+12:y+16}" font-size="12" fill="#38516f">${e(name)}</text><rect x="${L}" y="${barY}" width="${w}" height="14" rx="3" fill="${r.value<0?'#bb7764':color}"/><text x="${W-4}" y="${mobile?y+12:y+16}" text-anchor="end" font-size="12" fill="#304b6f">${e(short(r.value))}<tspan fill="#5b6b7f"> · ${share==null?'—':share.toFixed(1)+'%'}</tspan></text></g>`});
 $('line-mix').innerHTML=svg+'</svg>';
 const ctxLine=$('panel-mixLine').querySelector('.mix-context');if(ctxLine)ctxLine.textContent=`${mixPeriod(ctx,year)} · ${metric==='value'?'EGP':'Units'} · % of selected sales`;
}
function productMixDonut(items,metric,total,chartId=null,focusKey=null){
 if(!items.length||total==null)return '<p class="empty-chart">Mix unavailable for this selection.</p>';
 if(items.some(r=>r.value<0))return rankedHTML(items,metric,false,chartId)+'<p class="chart-note">Signed adjustments shown as bars; donut shares require non-negative sales.</p>';
 if(total<=0)return '<p class="empty-chart">No positive sales for this selection.</p>';
 if(items.length>6){const top=items.slice(0,5),rest=items.slice(5);return productMixDonut([...top,{name:'Others',value:rest.reduce((a,r)=>a+r.value,0)}],metric,total,chartId,focusKey)+'<details><summary>View all '+items.length+' groups</summary>'+rankedHTML(items,metric,false,chartId)+'</details>'}
 const sum=items.reduce((a,r)=>a+r.value,0);if(Math.abs(sum-total)>Math.max(1e-6,Math.abs(total)*1e-8))return rankedHTML(items,metric,false,chartId)+'<p class="chart-note">Complete mix is unavailable; known amounts are shown without a donut.</p>';
 // V68 S-15: one colour per category everywhere (chart-utils CATEGORY_COLORS); NOT PROVIDED is neutral grey.
 const colors=items.map(r=>categoryColor(r.name));let offset=0;
 const arcs=items.map((r,i)=>{const share=r.value/total*100,tip=r.name+' · '+amt(r.value,metric)+' · '+share.toFixed(1)+'% of selected',arc=`<circle role="img" cx="110" cy="110" r="78" fill="none" stroke="${colors[i%colors.length]}" stroke-width="28" pathLength="100" stroke-dasharray="${share} ${100-share}" stroke-dashoffset="${-offset}" transform="rotate(-90 110 110)" tabindex="0" data-tip="${e(tip)}" aria-label="${e(tip)}"></circle>`;offset+=share;return arc}).join('');
 return `<div class="product-mix-donut"><svg viewBox="0 0 220 220" role="img" aria-label="Selected ${e(metric)} mix"><circle cx="110" cy="110" r="78" fill="none" stroke="#edf1f7" stroke-width="28"/>${arcs}<text x="110" y="106" text-anchor="middle" font-size="23" font-weight="700" fill="#233653">${e(short(total))}</text><text x="110" y="127" text-anchor="middle" font-size="14" fill="#5b6b7f">${metric==='value'?'EGP':'Units'}</text></svg><ul class="product-mix-legend">${items.map((r,i)=>{const f=focusKey&&r.name!=='Others',body=`<i style="background:${colors[i%colors.length]}"></i><span>${e(r.name)}</span><strong>${n(r.value)}<small>${(r.value/total*100).toFixed(1)}%</small></strong>`;return f?`<li data-key="${e(r.name)}"><button type="button" class="mix-focus" data-mix-focus="${focusKey}" data-key="${e(r.name)}" title="${e('Filter to '+r.name)}">${body}</button></li>`:`<li>${body}</li>`}).join('')}</ul></div>`;
}
// ── V69 U-04: the one Monthly chart (replaces Monthly performance, Sales trend, the PPG panel and the value timeline) ──
function tgt(ctx,products,metric,chosen,annual=false,filters=ctx.selection){return targetSum(records(),{year:ctx.focusYear},products,chosen,metric,filters,annual)}
function ctxSummary(ctx,year,chosen,metric=ui.metric,filters=ctx.selection){const key=JSON.stringify(['v69',ctx.yearMode,year,chosen,metric,filters]);if(!cache.has(key))cache.set(key,comparableSummary(ctx.records,year,chosen,metric,filters));return cache.get(key)}
// V72 R-01: previous-year bars only when the previous year records every filtered dimension.
const pyOk=ctx=>ctx.compareYear!=null&&ctx.growthOk&&!ctx.filterCompareGap;
function monthlyRows(ctx,metric=ui.metric){
 const py=pyOk(ctx);
 return ctx.months.map(m=>{const actual=ctxSummary(ctx,ctx.focusYear,[m],metric).value,target=ctx.hasTargets?tgt(ctx,ctx.products,metric,[m]):null,previous=py?ctxSummary(ctx,ctx.compareYear,[m],metric).value:null,ch=py?changeBetween({value:actual},{value:previous}):{ppg:null};return {month:m,actual,target,previous,pct:actual!=null&&target>0?actual/target*100:null,ppg:ch.ppg}});
}
function monthlyCompareOptions(ctx){return [ctx.hasTargets&&['target','Target'],pyOk(ctx)&&['py','Previous year'],['none','None']].filter(Boolean)}
function monthlyCompare(ctx){const opts=monthlyCompareOptions(ctx).map(o=>o[0]);return opts.includes(ui.monthlyCompare)?ui.monthlyCompare:opts[0]}
function legendHTML(mode,ctx){
 const sw=(cls,text)=>`<span class="lg-item"><i class="lg-swatch ${cls}"></i>${e(text)}</span>`,line=(text,dash='')=>`<span class="lg-item"><svg class="lg-line" width="22" height="10" aria-hidden="true"><line x1="1" x2="21" y1="5" y2="5" stroke="#1f3555" stroke-width="2" ${dash?`stroke-dasharray="${dash}"`:''}/></svg>${e(text)}</span>`;
 if(ui.monthlyCumulative)return sw('toward','Cumulative '+ctx.focusYear)+(mode==='target'?line('Cumulative target','6 4'):mode==='py'?line('Cumulative '+ctx.compareYear,'6 4'):'');
 if(mode==='target')return sw('toward','Toward target')+sw('over','Above target')+line('Monthly target');
 if(mode==='py')return sw('previous',String(ctx.compareYear))+sw('toward',String(ctx.focusYear))+'<span class="lg-item lg-note">% = growth vs '+ctx.compareYear+'</span>';
 return sw('toward',String(ctx.focusYear));
}
function cumulativeChart(data,metric,compare='target',ctx=null){
 if(!data.length)return '<p class="empty-chart">Select at least one month.</p>';
 let a=0,t=0,aOk=true,tOk=true;const key=compare==='py'?'previous':'target';
 const rows=data.map(d=>{aOk=aOk&&Number.isFinite(d.actual);tOk=tOk&&Number.isFinite(d[key]);a+=aOk?d.actual:0;t+=tOk?d[key]:0;return {month:d.month,actual:aOk?a:null,target:compare!=='none'&&tOk?t:null}});
 const W=plotWidth('trend'),L=62,R=W-24,T=34,B=222,axis=niceAxis(rows.flatMap(r=>[r.actual,r.target]),4),Y=v=>B-(v-axis.min)/(axis.max-axis.min)*(B-T),step=(R-L)/rows.length,bw=Math.min(38,step*.52),stride=labelStride(rows.length,R-L),last=rows.at(-1),ratio=last.actual!=null&&last.target>0?last.actual/last.target*100:null,word=compare==='py'?'cumulative '+(ctx?.compareYear??'previous year'):'cumulative target';
 let svg=svgPlot(W,270,'Cumulative actual and '+word);for(const v of axisTicks(axis))svg+=`<line x1="${L}" x2="${R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e9eff2"/><text class="axis-tick" data-tick="${v}" x="${L-10}" y="${Y(v)+3}" text-anchor="end" font-size="12" fill="#5b6b7f">${tickLabel(v,axis)}</text>`;
 rows.forEach((r,i)=>{const x=L+step*(i+.5),tip=`${ms[r.month-1]} cumulative · actual ${r.actual==null?'unknown':amt(r.actual,metric)}${compare==='none'?'':' · '+word+' '+amt(r.target,metric)}`;svg+=`<g role="img" tabindex="0" data-tip="${e(tip)}" aria-label="${e(tip)}" data-cumulative="${r.actual??''}">${r.actual==null?`<rect class="unknown-slot" x="${x-bw/2}" y="${T+(B-T)*.45}" width="${bw}" height="${(B-T)*.55}" rx="3" fill="none" stroke="#9aa5b4" stroke-dasharray="4 3"/><text class="unknown-label" x="${x}" y="${T+(B-T)*.45-6}" text-anchor="middle" font-size="11" fill="#5b6b7f">unknown</text>`:`<rect x="${x-bw/2}" y="${Math.min(Y(r.actual),Y(0))}" width="${bw}" height="${Math.max(.5,Math.abs(Y(r.actual)-Y(0)))}" rx="3" fill="#245fa7"/>`}</g>${i%stride===0||i===rows.length-1?`<text x="${x}" y="250" text-anchor="middle" font-size="12" fill="#5b6b7f">${ms[r.month-1]}</text>`:''}`});
 const pts=rows.map((r,i)=>r.target==null?null:`${L+step*(i+.5)},${Y(r.target)}`).filter(Boolean);if(pts.length>1)svg+=`<polyline points="${pts.join(' ')}" fill="none" stroke="#1f3555" stroke-width="2" stroke-dasharray="6 4"/>`;else if(pts.length)svg+=`<circle cx="${pts[0].split(',')[0]}" cy="${pts[0].split(',')[1]}" r="3" fill="#1f3555"/>`;
 if(ratio!=null){const x=L+step*(rows.length-.5);svg+=`<text class="cumulative-ytd" x="${Math.min(x,R-4)}" y="${Y(Math.max(last.actual,last.target))-10}" text-anchor="end" font-size="12" font-weight="700" fill="#1f3555">${compare==='py'?(ratio-100>=0?'+':'')+(ratio-100).toFixed(0)+'% vs '+(ctx?.compareYear??'previous year'):ratio.toFixed(0)+'% of cumulative target'}</text>`}
 return svg+'</svg>';
}
// Generic multi-line chart: one line per series over the selected months (split by product, multi-year lines). Gaps where unknown.
const SERIES_COLORS=['#245fa7','#c0782f','#1f9a8a','#8a63c2','#b0533f','#5d7fa6'],SERIES_DASH=['0','7 3','2 3','10 3 2 3','5 3','12 3 3 3'];
function linesChart(series,monthsList,metric,id,label){
 const W=plotWidth(id,900),L=62,R=W-20,T=28,B=240,vals=series.flatMap(s=>s.values).filter(Number.isFinite),axis=niceAxis(vals,4),X=i=>monthsList.length===1?(L+R)/2:L+i*(R-L)/(monthsList.length-1),Y=v=>B-(v-axis.min)/(axis.max-axis.min)*(B-T),stride=labelStride(monthsList.length,R-L);
 let svg=svgPlot(W,280,label);for(const v of axisTicks(axis))svg+=`<line x1="${L}" x2="${R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e9eff2"/><text class="axis-tick" data-tick="${v}" x="${L-10}" y="${Y(v)+4}" text-anchor="end" font-size="12" fill="#5b6b7f">${tickLabel(v,axis)}</text>`;
 monthsList.forEach((m,i)=>{if(i%stride===0||i===monthsList.length-1)svg+=`<text x="${X(i)}" y="${B+24}" text-anchor="middle" font-size="12" fill="#5b6b7f">${ms[m-1]}</text>`});
 series.forEach((s,k)=>{const color=s.color||SERIES_COLORS[k%SERIES_COLORS.length],dash=s.dash??SERIES_DASH[k%SERIES_DASH.length];let seg=[];const flush=()=>{if(seg.length>1)svg+=`<polyline data-series="${e(s.name)}" points="${seg.join(' ')}" fill="none" stroke="${color}" stroke-width="2.6" stroke-dasharray="${dash}" stroke-linejoin="round"/>`;seg=[]};
  s.values.forEach((v,i)=>{if(!Number.isFinite(v)){flush();return}if(i&&monthsList[i]!==monthsList[i-1]+1)flush();seg.push(X(i)+','+Y(v))});flush();
  s.values.forEach((v,i)=>{const tip=`${s.name} · ${ms[monthsList[i]-1]} · ${Number.isFinite(v)?amt(v,metric):'unknown'}`;if(Number.isFinite(v))svg+=`<circle role="img" tabindex="0" data-tip="${e(tip)}" aria-label="${e(tip)}" cx="${X(i)}" cy="${Y(v)}" r="4" fill="white" stroke="${color}" stroke-width="2"></circle>`})});
 return svg+'</svg>';
}
function seriesLegend(series,attr=null,hidden=new Set()){return '<div class="series-legend">'+series.map((s,k)=>{const color=s.color||SERIES_COLORS[k%SERIES_COLORS.length],dash=s.dash??SERIES_DASH[k%SERIES_DASH.length],sw=`<svg width="30" height="12" aria-hidden="true"><line x1="1" x2="29" y1="6" y2="6" stroke="${color}" stroke-width="2.6" stroke-dasharray="${dash}"/></svg>`;return attr?`<button type="button" ${attr}="${e(s.key??s.name)}" aria-pressed="${!hidden.has(s.key??s.name)}">${sw}${e(s.name)}</button>`:`<span>${sw}${e(s.name)}</span>`}).join('')+'</div>'}
// One-month selection: a comparison card (Actual / Target / Previous year), never a lonely full-width bar (E-rule 3).
function monthCardHTML(row,ctx,metric){
 const items=[['Actual '+ctx.focusYear,row.actual,'#245fa7'],ctx.hasTargets&&['Target',row.target,'#1f3555'],pyOk(ctx)&&['Previous year · '+ctx.compareYear,row.previous,'#b8cadd']].filter(Boolean),max=Math.max(1,...items.map(i=>Math.abs(i[1]||0)));
 const chips=[row.pct!=null&&`<span class="delta-chip ${achStatus(row.pct)==='good'?'up':achStatus(row.pct)==='bad'?'down':'neutral'}">${n(row.pct)}% of target</span>`,row.ppg!=null&&`<span class="delta-chip ${row.ppg>=0?'up':'down'}">${row.ppg>=0?'▲ +':'▼ '}${row.ppg.toFixed(1)}% vs ${ctx.compareYear}</span>`,!ctx.growthOk&&ctx.growthReason&&`<span class="delta-chip neutral">${e(ctx.growthReason)}</span>`,ctx.filterCompareGap&&`<span class="delta-chip neutral">${e(ctx.filterCompareGap.sentence)}</span>`].filter(Boolean).join('');
 return `<div class="month-card"><p class="month-card-title">${ms[row.month-1]} ${ctx.focusYear}</p>${items.map(([label,v,color])=>{const tip=`${label} · ${v==null?'unknown':amt(v,metric)}`;return `<div class="month-card-row" data-tip="${e(tip)}" tabindex="0"><span class="mc-label">${e(label)}</span><span class="mc-track"><i style="width:${v==null?0:Math.abs(v)/max*100}%;background:${color}"></i></span><b>${v==null?'unknown':e(amt(v,metric))}</b></div>`}).join('')}<div class="month-card-chips">${chips}</div></div>`;
}
function renderMonthlyPanel(ctx){
 const metric=ui.metric,mode=monthlyCompare(ctx),node=$('trend'),article=$('panel-monthly');
 article.querySelector('h2').textContent=ctx.yearMode==='multi'?'Monthly sales by year':'Monthly sales';
 const controls=[];
 if(ctx.yearMode==='multi'){renderMultiYearMonthly(ctx);return}
 const opts=monthlyCompareOptions(ctx);if(opts.length>1)controls.push(buttons('Compare with',opts,mode,'data-monthly-compare'));
 if(ctx.monthCount>1)controls.push(buttons('Monthly or cumulative',[['monthly','Monthly'],['cumulative','Cumulative']],ui.monthlyCumulative?'cumulative':'monthly','data-monthly-view'));
 const splitable=ctx.productMode==='many'&&ctx.selection.product.length>=2&&ctx.selection.product.length<=3&&ctx.monthCount>1;
 if(splitable)controls.push(buttons('Split by product',[['off','Total'],['on','Split by product']],ui.monthlySplit?'on':'off','data-monthly-split'));
 $('monthly-controls').innerHTML=controls.join('');
 const legend=article.querySelector('.progress-legend'),rows=monthlyRows(ctx,metric),unknown=rows.filter(r=>r.actual==null).length,otherUnknown=ctx.unknownMonths[ctx.other].length;
 let note='';
 if(unknown*2>rows.length&&!otherUnknown)note=`<p class="chart-note unknown-note">${unknown} of ${rows.length} months have unknown ${metric}. <button type="button" class="link-button" data-measure-switch="${ctx.other}">Switch to ${ctx.other==='value'?'Value':'Units'} (complete)</button></p>`;
 else if(unknown)note=`<p class="chart-note unknown-note">Unknown ${metric} in ${e(rows.filter(r=>r.actual==null).map(r=>ms[r.month-1]).join(', '))}: shown as gaps, not zero.</p>`;
 if(ctx.filterCompareGap)note+=`<p class="chart-note compare-gap-note">No previous-year bars: ${e(ctx.filterCompareGap.sentence)}</p>`;
 if(ctx.monthCount===1){legend.hidden=true;node.innerHTML=monthCardHTML(rows[0],ctx,metric);$('monthly-context').textContent=`${periodLabel()} · ${metric==='value'?'EGP value':'Units'}`;return}
 if(splitable&&ui.monthlySplit){
  const series=ctx.selection.product.map(p=>({name:p,values:ctx.months.map(m=>ctxSummary(ctx,ctx.focusYear,[m],metric,{...ctx.selection,product:[p]}).value)}));
  legend.hidden=false;legend.innerHTML=seriesLegend(series);node.innerHTML=linesChart(series,ctx.months,metric,'trend','Monthly sales, one line per selected product');
  $('monthly-context').textContent=`${periodLabel()} · ${metric==='value'?'EGP value':'Units'} · one line per product`;return;
 }
 legend.hidden=false;legend.innerHTML=legendHTML(mode,ctx);
 node.innerHTML=note+(ui.monthlyCumulative?cumulativeChart(rows,metric,mode,ctx):window.actualDashboard.monthlyChartHTML(rows,metric,plotWidth('trend'),{compare:mode,maxBar:ctx.monthCount===2?64:38,pyYear:ctx.compareYear}));
 $('monthly-context').textContent=`${periodLabel()} · ${metric==='value'?'EGP value':'Units'}${mode==='target'?' · vs monthly target':mode==='py'?' · vs '+ctx.compareYear:''}${ui.monthlyCumulative?' · cumulative':''}`;
}
// ── V69 U-14: multi-year renderers (replace the Historical page charts) ──
// Monthly chart, one line per selected year; legend buttons toggle a year; phones show the 3 latest years first.
function renderMultiYearMonthly(ctx){
 const metric=ui.metric,article=$('panel-monthly'),legend=article.querySelector('.progress-legend'),node=$('trend'),mobile=isMobile();
 const all=ctx.years.slice(),limited=mobile&&!ui.monthlyAllYears&&all.length>3,shownYears=limited?all.slice(-3):all,hidden=ui.hiddenYears||(ui.hiddenYears=new Set());
 for(const y of [...hidden])if(!shownYears.includes(Number(y)))hidden.delete(y);if(shownYears.every(y=>hidden.has(String(y))))hidden.clear();
 const controls=[];if(ctx.monthCount>1)controls.push(buttons('Monthly or cumulative',[['monthly','Monthly'],['cumulative','Cumulative']],ui.monthlyCumulative?'cumulative':'monthly','data-monthly-view'));
 if(mobile&&all.length>3)controls.push(`<button type="button" class="link-button" data-monthly-years="${limited?'all':'recent'}">${limited?'Show all years ('+all.length+')':'Show 3 latest years'}</button>`);
 $('monthly-controls').innerHTML=controls.join('');
 const series=shownYears.map((y,k)=>{let run=0,broken=false;const values=ctx.months.map(m=>{const v=ctxSummary(ctx,y,[m],metric).value;if(!ui.monthlyCumulative)return v;if(v==null||broken){broken=true;return null}run+=v;return run});return {key:String(y),name:String(y)+(provisional(y)&&metric==='value'?' (includes estimates)':''),values,color:y===ctx.focusYear?'#1d4ed8':SERIES_COLORS[(all.indexOf(y)+1)%SERIES_COLORS.length],dash:y===ctx.focusYear?'0':SERIES_DASH[(all.indexOf(y)+1)%SERIES_DASH.length]}});
 legend.hidden=false;legend.innerHTML=seriesLegend(series,'data-year-line',hidden);
 if(ctx.monthCount===1){const rows=series.map(s=>({name:s.name,v:s.values[0]})),max=Math.max(1,...rows.map(r=>Math.abs(r.v||0)));node.innerHTML=`<div class="month-card"><p class="month-card-title">${ms[ctx.months[0]-1]} · ${e(yearSpan(ctx.years))}</p>${rows.map((r,k)=>`<div class="month-card-row" tabindex="0" data-tip="${e(r.name+' · '+(r.v==null?'unknown':amt(r.v,metric)))}"><span class="mc-label">${e(r.name)}</span><span class="mc-track"><i style="width:${r.v==null?0:Math.abs(r.v)/max*100}%;background:${series[k].color}"></i></span><b>${r.v==null?'unknown':e(amt(r.v,metric))}</b></div>`).join('')}</div>`;legend.hidden=true}
 else{const visible=series.filter(s=>!hidden.has(s.key)),gaps=series.filter(s=>s.values.some(v=>v==null)).map(s=>s.key);node.innerHTML=(gaps.length?`<p class="chart-note unknown-note">Unknown ${metric} months are gaps, not zero (${e(gaps.join(', '))}).</p>`:'')+linesChart(visible,ctx.months,metric,'trend',`Monthly ${ui.monthlyCumulative?'cumulative ':''}sales, one line per year`)}
 $('monthly-context').textContent=`${periodLabel()} · ${metric==='value'?'EGP value':'Units'} · one line per year${ui.monthlyCumulative?' · cumulative':''}${ctx.droppedMonths.length?' · common months only':''}`;
}
// Sales by year: one bar per selected year, with growth against the previous selected year.
function salesByYearRows(ctx,metric=ui.metric){return ctx.years.map((y,i)=>{const v=ctxSummary(ctx,y,ctx.months,metric).value,prev=i?ctx.years[i-1]:null,pv=prev==null?null:ctxSummary(ctx,prev,ctx.months,metric).value,allowed=prev==null?null:growthAllowed(prev,y),ppg=allowed?.ok&&v!=null&&pv>0?(v-pv)/pv*100:null;return {year:y,value:v,prev,ppg,unavailable:allowed&&!allowed.ok?allowed.reason:null}})}
function renderSalesByYear(ctx){
 const metric=ui.metric,rows=salesByYearRows(ctx,metric),id='sales-by-year',W=plotWidth(id,420),L=48,R=W-12,T=30,B=232,H=300,vals=rows.map(r=>r.value).filter(Number.isFinite),axis=niceAxis([0,...vals],4),Y=v=>B-(v-axis.min)/(axis.max-axis.min||1)*(B-T),step=(R-L)/rows.length,bw=Math.min(54,step*.62);
 let svg=svgPlot(W,H,`Sales by year, ${metric}, ${periodLabel()}`);for(const v of axisTicks(axis))svg+=`<line x1="${L}" x2="${R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e9eff2"/><text class="axis-tick" x="${L-8}" y="${Y(v)+4}" text-anchor="end" font-size="11" fill="#5b6b7f">${tickLabel(v,axis)}</text>`;
 rows.forEach((r,i)=>{const x=L+step*(i+.5),focus=r.year===ctx.focusYear,known=Number.isFinite(r.value),y=known?Y(r.value):B,label=r.unavailable?'N/A':r.ppg==null?'':pct(r.ppg),tip=`${r.year} · ${known?amt(r.value,metric):'unknown'}${r.prev?' · vs '+r.prev+': '+(r.unavailable?r.unavailable+' Growth unavailable.':r.ppg==null?'no comparison':pct(r.ppg)):''}`;
  svg+=`<g role="button" tabindex="0" data-focus-year="${r.year}" data-tip="${e(tip)}" aria-label="${e(tip+(focus?' · focus year':' · make this the focus year'))}" aria-pressed="${focus}">${known?`<rect x="${x-bw/2}" y="${y}" width="${bw}" height="${Math.max(1,B-y)}" rx="4" fill="${focus?'#1d4ed8':'#9db7dc'}"/>`:`<text x="${x}" y="${B-8}" text-anchor="middle" font-size="11" fill="#5b6b7f">unknown</text>`}<text x="${x}" y="${(known?y:B)-6}" text-anchor="middle" font-size="11" font-weight="700" fill="#1f3555">${known?short(r.value):''}</text>${label?`<text x="${x}" y="${B+34+(step<66&&i%2?14:0)}" text-anchor="middle" font-size="11" font-weight="600" fill="${r.unavailable?'#5b6b7f':r.ppg>=0?'#146c43':'#a1261b'}">${e(label)}</text>`:''}<text x="${x}" y="${B+18}" text-anchor="middle" font-size="12" font-weight="${focus?700:500}" fill="#1f3555">${r.year}</text></g>`});
 $(id).innerHTML=svg+'</svg>';$('years-context').textContent=`${periodLabel()} · ${metric==='value'?'EGP value':'Units'} · growth vs previous selected year · click a year to focus it${ctx.years.includes(2023)&&metric==='value'?' · 2023 includes estimated values where available':''}`;
}
// Share of company by year (one product): product sales ÷ company sales, same months, per year.
function shareByYearRows(ctx,metric=ui.metric){return ctx.years.map(y=>{const a=ctxSummary(ctx,y,ctx.months,metric).value,b=ctxSummary(ctx,y,ctx.months,metric,{}).value;return {year:y,share:a!=null&&b>0?a/b*100:null,sold:a!=null}})}
function shareYears(ctx){return ctx.yearMode==='multi'&&ctx.productMode==='one'?shareByYearRows(ctx).filter(r=>r.share!=null).length:0}
function renderShareByYear(ctx){
 const rows=shareByYearRows(ctx),id='share-by-year',W=plotWidth(id,420),L=44,R=W-12,T=34,B=210,H=260,vals=rows.map(r=>r.share).filter(Number.isFinite),axis=niceAxis([0,...vals],4),Y=v=>B-(v-axis.min)/(axis.max-axis.min||1)*(B-T),step=(R-L)/rows.length,bw=Math.min(44,step*.55);
 let svg=svgPlot(W,H,`Share of company by year for ${ctx.product}`);for(const v of axisTicks(axis))svg+=`<line x1="${L}" x2="${R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e9eff2"/><text class="axis-tick" x="${L-8}" y="${Y(v)+4}" text-anchor="end" font-size="11" fill="#5b6b7f">${v.toFixed(axis.max<5?1:0)}%</text>`;
 rows.forEach((r,i)=>{const x=L+step*(i+.5),known=r.share!=null,y=known?Y(r.share):B,tip=`${r.year} · ${known?r.share.toFixed(1)+'% of company '+ui.metric:r.sold?'company total unavailable':'not sold in '+r.year}`;svg+=`<g role="img" tabindex="0" data-tip="${e(tip)}" aria-label="${e(tip)}">${known?`<rect x="${x-bw/2}" y="${y}" width="${bw}" height="${Math.max(1,B-y)}" rx="4" fill="${r.year===ctx.focusYear?'#1f9a8a':'#9fd0c8'}"/><text x="${x}" y="${y-6}" text-anchor="middle" font-size="11" font-weight="700" fill="#1f3555">${r.share.toFixed(1)}%</text>`:`<text x="${x}" y="${B-8}" text-anchor="middle" font-size="11" fill="#5b6b7f">—</text>`}<text x="${x}" y="${B+18}" text-anchor="middle" font-size="12" fill="#1f3555">${r.year}</text></g>`});
 $(id).innerHTML=svg+'</svg>';
}
// S-32 table for the Monthly chart: Month, PY, CY, PPG %, Target, Ach. % (columns that apply), Total row, Export Excel.
function monthlyTableData(ctx,metric=ui.metric){
 if(ctx.yearMode==='multi'){const years=ctx.years,rows=ctx.months.map(m=>[ms[m-1],...years.map(y=>ctxSummary(ctx,y,[m],metric).value)]);rows.push(['Total',...years.map(y=>ctxSummary(ctx,y,ctx.months,metric).value)]);return {headers:['Month',...years.map(String)],kinds:['text',...years.map(()=>'number')],rows}}
 const py=pyOk(ctx),t=ctx.hasTargets,data=monthlyRows(ctx,metric),tot=ctxSummary(ctx,ctx.focusYear,ctx.months,metric).value,totPrev=py?ctxSummary(ctx,ctx.compareYear,ctx.months,metric).value:null,totT=t?tgt(ctx,ctx.products,metric,ctx.months):null,totPpg=py?changeBetween({value:tot},{value:totPrev}).ppg:null;
 const headers=['Month',...(py?[String(ctx.compareYear)]:[]),String(ctx.focusYear),...(py?['PPG %']:[]),...(t?['Target','Ach. %']:[])],kinds=['text',...(py?['number']:[]),'number',...(py?['percent']:[]),...(t?['number','percent']:[])];
 const line=(label,cy,prev,ppg,target,ach)=>[label,...(py?[prev]:[]),cy,...(py?[ppg]:[]),...(t?[target,ach]:[])];
 const rows=data.map(r=>line(ms[r.month-1],r.actual,r.previous,r.ppg,r.target,r.pct));rows.push(line('Total',tot,totPrev,totPpg,totT,tot!=null&&totT>0?tot/totT*100:null));
 return {headers,kinds,rows,reason:!py&&ctx.compareYear!=null?ctx.growthReason:null};
}
function monthlyTableHTML(){
 const ctx=viewContext(),{headers,kinds,rows}=monthlyTableData(ctx),cell=(v,k)=>v==null?`<td data-reason="Unknown, not zero" title="Unknown, not zero">—</td>`:k==='percent'?`<td>${v>0&&headers.includes('PPG %')?'':''}${v.toFixed(1)}%</td>`:k==='text'?`<th scope="row">${e(v)}</th>`:`<td>${e(n(v))}</td>`;
 return `<div class="chart-table-actions"><button type="button" data-monthly-export>Export Excel</button></div><div class="table-wrap chart-table-wrap"><table class="chart-table monthly-table"><caption>Monthly sales · ${e(periodLabel())} · ${ui.metric==='value'?'EGP':'Units'}</caption><thead><tr>${headers.map(h=>`<th scope="col">${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr${r[0]==='Total'?' class="total-row"':''}>${r.map((v,i)=>cell(v,kinds[i])).join('')}</tr>`).join('')}</tbody></table></div><p class="chart-note">— = unknown, never zero.</p>`;
}
function exportMonthlyTable(){const ctx=viewContext(),{headers,kinds,rows}=monthlyTableData(ctx);const bytes=tableWorkbook({title:'Nerhadou · Monthly sales',subtitle:[periodLabel(),scopeText(),ui.metric==='value'?'EGP value':'Units'].join(' · '),columns:headers.map((label,i)=>({label,width:i?18:14,kind:kinds[i]})),rows:rows.map(r=>r.map((v,i)=>kinds[i]==='percent'&&v!=null?v/100:v)),notes:['Exported '+new Date().toISOString()+' · Data revision '+payload?.revision+'. Unknown values stay blank, never zero.','PPG % = (current ÷ previous − 1) × 100 for the same month. 2023 comparisons use recorded same-month figures and may include estimates or recorded subtotals.']});const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),a=document.createElement('a');a.href=url;a.download='nerhadou-monthly-sales-'+ctx.years.join('-')+'-'+ui.metric+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
// ── V69 U-09: Products tab (plan 4.8) ──
let ptCache={ctx:null,key:'',data:null},ptSearchTimer=null;
function selectProduct(name){$('tooltip')&&($('tooltip').style.display='none');window.actualDashboard.selectProduct?.(name)}
function productMeasures(ctx){return window.actualDashboard.bothMeasures?.()?[ctx.measure,ctx.other]:[ctx.measure]}
function productsData(ctx){const d=dashboard(),measures=productMeasures(ctx),basis=d.targetBasis==='annual'?'annual':'period',key=measures.join()+basis;if(ptCache.ctx!==ctx||ptCache.key!==key)ptCache={ctx,key,data:productsTableData(ctx,{measures,targetBasis:basis,period:periodLabel(d,ctx.months)})};return {data:ptCache.data,measures,basis}}
function renderProductsTable(ctx){
 if(!$('details'))return;const d=dashboard(),{data,measures,basis}=productsData(ctx),term=($('search')?.value||'').trim().toLowerCase();
 const view={...data,view:term?data.rows.filter(r=>r.product.toLowerCase().includes(term)):data.rows};
 const opts=sortOptions(ctx);if(!ui.ptSort||(!ui.ptSort.startsWith('col:')&&!opts.some(([k])=>k===ui.ptSort))||(ui.ptSort.startsWith('col:')&&!data.cols.some(c=>'col:'+c.key===ui.ptSort))){ui.ptSort='sales';ui.ptDesc=true}
 const groupable=!ctx.selection.line.length&&ctx.dims.line.categories>=2,grouped=groupable&&!!ui.ptGroup&&!term;
 const html=productsTableHTML(view,ctx,{sort:ui.ptSort,desc:ui.ptDesc!==false,measures,showAll:!!ui.ptAll||!!term,grouped});
 $('detail-head').innerHTML=html.head;$('details').innerHTML=html.body;$('portfolio-cards').innerHTML=html.cards;$('pt-more').innerHTML=html.more;
 $('portfolio-sort').innerHTML=opts.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')+(ui.ptSort.startsWith('col:')?`<option value="${e(ui.ptSort)}">Column: ${e(data.cols.find(c=>'col:'+c.key===ui.ptSort)?.short||'')}</option>`:'');$('portfolio-sort').value=ui.ptSort;
 $('pt-basis-field').hidden=!(ctx.yearMode==='single'&&ctx.hasTargets);$('pt-target-basis').value=basis;$('pt-both').checked=measures.length>1;$('pt-group-field').hidden=!groupable;$('pt-group').checked=grouped;
 $('portfolio-context').textContent=[periodLabel(d,ctx.months),ctx.yearMode==='single'&&ctx.hasTargets?'Target: '+(basis==='annual'?'full year '+ctx.focusYear:'selected period'):null,'Shares use full company sales for the period'].filter(Boolean).join(' · ');
 $('rowcount').textContent=`${html.shown} of ${data.count} products${term?' match the search':''}`;$('search-clear').hidden=!term;$('export').disabled=!data.rows.length;
 if(!$('search').dataset.v69){$('search').dataset.v69='1';$('search').oninput=()=>{clearTimeout(ptSearchTimer);ptSearchTimer=setTimeout(()=>renderProductsTable(viewContext()),150)}}
}
function exportProductsTable(){const ctx=viewContext(),d=dashboard(),{data,measures,basis}=productsData(ctx),term=($('search')?.value||'').trim().toLowerCase(),rows=productsTableHTML({...data,view:term?data.rows.filter(r=>r.product.toLowerCase().includes(term)):data.rows},ctx,{sort:ui.ptSort||'sales',desc:ui.ptDesc!==false,measures,showAll:true}).sorted;
 const pctKind=k=>['share','ach','ppg','growth'].includes(k),cols=[{label:'Product',width:30,kind:'text'},...data.cols.map(c=>({label:c.label,width:22,kind:pctKind(c.kind)?'percent':'number'}))],line=r=>[r.product,...data.cols.map(c=>{const v=r.cells[c.key];return v==null?null:pctKind(c.kind)?v/100:v})];
 const bytes=tableWorkbook({title:'Nerhadou · Products',subtitle:[periodLabel(d,ctx.months),scopeText()].join(' · '),columns:cols,rows:[line(data.total),...rows.map(line)],notes:['Exported '+new Date().toISOString()+' · Revision '+(payload?.revision||''),'Shares use total company sales for the same period, before product, line, distributor and sales-type filters. Missing values stay blank.'+(ctx.hasTargets&&ctx.yearMode==='single'?' Target basis: '+(basis==='annual'?'full year.':'selected period.'):'')]}),url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),a=document.createElement('a');
 a.href=url;a.download=`nerhadou-products-${ctx.yearMode==='multi'?ctx.years[0]+'-'+ctx.focusYear:ctx.focusYear}-${measures.join('-')}.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function wireDrilldowns(){
 document.querySelectorAll('[data-focus="product"]').forEach(b=>{b.onclick=()=>selectProduct(b.dataset.key);b.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();b.onclick()}}});
 document.querySelectorAll('#lines-chart [data-focus="line"]').forEach(b=>{b.onclick=()=>window.actualDashboard.focusFilter('line',b.dataset.key);b.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();b.onclick()}}});
 document.querySelectorAll('[data-mix-focus]').forEach(b=>{b.onclick=()=>window.actualDashboard.focusFilter(b.dataset.mixFocus,b.dataset.key);b.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();b.onclick()}}});
 document.querySelectorAll('g[data-focus-year]').forEach(b=>{b.onclick=()=>window.actualDashboard.setFocusYear?.(Number(b.dataset.focusYear));b.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();b.onclick()}}});
 document.querySelectorAll('g[data-bridge-dim]').forEach(b=>{b.onclick=()=>b.dataset.bridgeDim==='product'?selectProduct(b.dataset.key):window.actualDashboard.focusFilter(b.dataset.bridgeDim,b.dataset.key);b.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();b.onclick()}}});
 document.querySelectorAll('g[data-select-product]').forEach(b=>b.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();selectProduct(b.dataset.selectProduct)}});
}
// V69 U-02: attention items are computed once per context; the layout engine hides the panel when no rule fires.
let attentionCache={key:null,items:[]};
function attentionCount(ctx){return attentionItems(ctx).length}
// V69 U-11: Product facts (plan 4.4) replace the single-product block. Facts that cannot be computed are omitted.
let factsCache={key:null,items:[]};
function productFacts(ctx){
 if(factsCache.key===ctx)return factsCache.items;const items=[];factsCache={key:ctx,items};
 if(ctx.productMode!=='one'||ctx.yearMode!=='single'||!ctx.hasData)return items;
 const p=ctx.product,m=ctx.measure,fy=ctx.focusYear,cy=ctx.compareYear,f=ctx.selection,unit=m==='value'?'EGP':'units',sum=(year,chosen,metric,filters=f)=>ctxSummary(ctx,year,chosen,metric,filters).value,cur=sum(fy,ctx.months,m);
 const focus=scopeRecords(ctx.records,f).filter(r=>r.dataset==='actual'&&r.year===fy&&ctx.months.includes(r.month)),lines=[...new Set(focus.map(r=>r.line).filter(knownCategory))];
 if(lines.length===1)items.push({label:'Line',value:lines[0]});
 const others={...f,product:[]},names=[...new Set(scopeRecords(ctx.records,others).filter(r=>r.dataset==='actual'&&r.year===fy&&ctx.months.includes(r.month)).map(r=>r.product))];
 if(cur!=null&&names.length>=2){const vals=names.map(x=>sum(fy,ctx.months,m,{...others,product:[x]})).filter(Number.isFinite);const rank=1+vals.filter(v=>v>cur).length;items.push({label:'Rank among products',value:`#${rank} of ${vals.length}`,note:'by '+(m==='value'?'value':'units')})}
 const company=sum(fy,ctx.months,m,{}),share=cur!=null&&company>0?cur/company*100:null;
 if(share!=null){let note='of company '+unit;if(cy!=null&&ctx.growthOk){const pc=sum(cy,ctx.months,m),pt=sum(cy,ctx.months,m,{});if(pc!=null&&pt>0){const d=share-pc/pt*100;note=`${d>=0?'+':'−'}${Math.abs(d).toFixed(1)} pts vs ${cy}`}}items.push({label:'Share of company',value:share.toFixed(1)+'%',note})}
 const u=sum(fy,ctx.months,'units'),v=sum(fy,ctx.months,'value');
 if(u>0&&v!=null){const price=v/u;let note='EGP per unit';if(cy!=null&&ctx.growthOk){const pu=sum(cy,ctx.months,'units'),pv=sum(cy,ctx.months,'value');if(pu>0&&pv!=null){const pp=pv/pu,g=(price-pp)/pp*100;note=Math.abs(g)<0.05?`same as ${cy}`:`${g>=0?'+':'−'}${Math.abs(g).toFixed(1)}% vs ${cy} (${n(pp)})`}}items.push({label:'Average price',value:'EGP '+(price>=100?n(price):price.toFixed(1)),note})}
 if(ctx.hasTargets){let met=0,known=0;for(const month of ctx.months){const a=sum(fy,[month],m),t=tgt(ctx,[p],m,[month]);if(a==null||!(t>0))continue;known++;if(a>=t)met++}if(known)items.push({label:'Months on or above target',value:`${met} of ${known}`,note:'monthly target, '+unit})}
 for(const key of ['distributor','channel'])if(ctx.dims[key].categories===1)items.push({label:key==='distributor'?'Distributor':'Sales type',value:'100% '+ctx.dims[key].single});
 const trivial=new Set(['Largest contribution to decline','Largest growth driver','Largest target shortfall','Biggest beat vs target']);
 for(const a of attentionItems(ctx).filter(a=>!trivial.has(a.title)))items.push({label:a.title,value:a.chip,note:a.text,tone:a.tone});
 return items;
}
function renderProductFacts(ctx){const all=productFacts(ctx),limit=isMobile()?3:4,list=ui.factsAll?all:all.slice(0,limit);
 $('product-facts').innerHTML=list.map(x=>`<li class="fact${x.tone?' '+x.tone:''}"><span class="fact-label">${e(x.label)}</span><b>${e(x.value)}</b>${x.note?`<small>${e(x.note)}</small>`:''}</li>`).join('')+(all.length>limit?`<li class="fact-more"><button type="button" class="show-all" data-facts-all="${ui.factsAll?'off':'on'}" aria-expanded="${!!ui.factsAll}">${ui.factsAll?'Show fewer':'Show all ('+all.length+')'}</button></li>`:'')}
function attentionItems(ctx=viewContext()){if(attentionCache.key===ctx)return attentionCache.items;attentionCache={key:ctx,items:computeAttention()};return attentionCache.items}
// V69 U-05: one column, impact order, top 4 (3 on phones) then 'Show all (n)' expands in place; the panel never sets the row height.
function renderAttention(){const all=attentionItems(),limit=isMobile()?3:4,items=ui.attentionAll?all:all.slice(0,limit);$('attention-list').innerHTML=items.map(r=>`<button class="attention-item ${r.tone}" data-tone="${r.tone}" data-impact="${r.impact}" ${r.p?`data-select-product="${e(r.p)}"`:'data-attention-distributors="1"'}><span class="attention-head"><b>${e(r.title)}</b><span class="attention-chip ${r.tone}">${e(r.chip)}</span></span><span>${e(r.text)}</span><small>${r.p?"Show this product →":"Show distributors →"}</small></button>`).join('')+(all.length>limit?`<button type="button" class="show-all" data-attention-all="${ui.attentionAll?'off':'on'}" aria-expanded="${!!ui.attentionAll}">${ui.attentionAll?'Show fewer':'Show all ('+all.length+')'}</button>`:'')}
function computeAttention(){
 // V68 S-35: balanced rules (positive and negative), a magnitude chip, sorted by absolute impact in the selected measure.
 const d=dashboard(),items=[],metric=ui.metric,unitWord=metric==='value'?'':' units',signed=v=>(v>0?'+':v<0?'−':'')+(metric==='value'?'EGP ':'')+n(Math.abs(v))+unitWord;
 const changes=selectedProducts().map(p=>({product:p,...pairs(metric,{...d.selection,product:[p]})})).filter(x=>Number.isFinite(x.delta));
 const decline=[...changes].filter(x=>x.delta<0).sort((a,b)=>a.delta-b.delta)[0],driver=[...changes].filter(x=>x.delta>0).sort((a,b)=>b.delta-a.delta)[0];
 if(decline)items.push({p:decline.product,tone:'negative',impact:Math.abs(decline.delta),chip:signed(decline.delta),title:'Largest contribution to decline',text:`${decline.product}: ${amt(decline.delta,metric)} vs same months ${d.snapshot.year-1}.`});
 if(driver)items.push({p:driver.product,tone:'positive',impact:driver.delta,chip:signed(driver.delta),title:'Largest growth driver',text:`${driver.product}: +${amt(driver.delta,metric)} vs same months ${d.snapshot.year-1}.`});
 const vsTarget=selectedProducts().map(p=>{const actual=summary(d.snapshot.year,d.months,metric,{...d.selection,product:[p]}).value,t=target([p],metric);return {product:p,actual,t,gap:actual!=null&&t!=null?t-actual:null}}).filter(r=>r.gap!=null&&r.t>0);
 const plan=d.targetBasis==='annual'?'full-year':'period',short=[...vsTarget].filter(r=>r.gap>0).sort((a,b)=>b.gap-a.gap)[0],beat=[...vsTarget].filter(r=>r.gap<0).sort((a,b)=>a.gap-b.gap)[0];
 if(short)items.push({p:short.product,tone:'negative',impact:short.gap,chip:`${n(short.actual/short.t*100)}% of target`,title:'Largest target shortfall',text:`${short.product}: ${amt(short.gap,metric)} remaining against the ${plan} plan.`});
 if(beat)items.push({p:beat.product,tone:'positive',impact:-beat.gap,chip:`${n(beat.actual/beat.t*100)}% of target`,title:'Biggest beat vs target',text:`${beat.product}: ${amt(-beat.gap,metric)} above the ${plan} plan.`});
 const divergent=selectedProducts().map(p=>({product:p,u:pairs('units',{...d.selection,product:[p]}),v:pairs('value',{...d.selection,product:[p]})})).filter(r=>r.u.delta<0&&r.v.delta>0).sort((a,b)=>b.v.delta-a.v.delta)[0];if(divergent){const own=metric==='value'?divergent.v.delta:divergent.u.delta;items.push({p:divergent.product,tone:'neutral',impact:Math.abs(own),chip:signed(own),title:'Value up, units down',text:`${divergent.product}: value ${pct(divergent.v.ppg)}, units ${pct(divergent.u.ppg)}. Review price / mix; this does not establish the cause.`})}
 const end=Math.max(0,...d.months);if(end>=3&&[end-2,end-1,end].every(m=>d.months.includes(m))){const found=selectedProducts().map(p=>({p,vals:[end-2,end-1,end].map(m=>summary(d.snapshot.year,[m],metric,{...d.selection,product:[p]}).value)})).filter(x=>x.vals.every(Number.isFinite)&&x.vals[0]>x.vals[1]&&x.vals[1]>x.vals[2]).sort((a,b)=>(b.vals[0]-b.vals[2])-(a.vals[0]-a.vals[2]))[0];if(found)items.push({p:found.p,tone:'negative',impact:found.vals[0]-found.vals[2],chip:signed(found.vals[2]-found.vals[0]),title:'Three-month downward trend',text:`${found.p}: declining ${metric} in ${ms[end-3]}, ${ms[end-2]} and ${ms[end-1]}.`})}
 // Concentration is structural, not an impact amount: it ranks after the impact rules. NOT PROVIDED is a data gap, not a distributor.
 const total=summary(d.snapshot.year,d.months,metric).value;if(total>0){const groups=[...new Set(scopeRecords(records(),d.selection).filter(r=>r.year===d.snapshot.year&&r.dataset==='actual').map(r=>r.distributor))].filter(name=>name&&String(name).trim().toUpperCase()!=='NOT PROVIDED').map(name=>({name,value:summary(d.snapshot.year,d.months,metric,{...d.selection,distributor:[name]}).value})).filter(x=>x.value!=null).sort((a,b)=>b.value-a.value);if(groups[0]?.value/total>=.6)items.push({tone:'neutral',impact:-1,chip:`${(groups[0].value/total*100).toFixed(1)}% share`,title:'Distributor concentration ≥60%',text:`${groups[0].name}: ${(groups[0].value/total*100).toFixed(1)}% of selected ${metric}. Check concentration and source coverage.`})}
 items.sort((a,b)=>b.impact-a.impact);return items;
}

function renderPlanning(){
 // V68: Ali decided Forecast is visible to every active user (Viewers included); it reads the same /api/data records all approved users receive.
 if(window.nerhadouSecurity?.me?.user?.status!=='active')return;
 const d=dashboard(),latest=Math.max(0,...scopeRecords(records(),d.selection).filter(r=>r.dataset==='actual'&&r.year===d.snapshot.year).map(r=>r.month));if(ui.forecastYear!==d.snapshot.year){ui.forecastYear=d.snapshot.year;ui.forecastCutoff=latest}const cutoff=Math.min(ui.forecastCutoff||latest,latest),input=records().filter(r=>!(r.dataset==='actual'&&r.year===d.snapshot.year&&r.month>cutoff));$('forecast-cutoff').innerHTML=Array.from({length:latest},(_,i)=>`<option value="${i+1}">${ms[i]} ${d.snapshot.year}</option>`).join('');$('forecast-cutoff').value=String(cutoff);const r=runRateProjection(input,d.snapshot.year,ui.metric,d.selection);if(cutoff===12){const full=summary(d.snapshot.year,Array.from({length:12},(_,i)=>i+1),ui.metric);$('run-rate').innerHTML='<p>Year complete — actual result</p><p class="projection-number">'+e(amt(full.value,ui.metric))+'</p><p>'+e(badge(full))+'</p>';$('target-forecast').innerHTML='<p>No remaining months to forecast.</p>';for(const id of ['run-rate-vs','seasonal-vs','forecast-required'])$(id).innerHTML='';$('forecast-chart').innerHTML='<p class="chart-note">The year is complete; no scenario path is needed.</p>';return}$('run-rate').innerHTML=r.value==null?`<p class="chart-note">${e(r.reason)}</p>`:`<p class="projection-number">${e(amt(r.value,ui.metric))}</p><details class="forecast-method"><summary>ⓘ Method</summary><p>${e(r.method)}</p></details><p class="chart-note">Actual through ${ms[r.through-1]} ${d.snapshot.year}. Based on Jan–${ms[r.through-1]} ${d.snapshot.year}. Independent of dashboard month display. ${summary(d.snapshot.year,Array.from({length:r.through},(_,i)=>i+1),ui.metric).estimated?'Estimated amounts included in YTD.':''}</p>`;
 const seasonal=seasonalProjection(input,d.snapshot.year,cutoff,ui.metric,d.selection);
 $('target-forecast').innerHTML=seasonal.value==null?`<p class="chart-note">${e(seasonal.reason)}</p>`:`<p class="projection-number">${e(amt(seasonal.value,ui.metric))}</p><details class="forecast-method"><summary>ⓘ Method</summary><p>${e(seasonal.method)}</p></details><p class="chart-note">Jan–${ms[cutoff-1]} represented ${(seasonal.share*100).toFixed(1)}% of ${seasonal.priorYear} full-year sales. Forecast = current YTD ÷ that share.</p>`;
 renderForecastContext(d,input,cutoff,r,seasonal);
 // V69 U-17: Required card only with targets; seasonality hidden when the source periods are incomplete (plan 4.9).
 const ctx=viewContext(d),prior=d.snapshot.year-1,hidden=[];
 const seasonalWhy=seasonal.value==null&&cutoff<12?(seasonal.reason||`No complete ${prior} sales to take the seasonality from.`):null;
 const requiredWhy=!ctx.hasTargets?(ctx.targetReason||'No target for this selection.'):null;
 $('fc-seasonal').hidden=!!seasonalWhy;$('fc-required').hidden=!!requiredWhy;if(seasonalWhy)hidden.push(['Historical seasonality forecast',seasonalWhy]);if(requiredWhy)hidden.push(['Required to hit target',requiredWhy]);
 const shown=['fc-runrate','fc-seasonal','fc-required'].filter(id=>!$(id).hidden).length;$('view-forecast').querySelector('.forecast-grid').style.gridTemplateColumns=isMobile()?'':`repeat(${shown},minmax(0,1fr))`;
 const strip=$('forecast-not-shown');strip.hidden=!hidden.length;strip.querySelector('summary').textContent=`Not shown for this selection (${hidden.length})`;strip.querySelector('ul').innerHTML=hidden.map(([t,why])=>`<li><b>${e(t)}</b> ${e(why)}</li>`).join('');
}
// V68 S-19: compare each scenario with the FY target, say what is needed, and draw the cumulative paths.
function renderForecastContext(d,input,cutoff,r,seasonal){
 const metric=ui.metric,f=d.selection,products=selectedProducts(d,f),fy=target(products,metric,d.months,true,f),fyReason=fy==null?targetReason(f,products,metric):null,months=Array.from({length:12},(_,i)=>i+1),through=months.slice(0,cutoff),ytd=comparableSummary(input,d.snapshot.year,through,metric,f),monthlyTargets=months.map(m=>target(products,metric,[m],false,f));
 const vs=(value,reason)=>{if(value==null)return `<p class="chart-note">vs FY target: — ${e(reason||'')}</p>`;if(fy==null)return `<p class="chart-note">vs FY target: — ${e(fyReason)}</p>`;const gap=value-fy,pctv=fy>0?value/fy*100:null,s=achStatus(pctv);return `<p class="forecast-vs-line status-${s}" data-gap="${gap}" data-pct="${pctv??''}">vs FY target: <b>${gap>=0?'+':'−'}${n(Math.abs(gap))}</b> (${pctv==null?'—':n(pctv)+'%'}) <span class="status-word ${s}">${gap>=0?'▲ above':'▼ below'}</span></p>`};
 $('run-rate-vs').innerHTML=vs(r.value,r.reason);$('seasonal-vs').innerHTML=vs(seasonal.value,seasonal.reason);
 const remaining=12-cutoff,avg=ytd.value!=null?ytd.value/cutoff:null,needTotal=fy!=null&&ytd.value!=null?fy-ytd.value:null,need=needTotal!=null&&remaining>0?needTotal/remaining:null;
 $('forecast-required').innerHTML=need==null?`<p class="chart-note">${e(fy==null?fyReason:ytd.reason||'YTD actual unavailable.')}</p>`:needTotal<=0?`<p class="projection-number small">Target reached</p><p class="chart-note">YTD ${e(amt(ytd.value,metric))} already covers the FY target ${e(amt(fy,metric))}.</p>`:`<p class="projection-number small" data-required="${need}">${e(amt(need,metric))}<small>/month</small></p><p class="forecast-sentence">Needs ${e(compact(need,2))}/month vs ${e(compact(avg,2))}/month so far (${need>=avg?'+':'−'}${Math.abs((need/avg-1)*100).toFixed(0)}%).</p><p class="chart-note">${e(amt(needTotal,metric))} remaining FY target ÷ ${remaining} remaining months. YTD average = ${e(amt(ytd.value,metric))} ÷ ${cutoff}.</p>`;
 // cumulative paths
 const actualMonthly=through.map(m=>comparableSummary(input,d.snapshot.year,[m],metric,f).value),actualOk=actualMonthly.every(Number.isFinite);let run=0;const actualCum=actualOk?actualMonthly.map(v=>run+=v):[];
 const prior=months.map(m=>comparableSummary(records(),d.snapshot.year-1,[m],metric,f).value);let pr=0;const priorCum=prior.every(Number.isFinite)?prior.map(v=>pr+=v):null;
 const runPath=r.value!=null&&actualOk?months.slice(cutoff-1).map(m=>({m,v:r.observed+r.monthly*(m-cutoff)})):null,seasonPath=seasonal.value!=null&&actualOk&&priorCum?months.slice(cutoff-1).map(m=>({m,v:seasonal.observed*priorCum[m-1]/seasonal.priorYTD})):null;
 let tc=0,tOk=true;const targetCum=monthlyTargets.map(v=>{tOk=tOk&&Number.isFinite(v);tc+=tOk?v:0;return tOk?tc:null});
 if(!actualOk){$('forecast-chart').innerHTML=`<p class="chart-note">${e('Cumulative path unavailable: a month through the cutoff has unknown '+metric+'.')}</p>`;return}
 const W=plotWidth('forecast-chart',900),L=64,R=W-20,T=24,B=250,all=[...actualCum,...(runPath||[]).map(p=>p.v),...(seasonPath||[]).map(p=>p.v),...targetCum.filter(Number.isFinite)],axis=niceAxis(all,4),Y=v=>B-(v-axis.min)/(axis.max-axis.min)*(B-T),step=(R-L)/12,X=m=>L+step*(m-.5);
 let svg=svgPlot(W,290,'Cumulative actual, scenario paths and cumulative target, January to December');for(const v of axisTicks(axis))svg+=`<line x1="${L}" x2="${R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e9eff2"/><text class="axis-tick" data-tick="${v}" x="${L-8}" y="${Y(v)+4}" text-anchor="end" font-size="12" fill="#5b6b7f">${tickLabel(v,axis)}</text>`;
 months.forEach(m=>svg+=`<text x="${X(m)}" y="${B+22}" text-anchor="middle" font-size="12" fill="#5b6b7f">${W<520?ms[m-1][0]:ms[m-1]}</text>`);
 const line=(pts,cls,color,dash,label)=>pts.length>1?`<polyline class="${cls}" points="${pts.map(p=>X(p.m)+','+Y(p.v)).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" ${dash?`stroke-dasharray="${dash}"`:''}><title>${e(label)}</title></polyline>`:'';
 const tPts=targetCum.map((v,i)=>({m:i+1,v})).filter(p=>p.v!=null);svg+=line(tPts,'fc-target','#1f3555','2 3','Cumulative target');
 svg+=line(actualCum.map((v,i)=>({m:i+1,v})),'fc-actual','#2456d6','','Cumulative actual');if(runPath)svg+=line(runPath,'fc-runrate','#2456d6','7 5','YTD average scenario');if(seasonPath)svg+=line(seasonPath,'fc-seasonal','#b0603e','7 5','Seasonality scenario');
 // S-32: one tooltip per month carries exactly the plotted values (also feeds the table view).
 months.forEach(m=>{const parts=[ms[m-1]+' '+d.snapshot.year,'Actual '+(m<=cutoff?n(actualCum[m-1]):'—'),'YTD avg '+(runPath?.find(p=>p.m===m)?n(runPath.find(p=>p.m===m).v):'—'),'Seasonality '+(seasonPath?.find(p=>p.m===m)?n(seasonPath.find(p=>p.m===m).v):'—'),'Target '+n(targetCum[m-1])];svg+=`<rect class="fc-hit" x="${X(m)-step/2}" y="${T}" width="${step}" height="${B-T}" fill="transparent" data-tip="${e(parts.join(' · '))}"></rect>`});
 const last=actualCum.at(-1);svg+=`<circle class="fc-last-actual" data-value="${last}" cx="${X(cutoff)}" cy="${Y(last)}" r="4" fill="#2456d6"><title>${e('YTD actual '+amt(last,metric))}</title></circle>`;
 for(const [pts,label,color] of [[runPath,'YTD avg',`#2456d6`],[seasonPath,'Seasonality','#b0603e']])if(pts){const p=pts.at(-1);svg+=`<text x="${X(12)-6}" y="${Y(p.v)-6}" text-anchor="end" font-size="12" font-weight="600" fill="${color}">${label} ${e(compact(p.v,2))}</text>`}
 const legend=`<div class="analysis-legend forecast-legend"><span><i class="fl actual"></i>Actual</span>${runPath?'<span><i class="fl runrate"></i>YTD average (scenario)</span>':''}${seasonPath?'<span><i class="fl seasonal"></i>Seasonality (scenario)</span>':''}${tPts.length?'<span><i class="fl target"></i>Cumulative target</span>':''}</div>`;
 const notes=[!runPath?'YTD average path unavailable: '+(r.reason||''):'',!seasonPath?'Seasonality path unavailable: '+(seasonal.reason||'prior-year monthly shape unavailable.'):'',!tPts.length?'Cumulative target unavailable: '+(fyReason||'monthly targets incomplete.'):''].filter(Boolean).map(t=>`<p class="chart-note">${e(t)}</p>`).join('');
 $('forecast-chart').innerHTML=legend+svg+'</svg>'+notes;
}
function onClick(ev){
 const b=ev.target.closest('button,[role="button"]');if(!b)return;if(b.dataset.page==='comparison'){ev.preventDefault();openHistoricalRedirect();return}if(b.dataset.page){placeActions(b.dataset.page);document.querySelector('.manager-actions').hidden=b.dataset.page!=='sales';$('manager-status').hidden=b.dataset.page!=='sales';}
 if(b.dataset.selectProduct){selectProduct(b.dataset.selectProduct);return}
 if(b.dataset.ptSort){const k=b.dataset.ptSort;ui.ptDesc=ui.ptSort===k?!ui.ptDesc:true;ui.ptSort=k;renderProductsTable(viewContext());$('detail-head').querySelector(`[data-pt-sort="${k}"]`)?.focus();return}
 if(b.dataset.ptAll){ui.ptAll=b.dataset.ptAll==='on';renderProductsTable(viewContext());return}
 if(b.id==='search-clear'){$('search').value='';renderProductsTable(viewContext());$('search').focus();return}
 if(b.id==='export'&&dashboard()){exportProductsTable();return}
 let changed=true;
 if(b.dataset.attentionAll)ui.attentionAll=b.dataset.attentionAll==='on';else if(b.dataset.factsAll)ui.factsAll=b.dataset.factsAll==='on';else if(b.dataset.monthlyCompare)ui.monthlyCompare=b.dataset.monthlyCompare;else if(b.dataset.monthlySplit)ui.monthlySplit=b.dataset.monthlySplit==='on';else if(b.dataset.measureSwitch)ui.metric=b.dataset.measureSwitch;else if(b.dataset.monthlyExport){exportMonthlyTable();return}
 else if(b.dataset.monthlyView)ui.monthlyCumulative=b.dataset.monthlyView==='cumulative';
 else if(b.dataset.monthlyYears)ui.monthlyAllYears=b.dataset.monthlyYears==='all';
 else if(b.dataset.yearLine){const h=ui.hiddenYears||(ui.hiddenYears=new Set());h.has(b.dataset.yearLine)?h.delete(b.dataset.yearLine):h.add(b.dataset.yearLine)}
 else if(b.dataset.attentionDistributors){window.actualDashboard.showSection('overview');$('panel-mixDistributor')?.scrollIntoView({behavior:'smooth',block:'center'})}
 else changed=false;
 if(changed)window.actualDashboard.render();
}
function onChange(ev){
 const id=ev.target.id;
 if(id==='portfolio-sort'){ui.ptSort=ev.target.value;ui.ptDesc=ev.target.value!=='name';renderProductsTable(viewContext());return}
 if(id==='pt-target-basis'){window.actualDashboard.setTargetBasis(ev.target.value);return}
 if(id==='pt-both'){window.actualDashboard.setBothMeasures(ev.target.checked);renderProductsTable(viewContext());return}
 if(id==='pt-group'){ui.ptGroup=ev.target.checked;renderProductsTable(viewContext());return}
 if(id==='forecast-cutoff')ui.forecastCutoff=Number(ev.target.value);
 else if(id==='bridge-from')ui.bridgeFrom=Number(ev.target.value);else if(id==='bridge-to')ui.bridgeTo=Number(ev.target.value);
 else if(id==='movement-dimension')ui.bridgeDimension=ev.target.value;

 else return;
 window.actualDashboard.render();
}
// V69 U-16: one Sales page. Saved views and links carry years / period / growth / common months; old Historical
// shapes (page 'comparison', a 'comparison' payload) open the multi-year state with all available years.
function capture(){const d=dashboard(),{hiddenYears,attentionAll,factsAll,ptAll,...rest}=ui;return {years:[...d.years],focusYear:d.focusYear,year:d.focusYear,selection:d.selection,months:d.months,periodMode:d.periodMode,targetBasis:d.targetBasis,growthBasis:d.growthBasis,commonMonths:d.commonMonths,section:d.section,ui:rest,page:'sales'}}
function fromHistorical(old={},base={}){const available=dashboard()?.snapshot.availableYears||[],years=available.slice().sort((a,b)=>a-b),mode=old.mode==='annual'?'full':old.mode==='month'?'selected':'ytd',through=Number.isInteger(old.month)?old.month:null,months=mode==='full'?Array.from({length:12},(_,i)=>i+1):mode==='selected'&&Array.isArray(old.selected)&&old.selected.length?old.selected.filter(m=>Number.isInteger(m)&&m>=1&&m<=12):through?Array.from({length:through},(_,i)=>i+1):base.months||[],scope=old.scope==='product'?'product':'company',metric=['units','value'].includes(old.metrics?.[scope])?old.metrics[scope]:base.ui?.metric||'units';
 return {years,year:years.at(-1),months,periodMode:mode,selection:{product:scope==='product'&&typeof old.product==='string'?[old.product]:[],line:typeof old.line==='string'&&old.line?[old.line]:[],distributor:[],channel:[]},targetBasis:'period',growthBasis:['selected','calendar'].includes(old.growthBasis)?old.growthBasis:'auto',commonMonths:true,section:'overview',ui:{...(base.ui||{}),metric},page:'sales'}}
function openHistoricalRedirect(){const d=dashboard();if(!d)return;const product=d.selection.product.length===1?window.actualDashboard.translateProducts?.(d.selection.product,'multi',d.focusYear)||[]:[];const cfg={...capture(),...fromHistorical({},capture())};cfg.months=d.months;cfg.periodMode=d.periodMode;cfg.selection={...cfg.selection,product};restore(cfg)}
function validConfig(config){
 if(!config||typeof config!=='object'||JSON.stringify(config).length>14000)throw Error('Invalid view link.');
 if(config.page==='comparison'||(!Number.isInteger(config.year)&&!Array.isArray(config.years)&&config.comparison))return fromHistorical(config.comparison||{},config);
 if(Array.isArray(config.years)&&(config.years.length>12||config.years.some(y=>!Number.isInteger(y)||y<2000||y>2100)))throw Error('Invalid sales years.');
 if(!Array.isArray(config.years)&&(!Number.isInteger(config.year)||config.year<2000||config.year>2100))throw Error('Invalid sales year.');
 if(!Array.isArray(config.months)||config.months.length>12||config.months.some(m=>!Number.isInteger(m)||m<1||m>12))throw Error('Invalid months.');
 for(const k of ['product','line','distributor','channel'])if(config.selection?.[k]&&(!Array.isArray(config.selection[k])||config.selection[k].length>150||config.selection[k].some(v=>typeof v!=='string'||v.length>180)))throw Error('Invalid filters.');
 const {comparison,breakdown,...clean}=config;if(clean.periodMode==='month')clean.periodMode='selected';if(clean.periodMode==='annual')clean.periodMode='full';return clean;
}
async function restore(config){
 try{if(!payload||!dashboard()){restorePending=config;return}config=validConfig(config);
 if(['lines','heatmap'].includes(config.section))config={...config,section:'overview'};if(['trends','movement','analysis','breakdown'].includes(config.section))config={...config,section:'overview'};if(config.section==='products')config={...config,section:'portfolio'};const available=dashboard().snapshot.availableYears,wanted=(Array.isArray(config.years)?config.years:[config.year]).filter(y=>available.includes(y));if(!wanted.length){status(`Year ${(config.years||[config.year]).join(', ')} is no longer available. View was not applied.`);return}config={...config,years:wanted};
 if(config.ui){for(const [key,allowed]of Object.entries({metric:['units','value'],bridgeDimension:['product','line','distributor','channel','month'],monthlyCompare:['target','py','none']}))if(allowed.includes(config.ui[key]))ui[key]=config.ui[key];for(const key of ['monthlyCumulative','monthlySplit'])if(typeof config.ui[key]==='boolean')ui[key]=config.ui[key];}
 if(config.years.length>1&&config.selection?.product?.length){const known=new Set(multiOptions('product',config.years));if(!config.selection.product.every(p=>known.has(p)))config={...config,selection:{...config.selection,product:translateProducts(records(),config.selection.product,'multi')}}}
 await window.actualDashboard.apply(config);
 if($('sales').hidden)document.querySelector('[data-page="sales"]')?.click();status('View restored. Only available filters were applied; sales data was not changed.');
 }catch(err){status(err.message)}
}
function savedViews(){try{const data=JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(data)?data.filter(r=>typeof r.id==='string'&&typeof r.name==='string'&&r.config).slice(0,30):[]}catch{return []}}
function refreshSaved(){const rows=savedViews();$('saved-view').innerHTML='<option value="">Saved views…</option>'+rows.map(r=>`<option value="${e(r.id)}">${e(r.name)}</option>`).join('');$('delete-view').disabled=true}
function status(message){$('manager-status').textContent=message}
function saveView(){if(!storageKey)return status('Sign-in context is still loading. Try again.');const name=$('view-name').value.trim();if(!name)return status('Enter a name for this view.');const rows=savedViews(),index=rows.findIndex(r=>r.name===name),item={id:index>=0?rows[index].id:crypto.randomUUID(),name,config:capture()};if(index>=0)rows[index]=item;else rows.push(item);try{localStorage.setItem(storageKey,JSON.stringify(rows.slice(-30)));refreshSaved();$('saved-view').value=item.id;$('delete-view').disabled=false;status('View saved for this account in this browser.')}catch{status('Browser storage is unavailable; the view was not saved.')}}
function deleteView(){try{const id=$('saved-view').value;localStorage.setItem(storageKey,JSON.stringify(savedViews().filter(r=>r.id!==id)));refreshSaved();status('Saved view removed.')}catch{status('Unable to update browser storage.')}}
async function shareView(){syncUrl();const url=new URL(location.href);try{await navigator.clipboard.writeText(url.href);status('View link copied. It contains filter choices only; recipients still need approved access.')}catch{status('Clipboard unavailable. Copy the link from the field below.');let input=$('view-link-copy');if(!input){$('manager-status').insertAdjacentHTML('afterend','<input id="view-link-copy" aria-label="View link to copy" readonly>');input=$('view-link-copy')}input.value=url.href;input.select()}}
// V68 S-37: the visible state lives in the URL query (replaceState on each change, pushState on a tab change).
let urlRestoring=false,lastUrlSection=null;const URL_FILTERS={product:'p',line:'l',distributor:'d',channel:'c'};
function urlQuery(){const d=dashboard();if(!d)return null;const q=new URLSearchParams();q.set('years',d.years.join(','));if(d.focusYear!==Math.max(...d.years))q.set('focus',d.focusYear);q.set('period',d.periodMode);if(d.periodMode==='ytd')q.set('through',Math.max(...d.months));else if(d.periodMode==='selected')q.set('months',d.months.join(','));q.set('tab',d.section==='portfolio'?'products':d.section);q.set('measure',ui.metric);if(d.targetBasis!=='period')q.set('basis',d.targetBasis);if(d.growthBasis!=='auto')q.set('growth',d.growthBasis==='calendar'?'calendar':'selected');if(!d.commonMonths)q.set('common','0');for(const [k,short]of Object.entries(URL_FILTERS))for(const v of d.selection[k]||[])q.append(short,v);return q}
function syncUrl(){if(!restored||urlRestoring||!payload||$('sales')?.hidden||typeof history==='undefined'||!history.replaceState)return;const q=urlQuery();if(!q)return;const url=location.pathname+'?'+q.toString()+(location.hash.startsWith('#view=')?'':location.hash),section=dashboard().section;if(url===location.pathname+location.search+location.hash)return;try{if(lastUrlSection&&section!==lastUrlSection)history.pushState(null,'',url);else history.replaceState(null,'',url)}catch{}lastUrlSection=section}
function urlConfig(){const q=new URLSearchParams(location.search);if(q.get('page')==='comparison'&&!q.has('years'))return fromHistorical({},capture());if(!q.has('year')&&!q.has('years'))return null;try{const base=capture(),list=(q.get('years')||q.get('year')||'').split(',').map(Number).filter(Number.isInteger),period=q.get('period')==='month'?'selected':q.get('period')==='annual'?'full':q.get('period'),periodMode=['ytd','full','selected'].includes(period)?period:base.periodMode,through=Number(q.get('through')),listed=(q.get('months')||'').split(',').filter(Boolean).map(Number),months=periodMode==='full'?Array.from({length:12},(_,i)=>i+1):periodMode==='ytd'&&Number.isInteger(through)&&through>=1&&through<=12?Array.from({length:through},(_,i)=>i+1):listed.length?listed:base.months,selection={};for(const [k,short]of Object.entries(URL_FILTERS))selection[k]=q.getAll(short);const tab=q.get('tab')||'overview',focus=Number(q.get('focus'));
 const config={...base,years:list,year:list.length?Math.max(...list):base.year,focusYear:Number.isInteger(focus)&&list.includes(focus)?focus:undefined,months,selection,periodMode,targetBasis:['period','annual'].includes(q.get('basis'))?q.get('basis'):'period',growthBasis:q.get('growth')==='calendar'?'calendar':q.get('growth')==='selected'?'selected':'auto',commonMonths:q.get('common')!=='0',section:tab==='products'?'portfolio':['analysis','trends','movement','breakdown'].includes(tab)?'overview':tab,ui:{...base.ui,metric:['units','value'].includes(q.get('measure'))?q.get('measure'):base.ui.metric},page:'sales'};return validConfig(config)}catch{return null}}
function readLink(){const fromUrl=urlConfig();if(fromUrl&&!location.hash.startsWith('#view=')){urlRestoring=true;restore(fromUrl).finally(()=>{urlRestoring=false;lastUrlSection=dashboard()?.section;syncUrl()});return}if(location.hash.startsWith('#view=')){try{restore(validConfig(JSON.parse(decodeURIComponent(location.hash.slice(6)))))}catch{status('The view link is invalid. Current filters were retained.')}}}
function reportFigure(title,caption,markup){return `<section class="report-section"><h2>${e(title)}</h2><p class="report-caption">${e(caption)}</p><div class="report-chart" tabindex="0" role="region" aria-label="${e(title)}">${markup}</div></section>`}
function reportSnapshot(id){const original=$(id)?.querySelector('svg');if(!original)return '<p class="report-empty">Chart unavailable for this selection.</p>';const clone=original.cloneNode(true),vb=clone.getAttribute('viewBox')?.split(/\s+/).map(Number);for(const node of [clone,...clone.querySelectorAll('*')]){node.removeAttribute('id');node.removeAttribute('tabindex');for(const attr of [...node.attributes])if(attr.name.startsWith('data-')||attr.name.startsWith('on'))node.removeAttribute(attr.name);if(node.getAttribute('role')==='button')node.removeAttribute('role');}if(vb?.length===4)clone.setAttribute('style',`width:${vb[2]}px;height:${vb[3]}px;max-width:none`);clone.setAttribute('class','report-snapshot');return clone.outerHTML;}
function reportCards(cards){return '<div class="report-kpis">'+cards.map(([label,value,note])=>`<div class="report-kpi"><span>${e(label)}</span><strong>${e(value)}</strong><small>${e(note)}</small></div>`).join('')+'</div>';}
// V69 U-19: the meeting report follows the page: same view context, KPI cards as shown, visible panels in page
// order, the Products table (top 15) when that tab exists, and the 'Not shown' reasons.
const REPORT_TARGETS={monthly:'trend',salesByYear:'sales-by-year',shareByYear:'share-by-year',bridge:'movement-chart',mixDistributor:'distributors',mixChannel:'company-channels',mixLine:'line-mix'};
function reportMarkup(id){const node=$(id);if(!node)return '<p class="report-empty">Chart unavailable for this selection.</p>';if(node.querySelector('svg'))return reportSnapshot(id);const clone=node.cloneNode(true);for(const el of [clone,...clone.querySelectorAll('*')]){el.removeAttribute('id');el.removeAttribute('tabindex');for(const attr of [...el.attributes])if(attr.name.startsWith('data-')||attr.name.startsWith('on'))el.removeAttribute(attr.name)}clone.querySelectorAll('button').forEach(b=>b.replaceWith(...b.childNodes));return clone.innerHTML||'<p class="report-empty">Chart unavailable for this selection.</p>'}
function buildMeetingReport(){
 const d=dashboard();if(!payload||!d)return;const ctx=viewContext(d),stamp=new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Cairo'}).format(new Date()),subtitle=selectionSubtitle(ctx);
 const header=`<header class="report-header"><img src="/logo.png?v=ui02" alt="Nerhadou International"><div><p class="eyebrow">NERHADOU SALES ANALYSIS</p><h1 id="report-heading">Sales performance · Meeting report</h1><p>${e(subtitle)} · Prepared ${e(stamp)} · Cairo time</p></div></header>`;
 if(d.section!=='overview')applyLayout('overview',ctx);
 const cards=[...$('kpis').querySelectorAll('.kpi')].map(k=>[k.querySelector('.label')?.textContent||'',(k.querySelector('strong')?.dataset.exact||k.querySelector('strong')?.textContent)||'',[k.querySelector('small')?.textContent,k.querySelector('.delta-chip,.status-word')?.textContent].filter(Boolean).join(' · ')]);
 let body=`<div class="report-scope">${e(subtitle)}</div>`+reportCards(cards);
 const result=layoutFor('overview',ctx);
 for(const row of result.rows)for(const p of row.panels){const node=$('panel-'+p.id),title=node?.querySelector('h2')?.textContent||p.entry.title,caption=node?.querySelector('#monthly-context,#years-context,#movement-context,.mix-context,.chart-note')?.textContent||subtitle;
  if(p.id==='attention'||p.id==='productFacts'){const items=p.id==='attention'?attentionItems(ctx).map(a=>[a.title,a.chip,a.text]):productFacts(ctx).map(x=>[x.label,x.value,x.note||'']);body+=`<section class="report-section"><h2>${e(title)}</h2><ul class="report-list">${items.map(([a,b,c])=>`<li><b>${e(a)}</b> · ${e(b)}${c?` <span>${e(c)}</span>`:''}</li>`).join('')}</ul></section>`;continue}
  body+=reportFigure(title,caption,reportMarkup(REPORT_TARGETS[p.id]))}
 if(tabVisible('portfolio',ctx)){const measures=[ctx.measure],data=productsTableData(ctx,{measures,targetBasis:d.targetBasis==='annual'?'annual':'period',period:periodLabel(d,ctx.months)}),h=productsTableHTML(data,ctx,{sort:'sales',desc:true,measures}),rows=h.sorted.slice(0,15),fmt=(c,v)=>v==null?'—':['share','ach','ppg','growth'].includes(c.kind)?(c.kind==='share'||c.kind==='ach'?v.toFixed(c.kind==='ach'?0:1)+'%':pct(v)):n(v);
  body+=`<section class="report-section"><h2>Products</h2><p class="report-caption">${e(subtitle)} · Top ${rows.length} of ${data.count} by sales · shares use full company sales for the period.</p><div class="report-table-wrap">`+table(['Product',...data.cols.map(c=>c.label)],[[data.total.product,...data.cols.map(c=>fmt(c,data.total.cells[c.key]))],...rows.map(r=>[e(r.product),...data.cols.map(c=>fmt(c,r.cells[c.key]))])])+'</div></section>'}
 if(result.hidden.length)body+=`<section class="report-section report-notes"><h2>Not shown for this selection</h2>${result.hidden.map(h=>`<p><b>${e(h.title)}</b> ${e(h.reason)}</p>`).join('')}</section>`;
 body+=`<section class="report-section report-notes"><h2>Reading this report</h2><p>Missing figures are —, not zero. Growth compares the same months in both years. 2023 comparisons use recorded figures and may include estimated values or recorded subtotals. Targets are provisional and product-level; they are not allocated to distributor or sales-type filters.</p></section>`;
 $('meeting-report').innerHTML=header+body+'<footer class="report-footer">Powered by Ali Ashour · Nerhadou Sales Analysis</footer>';for(const node of $('meeting-report').querySelectorAll('svg [tabindex],svg [data-tip]')){node.removeAttribute('tabindex');node.removeAttribute('data-tip');}
}
function openReport(){if(!payload||!dashboard())return;$('report-dialog').showModal();buildMeetingReport();}
window.addEventListener('commercial:data',event=>{payload=event.detail;cache.clear();if($('data-health'))window.actualDashboard.render();if(restorePending){const config=restorePending;restorePending=null;restore(config)}});
mount();
Promise.resolve(window.nerhadouSecurity?.ready).then(me=>{const id=me?.user?.id||me?.user?.email;if(!id)return;storageKey='nerhadou-management-views:'+id;refreshSaved();if(!restored&&payload&&dashboard()){restored=true;readLink()}});

function scheduleChartReflow(){if(chartResizeFrame!==null)clearTimeout(chartResizeFrame);chartResizeFrame=setTimeout(()=>{chartResizeFrame=null;if(!dashboard()||$('sales').hidden)return;const ids=['sales','trend','timeline','company-achievement-chart','company-ppg-chart','single-chart','single-achievement-chart','single-ppg-chart','drawer-chart'];const signature=ids.map(id=>Math.round($(id)?.getBoundingClientRect?.().width||0)).join(',');if(signature===chartWidthSignature)return;chartWidthSignature=signature;const focus=document.activeElement;window.actualDashboard.render();if($('report-dialog').open)buildMeetingReport();if(focus?.isConnected)focus.focus?.({preventScroll:true});},140);}
window.addEventListener('resize',scheduleChartReflow,{passive:true});
if(window.ResizeObserver){const observer=new window.ResizeObserver(scheduleChartReflow);const main=document.querySelector('main');if(main)observer.observe(main);const sales=$('sales');if(sales)observer.observe(sales);}
