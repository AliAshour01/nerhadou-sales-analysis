// V81 design fixes static checks (G-02, G-05, G-17, G-24, G-26).
import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('public/index.html', 'utf8');
const appCss = fs.readFileSync('public/app.css', 'utf8');
const mgmt = fs.readFileSync('public/management.js', 'utf8');
const pt = fs.readFileSync('public/products-table.js', 'utf8');

// G-05: no raw 6-digit hex colours outside comments in the four JS files.
for (const file of ['public/management.js', 'public/chart-utils.js', 'public/app.js', 'public/products-table.js']) {
  const stripped = fs.readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const hexes = [...stripped.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0]);
  assert.deepEqual(hexes, [], `${file} has raw hex colours: ${hexes.join(', ')}`);
}

// G-02: no background-clip:text (or any background-clip) left in app.css.
assert(!/background-clip/i.test(appCss), 'app.css still contains background-clip');

// G-24: polish-motion.js is removed and no translateY( lift remains in app.css.
assert(!fs.existsSync('public/polish-motion.js'), 'public/polish-motion.js should be removed');
assert(!/polish-motion/.test(html), 'index.html still references polish-motion');
assert(!/translateY\(/i.test(appCss), 'app.css still contains translateY(');

// G-17: Products table headers use "vs <year>" and "% of target".
assert(pt.includes("'vs ' + ctx.compareYear"), 'Products table should use "vs <year>" header');
assert(pt.includes("'% of target'"), 'Products table should use "% of target" header');

// G-26: KPI label uses "Units sold".
assert(mgmt.includes("'Units sold'"), 'management.js should use "Units sold" KPI label');

console.log('V81 static design checks passed.');
