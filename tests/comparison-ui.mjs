// Lightweight DOM interaction smoke test, not a browser visual review.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {effectiveRecords} from '../public/data-core.js';
const html=fs.readFileSync('public/index.html','utf8'),seed=JSON.parse(fs.readFileSync('private/seed.json')),nodes=new Map(),dynamic=new Map();
const decode=s=>String(s).replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&'),attributes=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],decode(m[2])]));
function element(attrs={},content=''){
 return {dataset:Object.fromEntries(Object.entries(attrs).filter(([k])=>k.startsWith('data-')).map(([k,v])=>[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),v])),value:attrs.value||'',checked:/checked/.test(attrs._raw||''),textContent:content.replace(/<[^>]*>/g,''),innerHTML:content,hidden:false,disabled:false,style:{},classList:{toggle(){}},setAttribute(k,v){this[k]=v},querySelectorAll(selector){return parse(this.innerHTML,selector,attrs.id||'inner')},focus(){}};
}
function parse(source,selector,namespace='global'){
 const attr=selector.match(/^\[([^\]]+)\]$/)?.[1],tag=selector==='input'?'input':'button|circle|g|td';if(!attr&&selector!=='input')return [];
 const matches=[...source.matchAll(new RegExp('<('+tag+')\\b([^>]*)>','g'))],found=[];
 for(const m of matches){const a=attributes(m[2]);if(attr&&!Object.hasOwn(a,attr))continue;const key=namespace+'|'+(attr?attr+'|'+a[attr]:'input|'+a.value);if(!dynamic.has(key))dynamic.set(key,element({...a,_raw:m[2]}));if(!found.includes(dynamic.get(key)))found.push(dynamic.get(key));}return found;
}
for(const m of html.matchAll(/\bid="([^"]+)"/g)){assert(!nodes.has(m[1]),'Duplicate DOM id '+m[1]);nodes.set(m[1],element({id:m[1]}))}
for(const m of html.matchAll(/<select id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)){nodes.get(m[1]).innerHTML=m[2];nodes.get(m[1]).value=m[2].match(/value="([^"]*)"/)?.[1]||''}
globalThis.document={getElementById:id=>{assert(nodes.has(id),'Missing DOM ID '+id);return nodes.get(id)},querySelectorAll:s=>parse(html+'\n'+[...nodes.values()].map(n=>n.innerHTML).join('\n'),s),createElement:()=>element()};globalThis.window={};globalThis.innerWidth=1280;globalThis.innerHeight=900;
await import('../public/comparison.js');
window.updateComparison({seed,records:effectiveRecords(seed),revision:0});
const node=id=>nodes.get(id),click=(attr,value)=>{const b=document.querySelectorAll(`[${attr}]`).find(b=>b.dataset[attr.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]===String(value));assert(b,'Button '+attr+' '+value);assert.equal(typeof b.onclick,'function');b.onclick()};
assert(node('focus-table').innerHTML.includes('Total company'));assert(node('focus-table').innerHTML.includes('2021'));assert(node('focus-table').innerHTML.includes('2026'));assert(node('focus-table').innerHTML.includes('Units'));assert(!node('focus-table').innerHTML.includes('Value · EGP'));assert.equal(node('focus-product-label').hidden,true);assert.equal(node('focus-company-panel').hidden,false);assert.equal(node('focus-share-panel').hidden,true);
assert(node('focus-sales-chart').innerHTML.includes('<svg'));assert(node('focus-growth-chart').innerHTML.includes('<svg'));assert(node('focus-trend-chart').innerHTML.includes('<svg'));assert(node('focus-composition-chart').innerHTML.includes('<svg'));
click('data-focus-metric','value');assert(node('focus-table-title').textContent.includes('Value'));assert(!node('focus-table').innerHTML.includes('Units'));assert(!node('focus-table').innerHTML.includes('>V%</th>'),'No redundant 100% share column for company');const companyValueTable=node('focus-table').innerHTML;
click('data-focus-scope','product');assert.equal(node('focus-product-label').hidden,false);assert(node('focus-table-title').textContent.includes('ONDALENZ 8MG'));assert(node('focus-table-title').textContent.includes('Units'));assert.equal(node('focus-company-panel').hidden,true);assert.equal(node('focus-share-panel').hidden,true);
click('data-focus-metric','value');assert(node('focus-table').innerHTML.includes('>V%</th>'));assert.equal(node('focus-share-panel').hidden,false);assert(node('focus-share-chart').innerHTML.includes('<svg'));
node('focus-product').value='ONDALENZ 4MG';node('focus-product').onchange();assert(node('focus-table-title').textContent.includes('ONDALENZ 4MG'));assert(node('focus-context').textContent.includes('ONDALENZ 4MG'));
click('data-focus-scope','company');assert.equal(node('focus-table').innerHTML,companyValueTable,'Product selection cannot filter company totals');
node('focus-clear-years').onclick();assert.equal(node('focus-content').hidden,true);assert.equal(node('focus-export').disabled,true);assert(node('focus-empty').textContent.includes('Select one or more'));
click('data-focus-year',2021);click('data-focus-year',2025);assert.equal(node('focus-content').hidden,false);assert(node('focus-table').innerHTML.includes('2021'));assert(node('focus-table').innerHTML.includes('2025'));assert(!node('focus-table').innerHTML.includes('>2026</th>'));
node('focus-growth-basis').value='selected';node('focus-growth-basis').onchange();assert(node('focus-table').innerHTML.includes('2025 vs 2021'));assert(node('focus-table').innerHTML.includes('No earlier selected year'));assert(node('focus-growth-note').textContent.includes('selected'));
node('focus-period').value='month';node('focus-period').onchange();assert.equal(node('focus-through-label').hidden,true);assert.equal(node('focus-month-picker').hidden,false);
const selectedMonth=node('focus-month-options').querySelectorAll('input').find(i=>i.value==='8');selectedMonth.checked=false;selectedMonth.onchange();assert.equal(node('focus-content').hidden,true);assert(node('focus-empty').textContent.includes('month'));
node('focus-reset').onclick();assert.equal(node('focus-content').hidden,false);assert.equal(node('focus-growth-basis').value,'calendar');assert(node('focus-table').innerHTML.includes('2026'));assert(node('focus-table-title').textContent.includes('Units'));
node('focus-period').value='annual';node('focus-period').onchange();assert(node('focus-table-note').textContent.includes('Incomplete'));assert(node('focus-table').innerHTML.includes('27,628,835'));
node('focus-composition-year').value='2025';node('focus-composition-year').onchange();assert(node('focus-composition-note').textContent.includes('2025'));
window.updateComparison({seed,records:effectiveRecords(seed),revision:3});assert.equal(node('comparison-revision').textContent,'Revision 3');assert.equal(node('focus-period').value,'annual','Shared refresh retains period');
window.comparisonLoadError('Unavailable');assert.equal(node('focus-content').hidden,true);assert.equal(node('focus-empty').textContent,'Unavailable');assert.equal(node('focus-export').disabled,true);
console.log('Focus UI smoke passed: company/product, independent Units/Value tabs, fixed company totals, V%, arbitrary two-year selection, both PPG baselines, empty-state/export guards, periods, reset, shared refresh and loading error');

