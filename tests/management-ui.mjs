// V69: DOM integration test for the unified Sales page, not browser layout / visual QA. Set NERHADOU_DOM_MODULE to a local Linkedom installation.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
import {effectiveRecords,snapshotFrom} from '../public/data-core.js';
const {parseHTML}=await import(process.env.NERHADOU_DOM_MODULE||'linkedom');
const {window}=parseHTML(fs.readFileSync('public/index.html','utf8'));globalThis.window=window;globalThis.document=window.document;globalThis.CustomEvent=window.CustomEvent;globalThis.innerWidth=1280;globalThis.innerHeight=900;
const values=new WeakMap();Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return values.has(this)?values.get(this):(this.querySelector('option[selected]')||this.querySelector('option'))?.value||''},set(value){values.set(this,String(value))},configurable:true});
const location=new URL('https://local.test/');globalThis.location=location;globalThis.history={pushes:0,replaceState:(s,t,url)=>{location.href=new URL(url,location).href},pushState(s,t,url){this.pushes++;location.href=new URL(url,location).href}};globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};const store=new Map();Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:async value=>{globalThis.copied=value}}},configurable:true});
window.nerhadouSecurity={me:{user:{role:'owner',status:'active'}}};window.scrollTo=()=>{};window.print=()=>{};window.nerhadouSecurity={me:{user:{role:'owner',status:'active'}},ready:Promise.resolve({user:{id:'qa-owner',email:'owner@nerhadou.com',role:'owner',status:'active'}})};
for(const d of document.querySelectorAll('dialog')){d.showModal=()=>{d.open=true};d.close=()=>{d.open=false;d.dispatchEvent(new window.Event('close'))}}
const seed=JSON.parse(fs.readFileSync('private/seed.json')),backup=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2])):null,overrides=backup?Object.fromEntries(backup.tables.record_overrides.rows.map(r=>[r.record_id,JSON.parse(r.payload)])):{},records=effectiveRecords(seed,overrides);let snap={...snapshotFrom(seed,overrides),revision:0};
globalThis.fetch=async url=>({ok:true,status:200,json:async()=>url.startsWith('/api/snapshot')?{...snapshotFrom(seed,overrides,new URL(url,'https://local.test').searchParams.has('year')?{year:Number(new URL(url,'https://local.test').searchParams.get('year'))}:{}),revision:0}:{seed,records,revision:0,overrides:{},isAdmin:true,audit:[]}});
vm.runInThisContext(fs.readFileSync('public/app.js','utf8'),{filename:'app.js'});await new Promise(setImmediate);await import('../public/management.js');
// Dialogs are added by the management module.
for(const d of document.querySelectorAll('dialog')){d.showModal=()=>{d.open=true};d.close=()=>{d.open=false;d.dispatchEvent(new window.Event('close'))}}
const payload={records,seed,revision:0};window.commercialAnalysisData=payload;console.time('Management render');window.dispatchEvent(new CustomEvent('commercial:data',{detail:payload}));console.timeEnd('Management render');await new Promise(setImmediate);
const node=id=>document.getElementById(id),base=window.actualDashboard.read(),none={product:[],line:[],distributor:[],channel:[]},cfg=(over={})=>({years:[base.snapshot.year],year:base.snapshot.year,months:[1,2,3,4,5,6,7,8],periodMode:'ytd',targetBasis:'period',selection:none,section:'overview',...over});
// One Sales page: no Historical page, no Sales Analysis tab, three tabs at most.
assert.equal(document.querySelector('[data-page="comparison"]'),null);assert.equal(node('comparison'),null);assert.equal(document.querySelector('[data-section="analysis"]'),null);
assert.deepEqual([...document.querySelectorAll('.section-tabs [role="tab"]')].map(t=>t.dataset.section),['overview','portfolio','forecast']);assert.equal(document.querySelector('[data-section="portfolio"]').textContent,'Products');
assert.equal(document.querySelector('#sales h1').textContent,'Sales performance');assert(node('page-subtitle').textContent.startsWith(base.snapshot.year+' · YTD'));
// Legacy section names open Overview.
for(const old of ['analysis','trends','movement','breakdown']){window.actualDashboard.showSection(old);assert.equal(window.actualDashboard.read().section,'overview',old)}
// Overview grid: registry panels with spans that add up to 12 per row.
await window.actualDashboard.apply(cfg());const rows={};for(const p of node('overview-grid').querySelectorAll('.v69-panel:not([hidden])')){const span=Number([...p.classList].find(c=>c.startsWith('span-')).slice(5));(rows[p.dataset.row]??=[]).push(span)}for(const [row,spans] of Object.entries(rows))assert.equal(spans.reduce((a,b)=>a+b,0),12,'row '+row+' sums to 12');
assert(!node('panel-monthly').hidden&&!node('panel-attention').hidden&&!node('panel-bridge').hidden);
// Saved and shared views carry the V69 URL shape.
node('view-name').value='QA saved view';node('save-view').click();assert(node('saved-view').innerHTML.includes('QA saved view'));
await node('share-view').onclick();assert.equal(globalThis.copied,location.href,'Copy link copies the URL');for(const k of ['years=','tab=','period=','through=','measure='])assert(globalThis.copied.includes(k),k);assert(!globalThis.copied.includes('target_units'));
// A product click selects the product (single-product Overview) with Undo; there is no drawer.
assert.equal(node('product-drawer'),null);const product=document.querySelector('#attention-list [data-select-product]');assert(product);const name=product.dataset.selectProduct;product.click();assert.deepEqual(window.actualDashboard.read().selection.product,[name]);assert(!node('panel-productFacts').hidden,'Product facts shown');assert(node('undo-toast').textContent.includes('Showing '+name));node('undo-toast').querySelector('button').click();assert.deepEqual(window.actualDashboard.read().selection.product,[]);
// Monthly compare controls do not accumulate on refresh.
const before=node('monthly-controls').querySelectorAll('button').length;window.dispatchEvent(new CustomEvent('commercial:data',{detail:payload}));assert.equal(node('monthly-controls').querySelectorAll('button').length,before);
// Meeting report: static copy of the page, no interactive DOM.
node('meeting-open').click();assert.equal(node('report-dialog').open,true);assert(node('meeting-report').textContent.includes('Meeting report'));assert(!node('meeting-report').querySelector('button'));assert(!node('meeting-report').querySelector('[data-tip]'));node('report-close').click();
const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);assert.equal(ids.length,new Set(ids).size,'No duplicate IDs');
// One product: Products tab hidden, Product facts, bridge by Month.
await window.actualDashboard.apply(cfg({selection:{...none,product:['CALCITRON']},months:[1,2,3]}));assert.equal(document.querySelector('[data-section="portfolio"]').getAttribute('aria-disabled'),'true','V72 R-11: Products tab disabled, not hidden');assert(!node('panel-productFacts').hidden);assert.equal(node('movement-dimension').value,'month');assert.equal(document.querySelector('.product-scope-chip,#product-scope-chip'),null,'no Viewing chip');
// Multi-year: Sales by year, lines by year, multi-year KPIs, no Forecast tab.
await window.actualDashboard.apply(cfg({years:[2024,2025,2026],selection:none}));assert.equal(window.actualDashboard.read().years.length,3);assert(!node('panel-salesByYear').hidden);assert(node('kpis').textContent.includes('Sales 2024'),'3+ years: card 2 is the first selected year');assert(/Change 2024 → 2026/.test(node('kpis').textContent),'3+ years: change spans the selected range');assert.equal(document.querySelector('[data-section="forecast"]').getAttribute('aria-disabled'),'true');
await window.actualDashboard.apply(cfg());
console.log('Management DOM interactions passed: one Sales page, tabs, registry rows, saved/shared views, select-product with Undo, refresh without duplicate controls, meeting report, single-product and multi-year states.');
