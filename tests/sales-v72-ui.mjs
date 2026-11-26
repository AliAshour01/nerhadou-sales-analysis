// V72 user-review fixes in the real DOM fixture (linkedom; no layout engine). Layout checks live in tests/layout-v72.cjs.
import './management-ui.mjs';
import assert from 'node:assert/strict';
const $ = (id) => document.getElementById(id),
  base = window.actualDashboard.read(),
  none = { product: [], line: [], distributor: [], channel: [] },
  YTD = [1, 2, 3, 4, 5, 6, 7, 8],
  FY = Array.from({ length: 12 }, (_, i) => i + 1);
const cfg = (over = {}) => ({ years: [2026], year: 2026, months: YTD, periodMode: 'ytd', targetBasis: 'period', selection: none, section: 'overview', ...over });
const visible = () => [...$('overview-grid').querySelectorAll('.v69-panel:not([hidden])')].map((p) => p.dataset.panel);
const strip = () => ($('overview-not-shown').hidden ? '' : $('overview-not-shown').textContent);
const kpiText = () => $('kpis').textContent.replace(/\s+/g, ' ');
window.actualDashboard.setMeasure('value');

// R-01 · acceptance 1: 2026, Distributor PHARMA
await window.actualDashboard.apply(cfg({ selection: { ...none, distributor: ['PHARMA'] } }));
assert(!visible().includes('bridge'), 'no bridge for PHARMA');
assert(/What drove the change.*2025 does not record distributor, so the change for PHARMA can’t be measured/.test(strip()), strip());
assert(/no comparison · 2025 has no distributor data/.test(kpiText()));
assert(!document.querySelector('[data-monthly-compare="py"]'), 'no Previous-year overlay option');
// R-01 · acceptance 2: 2025, Line Gyn line
await window.actualDashboard.apply(cfg({ years: [2025], year: 2025, months: FY, periodMode: 'full', selection: { ...none, line: ['Gyn line'] } }));
assert(!visible().includes('bridge'));
assert(/2024 does not record line/.test(strip()));

// R-02 · acceptance 3: 2023 full year
await window.actualDashboard.apply(cfg({ years: [2023], year: 2023, months: FY, periodMode: 'full' }));
{
  const first = $('kpis').querySelector('.kpi');
  assert.match(first.querySelector('.label').textContent, /Sales Jan–Sep 2023/);
  assert(first.querySelector('.kpi-provisional'), 'Provisional chip');
  assert(/Oct–Dec not recorded/.test(first.textContent));
  assert.equal($('kpis').querySelectorAll('.kpi').length, 4);
  assert(!/Months selected/.test(kpiText()));
  for (const id of visible()) assert(!/unavailable for this selection/i.test($('panel-' + id).textContent), id + ' is not an empty panel');
}
// R-02 · acceptance 4: 2024 full year: KPI, monthly chart and bridge agree on vs-2023 Jan–Sep
await window.actualDashboard.apply(cfg({ years: [2024], year: 2024, months: FY, periodMode: 'full' }));
assert(/▲ Up|▼ Down/.test(kpiText()), 'KPI has a vs-2023 change');
assert(/Jan–Sep only, Oct–Dec 2023 not recorded/.test([...document.querySelectorAll('#kpis .delta-chip')].map((x) => x.title).join(' ')), 'V74: the not-recorded note lives in the chip title, not repeated on the card');
assert(visible().includes('bridge'), 'bridge shown');
assert(/2023 → 2024 · Jan–Sep in both years/.test($('movement-context').textContent));
assert($('trend').querySelector('.ppg-label, .py-bar'), 'monthly chart compares with 2023');

// R-03 · acceptance 5: March only
await window.actualDashboard.apply(cfg({ periodMode: 'selected', months: [3] }));
assert(!/Full-year progress/.test(kpiText()));
await window.actualDashboard.apply(cfg());
assert(/Full-year progress/.test(kpiText()), 'YTD keeps full-year progress');

