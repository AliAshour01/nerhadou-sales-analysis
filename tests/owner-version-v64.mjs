// Version visibility derives from the existing verified identity. No auth behavior change.
import './management-ui.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';
const $=id=>document.getElementById(id);
assert.equal($('manager-headline'),null,'Unselected headline is absent');
assert.equal(document.querySelectorAll('.filter-bar-title').length,1,'V69: one Sales page with one named filter region');
assert.equal(document.querySelector('#sales>.filters').getAttribute('aria-label'),'Sales filters');
assert.equal($('comparison'),null,'Historical page removed in V69');
assert($('release-version').hasAttribute('data-owner-only'));
await import('../public/workspace-access.js');await new Promise(setImmediate);
for(const role of ['owner','admin','viewer',undefined]){window.nerhadouSecurity.me={user:{role,status:'active'}};window.updateWorkspaceVisibility();assert.equal($('release-version').hidden,role!=='owner','Version visibility for '+role);assert.equal($('release-history').hidden,role!=='owner','History visibility for '+role);}
window.nerhadouSecurity.me={user:{role:'owner',status:'active'}};window.updateWorkspaceVisibility();assert(!$('release-version').hidden);assert($('release-version').textContent.startsWith('V'+JSON.parse(fs.readFileSync('release.config.json','utf8')).version));
console.log('V64 passed: Owner-only version/history (admin/viewer/unknown hidden), one named Sales filter region, no extra headline.');
