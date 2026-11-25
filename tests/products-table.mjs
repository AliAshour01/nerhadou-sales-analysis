// V69 U-09: Products table data (plan 4.8). Baseline seed, no DOM.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { effectiveRecords } from '../public/data-core.js';
import { comparableSummary, targetSum } from '../public/management-core.js';
import { resolveViewContext } from '../public/view-context.js';
import { productsTableData, productsTableHTML, sortOptions, sortRows, groupByLine, TOP_ROWS } from '../public/products-table.js';

const seed = JSON.parse(fs.readFileSync('private/seed.json', 'utf8')),
  records = effectiveRecords(seed, {}),
  none = { product: [], line: [], distributor: [], channel: [] },
  ytd = (n) => Array.from({ length: n }, (_, i) => i + 1),
  ctx = (over) => resolveViewContext(records, { years: [2026], months: ytd(8), selection: none, measure: 'units', ...over });

// Single year, all products: pinned Total equals the KPI figure; target columns only with targets.
let c = ctx({}),
  d = productsTableData(c, { measures: ['units'] });
assert.deepEqual(d.cols.map((x) => x.kind), ['sales', 'share', 'py', 'ppg', 'target', 'ach', 'gap']);
assert.equal(d.total.cells['sales:units'], comparableSummary(records, 2026, ytd(8), 'units', none).value);
assert.equal(d.total.cells['target:units'], targetSum(records, { year: 2026 }, c.products, ytd(8), 'units', none, false));
assert.equal(d.rows.length, c.productCount);
assert.ok(Math.abs(d.total.cells['share:units'] - 100) < 1e-9, 'company scope share is 100%');
let h = productsTableHTML(d, c, { sort: 'sales', desc: true, measures: ['units'] });
assert.equal(h.shown, TOP_ROWS, 'top 15 then Show all');
assert.match(h.more, /Show all 67/);
assert.deepEqual(sortOptions(c).map((x) => x[0]), ['sales', 'growth', 'increase', 'decline', 'shortfall', 'ach', 'name']);
const sorted = sortRows(d.rows, c, 'shortfall', true, 'units').map((r) => r.cells['gap:units']).filter(Number.isFinite);
assert.ok(sorted.every((v, i) => !i || v >= sorted[i - 1]), 'target shortfall sorts largest gap first');
// Both measures: two column groups.
d = productsTableData(c, { measures: ['units', 'value'] });
assert.equal(d.cols.length, 14);
// Group by line: subtotal of a line equals the sum of its products.
const groups = groupByLine(d.rows, d.cols);
assert.ok(groups.length >= 2);
for (const g of groups) {
  const vals = g.rows.map((r) => r.cells['sales:units']);
  if (vals.every(Number.isFinite)) assert.ok(Math.abs(g.sub.cells['sales:units'] - vals.reduce((a, b) => a + b, 0)) < 1e-6);
}
// Distributor filter: no target columns (targets are product-level), shares keep the company denominator.
c = ctx({ selection: { ...none, distributor: ['PHARMA'] } });
d = productsTableData(c, { measures: ['units'] });
assert.ok(!d.cols.some((x) => x.kind === 'target'));
assert.ok(d.total.cells['share:units'] < 100);
// 2023 recorded amounts support previous-year growth and growth sorting.
c = ctx({ years: [2023], months: ytd(9) });
d = productsTableData(c, { measures: ['units'] });
assert.deepEqual(d.cols.map((x) => x.kind), ['sales', 'share', 'py', 'ppg']);
assert.ok(sortOptions(c).some(([key]) => key === 'growth'));
// Multi-year: one Sales column per year, Change / Growth / Share; missing years are "Not sold in Y", never 0.
c = ctx({ years: [2021, 2022, 2023, 2024, 2025, 2026] });
d = productsTableData(c, { measures: ['units'] });
assert.deepEqual(d.cols.map((x) => x.kind), ['year', 'year', 'year', 'year', 'year', 'year', 'change', 'growth', 'share']);
const late = d.rows.find((r) => r.cells['year:units:2021'] == null && r.cells['year:units:2026'] != null);
assert.ok(late, 'a product not sold in 2021 exists');
assert.match(late.reasons['year:units:2021'], /Not sold in 2021/);
assert.equal(d.total.cells['year:units:2026'], comparableSummary(c.records, 2026, c.months, 'units', none).value);
console.log('products-table: all states pass');