// R-20: forecast range band, why-sentence, products at risk (units, as in the plan's S1: 32.4M vs 38.6M, Sep–Dec 44%)
window.actualDashboard.setMeasure('units');
await window.actualDashboard.apply(cfg({ section: 'forecast' }));
assert($('forecast-chart').querySelector('.fc-range'), 'range band between the two scenario paths');
assert.equal($('forecast-chart').querySelectorAll('.fc-end-label').length, 2);
assert.match($('forecast-why').textContent, /19% apart\. Seasonality is higher because Sep–Dec were 44% of 2025 sales/);
{
  const rows = [...$('forecast-risk').querySelectorAll('tbody tr')];
  assert(rows.length > 0 && rows.length <= 10, 'top 10 at most');
  // V74 V-08: products that miss in every scenario that can be computed come first, YTD-average-only misses after; largest gap first within each.
  const rank = (r) => ({ both: 0, unknown: 0, avg: 1 })[r.querySelector('.risk-scenario').className.split(' ').pop()];
  assert.deepEqual(rows.map(rank), rows.map(rank).sort((x, y) => x - y), 'scenario order');
  const gaps = rows.filter((r) => rank(r) === 0).map((r) => -Number(r.children[5].textContent.replace(/[^0-9]/g, '')));
  assert.deepEqual(gaps, [...gaps].sort((x, y) => x - y), 'largest gap first within a scenario');
  assert.equal(rows[0].dataset.riskProduct, 'Methyltechno - TENDER');
  // V74 V-02: the one-off tender has no reliable seasonal projection (only 1% of its 2025 sales came by August).
  const tender = rows.find((r) => r.dataset.riskProduct === 'Methyltechno - TENDER');
  assert(tender && tender.children[3].textContent.trim() === '—' && /not reliable/.test(tender.children[3].title), 'tender seasonality withheld ' + rows.map((r) => r.dataset.riskProduct).join('|') + (tender ? tender.children[3].outerHTML : ''));
}
await window.actualDashboard.apply(cfg({ section: 'forecast', selection: { ...none, distributor: ['PHARMA'] } }));
assert($('forecast-risk-wrap').hidden);
assert(/Products at risk of missing the FY target/.test($('forecast-not-shown').textContent));
window.actualDashboard.setMeasure('value');
await window.actualDashboard.apply(cfg());

// R-21: phones get one Mix card with a Distributor / Sales type / Line switch; desktop keeps three panels.
{
  const w = window.innerWidth;
  window.innerWidth = 390;
  await window.actualDashboard.apply(cfg());
  const mixes = () => visible().filter((id) => id.startsWith('mix'));
  assert.deepEqual(mixes(), ['mixDistributor']);
  assert.equal(document.querySelectorAll('.mix-switch').length, 1);
  assert.deepEqual([...document.querySelectorAll('[data-mix-switch]')].map((b) => b.textContent), ['Distributor', 'Sales type', 'Line']);
  assert.equal($('panel-mixDistributor').querySelector('h2').textContent, 'Mix');
  assert.equal($('attention-list').querySelectorAll('.attention-item').length, 2, 'attention top 2 on phones');
  document.querySelector('[data-mix-switch="mixLine"]').click();
  assert.deepEqual(mixes(), ['mixLine']);
  window.innerWidth = w;
  await window.actualDashboard.apply(cfg());
  assert.deepEqual(mixes(), ['mixDistributor', 'mixChannel', 'mixLine']);
  assert(!document.querySelector('.mix-switch'));
}

// R-22: 8 months on a phone-width chart keep all 8 month labels (11 px); more than 9 months may skip.
{
  const rows = (k) => Array.from({ length: k }, (_, i) => ({ month: i + 1, actual: 100 + i, previous: 90, ppg: 11.1, target: 100 }));
  const names = (html) => (html.match(/y="250"[^>]*>[A-Z][a-z]{2}</g) || []).length;
  const eight = window.actualDashboard.monthlyChartHTML(rows(8), 'units', 330, { compare: 'py' });
  assert.equal(names(eight), 8);
  assert(/class="bar-pct ppg-label"[^>]*font-size="11"/.test(eight));
  assert(names(window.actualDashboard.monthlyChartHTML(rows(12), 'units', 330, { compare: 'py' })) < 12);
}

// R-23 + R-02: 2023 Products show the display name with the source name underneath, and a Jan–Sep sales subtotal.
await window.actualDashboard.apply(cfg({ years: [2023], year: 2023, months: FY, periodMode: 'full', section: 'portfolio' }));
{
  const head = document.querySelector('#view-portfolio thead').textContent;
  assert.match(head, /Sales Jan–Sep/);
  // V74 V-14: price versions are one product row with an expandable list of the source names.
  const toggle = document.querySelector('#view-portfolio tbody .pt-versions');
  assert(toggle, 'a product with price versions shows one row with a price-versions toggle');
  assert.match(toggle.textContent, /\d+ price versions/);
  toggle.click();
  const sub = [...document.querySelectorAll('#view-portfolio tbody .version-name button')];
  assert(sub.length >= 2 && sub.every((b) => b.dataset.selectProduct), 'expanding lists each source name');
}
await window.actualDashboard.apply(cfg());

window.actualDashboard.setMeasure('units');
console.log('sales-v72 UI checks passed');
