// V72 user-review fixes (docs/SALES-UX-V72-HANDOFF.md). Logic checks on the baseline seed, no DOM.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { effectiveRecords } from '../public/data-core.js';
import { movement, movementTotals, dimensionRecorded, dimensionGap } from '../public/management-core.js';
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
console.log('sales-v72 logic checks passed');
