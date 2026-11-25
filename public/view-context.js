// V69 U-01: one selection context for the whole Sales page. Pure module (no DOM).
// Every renderer reads this frozen object instead of re-deriving year / product / target / dimension conditions.
import { comparableSummary, commonAvailableMonths, growthAllowed, scopeRecords, targetSum, productName, productKey, PROVISIONAL_YEARS } from './management-core.js?v=sales-ux-v68';
import { comparisonProduct } from './compare-core.js?v=sales-ux-v68';

export const DIMENSIONS = ['distributor', 'channel', 'line'];
const UNKNOWN = new Set(['NOT PROVIDED', 'NOT RECORDED', '']);
export const knownCategory = (name) => !UNKNOWN.has(String(name ?? '').trim().toUpperCase());
const DIM_WORD = { distributor: 'Distributor', channel: 'Sales type', line: 'Line' };
const finite = Number.isFinite;

// Multi-year mode identifies products by their reviewed comparison name (packs and names differ by year).
const mappedCache = new WeakMap();
export function comparisonRecords(records) {
  let mapped = mappedCache.get(records);
  if (!mapped) {
    mapped = records.map((r) => (r.dataset === 'actual' || r.dataset === 'target' ? { ...r, source_product: r.product, product: comparisonProduct(r) } : r));
    mappedCache.set(records, mapped);
  }
  return mapped;
}
export function actualYears(records) {
  return [...new Set(records.filter((r) => r.dataset === 'actual' && r.month > 0).map((r) => r.year))].sort((a, b) => a - b);
}
export function yearMonths(records, year) {
  return [...new Set(records.filter((r) => r.dataset === 'actual' && r.year === year && r.month > 0).map((r) => r.month))].sort((a, b) => a - b);
}
export function yearSpan(years) {
  const list = [...years].sort((a, b) => a - b);
  if (!list.length) return '';
  const contiguous = list.every((y, i) => !i || y === list[i - 1] + 1);
  return list.length === 1 ? String(list[0]) : contiguous ? list[0] + '–' + list.at(-1) : list.join(', ');
}
// Translate a product selection between single-year source names and multi-year comparison names.
export function translateProducts(records, names, toMode, year) {
  if (!names?.length) return [];
  const actual = records.filter((r) => r.dataset === 'actual' && r.month > 0);
  if (toMode === 'multi') {
    const keys = new Set(names.map(productKey));
    return [...new Set(actual.filter((r) => keys.has(productKey(r.product))).map(comparisonProduct))].sort();
  }
  const wanted = new Set(names);
  return [...new Set(actual.filter((r) => r.year === year && wanted.has(comparisonProduct(r))).map(productName))].sort();
}

