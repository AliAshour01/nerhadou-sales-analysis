// V80: price vs volume split and price-increase tracker (pure helpers, no DOM).
// Both work on comparison-product records (packs of one product are one product; tender is always its own product).
import { scopeRecords, isTenderRecord } from './management-core.js?v=sales-review-v81';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
export const isTenderName = (name) => /\btender\b/i.test(String(name ?? ''));
// Value before 2025 is units × an average price, so a price analysis is only exact from 2025 on.
export const PRICE_FIRST_YEAR = 2025;

// ── Idea 1: price vs volume ──
// Inputs are two movement() results for the same years, months and filters, by product: one in EGP value, one in units.
// For a product sold in both periods (units > 0 both times), with price = value ÷ units:
//   volume effect = (units now − units before) × price before
//   price effect  = (price now − price before) × units now
// which add up exactly to its value change. Products with no sales before are "New products", with none now "No longer
// sold", tender products are their own bar (a tender's contract price is not a list-price change), and anything that
// cannot be split (returns larger than sales, units unknown, unmatched detail) is "Other". The bars sum to the total.
export const PV_PARTS = ['volume', 'price', 'new', 'stopped', 'tender', 'other'];
export function priceVolumeSplit(valueMove, unitMove) {
  if (!valueMove || valueMove.delta == null) return { delta: null, reason: valueMove?.reason || 'Comparable periods unavailable.' };
  const units = new Map((unitMove?.items || []).filter((r) => !r.residual).map((r) => [r.name, r]));
  const sums = Object.fromEntries(PV_PARTS.map((k) => [k, 0]));
  const products = [];
  for (const v of valueMove.items || []) {
    if (v.residual) {
      sums.other += v.delta;
      continue;
    }
    const u = units.get(v.name),
      row = { name: v.name, valueBefore: v.previous, valueNow: v.current, unitsBefore: u?.previous ?? null, unitsNow: u?.current ?? null, delta: v.delta, volume: 0, price: 0, part: 'other' };
    const known = u && finite(u.previous) && finite(u.current) && finite(v.previous) && finite(v.current);
    if (isTenderName(v.name)) row.part = 'tender';
    else if (known && v.previous === 0 && u.previous === 0) row.part = 'new';
    else if (known && v.current === 0 && u.current === 0) row.part = 'stopped';
    else if (known && u.previous > 0 && u.current > 0) {
      row.part = 'split';
      row.priceBefore = v.previous / u.previous;
      row.priceNow = v.current / u.current;
      row.volume = (u.current - u.previous) * row.priceBefore;
      row.price = v.delta - row.volume;
    }
    if (row.part === 'split') {
      sums.volume += row.volume;
      sums.price += row.price;
    } else sums[row.part] += v.delta;
    products.push(row);
  }
  // Exact reconciliation: whatever floating-point drift is left goes to the largest part, so the bars add up to the total.
  const drift = valueMove.delta - PV_PARTS.reduce((n, k) => n + sums[k], 0);
  if (drift) {
    const big = PV_PARTS.reduce((a, k) => (Math.abs(sums[k]) > Math.abs(sums[a]) ? k : a), 'volume');
    sums[big] += drift;
  }
  return { a: valueMove.a, b: valueMove.b, previous: valueMove.previous, current: valueMove.current, delta: valueMove.delta, sums, products };
}
// Plain-language bar names (the sign decides the word).
export function pvLabel(part, delta) {
  if (part === 'volume') return delta < 0 ? 'Selling fewer units' : 'Selling more units';
  if (part === 'price') return delta < 0 ? 'Lower prices' : 'Higher prices';
  return { new: 'New products', stopped: 'Products not sold this period', tender: 'Tender orders', other: 'Other (returns, missing detail)' }[part];
}

// ── Idea 2: price-increase tracker ──
// Monthly price per comparison product = value ÷ units, regular (non-tender) sales only, months with units > 0 only.
// A price increase is a month whose price is 5% or more above the median of the previous 3 months with sales, and the
// next month with sales is also 5% or more above that same level (one high month alone is a bulk order or a correction).
const RISE = 0.05;
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b),
    m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
