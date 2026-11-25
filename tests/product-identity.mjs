// V69 U-15: product identity across years (plan U-15). Multi-year mode uses the reviewed comparison name.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { effectiveRecords } from '../public/data-core.js';
import { comparableSummary } from '../public/management-core.js';
import { resolveViewContext, translateProducts } from '../public/view-context.js';
import { productsTableData } from '../public/products-table.js';

const seed = JSON.parse(fs.readFileSync('private/seed.json', 'utf8')),
  records = effectiveRecords(seed, {}),
  none = { product: [], line: [], distributor: [], channel: [] },
  ytd = (n) => Array.from({ length: n }, (_, i) => i + 1);

// The pack is written 'MELACRYST 1.5MG' in 2025 and 'MELACRYST 1.5 MG' in 2026.
const multi = translateProducts(records, ['MELACRYST 1.5 MG'], 'multi');
assert.deepEqual(multi, ['MELACRYST 1.5MG']);
assert.deepEqual(translateProducts(records, multi, 'single', 2026), ['MELACRYST 1.5 MG']);
assert.deepEqual(translateProducts(records, multi, 'single', 2025), ['MELACRYST 1.5MG']);

// One comparison product in multi-year mode sums each year's own source name.
const ctx = resolveViewContext(records, { years: [2025, 2026], months: ytd(8), selection: { ...none, product: multi }, measure: 'units' });
assert.equal(ctx.productMode, 'one');
for (const [year, name] of [[2025, 'MELACRYST 1.5MG'], [2026, 'MELACRYST 1.5 MG']]) {
  const single = comparableSummary(records, year, ctx.months, 'units', { ...none, product: [name] }).value;
  assert.equal(comparableSummary(ctx.records, year, ctx.months, 'units', ctx.selection).value, single, `${year} sums ${name}`);
}

// Products table, multi-year: the renamed product is one row with both years filled.
const all = resolveViewContext(records, { years: [2021, 2022, 2023, 2024, 2025, 2026], months: ytd(8), selection: none, measure: 'units' }),
  table = productsTableData(all, { measures: ['units'] }),
  row = table.rows.find((r) => r.product === 'MELACRYST 1.5MG');
assert.ok(row && row.cells['year:units:2025'] != null && row.cells['year:units:2026'] != null);
assert.equal(table.rows.filter((r) => /^MELACRYST 1\.5 ?MG$/.test(r.product)).length, 1, 'no duplicate row for the renamed pack');
// A product that did not exist in an early year shows '—' with a reason, never 0.
const late = table.rows.find((r) => r.cells['year:units:2021'] == null && r.cells['year:units:2026'] > 0);
assert.ok(late);
assert.equal(late.reasons['year:units:2021'], 'Not sold in 2021');
// A 0 is only ever a recorded zero, never a missing year.
for (const r of table.rows.filter((x) => x.cells['year:units:2021'] === 0)) assert.ok(all.records.some((x) => x.dataset === 'actual' && x.year === 2021 && x.product === r.product), r.product);
console.log('product-identity: all states pass');
