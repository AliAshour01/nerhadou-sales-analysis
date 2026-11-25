// V69 U-01: the selection context drives every adaptive rule. Baseline seed, no DOM.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { effectiveRecords } from '../public/data-core.js';
import { resolveViewContext, translateProducts, yearSpan } from '../public/view-context.js';

const seed = JSON.parse(fs.readFileSync('private/seed.json', 'utf8')),
  records = effectiveRecords(seed, {}),
  none = { product: [], line: [], distributor: [], channel: [] },
  ytd = (n) => Array.from({ length: n }, (_, i) => i + 1),
  ctx = (over) => resolveViewContext(records, { years: [2026], months: ytd(8), selection: none, measure: 'units', commonMonths: true, ...over });

// A1 2026 YTD Aug, all products
let c = ctx({});
assert.equal(c.yearMode, 'single'); assert.equal(c.focusYear, 2026); assert.equal(c.compareYear, 2025);
assert.equal(c.growthOk, true); assert.equal(c.isOpenYear, true); assert.equal(c.productMode, 'all');
assert.equal(c.hasTargets, true); assert.equal(c.monthCount, 8);
assert.equal(c.dims.distributor.categories, 4); assert.equal(c.dims.distributor.comparable, false, '2025 has no distributor');
assert.equal(c.dims.channel.categories, 3); assert(c.dims.line.categories >= 2);
assert(Object.isFrozen(c));
// A2 one product
c = ctx({ selection: { ...none, product: ['ONDALENZ 8MG'] } });
assert.equal(c.productMode, 'one'); assert.equal(c.product, 'ONDALENZ 8MG'); assert.equal(c.productCount, 1); assert.equal(c.hasTargets, true);
// A3 many products
c = ctx({ selection: { ...none, product: ['ONDALENZ 8MG', 'CALCITRON', 'FERROTRON'] } });
assert.equal(c.productMode, 'many');
// A4 distributor PHARMA: no targets, one distributor category
c = ctx({ selection: { ...none, distributor: ['PHARMA'] } });
assert.equal(c.hasTargets, false); assert.match(c.targetReason, /not allocated/); assert.equal(c.dims.distributor.categories, 1); assert.equal(c.dims.distributor.single, 'PHARMA');
// A5 one month
c = ctx({ months: [8], periodMode: 'selected' });
assert.equal(c.monthCount, 1);
// A6 2025 full year: growth vs 2024 allowed, no targets, line not comparable with 2024
c = ctx({ years: [2025], months: ytd(12) });
assert.equal(c.compareYear, 2024); assert.equal(c.growthOk, true); assert.equal(c.hasTargets, false); assert.equal(c.isOpenYear, false);
assert.equal(c.dims.line.comparable, false); assert(c.dims.line.categories >= 2); assert.equal(c.dims.distributor.categories, 0);
// A7 2023 comparables: growth allowed, closed year, unknown unit months detected from data
c = ctx({ years: [2023], months: ytd(9) });
assert.equal(c.growthOk, true); assert.equal(c.growthReason, null); assert.deepEqual(c.provisionalYears, [2023]);
assert.equal(c.isOpenYear, false); assert.equal(c.hasTargets, false); assert.equal(c.dims.distributor.categories, 0);
// A8 2021–2026: multi-year, compare 2025 → 2026 allowed, distributor not recorded before 2026
c = ctx({ years: [2021, 2022, 2023, 2024, 2025, 2026] });
assert.equal(c.yearMode, 'multi'); assert.equal(c.focusYear, 2026); assert.equal(c.compareYear, 2025); assert.equal(c.growthOk, true);
assert.equal(c.hasTargets, false); assert.deepEqual(c.dims.distributor.notRecorded, [2021, 2022, 2023, 2024, 2025]);
assert.equal(yearSpan(c.years), '2021–2026');
// A9 multi-year one product uses comparison names
c = ctx({ years: [2021, 2022, 2023, 2024, 2025, 2026], selection: { ...none, product: ['ONDALENZ 8MG'] } });
assert.equal(c.productMode, 'one'); assert.equal(c.productCount, 1);
// A10 2025+2026 with a line filter: previous selected year is the comparison
c = ctx({ years: [2025, 2026], selection: { ...none, line: ['Gyn line'] } });
assert.equal(c.growthBasis, 'selected'); assert.equal(c.compareYear, 2025);
// A11 2022+2023 full year: the pair uses the same months with available data
c = ctx({ years: [2022, 2023], months: ytd(12) });
assert.equal(c.compareYear, 2022); assert.equal(c.growthOk, true); assert.deepEqual(c.droppedMonths, [10, 11, 12]);
// U-15 product identity: a source name maps to its comparison key and back
const multi = translateProducts(records, ['ONDALENZ 8MG'], 'multi');
assert(multi.length >= 1);
assert.deepEqual(translateProducts(records, multi, 'single', 2026).includes('ONDALENZ 8MG'), true);
// Growth comparison "Previous selected year" in single-year mode has nothing to compare with
c = ctx({ growthBasis: 'selected' });
assert.equal(c.compareYear, null); assert.equal(c.growthOk, false);
console.log('view-context: all states pass');
