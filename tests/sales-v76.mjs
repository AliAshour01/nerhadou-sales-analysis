// V76 review fixes (docs/SALES-UX-V76-HANDOFF.md): tender-safe seasonality (W-01), prior year by comparison name (W-02),
// returns reasons (W-03), NOPYRETRON packs (W-04), tender growth (W-05), matched base column (W-06), no-target variance
// (W-07), display names (W-10), line colours (W-12). Baseline seed, no DOM.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { effectiveRecords } from '../public/data-core.js';
import { comparisonProduct, KNOWN_SPELLINGS } from '../public/compare-core.js';
import { resolveViewContext, tidyName, sameName } from '../public/view-context.js';
import { productsTableData, versionLabel } from '../public/products-table.js';
import { seasonalProjection, seasonalScenario, isTenderRecord } from '../public/management-core.js';
import { categoryColor } from '../public/chart-utils.js';

const seed = JSON.parse(fs.readFileSync('private/seed.json', 'utf8')),
  records = effectiveRecords(seed, {}),
  none = { product: [], line: [], distributor: [], channel: [] },
  months = (n) => Array.from({ length: n }, (_, i) => i + 1),
  ctx = (year, n, extra = {}) => resolveViewContext(records, { years: [year], months: months(n), selection: none, measure: 'value', periodMode: n === 12 ? 'full' : 'ytd', ...extra });

// ── W-01: the company seasonality scenario does not scale up the December 2025 Methyltechno tender ──
{
  const s = seasonalScenario(records, 2026, 8, 'value', {});
  assert.equal(s.excludesTender, true);
  assert(Math.abs(s.regularValue - 2771514250) < 2, 'regular seasonality ' + s.regularValue);
  assert(Math.abs(s.tenderYTD - 121616451) < 2, 'tender YTD ' + s.tenderYTD);
  assert(Math.abs(s.value - (s.regularValue + s.tenderYTD)) < 1e-3);
  assert(Math.abs(s.share - 0.6899) < 0.001);
  assert.equal(s.priorCum.length, 12);
  // Tender-only and tender-free selections keep the plain method.
  const t = seasonalScenario(records, 2026, 8, 'value', { product: ['Methyltechno - TENDER'] });
  assert(!t.excludesTender && t.share < 0.25, 'tender-only selection unchanged (guarded in the UI)');
  const reg = records.filter((r) => !(r.dataset === 'actual' && isTenderRecord(r)));
  assert.equal(seasonalScenario(reg, 2026, 8, 'value', {}).value, seasonalProjection(reg, 2026, 8, 'value', {}).value);
}

// ── W-02 / W-03: prior year by comparison name; negative months get their own reason ──
{
  const tad = seasonalProjection(records, 2026, 8, 'value', { product: ['TADANERFI 5MG - 20 FILM', 'TADANERFI 5MG - 30 FILM'] }, { product: ['TADANERFI 5MG'] });
  assert.match(tad.reason, /^2025 has returns larger than sales in Jul/, 'Tadanerfi 5MG prior year found by comparison name');
  const hi = seasonalProjection(records, 2026, 8, 'value', { product: ['HI-POTENCY'] });
  assert.match(hi.reason, /^2025 has returns larger than sales in Jan \(EGP −24\.6M\)/);
  assert.deepEqual(hi.negativeMonths, [1]);
  const fer = seasonalProjection(records, 2026, 8, 'value', { product: ['FERROTRON'] });
  assert(fer.value > 0, 'clean products keep a seasonal value');
}

// ── W-04: NOPYRETRON pack sizes are one product ──
assert.equal(comparisonProduct({ product: 'NOPYRETRON  125 MG 10  O. D.  FILM' }), 'NOPYRETRON 125MG');
assert.equal(comparisonProduct({ product: 'NOPYRETRON  125 MG 20  O. D.  FILM' }), 'NOPYRETRON 125MG');
assert(KNOWN_SPELLINGS.some(([a]) => /NOPYRETRON/.test(a)));

