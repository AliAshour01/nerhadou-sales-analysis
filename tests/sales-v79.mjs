// V79: Products "Group by line" is an expand/collapse tree whose line rows carry real subtotals (2025, PPG, target,
// achievement, variance computed from the line's own sums), and the bridge shows each bar's contribution in points.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { dashboardRecords } from '../public/compare-core.js';
import { effectiveRecords } from '../public/data-core.js';
import { resolveViewContext } from '../public/view-context.js';
import { productsTableData, productsTableHTML, groupByLine } from '../public/products-table.js';

const seed = JSON.parse(fs.readFileSync(new URL('../private/seed.json', import.meta.url), 'utf8'));
const ctx = resolveViewContext(dashboardRecords(effectiveRecords(seed, {})), { years: [2026], months: [1, 2, 3, 4, 5, 6, 7, 8], measure: 'units', selection: {} });
const data = productsTableData(ctx, {});
const groups = groupByLine(data.rows, data.cols, data.subtotal);
assert(groups.length >= 2);
const k = (kind) => kind + ':units';
let salesSum = 0;
for (const g of groups) {
  const sub = g.sub.cells;
  // Sales and target add up to the products' own figures; the line's own PPG / achievement come from its sums.
  const sales = g.rows.reduce((a, r) => a + (r.cells[k('sales')] || 0), 0);
  assert(Math.abs(sub[k('sales')] - sales) < 1e-6, g.line + ' sales');
  salesSum += sub[k('sales')];
  assert(Number.isFinite(sub[k('py')]), g.line + ' 2025 filled');
  assert(Number.isFinite(sub[k('target')]), g.line + ' target filled');
  if (sub[k('target')] > 0) {
    assert(Math.abs(sub[k('ach')] - (sub[k('sales')] / sub[k('target')]) * 100) < 1e-6, g.line + ' ach');
    assert(Math.abs(sub[k('gap')] - (sub[k('sales')] - sub[k('target')])) < 1e-6, g.line + ' variance');
  }
  if (sub[k('ppg')] != null) assert(Math.abs(sub[k('ppg')] - (sub[k('sales')] / sub[k('py')] - 1) * 100) < 1e-6, g.line + ' ppg');
  assert.equal(g.sub.count, g.rows.length);
}
assert(Math.abs(salesSum - data.total.cells[k('sales')]) < 1e-6, 'lines add up to the total');
// A tender-only line follows the tender growth rule (no +3000% line growth).
const tenderLine = groups.find((g) => g.rows.every((r) => /tender/i.test(r.product)));
if (tenderLine) assert(tenderLine.sub.cells[k('ppg')] == null || tenderLine.sub.cells[k('ppg')] < 1000, 'tender line growth');

// Tree: all lines open by default; a closed line keeps only its subtotal row (table) / line card (phone).
const opts = { sort: 'sales', desc: true, measures: ['units'], grouped: true };
const open = productsTableHTML(data, ctx, opts);
const first = groups[0];
assert(open.body.includes(`data-pt-line="${first.line}" aria-expanded="true"`));
assert(open.cards.includes(`data-pt-line="${first.line}" aria-expanded="true"`));
const firstProduct = first.rows[0].product;
assert(open.body.includes(`data-select-product="${firstProduct}"`) || open.body.includes(firstProduct));
const closed = productsTableHTML(data, ctx, { ...opts, closedLines: new Set([first.line]) });
assert(closed.body.includes(`data-pt-line="${first.line}" aria-expanded="false"`));
assert(closed.cards.includes(`data-pt-line="${first.line}" aria-expanded="false"`));
const countRows = (html) => (html.match(/<tr/g) || []).length;
assert(countRows(open.body) - countRows(closed.body) >= first.rows.length, 'closed line hides its products');
// Total row unaffected by open/closed state.
const totalRow = (html) => html.slice(0, html.indexOf('</tr>'));
assert.equal(totalRow(open.body), totalRow(closed.body));
// Children are indented (line-child) and the packs toggle still works inside the tree.
assert(open.body.includes('class="line-child'));
const packRow = data.rows.find((r) => r.versions);
if (packRow) {
  const withPacks = productsTableHTML(data, ctx, { ...opts, expanded: new Set(['v:' + packRow.key]) });
  assert(withPacks.body.includes('line-child member-row version-row'));
}
console.log('sales-v79 ok');
