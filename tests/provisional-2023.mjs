import './management-ui.mjs';
import assert from 'node:assert/strict';
import {changeBetween, comparableSummary, movement, seasonalProjection} from '../public/management-core.js';
const $=id=>document.getElementById(id), {records}=window.commercialAnalysisData;
const months=Array.from({length:9},(_,i)=>i+1);
const selection={product:[],line:[],distributor:[],channel:[]};
const cfg=(years,chosen=months)=>({years,months:chosen,periodMode:'selected',selection,section:'overview'});

for(const metric of ['units','value']){
 const current=comparableSummary(records,2023,months,metric);
 const expected=records.filter(r=>r.year===2023&&r.dataset==='actual'&&months.includes(r.month)&&Number.isFinite(r[metric])).reduce((sum,r)=>sum+r[metric],0);
 assert.equal(current.value,expected);
 assert.equal(comparableSummary(records,2023,[9,10],metric).value,null);
 assert.equal(comparableSummary(records,2023,[10],metric).value,null);
 assert.equal(comparableSummary(records,2023,months,metric,{product:['missing product']}).value,null);
 if(metric==='value')assert(current.estimated>0&&current.approximate);
 for(const [a,b] of [[2022,2023],[2023,2024]]){
  const start=comparableSummary(records,a,months,metric);
  const end=comparableSummary(records,b,months,metric);
  const change=changeBetween(end,start);
  assert.equal(change.delta,end.value-start.value);
  assert(change.ppg!=null);
  const bridge=movement(records,{a,b,months,metric});
  assert.equal(bridge.delta,change.delta);
  assert(Math.abs(bridge.items.reduce((sum,row)=>sum+row.delta,0)-bridge.delta)<1e-5);
 }
}
assert.equal(seasonalProjection(records,2024,6,'units').value,null,'Missing prior months cannot produce seasonality');

for(const year of [2023,2024]){
 await window.actualDashboard.apply(cfg([year]));
 assert.equal($('provisional-badge').hidden,false);
 assert($('kpis').querySelector('.delta-chip.up, .delta-chip.down'));
 assert(!$('panel-bridge').hidden);
 assert(!/\bwithheld\b/i.test($('sales').textContent));
}
await window.actualDashboard.apply({...cfg([2023,2024],[9,10]),commonMonths:false});
assert.equal(window.actualDashboard.context().months.length,2);
const absent=$('sales-by-year').querySelector('[data-focus-year="2023"]');
assert.match(absent.getAttribute('data-tip'), /unknown/);
assert(!absent.textContent.includes('%'));
console.log('2023 comparisons use recorded units and EGP, reconcile movement, and keep unavailable months blank.');
