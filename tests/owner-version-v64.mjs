// Version visibility derives from the existing verified identity. No auth behavior change.
import './management-ui.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';
const $=id=>document.getElementById(id);
assert.equal($('manager-headline'),null,'Unselected headline is absent');
assert.equal(document.querySelectorAll('.filter-bar-title').length,2,'Actual and Historical both have a named filter region');
assert.equal(document.querySelector('#sales>.filters').getAttribute('aria-label'),'Actual sales filters');
assert.equal(document.querySelector('#comparison .focus-filters').getAttribute('aria-label'),'Historical sales filters');
assert($('release-version').hasAttribute('data-owner-only'));
await import('../public/workspace-access.js');await new Promise(setImmediate);
for(const role of ['owner','admin','viewer',undefined]){window.nerhadouSecurity.me={user:{role,status:'active'}};window.updateWorkspaceVisibility();assert.equal($('release-version').hidden,role!=='owner','Version visibility for '+role);assert.equal($('release-history').hidden,role!=='owner','History visibility for '+role);}
window.nerhadouSecurity.me={user:{role:'owner',status:'active'}};window.updateWorkspaceVisibility();assert(!$('release-version').hidden);assert($('release-version').textContent.startsWith('V64'));
window.comparisonDashboard.restore({scope:'product',product:'ONDALENZ 8MG',years:[2024,2025],mode:'ytd',month:8,commonMonths:true});assert.equal(document.querySelectorAll('#historical-contribution-panel').length,1);assert($('focus-company-panel').hidden);assert(!$('focus-share-panel').hidden);$('clear-historical-product').click();assert(!$('focus-company-panel').hidden);assert($('focus-share-panel').hidden);
assert.equal(document.querySelector('#historical-coverage .coverage-alert'),null,'Extra coverage banner was not selected');
console.log('V64 passed: Owner-only version/history (admin/viewer/unknown hidden), both named filter regions, no extra headline/banner, unified contribution switches/clears correctly.');
