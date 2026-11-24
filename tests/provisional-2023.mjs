// V68 S-02: growth that uses provisional 2023 as either year is withheld everywhere on the Sales page.
import './management-ui.mjs';
import assert from 'node:assert/strict';
import {growthAllowed,seasonalProjection,PROVISIONAL_YEARS} from '../public/management-core.js';
const $=id=>document.getElementById(id),payload=window.commercialAnalysisData;
const cfg=(year,months,section='overview')=>({year,months,periodMode:'ytd',targetBasis:'period',selection:{product:[],line:[],distributor:[],channel:[]},section});
assert(PROVISIONAL_YEARS.has(2023));assert.equal(growthAllowed(2022,2023).ok,false);assert.equal(growthAllowed(2023,2024).ok,false);assert.equal(growthAllowed(2024,2025).ok,true);
const kpiText=()=>$('kpis').textContent;
window.nerhadouSecurity.me={user:{role:'viewer',status:'active'}};
for(const [year,months] of [[2023,[1,2,3,4,5,6,7,8,9]],[2024,[1,2,3,4,5,6]],[2024,[1,2,3,4,5,6,7,8,9,10,11,12]]]){
 await window.actualDashboard.apply(cfg(year,months));
 assert(kpiText().includes('Withheld'),year+' KPI growth withheld');assert(kpiText().includes('2023 data is provisional'),year+' KPI subline');assert(!/[+−-]\d+\.\d%/.test($('kpis').querySelector('.kpi-growth, [data-kpi="growth"]')?.textContent||''));
 assert($('company-ppg-chart').textContent.includes('2023 data is provisional'),year+' PPG chart message');assert.equal($('company-ppg-chart').querySelector('svg'),null,year+' no PPG bars');
 assert(!$('attention-list').textContent.includes('vs same months 2023')&&!$('attention-list').textContent.includes('vs same months 2022')||year!==2023,year+' attention');assert(!/vs same months 2023/.test($('attention-list').textContent),year+' no vs 2023 attention');assert(!/Value up, units down/.test($('attention-list').textContent),year+' no divergence vs 2023');
 assert.equal($('provisional-badge').hidden,year!==2023,year+' badge');
 window.actualDashboard.showSection('analysis');if(year===2023)assert($('movement-chart').textContent.includes('provisional'),'2023 movement withheld');
 const s=seasonalProjection(payload.records,year,6,'units',{});assert.equal(s.value,null);assert(s.reason.includes('provisional'),year+' seasonal withheld');
 window.actualDashboard.showSection('forecast');assert.equal($('view-forecast').hidden,false,'Forecast visible to viewers');if(year===2024){$('forecast-cutoff').value='6';$('forecast-cutoff').dispatchEvent(new window.Event('change',{bubbles:true}));assert($('target-forecast').textContent.includes('provisional'),'2024 seasonality withheld at a Jun cutoff')}
 window.actualDashboard.showSection('overview');
}
// 2024 movement default compares from 2023 → withheld; 2025 compares to 2024 → bridge.
await window.actualDashboard.apply(cfg(2024,[1,2,3,4,5,6],'analysis'));assert($('movement-year').innerHTML.includes('2023'),'2023 stays listed');$('movement-year').value='2023';$('movement-year').dispatchEvent(new window.Event('change',{bubbles:true}));assert($('movement-chart').textContent.includes('provisional'));assert.equal($('movement-chart').querySelector('svg'),null);$('movement-year').value='2022';$('movement-year').dispatchEvent(new window.Event('change',{bubbles:true}));assert($('movement-chart').querySelector('svg'),'2022 → 2024 bridge allowed');
await window.actualDashboard.apply(cfg(2026,[1,2,3,4,5,6,7,8]));assert(kpiText().includes('Up 39.6%'),'2026 YTD Aug unchanged');assert.equal($('provisional-badge').hidden,true);assert($('company-ppg-chart').querySelector('svg'));
window.nerhadouSecurity.me={user:{role:'owner',status:'active'}};
console.log('Provisional 2023 passed: KPI, PPG chart, attention, movement, seasonality forecast for 2023 and 2024; 2026 unchanged.');
