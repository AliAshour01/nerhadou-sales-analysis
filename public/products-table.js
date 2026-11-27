// V69 U-09: the Products table (plan 4.8). Built from the view context so its pinned Total equals the KPIs
// in every state. Pure data (productsTableData) + HTML (productsTableHTML); management.js wires events.
import { comparableSummary, portfolioTarget, targetSum, scopeRecords, dimensionGap, tenderBase, productKey, shortAmount } from './management-core.js?v=sales-review-v78';
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ALL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
import { knownCategory, monthSpan, comparisonRecords, productDisplayNames, sameName } from './view-context.js?v=sales-review-v78';
import { comparisonProduct } from './compare-core.js?v=sales-review-v78';

// V74 V-14: the previous-year side of a single-year row is looked up by comparison name (price versions and renamed
// packs of one product are one product). A row that stands for only some of the price versions the focus year has
// under that comparison name cannot be compared (last year's total belongs to all of them): it stays unknown.
function previousLookup(ctx) {
  if (ctx.yearMode !== 'single' || ctx.compareYear == null) return null;
  const keyOf = new Map(),
    srcOf = new Map();
  for (const r of ctx.records) {
    if (r.dataset !== 'actual' || r.year !== ctx.focusYear || !ctx.months.includes(r.month)) continue;
    const key = comparisonProduct(r),
      name = productKey(r.product);
    keyOf.set(name, key);
    if (!srcOf.has(key)) srcOf.set(key, new Set());
    srcOf.get(key).add(name);
  }
  const recs = comparisonRecords(ctx.records);
  return (filters, total = false) => {
    if (!filters.product?.length) return { recs: ctx.records, filters };
    const wanted = new Set(filters.product.map(productKey)),
      keys = [...new Set([...wanted].map((p) => keyOf.get(p)).filter(Boolean))];
    if (!keys.length || keys.some((k) => [...srcOf.get(k)].some((sn) => !wanted.has(sn)))) return total ? { recs: ctx.records, filters } : { recs: ctx.records, filters, unknown: true };
    return { recs, filters: { ...filters, product: keys } };
  };
}

const finite = Number.isFinite;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = (v) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
export const TOP_ROWS = 15;
export const MAX_YEARS = 6;

// Sort options that apply to this selection (plan 4.8: "only options that apply").
export function sortOptions(ctx) {
  const opts = [['sales', 'Sales']];
  if (ctx.compareYear != null && ctx.growthOk && !ctx.filterCompareGap) opts.push(['growth', 'Growth'], ['increase', 'Largest increase'], ['decline', 'Largest decline']);
  if (ctx.yearMode === 'single' && ctx.hasTargets) opts.push(['shortfall', 'Target shortfall'], ['ach', 'Achievement']);
  opts.push(['name', 'Name']);
  return opts;
}

