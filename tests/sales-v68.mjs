// V68 Sales UX acceptance checks in the real DOM fixture (linkedom; no layout engine). Browser-only checks live in the PR.
import './management-ui.mjs';
import assert from 'node:assert/strict';
import {checkTicks} from './tick-check.mjs';
const $=id=>document.getElementById(id),base=window.actualDashboard.read();
const cfg=(over={})=>({year:base.snapshot.year,months:[1,2,3,4,5,6,7,8],periodMode:'ytd',targetBasis:'period',selection:{product:[],line:[],distributor:[],channel:[]},section:'overview',...over});
// S-01 movement ticks
await window.actualDashboard.apply(cfg({section:'analysis'}));checkTicks($('movement-chart'),'#movement-chart');checkTicks($('breakdown-products-chart'),'#breakdown-products-chart (dashboard)');
console.log('Sales V68 checks passed.');