// records: comparison records (product = comparison name); filters: the page selection already in comparison names.
// Returns one entry per product with its monthly series and every increase found from `fromYear` through `through`
// ({year, month}).
export function priceSeries(records, { fromYear = PRICE_FIRST_YEAR, through, filters = {} }) {
  const end = through.year * 12 + through.month,
    start = Math.max(fromYear, PRICE_FIRST_YEAR) * 12 + 1,
    by = new Map();
  for (const r of scopeRecords(records, filters)) {
    if (r.dataset !== 'actual' || !(r.month > 0) || isTenderRecord(r) || isTenderName(r.product)) continue;
    const t = r.year * 12 + r.month;
    if (t < start || t > end || !finite(r.units) || !finite(r.value)) continue;
    const m = by.get(r.product) || new Map();
    by.set(r.product, m);
    const s = m.get(t) || { t, year: r.year, month: r.month, units: 0, value: 0 };
    s.units += r.units;
    s.value += r.value;
    m.set(t, s);
  }
  const out = [];
  for (const [product, m] of by) {
    const months = [...m.values()].sort((a, b) => a.t - b.t);
    for (const s of months) s.price = s.units > 0 && s.value > 0 ? s.value / s.units : null;
    out.push({ product, months, steps: priceSteps(months) });
  }
  return out.sort((a, b) => a.product.localeCompare(b.product));
}
export function priceSteps(months) {
  const priced = months.filter((s) => s.price != null),
    steps = [],
    level = (i) => median(priced.slice(i - 3, i).map((s) => s.price)),
    isStep = (i) => i >= 3 && i < priced.length - 1 && priced[i].price >= level(i) * (1 + RISE) && priced[i + 1].price >= level(i) * (1 + RISE);
  for (let i = 3; i < priced.length - 1; i++) {
    if (!isStep(i)) continue;
    // The price it settled at: the latest month before the next increase (searched from 3 months on, so the months
    // just after this increase are not counted as a second one).
    let next = i + 3;
    while (next < priced.length && !isStep(next)) next++;
    const settled = priced[Math.min(next, priced.length) - 1],
      before = level(i);
    steps.push({ t: priced[i].t, year: priced[i].year, month: priced[i].month, before, after: settled.price, afterMonth: { year: settled.year, month: settled.month }, change: (settled.price / before - 1) * 100 });
    i = next - 1;
  }
  return steps;
}
export const monthName = (year, month) => `${MONTHS[month - 1]} ${year}`;
// Units since an increase vs the same months a year earlier (the same months, so seasonality and bulk timing cancel
// out as far as possible), plus the monthly average in the 3 months before and the months after.
export function unitsAfter(series, step, through) {
  const end = through.year * 12 + through.month,
    by = new Map(series.months.map((s) => [s.t, s.units])),
    sum = (from, to) => {
      let n = 0,
        known = 0;
      for (let t = from; t <= to; t++)
        if (by.has(t)) {
          n += by.get(t);
          known++;
        }
      return { n, known };
    };
  const since = sum(step.t, end),
    lastYear = sum(step.t - 12, end - 12),
    count = end - step.t + 1,
    before = sum(step.t - 3, step.t - 1);
  return {
    months: count,
    since: since.n,
    lastYear: lastYear.known ? lastYear.n : null,
    vsLastYear: lastYear.known && lastYear.n > 0 ? (since.n / lastYear.n - 1) * 100 : null,
    perMonthBefore: before.n / 3,
    perMonthAfter: since.n / count,
  };
}
// The table rows: one per increase whose month is in `year` (up to `through`).
export function priceIncreases(records, { year, through, filters = {} }) {
  if (year < PRICE_FIRST_YEAR) return [];
  const rows = [];
  for (const s of priceSeries(records, { fromYear: year - 1, through, filters }))
    for (const step of s.steps) if (step.year === year) rows.push({ product: s.product, ...step, units: unitsAfter(s, step, through) });
  return rows.sort((a, b) => a.t - b.t || b.change - a.change);
}