export function resolveViewContext(rawRecords, state) {
  const allYears = actualYears(rawRecords),
    years = [...new Set(state.years || [])].filter((y) => allYears.includes(y)).sort((a, b) => a - b);
  if (!years.length && allYears.length) years.push(allYears.at(-1));
  const yearMode = years.length > 1 ? 'multi' : 'single',
    records = yearMode === 'multi' ? comparisonRecords(rawRecords) : rawRecords,
    focusYear = years.includes(state.focusYear) ? state.focusYear : years.at(-1),
    latestYear = allYears.at(-1),
    measure = state.measure === 'value' ? 'value' : 'units',
    other = measure === 'value' ? 'units' : 'value',
    selection = Object.fromEntries(['product', ...DIMENSIONS].map((k) => [k, [...(state.selection?.[k] || [])]]));
  // Growth comparison: Auto = previous selected year when exactly two years are chosen, else the previous calendar year.
  const basis = state.growthBasis === 'selected' || state.growthBasis === 'calendar' ? state.growthBasis : yearMode === 'multi' && years.length === 2 ? 'selected' : 'calendar',
    before = years.filter((y) => y < focusYear);
  let compareYear = basis === 'selected' ? before.at(-1) ?? null : allYears.includes(focusYear - 1) ? focusYear - 1 : null;
  const allowed = compareYear == null ? { ok: false, reason: basis === 'selected' ? 'No earlier selected year to compare with.' : `No ${focusYear - 1} sales data to compare with.` } : growthAllowed(compareYear, focusYear);
  const focusMonths = yearMonths(rawRecords, focusYear),
    isOpenYear = focusYear === latestYear && focusMonths.length > 0 && focusMonths.length < 12;
  let requested = [...new Set(state.months || [])].filter((m) => Number.isInteger(m) && m >= 1 && m <= 12).sort((a, b) => a - b);
  let months = requested,
    droppedMonths = [];
  if (yearMode === 'multi' && state.commonMonths !== false && requested.length) {
    months = commonAvailableMonths(records, years, requested, measure, selection);
    droppedMonths = requested.filter((m) => !months.includes(m));
  }
  const focusRows = scopeRecords(records, selection).filter((r) => r.dataset === 'actual' && r.year === focusYear && months.includes(r.month));
  const products = [...new Set(focusRows.map((r) => r.product))].sort(),
    pickedProducts = selection.product.length,
    productMode = !pickedProducts ? 'all' : pickedProducts === 1 ? 'one' : 'many',
    nonProduct = { ...selection, product: [] },
    universe = [...new Set(scopeRecords(records, nonProduct).filter((r) => r.dataset === 'actual' && r.year === focusYear && months.includes(r.month)).map((r) => r.product))];
  // Targets are product-level: never allocated to distributor / sales-type subsets (AGENTS.md rule 4).
  const dimensionFilter = ['distributor', 'channel'].find((k) => selection[k].length);
  let hasTargets = false,
    targetReason = null;
  if (yearMode === 'multi') targetReason = 'Targets apply to a single year.';
  else if (dimensionFilter) targetReason = 'Targets are product-level and are not allocated to distributor or sales-type filters.';
  else if (!products.length || !months.length) targetReason = 'No products in this selection.';
  else {
    const t = targetSum(records, { year: focusYear }, products, months, measure, selection, false);
    hasTargets = t != null && t > 0;
    targetReason = hasTargets ? null : t === 0 ? 'Zero target for this selection.' : rawRecords.some((r) => r.dataset === 'target' && r.year === focusYear) ? (selection.line.length ? 'Target is shared with another line and isn’t split.' : `No complete ${measure === 'value' ? 'value' : 'unit'} target for every selected product.`) : `No targets recorded for ${focusYear}.`;
  }
  // Dimensions: count only categories with known values; NOT PROVIDED is a data gap, never a category.
  const dims = {};
  const compareRows = compareYear == null ? [] : scopeRecords(records, selection).filter((r) => r.dataset === 'actual' && r.year === compareYear && months.includes(r.month));
  for (const key of DIMENSIONS) {
    const totals = new Map();
    let all = 0;
    for (const r of focusRows) {
      const v = r[measure];
      if (!finite(v)) continue;
      all += Math.abs(v);
      if (knownCategory(r[key])) totals.set(r[key], (totals.get(r[key]) || 0) + Math.abs(v));
    }
    const known = [...totals.values()].reduce((a, b) => a + b, 0),
      categories = [...totals.keys()].filter((k) => totals.get(k) !== 0).length,
      compareKnown = new Set(compareRows.filter((r) => knownCategory(r[key])).map((r) => r[key]));
    const notRecorded = years.filter((y) => !rawRecords.some((r) => r.dataset === 'actual' && r.year === y && r.month > 0 && knownCategory(r[key])));
    dims[key] = { categories, knownShare: all > 0 ? known / all : 0, comparable: categories >= 1 && compareKnown.size >= 1, single: categories === 1 ? [...totals.keys()][0] : null, notRecorded };
  }
  const unknownMonths = { units: [], value: [] };
  if (yearMode === 'single')
    for (const metric of ['units', 'value'])
      for (const m of months) if (comparableSummary(records, focusYear, [m], metric, selection).value == null) unknownMonths[metric].push(m);
  const provisionalYears = years.filter((y) => PROVISIONAL_YEARS.has(y)),
    hasData = focusRows.length > 0;
  const ctx = {
    years,
    allYears,
    yearMode,
    focusYear,
    latestYear,
    compareYear,
    growthBasis: basis,
    growthOk: allowed.ok,
    growthReason: allowed.ok ? null : allowed.reason,
    requestedMonths: requested,
    months,
    droppedMonths,
    monthCount: months.length,
    focusMonths,
    isOpenYear,
    productMode,
    product: productMode === 'one' ? selection.product[0] : null,
    products,
    productCount: products.length,
    universeCount: universe.length,
    hasTargets,
    targetReason,
    dims,
    unknownMonths,
    provisionalYears,
    measure,
    other,
    selection,
    companyScope: !Object.values(selection).some((v) => v.length),
    hasData,
    periodMode: state.periodMode || 'ytd',
    records,
  };
  return Object.freeze(ctx);
}
export const dimensionWord = (key) => DIM_WORD[key];
