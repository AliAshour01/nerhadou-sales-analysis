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
assert(/Jan–Sep only, Oct–Dec 2023 not recorded/.test(kpiText()));
assert(visible().includes('bridge'), 'bridge shown');
assert(/2023 → 2024 · Jan–Sep only/.test($('movement-context').textContent));
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
  const gaps = rows.map((r) => -Number(r.children[4].textContent.replace(/[^0-9]/g, '')));
  assert.deepEqual(gaps, [...gaps].sort((a, b) => a - b), 'largest gap first');
  assert.equal(rows[0].dataset.riskProduct, 'Methyltechno - TENDER');
}
await window.actualDashboard.apply(cfg({ section: 'forecast', selection: { ...none, distributor: ['PHARMA'] } }));
assert($('forecast-risk-wrap').hidden);
assert(/Products at risk of missing the FY target/.test($('forecast-not-shown').textContent));
window.actualDashboard.setMeasure('value');
await window.actualDashboard.apply(cfg());

window.actualDashboard.setMeasure('units');
console.log('sales-v72 UI checks passed');
