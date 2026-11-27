// V80: plain % in "What drove the change" (no "pts"), price vs volume split (idea 1) and price-increase tracker (idea 2).
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { dashboardRecords } from '../public/compare-core.js';
import { effectiveRecords } from '../public/data-core.js';
import { movement } from '../public/management-core.js';
import { comparisonRecords } from '../public/view-context.js';
import { priceVolumeSplit, PV_PARTS, pvLabel, priceSteps, priceIncreases, unitsAfter, priceSeries } from '../public/price-core.js';

const seed = JSON.parse(fs.readFileSync(new URL('../private/seed.json', import.meta.url), 'utf8'));
const recs = comparisonRecords(dashboardRecords(effectiveRecords(seed, {})));
const months = [1, 2, 3, 4, 5, 6, 7, 8];
const near = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

// ── A: no "pts" anywhere the user reads; % = share of the prior-year total ──
const mgmt = fs.readFileSync('public/management.js', 'utf8');
assert(!/ pts['`]/.test(mgmt) && !/\bpts vs\b|pts behind|pts ahead|Pts =/.test(mgmt), 'no pts wording left');
assert(mgmt.includes('% = share of the ${a} total'), 'plain % line under the bridge title');

// ── Idea 1: price vs volume, Jan–Aug 2026 vs 2025, total company ──
const v = movement(recs, { a: 2025, b: 2026, months, metric: 'value' }), u = movement(recs, { a: 2025, b: 2026, months, metric: 'units' });
const pv = priceVolumeSplit(v, u);
// The bars add up exactly to the total change, and each split product's two effects add up to its own change.
near(PV_PARTS.reduce((n, k) => n + pv.sums[k], 0), v.delta, 1e-6, 'parts sum to the total');
for (const r of pv.products.filter((r) => r.part === 'split')) {
  near(r.volume + r.price, r.delta, 1e-6, r.name + ' volume + price');
  near(r.volume, (r.unitsNow - r.unitsBefore) * r.priceBefore, 1e-6, r.name + ' volume effect');
  near(r.price, (r.priceNow - r.priceBefore) * r.unitsNow, 1e-3, r.name + ' price effect');
}
near(pv.sums.volume / 1e6, 327.0, 0.1, 'volume EGP M');
near(pv.sums.price / 1e6, 43.2, 0.1, 'price EGP M');
near(pv.sums.new / 1e6, 88.2, 0.1, 'new products EGP M');
near(pv.sums.tender / 1e6, 118.1, 0.1, 'tender EGP M');
// Tender is its own bar, never a price effect (Methyltechno's tender price is a contract price).
assert(pv.products.every((r) => (/tender/i.test(r.name) ? r.part === 'tender' : r.part !== 'tender')));
const by = Object.fromEntries(pv.products.map((r) => [r.name, r]));
assert.equal(by['FERROTRON FORT'].part, 'new', 'Ferrotron Forte is a separate new product');
near(by.CALCITRON.price / 1e6, 28.4, 0.1, 'Calcitron price effect');
assert(by.FERROTRON.volume < 0 && by.FERROTRON.price > 0, 'Ferrotron: fewer units, higher price');
assert.equal(pvLabel('volume', -1), 'Selling fewer units');
assert.equal(pvLabel('price', 1), 'Higher prices');
// Unknown units on one side cannot be split: it goes to Other, the total still reconciles.
const fake = priceVolumeSplit({ a: 1, b: 2, delta: 30, previous: { value: 100 }, current: { value: 130 }, items: [{ name: 'X', previous: 100, current: 120, delta: 20 }, { name: 'Gap', delta: 10, residual: true }] }, { items: [{ name: 'X', previous: null, current: 5 }] });
assert.equal(fake.sums.other, 30);

// ── Idea 2: price increases ──
const series = (prices) => prices.map((p, i) => ({ t: 24300 + i, year: 2025 + Math.floor(i / 12), month: (i % 12) + 1, units: 10, value: p * 10, price: p }));
assert.equal(priceSteps(series([100, 100, 100, 100, 120, 100, 100])).length, 0, 'one high month (bulk order) is ignored');
assert.equal(priceSteps(series([100, 100, 100, 100, 100, 112])).length, 0, 'the latest month alone is not yet an increase');
const st = priceSteps(series([100, 100, 100, 100, 110, 112, 112, 112]));
assert.equal(st.length, 1);
assert.equal(st[0].month, 5);
near(st[0].after, 112, 1e-9, 'settled price');
assert.equal(priceSteps(series([100, 100, 100, 104, 104, 104])).length, 0, 'below 5% is not an increase');

const rises = priceIncreases(recs, { year: 2026, through: { year: 2026, month: 8 } });
assert.deepEqual(rises.map((r) => `${r.product} ${r.month}`), ['CALCITRON 3', 'FERROTRON 3', 'VITATRON 6']);
near(rises[0].before, 85.3, 0.05, 'Calcitron before');
near(rises[0].after, 103.0, 0.05, 'Calcitron after');
near(rises[1].units.vsLastYear, -34.2, 0.05, 'Ferrotron units since vs last year');
near(rises[2].units.vsLastYear, -28.8, 0.05, 'Vitatron units since vs last year');
assert.equal(rises[2].units.months, 3);
// Tender sales never count; years before 2025 have estimated values, so no tracker.
assert(priceSeries(recs, { through: { year: 2026, month: 8 } }).every((s) => !/tender/i.test(s.product)));
assert.deepEqual(priceIncreases(recs, { year: 2024, through: { year: 2024, month: 12 } }), []);
// Filters: a product filter shows only that product.
const gyn = priceIncreases(recs, { year: 2026, through: { year: 2026, month: 8 }, filters: { product: ['VITATRON'] } });
assert.deepEqual(gyn.map((r) => r.product), ['VITATRON']);
// Through May: Vitatron's June increase is not there yet; Calcitron counts Mar–May only.
const may = priceIncreases(recs, { year: 2026, through: { year: 2026, month: 5 } });
assert.deepEqual(may.map((r) => r.product), ['CALCITRON', 'FERROTRON']);
assert.equal(may[0].units.months, 3);
assert(unitsAfter(priceSeries(recs, { through: { year: 2026, month: 8 }, filters: { product: ['CALCITRON'] } })[0], rises[0], { year: 2026, month: 8 }).perMonthBefore > 0);
console.log('sales-v80 ok');