export function tableColumns(ctx, measures, period = '') {
  const cols = [],
    multi = ctx.yearMode === 'multi',
    years = ctx.years.slice(-MAX_YEARS);
  for (const m of measures) {
    const unit = m === 'value' ? 'value (EGP)' : 'units',
      add = (kind, short, label, extra = {}) => cols.push({ key: kind + ':' + m + (extra.year ? ':' + extra.year : ''), kind, metric: m, short, label, ...extra });
    if (!multi) {
      // V72 R-02: a year with unrecorded months shows its recorded subtotal (e.g. Sales Jan–Sep 2023), never a blank total.
      const rec = ctx.missingMonths?.length && ctx.dataMonths?.length ? monthSpan(ctx.dataMonths) : '';
      add('sales', rec ? 'Sales ' + rec : 'Sales', rec ? `Sales ${unit} · ${rec} ${ctx.focusYear} (${ctx.missingNote})` : `Sales ${unit} · ${period || ctx.focusYear}`);
      add('share', 'Share', `Share of company ${unit} (%)`);
      // V72 R-02: when the two years record different months, PY and PPG use the months both record (same as the KPIs).
      const part = ctx.comparePartial ? ' ' + monthSpan(ctx.compareMonths) : '';
      // V76 W-06: when the comparison covers fewer months than Sales, show the focus year over those months too.
      if (ctx.compareYear != null && ctx.comparePartial) add('cur', String(ctx.focusYear) + part, `Sales ${unit} · ${ctx.focusYear}${part} (same months as ${ctx.compareYear})`);
      if (ctx.compareYear != null) add('py', String(ctx.compareYear) + part, `Sales ${unit} · ${ctx.compareYear}${part}${ctx.comparePartial ? ' (' + ctx.compareNote + ')' : ''}`);
      if (ctx.compareYear != null && ctx.growthOk && !ctx.filterCompareGap) add('ppg', 'PPG' + part, `Growth vs ${ctx.compareYear}${part} (%)`);
      if (ctx.hasTargets) {
        add('target', 'Target', `Target ${unit}`);
        add('ach', 'Ach.', 'Achievement (%)');
        add('gap', 'Variance', `Variance (sales − target) · ${unit}`);
      }
    } else {
      for (const y of years) add('year', String(y), `Sales ${unit} · ${y}`, { year: y });
      if (ctx.compareYear != null && ctx.growthOk && !ctx.filterCompareGap) {
        add('change', 'Change', `Change ${ctx.compareYear} → ${ctx.focusYear} · ${unit}`);
        add('growth', 'Growth', `Growth ${ctx.compareYear} → ${ctx.focusYear} (%)`);
      }
      add('share', 'Share ' + ctx.focusYear, `Share of company ${unit} in ${ctx.focusYear} (%)`);
    }
  }
  return cols;
}

