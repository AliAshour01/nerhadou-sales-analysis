// V69 U-01: one selection context for the whole Sales page. Pure module (no DOM).
// Every renderer reads this frozen object instead of re-deriving year / product / target / dimension conditions.
import { comparableSummary, commonAvailableMonths, growthAllowed, scopeRecords, targetSum, productName, productKey, PROVISIONAL_YEARS, dimensionGap } from './management-core.js?v=sales-review-v78';
import { comparisonProduct } from './compare-core.js?v=sales-review-v78';

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
// V72 R-05 / R-23: one display name per product across views. A reviewed comparison name (multi-year key, often
// upper case) shows as its source name in the latest year it sold, when that year has exactly one such source name.
// Historical single-year views (before the latest year) show that same name for each source pack / price version
// (the source name stays in tooltips). Display only: selections, filters and records keep their own names.
export function tidyName(name) {
  return String(name ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .replace(/(\d(?:\.\d+)?)\s+(MG|MCG|G)\b/g, '$1$2')
    .replace(/\s*[-–—]?\s*\(?\bTENDER\b\)?$/, ' - TENDER');
}
// Names that differ only by case, spacing or "1.5 MG" vs "1.5MG" are the same name (no source-name subline needed).
export const sameName = (a, b) => tidyName(a) === tidyName(b);
const displayCache = new WeakMap();
export function productDisplayNames(records) {
  let out = displayCache.get(records);
  if (out) return out;
  const latest = new Map();
  for (const r of records) {
    if (r.dataset !== 'actual' || !(r.month > 0)) continue;
    const key = comparisonProduct(r),
      src = r.source_product ?? r.product,
      cur = latest.get(key);
    if (!cur || r.year > cur.year) latest.set(key, { year: r.year, names: new Set([src]) });
    else if (r.year === cur.year) cur.names.add(src);
  }
  // V76 W-10: one style for every display name (upper case, single spaces, strength without a space, " - TENDER").
  const multi = new Map([...latest].map(([key, v]) => [key, v.names.size === 1 ? tidyName([...v.names][0]) : key]));
  const byYear = new Map();
  for (const r of records) {
    if (r.dataset !== 'actual' || !(r.month > 0)) continue;
    let y = byYear.get(r.year);
    if (!y) byYear.set(r.year, (y = new Map()));
    const key = comparisonProduct(r);
    if (!y.has(key)) y.set(key, new Set());
    y.get(key).add(r.source_product ?? r.product);
  }
  const single = new Map();
  for (const [year, keys] of byYear) for (const [key, names] of keys) for (const name of names) single.set(year + '|' + name, multi.get(key) ?? key);
  out = { multi: (name) => multi.get(name) ?? name, single: (year, name) => single.get(year + '|' + name) ?? name };
  displayCache.set(records, out);
  return out;
}
export function actualYears(records) {
  return [...new Set(records.filter((r) => r.dataset === 'actual' && r.month > 0).map((r) => r.year))].sort((a, b) => a - b);
}
export function yearMonths(records, year) {
  return [...new Set(records.filter((r) => r.dataset === 'actual' && r.year === year && r.month > 0).map((r) => r.month))].sort((a, b) => a - b);
}
// "Jan–Sep", "Jan–Mar, May".
export function monthSpan(list, names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']) {
  const sorted = [...new Set(list)].sort((a, b) => a - b),
    out = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    out.push(j > i ? names[sorted[i] - 1] + '–' + names[sorted[j] - 1] : names[sorted[i] - 1]);
    i = j + 1;
  }
  return out.join(', ');
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
  // V72 R-02: one month rule for every comparison. The focus year's recorded months inside the selection are the
  // analysis months (2023 Full year = Jan–Sep); comparisons use the months both years record, on both sides.
  const MS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    span = (list) => monthSpan(list, MS);
  const recordedMonths = yearMode === 'single' ? months.filter((m) => focusMonths.includes(m)) : months,
    missingMonths = months.filter((m) => !recordedMonths.includes(m)),
    dataMonths = recordedMonths.length ? recordedMonths : months,
    compareYearMonths = compareYear == null ? [] : yearMonths(rawRecords, compareYear),
    compareMonths = yearMode === 'single' && compareYear != null ? dataMonths.filter((m) => compareYearMonths.includes(m)) : months,
    comparePartial = yearMode === 'single' && compareMonths.length > 0 && compareMonths.length < months.length,
    compareMissing = comparePartial ? months.filter((m) => !compareMonths.includes(m)) : [],
    compareNote = comparePartial ? `${span(compareMonths)} only, ${span(compareMissing)} ${compareMissing.every((m) => !compareYearMonths.includes(m)) ? compareYear : focusYear} not recorded` : null,
    missingNote = missingMonths.length && recordedMonths.length ? `${span(missingMonths)} not recorded` : null;
  // V72 R-01: a distributor / line / sales-type filter cannot be compared with a year that does not record that dimension.
  const compareGap = compareYear != null && compareMonths.length ? dimensionGap(records, compareYear, compareMonths, selection) : null,
    filterCompareGap = compareGap ? { ...compareGap, year: compareYear, short: `${compareYear} has no ${compareGap.word} data`, sentence: `${compareYear} does not record ${compareGap.word}, so the change for ${selection[compareGap.key].length === 1 ? selection[compareGap.key][0] : 'the selected ' + compareGap.word + 's'} can’t be measured.` } : null;
  const provisionalYears = years.filter((y) => PROVISIONAL_YEARS.has(y)),
    hasData = focusRows.length > 0;
  const names = productDisplayNames(rawRecords),
    displayName = yearMode === 'multi' ? names.multi : (name) => names.single(focusYear, name);
  const ctx = {
    displayName,
    years,
    allYears,
    yearMode,
    focusYear,
    latestYear,
    compareYear,
    growthBasis: basis,
    growthOk: allowed.ok,
    growthReason: allowed.ok ? null : allowed.reason,
    filterCompareGap,
    requestedMonths: requested,
    months,
    droppedMonths,
    monthCount: months.length,
    recordedMonths,
    missingMonths,
    missingNote,
    dataMonths,
    compareMonths,
    comparePartial,
    compareNote,
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
