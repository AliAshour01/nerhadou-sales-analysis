// V73 review fixes (docs/SALES-UX-V73-HANDOFF.md). Logic checks on the baseline seed, then the real DOM fixture
// (linkedom, set NERHADOU_DOM_MODULE). Layout checks live in tests/layout-v72.cjs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { effectiveRecords } from '../public/data-core.js';
import { movement } from '../public/management-core.js';
import { comparisonRecords, resolveViewContext } from '../public/view-context.js';
import { productsTableData } from '../public/products-table.js';
import { compact } from '../public/chart-utils.js';

const seed = JSON.parse(fs.readFileSync('private/seed.json', 'utf8')),
  records = effectiveRecords(seed, {}),
  JS = [1, 2, 3, 4, 5, 6, 7, 8, 9],
  YTD = [1, 2, 3, 4, 5, 6, 7, 8],
  FY = Array.from({ length: 12 }, (_, i) => i + 1),
  none = { product: [], line: [], distributor: [], channel: [] };
const residual = (m) => m.items.find((x) => x.residual)?.delta ?? 0;

// ── N-01: historical bridges match products by comparison name ──
{
  const m = movement(comparisonRecords(records), { a: 2023, b: 2024, months: JS, metric: 'value' });
  const methyl = m.items.find((x) => x.name === 'METHYLTECHNO');
  assert(methyl, 'one Methyltechno item');
  assert(Math.abs(methyl.delta - (317378139 - 289946712)) <= 1, 'Methyltechno 2023 → 2024 Jan–Sep ≈ +27,431,427, got ' + methyl.delta);
  assert(Math.abs(residual(m)) < Math.abs(m.delta) * 0.1, 'residual under 10% of the total change');
  assert(m.items.filter((x) => !x.residual).every((x) => Math.abs(x.delta) >= 0) && new Set(m.items.map((x) => x.name)).size === m.items.length, 'no duplicate names');
  const raw = movement(records, { a: 2022, b: 2023, months: JS, metric: 'value' }),
    keyed = movement(comparisonRecords(records), { a: 2022, b: 2023, months: JS, metric: 'value' });
  assert(Math.abs(residual(keyed)) < Math.abs(residual(raw)) / 10, '2022 → 2023 residual much smaller than V72 (−431.9M)');
  // Products table: 2025 rows (compare 2024) find their previous year through the comparison name.
  const ctx = resolveViewContext(records, { years: [2025], months: FY, periodMode: 'full', selection: none, measure: 'value' }),
    data = productsTableData(ctx, { measures: ['value'] }),
    py = data.cols.find((c) => c.kind === 'py');
  assert(data.rows.filter((r) => r.cells[py.key] != null).length >= data.rows.length - 3, '2025 products show 2024 sales');
  const c24 = resolveViewContext(records, { years: [2024], months: FY, periodMode: 'full', selection: none, measure: 'value' }),
    d24 = productsTableData(c24, { measures: ['value'] }),
    py24 = d24.cols.find((c) => c.kind === 'py'),
    split = d24.rows.find((r) => r.cells[py24.key] == null);
  assert(!split || /price versions|Not sold/.test(split.reasons[py24.key]), 'unknown previous year says why');
}

// ── N-10: one compact rule ──
assert.equal(compact(2.03e9), '2.03B');
assert.equal(compact(1457e6), '1.46B');
assert.equal(compact(229.7e6), '229.7M');
assert.equal(compact(14.04e6), '14M');

// ── DOM ──
await import('./management-ui.mjs');
const $ = (id) => document.getElementById(id),
  cfg = (over = {}) => ({ years: [2026], year: 2026, months: YTD, periodMode: 'ytd', targetBasis: 'period', selection: none, section: 'overview', ...over }),
  kpi = (k) => document.querySelector(`#kpis [data-kpi="${k}"]`)?.textContent.replace(/\s+/g, ' ') || '';
window.actualDashboard.setMeasure('value');

