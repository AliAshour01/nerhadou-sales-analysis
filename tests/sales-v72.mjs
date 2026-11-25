// V72 user-review fixes (docs/SALES-UX-V72-HANDOFF.md). Logic checks on the baseline seed, no DOM.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { effectiveRecords } from '../public/data-core.js';
import { movement, movementTotals, dimensionRecorded, dimensionGap, tenderBase, isTenderVariant, TENDER_SUFFIX } from '../public/management-core.js';
import { productsTableData, productsTableHTML } from '../public/products-table.js';
import { resolveViewContext } from '../public/view-context.js';

const seed = JSON.parse(fs.readFileSync('private/seed.json', 'utf8')),
  records = effectiveRecords(seed, {}),
  YTD = [1, 2, 3, 4, 5, 6, 7, 8],
  FY = Array.from({ length: 12 }, (_, i) => i + 1),
  none = { product: [], line: [], distributor: [], channel: [] };

// ── R-01: a filtered dimension that the earlier year does not record is unknown, never zero ──
{
  assert.equal(dimensionRecorded(records, 2025, YTD, 'distributor'), false, '2025 has no distributor data');
  assert.equal(dimensionRecorded(records, 2026, YTD, 'distributor'), true);
  assert.equal(dimensionRecorded(records, 2024, FY, 'line'), false, '2024 has no line data');
  assert.equal(dimensionRecorded(records, 2025, FY, 'line'), true);
  assert.equal(dimensionRecorded(records, 2025, YTD, 'channel'), false, '2025 sales type is an undivided COMBINED / SOURCE bucket');
  let m = movement(records, { a: 2025, b: 2026, months: YTD, metric: 'value', filters: { distributor: ['PHARMA'] } });
  assert.equal(m.delta, null, 'S10: no +1.1B bridge');
  assert.match(m.reason, /2025/);
  assert.match(m.reason, /distributor/);
  assert.equal(m.items.length, 0);
  m = movement(records, { a: 2024, b: 2025, months: FY, metric: 'value', filters: { line: ['Gyn line'] } });
  assert.equal(m.delta, null, 'S12: no +675.7M bridge');
  assert.match(m.reason, /2024 does not record line/);
  assert.equal(movementTotals(records, { a: 2025, b: 2026, months: YTD, metric: 'value', filters: { channel: ['PRIVATE'] } }).delta, null);
  // Regression: a product-only filter is unchanged (S3: 599,264 → 1,204,041 units).
  m = movement(records, { a: 2025, b: 2026, months: YTD, metric: 'units', filters: { product: ['ONDALENZ 8MG'] } });
  assert.equal(Math.round(m.previous.value), 599264);
  assert.equal(Math.round(m.current.value), 1204041);
  // A line recorded in both years still compares (absent line in a fully recorded year = new line).
  assert.notEqual(movementTotals(records, { a: 2025, b: 2026, months: YTD, metric: 'value', filters: { line: ['Gyn line'] } }).delta, null);
  assert.equal(dimensionGap(records, 2025, YTD, { line: ['Gyn line'] }), null);
  // View context exposes the gap for the KPI chip, Monthly chart and Products table.
  const ctx = resolveViewContext(records, { years: [2026], months: YTD, measure: 'value', selection: { ...none, distributor: ['PHARMA'] } });
  assert.equal(ctx.filterCompareGap.year, 2025);
  assert.match(ctx.filterCompareGap.sentence, /2025 does not record distributor, so the change for PHARMA can’t be measured/);
  assert.equal(resolveViewContext(records, { years: [2026], months: YTD, measure: 'value', selection: none }).filterCompareGap, null);
}
// ── R-02: one month rule for 2023 / 2024 comparisons ──
{
  const c24 = resolveViewContext(records, { years: [2024], months: FY, measure: 'value', selection: none });
  assert.deepEqual(c24.compareMonths, [1, 2, 3, 4, 5, 6, 7, 8, 9], '2024 vs 2023 compares Jan–Sep');
  assert.equal(c24.compareNote, 'Jan–Sep only, Oct–Dec 2023 not recorded');
  assert.notEqual(movementTotals(records, { a: 2023, b: 2024, months: c24.compareMonths, metric: 'value' }).delta, null, 'bridge 2023 → 2024 is measurable on Jan–Sep');
  const c23 = resolveViewContext(records, { years: [2023], months: FY, measure: 'value', selection: none });
  assert.deepEqual(c23.dataMonths, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(c23.missingNote, 'Oct–Dec not recorded');
  const c26 = resolveViewContext(records, { years: [2026], months: YTD, measure: 'value', selection: none });
  assert.equal(c26.comparePartial, false);
  assert.deepEqual(c26.compareMonths, YTD);
}
// ── R-19: tender twins ──
{
  for (const [name, base] of [['NERHAPEZIL 5MG  - Tender', 'NERHAPEZIL 5MG'], ['TADANERFI 5MG - 30 FILM -Tender', 'TADANERFI 5MG - 30 FILM'], ['Methyltechno - TENDER', 'Methyltechno'], ['Methyltechno-Tender', 'Methyltechno'], ['ONDALENZ 8MG', 'ONDALENZ 8MG'], ['TENDER', 'TENDER']]) assert.equal(tenderBase(name), base, name);
  assert.equal(isTenderVariant('CALCITRON - Tender'), true);
  assert.equal(isTenderVariant('CALCITRON'), false);
  assert(fs.readFileSync('public/app.js', 'utf8').includes('const TENDER_SUFFIX=' + TENDER_SUFFIX.toString() + ';'), 'app.js copy of TENDER_SUFFIX');
  const ctx = resolveViewContext(records, { years: [2026], months: YTD, measure: 'units', selection: none }),
    data = productsTableData(ctx, { measures: ['units'] }),
    g = [...data.tender.values()].find((x) => x.product === 'Methyltechno');
  assert(g, 'Methyltechno has a combined row');
  assert.deepEqual(g.members.map((m) => m.product).sort(), ['Methyltechno', 'Methyltechno - TENDER']);
  const sum = (k) => g.members.reduce((a, m) => a + m.cells[k], 0);
  assert.equal(Math.round(g.cells['sales:units']), Math.round(sum('sales:units')), 'sales add up');
  assert.equal(g.cells['target:units'], sum('target:units'), 'targets add up (two product-level targets, never allocated)');
  assert.equal(g.cells['target:units'], 8000000);
  assert(Math.abs(g.cells['ppg:units'] - ((g.cells['sales:units'] - g.cells['py:units']) / g.cells['py:units']) * 100) < 1e-9, 'PPG recomputed from combined amounts');
  const html = productsTableHTML(data, ctx, { sort: 'sales', desc: true, measures: ['units'], showAll: true, combine: true, expanded: new Set([g.key]) });
  assert.equal(html.sorted.filter((r) => /^Methyltechno/.test(r.product)).length, 1, 'one combined row');
  assert(html.body.includes('member-row'), 'expand shows the two rows');
  const plain = productsTableHTML(data, ctx, { sort: 'sales', desc: true, measures: ['units'], showAll: true });
  assert.equal(plain.sorted.length, data.rows.length, 'off by default');
}
console.log('sales-v72 logic checks passed');