// ── 2026 Products tab ──
{
  const d = productsTableData(ctx(2026, 8), { measures: ['value'] }),
    by = (re) => d.rows.filter((r) => re.test(r.product));
  const nop = by(/^NOPYRETRON/);
  assert.equal(nop.length, 1, 'one NOPYRETRON row');
  assert.equal(nop[0].sources.length, 2);
  assert(Math.abs(nop[0].cells['sales:value'] - 4086806) < 2);
  assert.equal(nop[0].cells['target:value'], 15840000);
  // W-05: tender growth from a near-empty base
  const mt = by(/^METHYLTECHNO - TENDER$/i)[0];
  assert.equal(mt.cells['ppg:value'], null);
  assert.match(mt.reasons['ppg:value'], /tender orders came mostly after Aug \(1% by Aug\)/);
  // W-03: returns in the base are named; growth below −100% never shows
  const hi = by(/^HI-POTENCY$/)[0];
  assert(hi.cells['ppg:value'] > 600);
  assert.match(hi.reasons['ppg:value'], /2025 Jan–Aug includes returns of EGP −24\.6M \(Jan\)/);
  for (const r of d.rows) if (r.cells['ppg:value'] != null) assert(r.cells['ppg:value'] >= -100, r.product);
  // W-07: zero target → no achievement / variance
  const cal = by(/^CALCITRON - TENDER$/i)[0];
  assert.equal(cal.cells['gap:value'], null);
  assert.equal(cal.reasons['gap:value'], 'No target for this product.');
  assert(Math.abs(d.total.cells['gap:value'] - 40007424) < 2, 'Total variance unchanged');
  // W-10: one display style
  for (const r of d.rows) if (!r.versions) assert(sameName(ctx(2026, 8).displayName(r.product), r.product));
  assert.equal(ctx(2026, 8).displayName('Vita D3'), 'VITA D3');
  assert.equal(ctx(2026, 8).displayName('MELACRYST 1.5 MG'), 'MELACRYST 1.5MG');
  assert.equal(ctx(2026, 8).displayName('CALCITRON - Tender'), 'CALCITRON - TENDER');
  assert.equal(versionLabel(nop[0].sources), '2 packs');
}
assert.equal(tidyName(' Methyltechno-Tender '), 'METHYLTECHNO - TENDER');

// ── W-03 / W-06: 2023 and 2024 full year ──
{
  const d24 = productsTableData(ctx(2024, 12), { measures: ['value'] });
  assert(d24.cols.some((c) => c.key === 'cur:value' && /^2024 Jan–Sep$/.test(c.short)), 'matched-base column');
  const m = d24.rows.find((r) => r.key === 'METHYLTECHNO');
  assert(Math.abs(m.cells['cur:value'] - 317378139) <= 1, 'Methyltechno 2024 Jan–Sep');
  assert(Math.abs(d24.total.cells['cur:value'] - 1030296056) <= 2);
  assert.match(versionLabel(m.sources), /price versions$/);
  const d23 = productsTableData(ctx(2023, 12), { measures: ['value'] });
  for (const r of d23.rows) if (r.cells['ppg:value'] != null) assert(r.cells['ppg:value'] >= -100, r.product);
  const tad = d23.rows.find((r) => r.key === 'TADANERFI 10MG');
  assert.equal(tad.cells['ppg:value'], null);
  assert.match(tad.reasons['ppg:value'], /^Returns larger than sales/);
}

// ── W-12: every sales line has its own colour ──
{
  const lines = ['Endocrinology line', 'Gyn line', 'Andrology line', 'TENDER-ODF', 'G.I.T Line', 'OTC Line', 'Nerkardou Line', 'Pedia line'];
  assert.equal(new Set(lines.map(categoryColor)).size, lines.length);
}
console.log('Sales V76 passed: tender-safe seasonality, returns reasons, NOPYRETRON packs, tender growth, matched base, no-target variance, names, line colours.');
