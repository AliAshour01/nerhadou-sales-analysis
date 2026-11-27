// V74 review fixes (docs/SALES-UX-V74-HANDOFF.md): product identity (V-13), one row per product (V-14),
// price-version safety (V-01), forecast seasonality guard (V-02). Baseline seed, no DOM.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { effectiveRecords } from '../public/data-core.js';
import { comparisonProduct } from '../public/compare-core.js';
import { resolveViewContext } from '../public/view-context.js';
import { productsTableData } from '../public/products-table.js';
import { seasonalProjection } from '../public/management-core.js';
import { fitTail, wrapLabel, textWidth } from '../public/chart-utils.js';

const seed = JSON.parse(fs.readFileSync('private/seed.json', 'utf8')),
  records = effectiveRecords(seed, {}),
  none = { product: [], line: [], distributor: [], channel: [] },
  months = (n) => Array.from({ length: n }, (_, i) => i + 1),
  ctx = (year, n, extra = {}) => resolveViewContext(records, { years: [year], months: months(n), selection: none, measure: 'value', periodMode: n === 12 ? 'full' : 'ytd', ...extra });

// ── V-13: reviewed product identity ──
{
  const keysByYear = new Map();
  for (const r of records) if (r.dataset === 'actual' && r.month > 0) {
    const k = comparisonProduct(r);
    if (!keysByYear.has(k)) keysByYear.set(k, new Set());
    keysByYear.get(k).add(r.year);
  }
  for (const orphan of ['MELACRYST', 'NERHAPEZIL', 'NERDECONG', 'NERCAFIX', 'ZOLMASONE 2.5MG', 'ZOLMASONE 5MG']) assert(!keysByYear.has(orphan), orphan + ' no longer a separate product');
  assert([...keysByYear.get('MELACRYST 1.5MG')].includes(2023));
  assert([...keysByYear.get('NERCAFIX 40MG')].includes(2022) && [...keysByYear.get('NERCAFIX 40MG')].includes(2025), 'NERCAFIX is one product across years');
  assert([...keysByYear.get('ZOLMSOLAN 2.5MG')].includes(2021));
  assert([...keysByYear.get('NERDECONG 2.5MG')].includes(2026));
  assert(keysByYear.has('FERROTRON FORT') && [...keysByYear.get('FERROTRON FORT')].join() === '2026', 'Ferrotron Fort is its own product');
  const sum = (key) => records.filter((r) => r.dataset === 'actual' && r.year === 2023 && r.month >= 1 && r.month <= 9 && comparisonProduct(r) === key).reduce((n, r) => n + (r.value || 0), 0);
  assert(Math.abs(sum('MELACRYST 1.5MG') - 6016000) < 100000, 'unlabelled 2023 MELACRYST rows now count as MELACRYST 1.5MG: ' + sum('MELACRYST 1.5MG'));
  assert.equal(comparisonProduct({ product: 'Ferrotron Fort - Tender', channel: 'TENDER' }), 'FERROTRON FORT - TENDER');
}

