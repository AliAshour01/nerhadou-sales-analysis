const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('public/index.html', 'utf8');
const snapshot = {...JSON.parse(fs.readFileSync('private/data.json', 'utf8')),year:2026,latestYear:2026,availableYears:[2026]};
const app = fs.readFileSync('public/app.js', 'utf8');
let passed = 0;
const equal = (a,b,label) => { assert.equal(a,b,label); passed++; };
const near = (a,b,label) => { assert(Math.abs(a-b) < 0.01,label+': '+a+' vs '+b); passed++; };

async function main() {
 const {tableWorkbook}=await import('../public/comparison-xlsx.js');
 const nodes = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m => [m[1], {
  value:m[1]==='period'?'8':'', innerHTML:'',textContent:'',style:{},disabled:true
 }]));
 const buttons = [['periodMode','ytd'],['periodMode','selected'],['targetBasis','period'],['targetBasis','annual']].map(([key,choice])=>({
  dataset:{global:key,choice},classList:{toggle(){}},setAttribute(){}
 }));
 const registry=new Map(),keys=['product','line','distributor','channel','months'];
 const item=(key,dataset={})=>{if(!registry.has(key))registry.set(key,{dataset,value:'',checked:false,hidden:false,open:false,classList:{toggle(){}},setAttribute(){},contains(){return false}});return registry.get(key)};
 const decode=text=>text.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
 function qsa(selector){
  if(selector==='[data-global]')return buttons;
  if(selector==='[data-section]')return ['overview','trends','breakdown','portfolio'].map(section=>item('tab-'+section,{section}));
  if(selector==='[data-multi]')return keys.map(multi=>item('menu-'+multi,{multi}));
  for(const [attr,field] of [['data-select-all','selectAll'],['data-clear-all','clearAll'],['data-filter-search','filterSearch']])if(selector==='['+attr+']')return keys.map(key=>item(attr+'-'+key,{[field]:key}));
  if(selector.startsWith('[data-filter-key')){
   const keyMatch=selector.match(/="([^"]+)"/),wanted=keyMatch?.[1];const source=Object.values(nodes).map(n=>n.innerHTML).join('');
   return [...source.matchAll(/<input type="checkbox" data-filter-key="([^"]+)" value="([^"]*)">/g)].filter(m=>!wanted||m[1]===wanted).map(m=>{const key=m[1],value=decode(m[2]),node=item('checkbox-'+key+'-'+value,{filterKey:key});node.value=value;const label=item('label-'+key+'-'+value);label.textContent=key==='months'?['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'][Number(value)-1]+' 2026':value;node.closest=()=>label;return node})
  }
  return [];
 }
 let savedBlob;
 const ctx = {
  document:{getElementById:id=>{if(!nodes[id]&&Object.values(nodes).some(n=>(n.innerHTML||'').includes('id="'+id+'"')))nodes[id]={value:'',innerHTML:'',textContent:'',style:{}};assert(nodes[id],'Unknown DOM element '+id);return nodes[id]},
   querySelectorAll:qsa,querySelector:()=>null,addEventListener(){},
   createElement:()=>({click(){}})},
  fetch:async url=>{ctx.lastFetchURL=url;return {ok:true,json:async()=>structuredClone(ctx.nextSnapshot||snapshot)}},
  window:{scrollTo(){},createTableWorkbook:tableWorkbook}, Blob, URL:{createObjectURL(blob){savedBlob=blob;return 'blob:test'},revokeObjectURL(){}},
  setTimeout:fn=>fn(),console
 };
 vm.createContext(ctx);
 vm.runInContext(app,ctx);
 await new Promise(setImmediate);
 const run = text=>vm.runInContext(text,ctx);
 const reset = ()=>nodes.reset.onclick();
 for(const key of ['product','line','distributor','channel']){nodes[key]={};Object.defineProperty(nodes[key],'value',{get:()=>run(`Array.from(selection.${key})[0]||''`),set:value=>run(`selection.${key}=new Set(${JSON.stringify(value?[value]:[])})`)});}

 equal(nodes.export.disabled,false,'Export enabled only after source load');
 equal(nodes.period.value,'8','Latest month selected dynamically');
 assert(!nodes.kpis.textContent.includes('Unable'));
 // Reconcile every monthly actual and cumulative actual against the unchanged source.
 for(let m=1;m<=8;m++) {
  nodes.period.value=String(m);buttons[1].onclick();
  near(run('view.reduce((s,r)=>s+r.units,0)'),snapshot.rows.filter(r=>r.month===m).reduce((s,r)=>s+r.units,0),'Monthly units '+m);
  near(run('view.reduce((s,r)=>s+r.value,0)'),snapshot.rows.filter(r=>r.month===m).reduce((s,r)=>s+r.value,0),'Monthly value '+m);
  buttons[0].onclick();
  near(run('view.reduce((s,r)=>s+r.units,0)'),snapshot.rows.filter(r=>r.month<=m).reduce((s,r)=>s+r.units,0),'YTD units '+m);
 }
 nodes.product.value='ZOLMSOLAN 2.5MG';nodes.period.value='3';run('render()');
 equal(run('view[0].units'),18803,'March YTD units');
 near(run('view[0].targetUnits'),25000,'March YTD target');
 near(run('view[0].targetValue'),1296000,'Value target');
 const monthly = JSON.stringify(run('monthlyData()'));
 const monthlySvg = nodes.trend.innerHTML;
 const timelineSvg = nodes.timeline.innerHTML;
 buttons[3].onclick();
 equal(JSON.stringify(run('monthlyData()')),monthly,'Annual target cannot affect monthly data');
 equal(nodes.trend.innerHTML,monthlySvg,'Annual target cannot affect monthly chart');
 equal(nodes.timeline.innerHTML,timelineSvg,'Annual target cannot affect actual timelines');
 near(run('view[0].targetUnits'),100000,'Full-year denominator');
 equal(run('view[0].units'),18803,'Annual target leaves actual unchanged');
 buttons[1].onclick();
 equal(run('view[0].units'),10074,'March single month');
 equal(run('monthlyData().length'),1,'One selected month only');
 equal((nodes.timeline.innerHTML.match(/<polyline/g)||[]).length,0,'No trend fabricated from one point');
 equal((nodes.timeline.innerHTML.match(/<circle/g)||[]).length,2,'One point per metric');
 buttons[2].onclick();
 near(run('view[0].targetUnits'),100000/12,'Monthly denominator');
 assert(nodes.trend.innerHTML.includes('#d6a15e'),'Overachievement drawn beyond monthly target');passed++;
 run("states.monthly.metric='value';render()");
 near(run('monthlyData()[0].target'),432000,'Monthly value target');
 equal(run('states.lines.metric'),'units','Per-chart metric independence');
 equal(run('tableColumns().map(a=>a[0]).join(",")'),'product,units,shareUnits,targetUnits,achUnits,gapUnits,value,shareValue,targetValue,achValue,gapValue','Mix column grouping');
 run("states.portfolio.metric='value';render()");equal(run('tableColumns().length'),6,'Value-only columns');
 reset();
 equal((nodes.timeline.innerHTML.match(/<polyline/g)||[]).length,2,'Two aligned actual trends');
 assert(!nodes.timeline.innerHTML.includes('RIGHT AXIS'),'No misleading overlaid dual axis');passed++;
 assert(nodes.distributors.innerHTML.includes('conic-gradient'),'Four positive distributors use donut');passed++;
 nodes.distributor.value='IBN SINA';run('render()');equal(run('view[0].targetUnits'),null,'No invented distributor targets');
 assert(nodes.achievements.innerHTML.includes('No distributor'),'Gap panel explains target absence');passed++;
 reset();nodes.product.value='ZOLMSOLAN 2.5MG';nodes.line.value='nonexistent';run('render()');
 equal(run('view.length'),0,'Incompatible filters return no fabricated products');
 assert(nodes['selection-status'].innerHTML.includes('No source records'),'Empty selection visible');passed++;
 assert(!nodes.trend.innerHTML.includes('NaN')&&!nodes.timeline.innerHTML.includes('NaN'),'No NaN in zero-data charts');passed++;
 reset();
 // Adversarial fixtures are isolated in memory; no source values are modified.
 run("D={year:2026,latestYear:2026,availableYears:[2026],rows:[{month:1,product:'Positive',line:'Test',distributor:'A',channel:'PRIVATE',units:10,value:100},{month:2,product:'Positive',line:'Test',distributor:'A',channel:'PRIVATE',units:0,value:0},{month:2,product:'Negative',line:'Test',distributor:'B',channel:'PRIVATE',units:-10,value:-100}],targets:{Positive:{monthly:20,price:10},Negative:{monthly:20,price:10}}};periodMode='month'");
 nodes.period.value='2';run('render()');
 assert(nodes.distributors.innerHTML.includes('negative adjustments'),'Signed or cancelling totals use bars, not empty donut');passed++;
 assert(nodes.distributors.innerHTML.includes('bar-fill negative'),'Negative bar is visible');passed++;
 assert(nodes.timeline.innerHTML.includes('-'),'Negative trend axes supported');passed++;
 equal(run('axisFor([-10,0,5]).min')<0,true,'Axis includes negative domain');
 equal(run('axisFor([-10,0,5]).max')>0,true,'Axis includes positive domain');
 run("D.rows[0].month=1;D.rows=D.rows.filter(r=>r.product!=='Positive'||r.month===1);render()");
 equal(run("view.find(r=>r.product==='Positive').units"),0,'Products without current-month transactions remain visible');
 equal(run("view.find(r=>r.product==='Positive').targetUnits"),20,'Zero-sales products retain their target');
 run("delete D.targets.Negative;sortKey='achUnits';desc=false;render()");
 equal(run('view[view.length-1].achUnits'),null,'Unknown achievement sorts last ascending');
 run('desc=true;render()');equal(run('view[view.length-1].achUnits'),null,'Unknown achievement sorts last descending');
 run("D.rows[0].product='=SUM(1,1)';D.targets['=SUM(1,1)']={monthly:0,price:0};render()");
 assert(nodes.trend.innerHTML.includes('<rect'),'Zero-target actuals are not hidden');passed++;
 await nodes.export.onclick();
 const excelXML=await savedBlob.text();
 assert(excelXML.includes('=SUM(1,1)')&&!excelXML.includes('<f>'),'Excel formula-like names remain inline text');passed++;
 assert(excelXML.includes('Jan 2026')||excelXML.includes('Feb 2026'),'Export includes period labels');passed++;
 run("D.rows[0].product='<img src=x onerror=alert(1)>';render()");
 assert(!nodes.details.innerHTML.includes('<img'),'Source product names HTML escaped');passed++;
 assert(nodes.details.innerHTML.includes('&lt;img'),'Escaped product still visible');passed++;
 // Ranked charts remain absolute comparisons; the removed percentage UI must not return.
 run("D="+JSON.stringify(snapshot)+";periodMode='ytd';targetBasis='period';selectedMonths=null;Object.values(states).forEach(s=>s.metric='units')");
 nodes.product.value='';nodes.line.value='';nodes.distributor.value='';nodes.channel.value='';nodes.period.value='8';run('render()');
 for(const panel of ['leaders','achievements','lines']) {
  assert(!nodes[panel+'-controls'].innerHTML.includes('Percentage'),'Removed percentage controls');passed++;
  assert(nodes[panel==='lines'?'lines-chart':panel].innerHTML.includes('comparison-svg'),'Comparison uses true SVG chart');passed++;
  assert(!nodes[panel==='lines'?'lines-chart':panel].innerHTML.includes('bar-track'),'No progress tracks in comparison chart');passed++;
 }
 const selectedUnits=snapshot.rows.reduce((sum,r)=>sum+r.units,0);
 near(run("comparisonData('lines').items.reduce((sum,a)=>sum+a.raw,0)"),selectedUnits,'Line chart absolute total');
 run("states.leaders.metric='value';render()");assert(nodes['leaders-context'].textContent.includes('EGP'),'Value ranking labelled EGP');passed++;
 for(const id of ['trend','timeline','leaders','achievements','lines-chart']) {
  assert(!nodes[id].innerHTML.includes('<title>'),'No native SVG title to duplicate tooltip in '+id);passed++;
  assert(!/\stitle=/.test(nodes[id].innerHTML),'No native title attribute in '+id);passed++;
 }
 nodes.tooltip.getBoundingClientRect=()=>({width:220,height:65});ctx.window.innerWidth=800;ctx.window.innerHeight=600;
 ctx.fakeTip={dataset:{tip:'One tooltip only'}};
 run('showTooltip(fakeTip,790,590)');equal(nodes.tooltip.textContent,'One tooltip only','Single tooltip text');
 assert(parseFloat(nodes.tooltip.style.left)<=572,'Tooltip stays inside right edge');passed++;
 assert(parseFloat(nodes.tooltip.style.top)<=527,'Tooltip stays inside bottom edge');passed++;
 run('hideTooltip()');equal(nodes.tooltip.style.display,'none','Tooltip hides on demand');
 run('showTooltip(fakeTip,10,10);render()');equal(nodes.tooltip.style.display,'none','Tooltip cleared on rerender');
 const source=fs.readFileSync('public/app.js','utf8');assert(!source.includes('<title>'),'Native tooltip path removed from code');passed++;
 // Multi-selection integration: exercise the actual checkbox and bulk-action handlers.
 reset();
 const check=(key,value,checked=true)=>{const box=qsa('[data-filter-key="'+key+'"]').find(b=>b.value===String(value));assert(box,'Checkbox '+key+' '+value);box.checked=checked;box.onchange();};
 const bulk=(type,key)=>qsa('[data-'+type+']').find(b=>b.dataset[type==='select-all'?'selectAll':'clearAll']===key).onclick();
 const products=['ZOLMSOLAN 2.5MG','ZOLMSOLAN 5MG'];
 products.forEach(p=>check('product',p));equal(run('selection.product.size'),2,'Two products selected through checkboxes');
 buttons[1].onclick();bulk('clear-all','months');equal(run('view.length'),0,'Empty month selection does not fabricate zero-sales records');
 assert(nodes.kpis.innerHTML.includes('No months selected'),'No-month cards show unavailable rather than zero');passed++;
 [1,3,5].forEach(m=>check('months',m));
 equal(run('periodMonths().join(",")'),'1,3,5','Nonconsecutive month selection');
 const expected=snapshot.rows.filter(r=>products.includes(r.product)&&[1,3,5].includes(r.month));
 near(run('view.reduce((s,r)=>s+r.units,0)'),expected.reduce((s,r)=>s+r.units,0),'Combined two-product selected-month units');
 near(run('view.reduce((s,r)=>s+r.value,0)'),expected.reduce((s,r)=>s+r.value,0),'Combined two-product selected-month value');
 near(run('view.reduce((s,r)=>s+r.targetUnits,0)'),products.reduce((s,p)=>s+snapshot.targets[p].monthly*3,0),'Period target covers three months, not five');
 equal(run('monthlyData().map(r=>r.month).join(",")'),'1,3,5','Monthly chart includes only selected months');
 equal((nodes.timeline.innerHTML.match(/<polyline/g)||[]).length,0,'Timeline never bridges excluded months');
 const actualBefore=run('view.reduce((s,r)=>s+r.units,0)'),chartBefore=nodes.trend.innerHTML;
 buttons[3].onclick();near(run('view.reduce((s,r)=>s+r.units,0)'),actualBefore,'Annual basis cannot change selected-month sales');
 near(run('view.reduce((s,r)=>s+r.targetUnits,0)'),products.reduce((s,p)=>s+snapshot.targets[p].monthly*12,0),'Annual basis still covers twelve months');
 equal(nodes.trend.innerHTML,chartBefore,'Monthly chart remains invariant under annual target');
 check('months',3);near(run('view.reduce((s,r)=>s+r.units,0)'),actualBefore,'Set-based checkbox repeat cannot duplicate sales');
 nodes.period.value='4';buttons[0].onclick();
 near(run('view.reduce((s,r)=>s+r.units,0)'),snapshot.rows.filter(r=>products.includes(r.product)&&r.month<=4).reduce((s,r)=>s+r.units,0),'YTD remains January through selected cutoff');
 equal(nodes['period-field'].hidden,false,'YTD cutoff visible');equal(nodes['months-filter'].hidden,true,'Multi-month chooser hidden in YTD');
 buttons[1].onclick();equal(run('periodMonths().join(",")'),'1,3,5','Selected-month choice retained after YTD');
 equal(nodes['period-field'].hidden,true,'YTD cutoff hidden in selected-month mode');equal(nodes['months-filter'].hidden,false,'Multi-month chooser visible');
 check('distributor','IBN SINA');check('distributor','PHARMA');
 const subset=expected.filter(r=>['IBN SINA','PHARMA'].includes(r.distributor));near(run('view.reduce((s,r)=>s+r.units,0)'),subset.reduce((s,r)=>s+r.units,0),'Multiple distributors use OR within a filter');
 equal(run('unavailableTarget()'),true,'Partial distributor selection cannot fabricate targets');
 bulk('select-all','distributor');equal(run('unavailableTarget()'),false,'Selecting every distributor restores product-level targets');
 bulk('clear-all','distributor');equal(run('selection.distributor.size'),0,'Reset distributor filter restores all');
 bulk('select-all','months');equal(run('periodMonths().length'),8,'Select all months');
 bulk('clear-all','product');equal(run('selection.product.size'),0,'Reset product filter restores all');
 near(run('view.reduce((s,r)=>s+r.units,0)'),snapshot.rows.reduce((s,r)=>s+r.units,0),'All selected months reconcile to full source');
 const tab=qsa('[data-section]').find(b=>b.dataset.section==='trends');tab.onclick();equal(nodes['view-trends'].hidden,false,'Trends tab opens');equal(nodes['view-overview'].hidden,true,'Overview is not duplicated below Trends');
 qsa('[data-section]').find(b=>b.dataset.section==='portfolio').onclick();equal(nodes['view-portfolio'].hidden,false,'Portfolio tab opens');equal(nodes['view-breakdown'].hidden,true,'Breakdown hidden from Portfolio');
 reset();equal(run('periodMode'),'ytd','Reset restores YTD');equal(run('selectedMonths'),null,'Reset clears custom month selections');equal(run('selection.product.size+selection.line.size+selection.distributor.size+selection.channel.size'),0,'Reset clears every dimension');
 equal(run('context("summary").months.length'),8,'Reset restores latest available YTD');
 const testLines=[...new Set(snapshot.rows.map(r=>r.line))].slice(0,2),testChannels=[...new Set(snapshot.rows.map(r=>r.channel))].slice(0,2);testLines.forEach(value=>check('line',value));testChannels.forEach(value=>check('channel',value));
 near(run('view.reduce((sum,r)=>sum+r.units,0)'),snapshot.rows.filter(r=>testLines.includes(r.line)&&testChannels.includes(r.channel)).reduce((sum,r)=>sum+r.units,0),'Line and sales-type multi-select combine with AND across dimensions');
 const searchInput=qsa('[data-filter-search]').find(input=>input.dataset.filterSearch==='line');searchInput.value='unlikely-no-match';searchInput.oninput();assert(qsa('[data-filter-key="line"]').every(box=>box.closest('label').hidden),'Dropdown search hides unmatched options');passed++;
 searchInput.value='';searchInput.oninput();assert(qsa('[data-filter-key="line"]').every(box=>!box.closest('label').hidden),'Clearing dropdown search restores options');passed++;
 assert(!fs.readFileSync('public/style.css','utf8').includes('.multi-option{display:flex!important'),'Search hidden attribute wins over checkbox styling');passed++;

 // Breakdown shares follow selected results; Portfolio retains company denominators.
 reset();
 equal(run("comparisonData('leaders').items.length"),run("aggregates('leaders').length"),'All leading products, no top-eight cutoff');
 near(run("comparisonData('leaders').items.reduce((n,r)=>n+(r.share||0),0)"),100,'Unfiltered product shares total 100%');
 near(run("comparisonData('lines').items.reduce((n,r)=>n+(r.share||0),0)"),100,'Unfiltered line shares total 100%');
 near(run("comparisonData('achievements').items.reduce((n,r)=>n+(r.share||0),0)"),100,'Gap shares use total positive shortfall');
 const companyUnits=run("companySalesTotal('units')");
 nodes.product.value='ZOLMSOLAN 2.5MG';run('render()');
 near(run("companySalesTotal('units')"),companyUnits,'Product filter does not reduce company denominator');
 near(run('view[0].shareUnits'),run('view[0].units')/companyUnits*100,'Product share is contribution, not filtered 100%');
 assert(run('view[0].shareUnits')<100,'Single product is not automatically 100%');passed++;
 assert(nodes.leaders.innerHTML.includes('Rank')&&nodes.leaders.innerHTML.includes('% of selected'),'Rank and units contribution labels');passed++;
 near(run("comparisonData('leaders').items[0].share"),100,'Single selected product is 100% of selected');
 near(run("comparisonData('lines').items.reduce((n,r)=>n+(r.share||0),0)"),100,'Filtered line shares total 100%');
 reset();
 for(const metric of ['units','value']){
  run("states.leaders.metric='"+metric+"';states.lines.metric='"+metric+"'");
  check('product','ZOLMSOLAN 2.5MG');
  const other=snapshot.rows.find(r=>r.product!=='ZOLMSOLAN 2.5MG').product;check('product',other);
  for(const panel of ['leaders','lines']){
   near(run("comparisonData('"+panel+"').items.reduce((n,r)=>n+r.share,0)"),100,metric+' selected '+panel+' sum to 100%');
   near(run("(()=>{const a=comparisonData('"+panel+"').items;return a[0].share-a[0].raw/a.reduce((n,r)=>n+r.raw,0)*100})()"),0,'Percentage equals selected total for '+metric+' '+panel);
  }
  reset();
 }
 nodes.period.value='1';
 run("states.leaders.metric='units';globalThis.savedRows=D.rows;D.rows=[{...savedRows[0],month:1,units:120,value:120},{...savedRows[0],month:1,product:'Adjustment',units:-20,value:-20}]");
 near(run("comparisonData('leaders').items.find(r=>r.name!=='Adjustment'&&r.raw===120).share"),120,'Signed positive contribution may exceed 100%');
 near(run("comparisonData('leaders').items.find(r=>r.name==='Adjustment').share"),-20,'Negative adjustments retain signed share');
 run("D.rows[0].units=20");equal(run("comparisonData('leaders').items.every(r=>r.share===null)"),true,'Zero selected net total has no percentage');
 run("D.rows[0].units=null");equal(run("comparisonData('leaders').items.every(r=>r.share===null)"),true,'Missing selected amounts have no percentage');
 run("D.rows=savedRows");reset();nodes.product.value='ZOLMSOLAN 2.5MG';run('render()');
 assert(nodes.achievements.innerHTML.includes('% of target gap'),'Gap percentage is not mislabeled as sales contribution');passed++;
 assert(html.indexOf('id="export"')>html.indexOf('<h2>Portfolio detail</h2>'),'Export lives in table header');passed++;
 assert(fs.readFileSync('public/style.css','utf8').includes('#sales .actual-ranked-scroll{max-height:480px;overflow:auto'),'Actual ranking has bounded scrolling');passed++;
 const exportColumns=JSON.parse(JSON.stringify(run('tableColumns()'))),exportRows=JSON.parse(JSON.stringify(run('view')));
 await nodes.export.onclick();fs.writeFileSync('/workspace/scratch/0031b03e22a5/actual-export-test-v18.xlsx',Buffer.from(await savedBlob.arrayBuffer()));
 fs.writeFileSync('/workspace/scratch/0031b03e22a5/actual-export-test-v18.json',JSON.stringify({columns:exportColumns,rows:exportRows}));


 // Data refresh updates the reporting horizon and year without changing source fixtures.
 reset();
 ctx.nextSnapshot={...structuredClone(snapshot),rows:snapshot.rows.filter(r=>r.month<=6)};
 await ctx.window.refreshSalesSnapshot();equal(nodes.period.value,'6','Cutoff through June refreshes the actual month selector');
 equal(run('context("summary").salesLabel'),'Jan–Jun 2026','June context is dynamic');
 const jan=snapshot.rows.find(r=>r.month===1);
 ctx.nextSnapshot={...structuredClone(snapshot),rows:[...structuredClone(snapshot.rows),...[9,10,11,12].map(month=>({...jan,month,units:100,value:1000}))]};
 await ctx.window.refreshSalesSnapshot();equal(nodes.period.value,'12','Following latest automatically extends through December');equal(run('monthlyData().length'),12,'Monthly chart receives twelve periods');
 nodes.period.value='6';nodes.period.onchange();const beforeBackfill=run('view.reduce((n,r)=>n+r.units,0)');ctx.nextSnapshot.rows.find(r=>r.month===1).units+=10;
 await ctx.window.refreshSalesSnapshot();equal(nodes.period.value,'6','Explicit June choice survives later data refresh');near(run('view.reduce((n,r)=>n+r.units,0)'),beforeBackfill+10,'A historical correction flows through the table totals');
 ctx.nextSnapshot={year:2027,latestYear:2027,availableYears:[2026,2027],source:'Test',targets:{},rows:[{...jan,product:'New-year product',month:1,units:42,value:420}]};
 await ctx.window.refreshSalesSnapshot();equal(run('D.year'),2027,'Latest mode follows a new sales year');equal(nodes.period.value,'1','New year clamps the cutoff to its available month');assert(nodes.period.innerHTML.includes('Jan 2027'),'Year labels follow the response');passed++;
 equal(run('view[0].targetUnits'),null,'A new year has no invented target');
 ctx.nextSnapshot={...structuredClone(snapshot),latestYear:2027,availableYears:[2026,2027]};nodes['actual-year'].value='2026';await nodes['actual-year'].onchange();equal(ctx.lastFetchURL,'/api/snapshot?year=2026','Explicit year fetches its own snapshot');equal(run('D.year'),2026,'Older year can be selected');
 ctx.nextSnapshot={...structuredClone(snapshot),rows:[...snapshot.rows.filter(r=>r.month<=6),{...jan,month:12,units:1,value:10}]};
 await ctx.window.refreshSalesSnapshot();run("followLatestPeriod=true");await ctx.window.refreshSalesSnapshot();assert(run('missingReportingMonths().includes(7)'),'Unreported intervening months are not zeros');passed++;equal(run('monthlyData().find(r=>r.month===7).actual'),null,'Missing month amount remains unknown');assert(nodes.trend.innerHTML.includes('Missing'),'Incomplete-period monthly chart is guarded');passed++;

 console.log(passed+' regression assertions passed. No source workbook or data snapshot changed.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