// N-01 / N-02: S8 (2024 full year, value)
await window.actualDashboard.apply(cfg({ years: [2024], year: 2024, months: FY, periodMode: 'full' }));
$('movement-dimension').value = 'product';
$('movement-dimension').dispatchEvent(new window.Event('change', { bubbles: true }));
{
  const tips = [...$('movement-chart').querySelectorAll('g[data-tip]')].map((g) => g.dataset.tip);
  const methyl = tips.find((t) => /^Methyltechno ·/i.test(t));
  assert(methyl && /EGP 27,431,42[67]/.test(methyl), 'S8 bridge Methyltechno +27.4M: ' + methyl);
  const names = tips.map((t) => t.split(' · ')[0]);
  assert.equal(new Set(names).size, names.length, 'no repeated bridge names');
  const products = [...$('movement-chart').querySelectorAll('g[data-bridge-dim="product"]')].map((g) => Math.abs(Number(g.dataset.tip.match(/EGP (-?[\d,]+)/)[1].replace(/,/g, ''))));
  const unmatched = tips.find((t) => /^Unmatched/.test(t));
  if (unmatched) assert(Math.abs(Number(unmatched.match(/EGP (-?[\d,]+)/)[1].replace(/,/g, ''))) < Math.max(...products), 'Unmatched bar smaller than the biggest product bar');
  assert(/Jan–Sep/.test($('movement-chart').querySelector('.bridge-span')?.textContent || ''), 'end bars say Jan–Sep');
  const sales = kpi('sales');
  assert(/Jan–Sep: EGP 1\.03B vs EGP 789\.9M \(2023, includes estimates\)/.test(sales), sales);
  assert(/▲ 30\.4% vs/.test(sales));
  assert(/Jan–Sep avg: EGP 114\.5M vs EGP 87\.8M/.test(kpi('avg')), kpi('avg'));
}
// N-03: multi-year caption
await window.actualDashboard.apply(cfg({ years: [2021, 2022, 2023, 2024, 2025, 2026] }));
assert(/2025 → 2026 · YTD Aug in both years/.test($('movement-context').textContent), $('movement-context').textContent);
// N-12: status strip
assert(/Jan–Aug, 2021–2026/.test($('data-health').textContent));
assert(/Some 2023 values are estimated/.test($('data-health').textContent));
assert(!/Rev 0|No manual update recorded/.test($('data-health').textContent));
// N-18: first and focus years labelled
{
  const labels = [...$('sales-by-year').querySelectorAll('.year-value')].map((t) => t.closest('g').dataset.focusYear);
  assert(labels.includes('2021') && labels.includes('2026'), 'Sales by year labels the first and last years');
}
// N-11: signed EGP amounts put the unit first
await window.actualDashboard.apply(cfg({ years: [2025, 2026] }));
assert(/EGP \+/.test(kpi('change')) && !/\+EGP/.test($('kpis').textContent), kpi('change'));
// N-08 / N-16: 2023
await window.actualDashboard.apply(cfg({ years: [2023], year: 2023, months: FY, periodMode: 'full' }));
assert(/Oct–Dec 2023 are not in the source\. Figures below cover Jan–Sep only\./.test($('selection-status').textContent), $('selection-status').textContent);
assert(!/87,767,474/.test(document.querySelector('#kpis [data-kpi="avg"] strong .kpi-value')?.textContent || '87,767,474'), 'average card compacted with card 1');
// N-06: one unknown label over Oct–Dec, every month labelled
{
  const unknown = $('trend').querySelectorAll('.unknown-label');
  assert.equal(unknown.length, 1, 'one unknown label for the Oct–Dec run');
}
// N-07: months summary names, phone summary
await window.actualDashboard.apply(cfg({ months: [3], periodMode: 'selected' }));
assert.equal($('months-summary').textContent, 'Mar');
// N-15: same product twice in Needs attention is merged
await window.actualDashboard.apply(cfg());
window.actualDashboard.setMeasure('units');
await window.actualDashboard.apply(cfg());
{
  const titles = [...$('attention-list').querySelectorAll('.attention-head b')].map((b) => b.textContent);
  const products = [...$('attention-list').querySelectorAll('[data-select-product]')].map((b) => b.dataset.selectProduct);
  assert.equal(new Set(products).size, products.length, 'no product twice: ' + products);
  const chips = [...$('attention-list').querySelectorAll('.attention-chip')].map((c) => c.textContent); assert(chips.some((c) => /Below target/.test(c)), chips.join(' | '));
}
// N-17: leaving Forecast for an unavailable selection says why
await window.actualDashboard.apply(cfg({ section: 'forecast' }));
await window.actualDashboard.apply(cfg({ years: [2025, 2026], section: 'forecast' }));
assert.equal(window.actualDashboard.read().section, 'overview');
assert(!$('tab-message').hidden && /Forecast needs one open year/.test($('tab-message').textContent), $('tab-message').textContent);

console.log('Sales V73 passed: comparison-name bridge and products, like-for-like KPI cards, captions, labels, strip, attention, tab message.');