// ── V-14: one row per product, price versions expandable ──
for (const [year, n] of [[2022, 12], [2023, 12], [2024, 12], [2025, 12], [2026, 8]]) {
  const c = ctx(year, n), d = productsTableData(c, { measures: ['value'] });
  const keys = new Set(d.rows.map((r) => r.key));
  assert.equal(keys.size, d.rows.length, year + ': one row per comparison product');
  assert(d.rows.length < c.productCount || year === 2025, year + ': fewer rows than source names');
  // The pinned Total is the company figure; rows add up to it (price versions never counted twice).
  const total = d.total.cells['sales:value'], rows = d.rows.reduce((s, r) => s + (r.cells['sales:value'] ?? 0), 0);
  assert(Math.abs(total - rows) < 1, year + ': rows add up to the total');
  for (const r of d.rows.filter((x) => x.versions)) {
    const v = r.versions.reduce((s, x) => s + (x.cells['sales:value'] ?? 0), 0);
    assert(Math.abs(v - r.cells['sales:value']) < 1, year + ' ' + r.product + ': versions add up to the product row');
    // V-01: a price version never gets a previous-year figure of its own.
    assert(r.versions.every((x) => x.cells['py:value'] == null && x.cells['ppg:value'] == null), year + ' ' + r.product + ': price-version rows have no previous year');
  }
}
{
  const c = ctx(2024, 12), d = productsTableData(c, { measures: ['value'] }), by = (name) => d.rows.find((r) => r.product === name);
  assert.equal(d.rows.filter((r) => /^methyltechno/i.test(r.product)).length, 1, 'Methyltechno is one row');
  const m = by('METHYLTECHNO');
  assert(Math.abs(m.cells['py:value'] - 289946712) <= 1 && Math.abs(m.cells['ppg:value'] - 9.46) < 0.1, 'Methyltechno Jan–Sep 2023 and growth');
  assert(Math.abs(by('CALCITRON').cells['ppg:value'] - 40.5) < 0.2, 'Calcitron +40.5% (was +55,913% on an "Old Price" row)');
  assert(Math.abs(d.total.cells['sales:value'] - 1767914133) < 1 && Math.abs(d.total.cells['ppg:value'] - 30.4) < 0.1, 'Total row unchanged');
  const big = d.rows.map((r) => r.cells['ppg:value']).filter((v) => v != null && Math.abs(v) > 1000);
  assert.equal(big.length, 2, 'only the two NERKARDOU launches (tiny 2023 base) exceed 1,000%');
}
{
  // A single price version selected on its own is not comparable with last year's whole product.
  const c = ctx(2024, 12, { selection: { ...none, product: ['Calcitron 3*10 Old Price'] } }), d = productsTableData(c, { measures: ['value'] });
  const r = d.rows[0];
  assert(r && r.cells['py:value'] == null && /Price versions change every year/.test(r.reasons['py:value']), 'one price version: previous year unknown with a reason');
}
{
  // Targets: a product row sums the targets of its source names (Tadanerfi 5MG 20 FILM + 30 FILM), never splits one.
  const c = ctx(2026, 8), d = productsTableData(c, { measures: ['value'] }), t = d.rows.find((r) => r.product === 'TADANERFI 5MG');
  assert(t && t.sources.length === 2 && t.cells['target:value'] > 0);
  const f = d.rows.find((r) => r.product === 'Ferrotron Fort');
  assert(f && f.cells['target:value'] > 0, 'Ferrotron Fort is a separate row with its own target');
}

// ── V-02: no seasonal projection from a sliver of last year ──
{
  const input = records.filter((r) => !(r.dataset === 'actual' && r.year === 2026 && r.month > 8)),
    s = seasonalProjection(input, 2026, 8, 'units', { product: ['Methyltechno - TENDER'] });
  assert(s.share < 0.25, 'the tender sold ' + (s.share * 100).toFixed(1) + '% of its 2025 total by August (guard threshold 25%)');
}

// ── V-05: labels ──
{
  assert.equal(fitTail('ONDALENZ 8MG', 60, 12).slice(-3), '8MG');
  const lines = wrapLabel('ONDALENZ 8MG', 70, 12);
  assert(lines.length === 2 && lines.every((l) => textWidth(l, 12) <= 70) && lines.join(' ') === 'ONDALENZ 8MG');
  assert.deepEqual(wrapLabel('CALCITRON', 120, 12), ['CALCITRON']);
}
console.log('Sales V74 passed: product identity, one row per product, price-version safety, tender seasonality guard, labels.');
// V74.1: a product with no previous-year sales but sales now shows "New", not a dash.
{
  const { productsTableHTML } = await import('../public/products-table.js');
  const c = ctx(2024, 12), d = productsTableData(c, { measures: ['value'] }), v = d.rows.find((r) => r.product === 'VITATRON');
  assert(v && v.cells['py:value'] === 0 && /^New:/.test(v.reasons['ppg:value']));
  const h = productsTableHTML(d, c, { sort: 'sales', desc: true, measures: ['value'], showAll: true });
  assert(/>New<\/td>/.test(h.body), 'New shown in the growth column');
  console.log('Sales V74.1 passed: New for launches.');
}