assert(html.indexOf('focus-table-panel')>html.indexOf('focus-share-panel'),'Year table is below the charts');
assert(html.includes('Export Excel'));

node('focus-reset').onclick();
node('focus-composition-year').value='all';node('focus-composition-year').onchange();
assert(node('focus-composition-year').innerHTML.includes('All years'));
assert(node('focus-composition-note').textContent.includes('All selected years'));
assert(node('focus-composition-chart').innerHTML.includes('Rank'));
assert(node('focus-composition-chart').innerHTML.includes('% of total'));
assert(!node('focus-composition-chart').innerHTML.includes('Other products ('));
assert(!node('focus-table').innerHTML.includes('Compared with'));
assert(!node('focus-table').innerHTML.includes('>Notes</th>'));
assert(html.indexOf('id="focus-export"')>html.indexOf('focus-table-panel'));
console.log('Full-ranking UI passed: all-years filter, rank/share labels, full list, clean table and table-local export');
// Comparison follows new years/months in All years mode, but retains explicit choices.
const baseRecords=effectiveRecords(seed),template=baseRecords.find(r=>r.dataset==='actual'&&r.year===2026&&r.month===1);
node('focus-reset').onclick();
window.updateComparison({seed,records:baseRecords.filter(r=>r.year!==2026||r.month<=6),revision:4});assert.equal(node('focus-through').value,'6');
const endYear=[...baseRecords,...[9,10,11,12].map(month=>({...template,id:'UI2026_'+month,month,units:10,value:100}))];
window.updateComparison({seed,records:endYear,revision:5});assert.equal(node('focus-through').value,'12');
const nextYear=[...endYear,{...template,id:'UI2027_1',year:2027,month:1,units:42,value:420}];
window.updateComparison({seed,records:nextYear,revision:6});assert(node('focus-years').innerHTML.includes('2027'));assert(node('focus-table').innerHTML.includes('2027'));assert.equal(node('focus-through').value,'1');
node('focus-through').value='6';node('focus-through').onchange();
window.updateComparison({seed,records:[...nextYear,{...template,id:'UI2027_2',year:2027,month:2,units:2,value:20}],revision:7});assert.equal(node('focus-through').value,'6','Explicit comparison cutoff is retained');
click('data-focus-year',2021);
window.updateComparison({seed,records:[...nextYear,{...template,id:'UI2028_1',year:2028,month:1,units:1,value:10}],revision:8});assert(!node('focus-table').innerHTML.includes('>2028</th>'),'Explicit selected-year set is not expanded');
console.log('Comparison dynamic refresh passed: June/December/new-year following and retained explicit period/year choices');