// V74 V-14: one entry per product. Multi-year records already carry comparison names; in a single year the source names
// (price versions, packs) that share a comparison name are grouped into one entry with `sources`.
function productUniverse(ctx) {
  const wanted = new Set(ctx.years),
    single = ctx.yearMode === 'single';
  const rows = scopeRecords(ctx.records, ctx.selection).filter((r) => r.dataset === 'actual' && wanted.has(r.year) && ctx.months.includes(r.month));
  const byKey = new Map();
  for (const r of rows) {
    if (single && r.year !== ctx.focusYear) continue;
    const key = single ? comparisonProduct(r) : r.product;
    let p = byKey.get(key);
    if (!p) byKey.set(key, (p = { sources: new Map(), lines: new Map() }));
    p.sources.set(productKey(r.product), (p.sources.get(productKey(r.product)) ?? r.product));
    if (knownCategory(r.line)) p.lines.set(r.line, (p.lines.get(r.line) || 0) + Math.abs(Number(r[ctx.measure]) || 0));
  }
  const display = single ? productDisplayNames(ctx.records) : null;
  return [...byKey.entries()].map(([key, p]) => {
    const sources = [...p.sources.values()].sort(),
      line = [...p.lines.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Not provided';
    return sources.length > 1 ? { product: display.multi(key), key, sources, line, versions: true } : { product: sources[0], key, sources, line };
  });
}

// One product (or the selection total) → cell values and "why unavailable" reasons.
function cells(ctx, cols, filters, { total = false, product = null, products = [], sources = null, annual = false, company, lookup = null }) {
  const prevSide = lookup ? lookup(filters, total) : null;
  const out = {},
    why = {},
    memo = new Map(),
    sum = (year, m) => {
      const k = year + m,
        side = prevSide && year === ctx.compareYear ? prevSide : { recs: ctx.records, filters };
      if (!memo.has(k)) memo.set(k, side.unknown ? { value: null, rows: [], reason: null } : comparableSummary(side.recs, year, ctx.dataMonths || ctx.months, m, side.filters));
      return memo.get(k);
    },
    partial = ctx.yearMode === 'single' && ctx.comparePartial,
    sumC = (year, m) => {
      if (!partial) return sum(year, m);
      const k = 'c' + year + m,
        side = prevSide && year === ctx.compareYear ? prevSide : { recs: ctx.records, filters };
      if (!memo.has(k)) memo.set(k, side.unknown ? { value: null, rows: [], reason: null } : comparableSummary(side.recs, year, ctx.compareMonths, m, side.filters));
      return memo.get(k);
    },
    // V72 R-01: a year that does not record the filtered dimension is unknown, not "not sold".
    gapFor = (year) => (s) => (!s.rows?.length ? dimensionGap(ctx.records, year, ctx.months, ctx.selection) : null),
    salesReason = (s, year) => {
      if (prevSide?.unknown && year === ctx.compareYear) return `Price versions change every year, so ${year} can only be compared at product level (see the product row).`;
      const gap = gapFor(year)(s);
      return gap ? `${year} has no ${gap.word} data.` : !s.rows?.length ? (total ? 'No sales in this selection.' : `Not sold in ${year}`) : s.reason || 'Sales unavailable.';
    };
  for (const c of cols) {
    const m = c.metric,
      fy = ctx.focusYear,
      cy = ctx.compareYear,
      cur = sum(fy, m);
    let v = null,
      r = null;
    if (c.kind === 'sales' || (c.kind === 'year' && c.year === fy)) {
      v = cur.value;
      if (v == null) r = salesReason(cur, fy);
    } else if (c.kind === 'cur') {
      const s = sumC(fy, m);
      v = s.value;
      if (v == null) r = salesReason(s, fy);
    } else if (c.kind === 'year' || c.kind === 'py') {
      const y = c.kind === 'py' ? cy : c.year,
        s = c.kind === 'py' ? sumC(y, m) : sum(y, m);
      v = s.value;
      if (v == null) r = salesReason(s, y);
    } else if (c.kind === 'share') {
      v = cur.value != null && company[m] > 0 ? (cur.value / company[m]) * 100 : null;
      if (v == null) r = cur.value == null ? salesReason(cur, fy) : 'Company total unavailable for this period.';
    } else if (c.kind === 'ppg' || c.kind === 'growth' || c.kind === 'change') {
      const prev = sumC(cy, m),
        now = sumC(fy, m);
      if (now.value != null && prev.value != null) v = c.kind === 'change' ? now.value - prev.value : prev.value > 0 ? ((now.value - prev.value) / prev.value) * 100 : null;
      if (v == null) r = prev.value == null ? salesReason(prev, cy) : now.value == null ? salesReason(now, fy) : prev.value === 0 && now.value > 0 ? `New: no ${cy} sales to grow from.` : `No ${cy} sales to grow from.`;
      if (c.kind !== 'change') {
        const cmpMonths = partial ? ctx.compareMonths : ctx.dataMonths || ctx.months,
          lastM = MONTHS_SHORT[Math.max(...cmpMonths) - 1],
          span = cmpMonths.length > 1 ? `Jan–${lastM}` : lastM;
        if (now.value != null && now.value < 0) {
          // V76 W-03: negative current sales are returns; a growth rate below −100% means nothing.
          v = null;
          r = 'Returns larger than sales in this period, so growth is not meaningful.';
        } else if (v != null && !total && ctx.yearMode === 'single' && (sources || [product]).some((n) => /\btender\b/i.test(String(n)))) {
          // V76 W-05: a tender whose previous-year order came mostly after the period has no meaningful growth rate.
          const side = prevSide || { recs: ctx.records, filters },
            full = side.unknown ? null : comparableSummary(side.recs, cy, ALL_MONTHS, m, side.filters).value;
          if (full > 0 && prev.value < 0.25 * full) {
            v = null;
            r = `${cy} tender orders came mostly after ${lastM} (${Math.round((prev.value / full) * 100)}% by ${lastM}), so growth is not meaningful.`;
          }
        }
        if (v != null) {
          // V76 W-03: say when the previous-period base includes returns (a negative month).
          const byMonth = new Map();
          for (const row of prev.rows || []) if (Number.isFinite(row[m])) byMonth.set(row.month, (byMonth.get(row.month) || 0) + row[m]);
          const neg = [...byMonth.entries()].filter(([, val]) => val < 0).sort((a, b) => a[0] - b[0]);
          if (neg.length) r = `${cy} ${span} includes returns of ${neg.map(([mo, val]) => shortAmount(val, m) + ' (' + MONTHS_SHORT[mo - 1] + ')').join(', ')}.`;
        }
      }
    } else if (c.kind === 'target' || c.kind === 'ach' || c.kind === 'gap') {
      const t = total || sources ? targetSum(ctx.records, { year: fy }, sources || products, ctx.months, m, ctx.selection, annual) : portfolioTarget(ctx.records, { year: fy }, product, ctx.months, m, ctx.selection, annual);
      // V76 W-07: a product with a zero target has no target: no achievement and no variance (totals unchanged).
      if (!total && t === 0) {
        out[c.key] = null;
        why[c.key] = 'No target for this product.';
        continue;
      }
      if (c.kind === 'target') v = t;
      else if (c.kind === 'ach') v = cur.value != null && t > 0 ? (cur.value / t) * 100 : null;
      else v = cur.value != null && t != null ? cur.value - t : null;
      if (v == null) r = t == null ? (total || sources ? 'One or more selected products have no complete target.' : 'No target for this product and period.') : t === 0 && c.kind === 'ach' ? 'Zero target: achievement is undefined.' : salesReason(cur, fy);
    }
    out[c.key] = v;
    if (r) why[c.key] = r;
  }
  return { cells: out, reasons: why };
}

export function productsTableData(ctx, { measures = [ctx.measure], targetBasis = 'period', search = '', period = '' } = {}) {
  const cols = tableColumns(ctx, measures, period),
    annual = targetBasis === 'annual' && ctx.hasTargets,
    company = Object.fromEntries(measures.map((m) => [m, comparableSummary(ctx.records, ctx.focusYear, ctx.dataMonths || ctx.months, m, {}).value])),
    universe = productUniverse(ctx),
    names = universe.map((u) => u.key);
  const lookup = previousLookup(ctx);
  const total = { product: 'Total (selection)', total: true, ...cells(ctx, cols, ctx.selection, { total: true, products: ctx.products, annual, company, lookup }) };
  const rows = universe.map((u) => {
    const own = cells(ctx, cols, { ...ctx.selection, product: u.sources }, { product: u.product, sources: u.versions ? u.sources : null, annual, company, lookup });
    // Price versions: expandable sub-rows (their previous year stays unknown: a price version has no own history).
    const versions = u.versions ? u.sources.map((src) => ({ product: src, line: u.line, member: true, version: true, ...cells(ctx, cols, { ...ctx.selection, product: [src] }, { product: src, annual, company, lookup }) })).sort((a, b) => (b.cells[cols[0].key] ?? -Infinity) - (a.cells[cols[0].key] ?? -Infinity)) : null;
    return { product: u.product, key: u.key, sources: u.sources, line: u.line, versions, ...own };
  });
  const term = search.trim().toLowerCase(),
    view = term ? rows.filter((r) => r.product.toLowerCase().includes(term)) : rows;
  return { cols, total, rows, view, count: names.length, company, tender: tenderGroups(ctx, cols, rows, annual, company, lookup) };
}

// V72 R-19: "Combine tender with base product". Each base product and its tender twin(s) get one combined row computed
// like the Total row (sales summed from records, targets summed per product with targetSum, never allocated), so
// PPG / achievement are recomputed from the combined amounts.
function tenderGroups(ctx, cols, rows, annual, company, lookup) {
  const groups = new Map();
  for (const r of rows) {
    const key = productKey(tenderBase(r.product));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const out = new Map();
  for (const [key, members] of groups) {
    if (members.length < 2) continue;
    const names = members.flatMap((m) => m.sources || [m.product]),
      base = members.find((m) => tenderBase(m.product) === m.product.trim())?.product || tenderBase(members[0].product);
    const combined = cells(ctx, cols, { ...ctx.selection, product: names }, { total: true, products: names, annual, company, lookup });
    out.set(key, { product: base, line: members[0].line, combined: true, key, members, ...combined });
  }
  return out;
}

// Replace tender twins by their combined row (members stay available for the expand toggle).
export function combineTender(rows, groups) {
  if (!groups?.size) return rows;
  const used = new Set(),
    out = [];
  for (const r of rows) {
    const key = productKey(tenderBase(r.product)),
      g = groups.get(key);
    if (!g) out.push(r);
    else if (!used.has(key)) {
      used.add(key);
      out.push(g);
    }
  }
  return out;
}

export function sortRows(rows, ctx, sort, desc, measure) {
  const m = measure,
    key = (kind) => `${kind}:${m}`,
    byKey = {
      sales: [ctx.yearMode === 'multi' ? `year:${m}:${ctx.focusYear}` : key('sales'), true],
      growth: [key(ctx.yearMode === 'multi' ? 'growth' : 'ppg'), true],
      increase: [key('change'), true],
      decline: [key('change'), false],
      shortfall: [key('gap'), false],
      ach: [key('ach'), true],
    };
  const list = rows.slice();
  // Same-months change: with partial comparison months (V72 R-02) it is derived from PPG over the common months.
  if (ctx.yearMode === 'single') for (const r of list) if (r.cells[`py:${m}`] != null) r.cells[key('change')] = ctx.comparePartial ? (r.cells[key('ppg')] != null ? (r.cells[`py:${m}`] * r.cells[key('ppg')]) / 100 : null) : r.cells[key('sales')] != null ? r.cells[key('sales')] - r.cells[`py:${m}`] : null;
  if (sort === 'name') return list.sort((a, b) => (desc ? -1 : 1) * a.product.localeCompare(b.product));
  let [k, d] = byKey[sort] || [sort, true];
  if (!byKey[sort]) d = desc;
  return list.sort((a, b) => {
    const x = a.cells[k],
      y = b.cells[k];
    if (x == null && y == null) return a.product.localeCompare(b.product);
    if (x == null) return 1;
    if (y == null) return -1;
    return (d ? y - x : x - y) || a.product.localeCompare(b.product);
  });
}

export function groupByLine(rows, cols) {
  const groups = new Map();
  for (const r of rows) {
    if (!groups.has(r.line)) groups.set(r.line, []);
    groups.get(r.line).push(r);
  }
  const additive = new Set(['sales', 'year', 'cur', 'py', 'target', 'gap', 'change', 'share']);
  return [...groups.entries()]
    .map(([line, list]) => {
      const sub = { product: line, subtotal: true, cells: {}, reasons: {} };
      for (const c of cols) {
        if (!additive.has(c.kind)) continue;
        const vals = list.map((r) => r.cells[c.key]);
        sub.cells[c.key] = vals.every(finite) ? vals.reduce((a, b) => a + b, 0) : null;
        if (sub.cells[c.key] == null) sub.reasons[c.key] = 'One or more products in this line have no figure.';
      }
      return { line, sub, rows: list };
    })
    .sort((a, b) => (a.line === 'Not provided') - (b.line === 'Not provided') || a.line.localeCompare(b.line));
}

const achClass = (v) => (v == null ? 'unknown' : v >= 100 ? 'good' : v >= 90 ? 'warn' : 'bad');
// V76 W-10: say "packs" when the grouped source names differ by pack only, "price versions" when a price word is involved.
const PRICE_WORD = /\b(old|new|n\.\s*new)\s+price\b|\bprice\s+20\d\d\b|\bnew\s+price\b/i;
export const versionLabel = (sources) => `${sources.length} ${sources.some((n) => PRICE_WORD.test(n)) ? 'price versions' : 'packs'}`;
export function cellHTML(row, c, maxSales) {
  const v = row.cells[c.key],
    reason = row.reasons[c.key];
  if (v == null && (c.kind === 'ppg' || c.kind === 'growth') && /^New:/.test(reason || '')) return `<td class="variance positive" title="${esc(reason)}" data-reason="${esc(reason)}">New</td>`;
  if (v == null) return `<td title="${esc(reason || 'Not available')}" data-reason="${esc(reason || 'Not available')}">—</td>`;
  if (c.kind === 'share') return `<td>${v.toFixed(1)}%</td>`;
  if (c.kind === 'ppg' || c.kind === 'growth') return `<td class="variance ${v < 0 ? 'negative' : 'positive'}"${reason ? ` title="${esc(reason)}" data-reason="${esc(reason)}"` : ''}>${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%${reason ? '<sup class="pt-note" aria-hidden="true">ⓘ</sup>' : ''}</td>`;
  if (c.kind === 'ach') {
    const k = achClass(v);
    return `<td><span class="ach ach-${k}">${v.toFixed(0)}%</span><span class="ach-bar ach-${k}" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span></td>`;
  }
  if (c.kind === 'gap' || c.kind === 'change') return `<td class="variance ${v < 0 ? 'negative' : 'positive'}">${v < 0 ? '−' : '+'}${num(Math.abs(v))}</td>`;
  // V72 R-18: the share bar sits under the number (full cell width, 4 px, right-aligned); total and subtotal rows keep an
  // empty track so every row has the same rhythm.
  if (c.bar && maxSales > 0) {
    const w = row.total || row.subtotal ? 0 : Math.max(0, Math.min(100, (v / maxSales) * 100));
    return `<td class="sales-bar-cell"><span class="sales-num">${num(v)}</span><span class="sales-bar${row.total || row.subtotal ? ' empty' : ''}" aria-hidden="true"><i style="width:${w.toFixed(1)}%"></i></span></td>`;
  }
  return `<td>${num(v)}</td>`;
}

export function productsTableHTML(data, ctx, { sort, desc, measures, showAll = false, grouped = false, combine = false, expanded = new Set() }) {
  // V72 R-23: rows show the display name used across years; the source name stays in the tooltip. Display only.
  const shown = (name) => (typeof ctx?.displayName === 'function' ? ctx.displayName(name) : name),
    label = (name) => (!sameName(shown(name), name) ? `${esc(shown(name))}<small class="src-name">${esc(name)}</small>` : esc(shown(name))),
    tip = (name) => (shown(name) !== name ? `Source name: ${esc(name)} · ` : '') + `Show ${esc(shown(name))} on Overview`;
  const { cols, total } = data,
    primary = measures[0],
    barKey = ctx.yearMode === 'multi' ? `year:${primary}:${ctx.focusYear}` : `sales:${primary}`;
  for (const c of cols) c.bar = c.key === barKey;
  const sorted = sortRows(combine ? combineTender(data.view, data.tender) : data.view, ctx, sort, desc, primary),
    capped = !showAll && !grouped && sorted.length > TOP_ROWS + 2,
    visible = capped ? sorted.slice(0, TOP_ROWS) : sorted,
    maxSales = Math.max(0, ...sorted.map((r) => r.cells[barKey]).filter(finite));
  const groupsHead =
    measures.length > 1
      ? `<tr class="group-row"><th scope="col" rowspan="2" class="sticky-col">Product</th>${measures.map((m) => `<th scope="colgroup" colspan="${cols.filter((c) => c.metric === m).length}">${m === 'value' ? 'Value (EGP)' : 'Units'}</th>`).join('')}</tr>`
      : '';
  const sortHead = (c) => {
    const on = sort === 'col:' + c.key;
    return `<th scope="col" aria-sort="${on ? (desc ? 'descending' : 'ascending') : 'none'}"><button data-pt-sort="col:${esc(c.key)}" title="${esc(c.label)}">${esc(c.short)}${on ? (desc ? ' ↓' : ' ↑') : ''}</button></th>`;
  };
  const head = groupsHead + `<tr class="sub-row">${measures.length > 1 ? '' : '<th scope="col" class="sticky-col">Product</th>'}${cols.map(sortHead).join('')}</tr>`;
  const row = (r) => {
    const first = r.total
      ? `<th scope="row" class="sticky-col">${esc(r.product)}</th>`
      : r.combined
        ? `<td class="sticky-col combined-name"><button type="button" class="pt-expand" data-pt-expand="${esc(r.key)}" aria-expanded="${expanded.has(r.key)}" title="${esc(r.members.map((m) => m.product).join(' + '))}"><span aria-hidden="true">${expanded.has(r.key) ? '▾' : '▸'}</span> ${esc(r.product)} <small>+ Tender</small></button></td>`
      : r.version
        ? `<td class="sticky-col member-name version-name"><button data-select-product="${esc(r.product)}" title="Price version · show on Overview">${esc(r.product)}</button></td>`
      : r.member
        ? `<td class="sticky-col member-name">${r.sources?.length > 1 ? `<button data-select-products="${esc(JSON.stringify(r.sources))}" title="Show ${esc(r.product)} on Overview">${esc(r.product)}</button>` : `<button data-select-product="${esc(r.product)}" title="${tip(r.product)}">${label(r.product)}</button>`}</td>`
      : r.versions
        ? `<td class="sticky-col"><button data-select-products="${esc(JSON.stringify(r.sources))}" title="Show ${esc(r.product)} on Overview">${esc(r.product)}</button> <button type="button" class="pt-expand pt-versions" data-pt-expand="v:${esc(r.key)}" aria-expanded="${expanded.has('v:' + r.key)}" title="${esc(r.sources.join(' · '))}"><span aria-hidden="true">${expanded.has('v:' + r.key) ? '▾' : '▸'}</span> ${versionLabel(r.sources)}</button></td>`
      : r.subtotal
        ? `<th scope="row" class="sticky-col">${esc(r.product)} <small>subtotal</small></th>`
        : `<td class="sticky-col"><button data-select-product="${esc(r.product)}" title="${tip(r.product)}">${label(r.product)}</button></td>`;
    const own = `<tr${r.total ? ' class="total-row pinned-total"' : r.subtotal ? ' class="subtotal-row"' : r.combined ? ' class="combined-row"' : r.version ? ' class="member-row version-row"' : r.member ? ' class="member-row"' : r.versions ? ' class="versions-row"' : ''}>${first}${cols.map((c) => cellHTML(r, c, maxSales)).join('')}</tr>`;
    if (r.combined && expanded.has(r.key)) return own + r.members.map((m) => row({ ...m, member: true })).join('');
    if (r.versions && expanded.has('v:' + r.key)) return own + r.versions.map((v) => row(v)).join('');
    return own;
  };
  let body = row(total);
  if (grouped) for (const g of groupByLine(sorted, cols)) body += row(g.sub) + g.rows.map(row).join('');
  else body += visible.map(row).join('');
  if (!sorted.length) body += `<tr><td colspan="${cols.length + 1}">No matching products.</td></tr>`;
  const sk = barKey,
    ak = `ach:${primary}`,
    gk = ctx.yearMode === 'multi' ? `growth:${primary}` : `ppg:${primary}`,
    share = `share:${primary}`,
    unit = primary === 'value' ? 'EGP' : 'units';
  // V72 R-17: phone cards show a 2×2 grid: Sales, vs PY %, Ach % (coloured pill) and Variance; when a column does not
  // apply to the selection (no targets, multi-year) the next available figure (Share, Change) takes the cell.
  const gapK = `gap:${primary}`,
    chK = `change:${primary}`,
    has = (k) => cols.some((c) => c.key === k),
    signedPct = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + '%',
    signedNum = (v) => (v < 0 ? '−' : '+') + num(Math.abs(v)),
    cellDefs = [
      has(gk) && [ctx.yearMode === 'multi' ? 'Growth' : `vs ${ctx.compareYear}${ctx.comparePartial ? ' ' + monthSpan(ctx.compareMonths) : ''}`, gk, (v) => `<b class="variance ${v < 0 ? 'negative' : 'positive'}">${signedPct(v)}</b>`],
      has(ak) && ['Ach.', ak, (v) => `<b class="ach ach-${achClass(v)}">${v.toFixed(0)}%</b>`],
      has(gapK) && ['Variance', gapK, (v) => `<b class="variance ${v < 0 ? 'negative' : 'positive'}">${signedNum(v)}</b>`],
      has(share) && ['Share', share, (v) => `<b>${v.toFixed(1)}%</b>`],
      has(chK) && ['Change', chK, (v) => `<b class="variance ${v < 0 ? 'negative' : 'positive'}">${signedNum(v)}</b>`],
    ]
      .filter(Boolean)
      .slice(0, 3);
  const card = (r) => {
    const s = r.cells[sk],
      tag = r.total || r.combined ? 'div' : 'button',
      attrs = r.total || r.combined ? '' : r.sources?.length > 1 ? ` type="button" data-select-products="${esc(JSON.stringify(r.sources))}"` : ` type="button" data-select-product="${esc(r.product)}"`,
      cell = ([label, key, fmt]) => {
        const v = r.cells[key];
        return `<span class="pc-cell"${v != null && r.reasons[key] ? ` title="${esc(r.reasons[key])}"` : ''}><small>${esc(label)}</small>${v == null ? `<b title="${esc(r.reasons[key] || 'Not available')}">—</b>` : fmt(v)}</span>`;
      };
    return `<${tag} class="portfolio-card${r.total ? ' pinned-total' : ''}"${attrs}><span class="pc-name"${!r.total && !r.combined && shown(r.product) !== r.product ? ` title="Source name: ${esc(r.product)}"` : ''}>${r.total || r.version ? esc(r.product) : label(r.product)}${r.combined ? ' <small>+ Tender</small>' : ''}</span><span class="pc-grid"><span class="pc-cell"><small>Sales · ${unit}</small><b>${s == null ? '—' : num(s)}</b></span>${cellDefs.map(cell).join('')}</span></${tag}>`;
  };
  // V78: on the phone a product with several packs (or price versions) gets the same "n packs" toggle as the table; each
  // pack is its own card, and tapping it shows only that pack on Overview.
  const withPacks = (r) => {
    if (!r.versions) return card(r);
    const open = expanded.has('v:' + r.key);
    return card(r) + `<button type="button" class="pt-versions pc-packs" data-pt-expand="v:${esc(r.key)}" aria-expanded="${open}" title="${esc(r.sources.join(' · '))}"><span aria-hidden="true">${open ? '▾' : '▸'}</span> ${versionLabel(r.sources)}</button>` + (open ? r.versions.map((v) => card(v).replace('class="portfolio-card', 'class="portfolio-card pc-sub')).join('') : '');
  };
  const cards = card(total) + (grouped ? sorted : visible).map(withPacks).join('') || '<p class="chart-note">No matching products.</p>';
  const more = capped ? `<button type="button" class="link-button pt-show-all" data-pt-all="on">Show all ${sorted.length}</button>` : showAll && sorted.length > TOP_ROWS + 2 && !grouped ? `<button type="button" class="link-button pt-show-all" data-pt-all="off">Show top ${TOP_ROWS}</button>` : '';
  return { head, body, cards, more, shown: grouped ? sorted.length : visible.length, matched: sorted.length, sorted };
}
