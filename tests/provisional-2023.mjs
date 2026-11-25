// V68 S-02 / V69: growth that uses provisional 2023 as either year is withheld everywhere on the Sales page.
import './management-ui.mjs';
import assert from 'node:assert/strict';
import {growthAllowed,seasonalProjection,PROVISIONAL_YEARS} from '../public/management-core.js';
const $=id=>document.getElementById(id),payload=window.commercialAnalysisData;
const cfg=(years,months,section='overview')=>({years,months,periodMode:'ytd',targetBasis:'period',selection:{product:[],line:[],distributor:[],channel:[]},section});
const visible=()=>[...$('overview-grid').querySelectorAll('.v69-panel:not([hidden])')].map(p=>p.dataset.panel);
assert(PROVISIONAL_YEARS.has(2023));assert.equal(growthAllowed(2022,2023).ok,false);assert.equal(growthAllowed(2023,2024).ok,false);assert.equal(growthAllowed(2024,2025).ok,true);
const kpiText=()=>$('kpis').textContent;
window.nerhadouSecurity.me={user:{role:'viewer',status:'active'}};
for(const [year,months] of [[2023,[1,2,3,4,5,6,7,8,9]],[2024,[1,2,3,4,5,6]],[2024,[1,2,3,4,5,6,7,8,9,10,11,12]]]){
 await window.actualDashboard.apply(cfg([year],months));
 assert(kpiText().includes('Growth unavailable'),year+' KPI availability label');assert(kpiText().includes('2023 data is provisional'),year+' KPI subline');assert(!/▲|▼/.test(kpiText()),year+' no growth arrows');
 assert(!visible().includes('bridge'),year+' bridge hidden');assert($('overview-not-shown').textContent.includes('2023 data is provisional'),year+' Not shown reason');
 assert(!/vs same months 2023/.test($('attention-list')?.textContent||''),year+' no vs 2023 attention');assert(!/Value up, units down/.test($('attention-list')?.textContent||''),year+' no divergence vs 2023');
 assert.equal($('provisional-badge').hidden,year!==2023,year+' badge');
 const s=seasonalProjection(payload.records,year,6,'units',{});assert.equal(s.value,null);assert(s.reason.includes('provisional'),year+' seasonal withheld');
}
// Multi-year: a pair touching 2023 is withheld; 2024 → 2025 is allowed.
await window.actualDashboard.apply(cfg([2022,2023],[1,2,3,4,5,6,7,8,9,10,11,12]));assert(kpiText().includes('2023 data is provisional'));assert(!visible().includes('bridge'));assert.equal($('provisional-badge').hidden,false);
await window.actualDashboard.apply(cfg([2024,2025],[1,2,3,4,5,6]));assert(!kpiText().includes('2023 data is provisional'));assert(visible().includes('bridge'),'2024 → 2025 bridge allowed');
await window.actualDashboard.apply(cfg([2026],[1,2,3,4,5,6,7,8]));assert(kpiText().includes('39.6%'),'2026 YTD Aug unchanged');assert.equal($('provisional-badge').hidden,true);assert(visible().includes('bridge'));
window.nerhadouSecurity.me={user:{role:'owner',status:'active'}};
console.log('Provisional 2023 passed: KPI, bridge, Not shown reason, attention, badge, seasonality for 2023 and 2024; multi-year pairs; 2026 unchanged.');
