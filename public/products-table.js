// V69 U-09: the Products table (plan 4.8). Built from the view context so its pinned Total equals the KPIs
// in every state. Pure data (productsTableData) + HTML (productsTableHTML); management.js wires events.
import { comparableSummary, portfolioTarget, targetSum, scopeRecords } from './management-core.js?v=sales-filters-v70';
import { knownCategory } from './view-context.js?v=sales-filters-v70';

const finite = Number.isFinite;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = (v) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
export const TOP_ROWS = 15;
export const MAX_YEARS = 6;

// Sort options that apply to this selection (plan 4.8: "only options that apply").
export function sortOptions(ctx) {
  const opts = [['sales', 'Sales']];
  if (ctx.compareYear != null && ctx.growthOk) opts.push(['growth', 'Growth'], ['increase', 'Largest increase'], ['decline', 'Largest decline']);
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
      add('sales', 'Sales', `Sales ${unit} · ${period || ctx.focusYear}`);
      add('share', 'Share', `Share of company ${unit} (%)`);
      if (ctx.compareYear != null) add('py', String(ctx.compareYear), `Sales ${unit} · ${ctx.compareYear}`);
      if (ctx.compareYear != null && ctx.growthOk) add('ppg', 'PPG', `Growth vs ${ctx.compareYear} (%)`);
      if (ctx.hasTargets) {
        add('target', 'Target', `Target ${unit}`);
        add('ach', 'Ach.', 'Achievement (%)');
        add('gap', 'Variance', `Variance (sales − target) · ${unit}`);
      }
    } else {
      for (const y of years) add('year', String(y), `Sales ${unit} · ${y}`, { year: y });
      if (ctx.compareYear != null && ctx.growthOk) {
        add('change', 'Change', `Change ${ctx.compareYear} → ${ctx.focusYear} · ${unit}`);
        add('growth', 'Growth', `Growth ${ctx.compareYear} → ${ctx.focusYear} (%)`);
      }
      add('share', 'Share ' + ctx.focusYear, `Share of company ${unit} in ${ctx.focusYear} (%)`);
    }
  }
  return cols;
}

function productUniverse(ctx) {
  const wanted = new Set(ctx.years);
  const rows = scopeRecords(ctx.records, ctx.selection).filter((r) => r.dataset === 'actual' && wanted.has(r.year) && ctx.months.includes(r.month));
  const byProduct = new Map();
  for (const r of rows) {
    if (ctx.yearMode === 'single' && r.year !== ctx.focusYear) continue;
    let p = byProduct.get(r.product);
    if (!p) byProduct.set(r.product, (p = new Map()));
    if (knownCategory(r.line)) p.set(r.line, (p.get(r.line) || 0) + Math.abs(Number(r[ctx.measure]) || 0));
  }
  return [...byProduct.entries()].map(([product, lines]) => ({ product, line: [...lines.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Not provided' }));
}

// One product (or the selection total) → cell values and "why unavailable" reasons.
function cells(ctx, cols, filters, { total = false, product = null, products = [], annual = false, company }) {
  const out = {},
    why = {},
    memo = new Map(),
    sum = (year, m) => {
      const k = year + m;
      if (!memo.has(k)) memo.set(k, comparableSummary(ctx.records, year, ctx.months, m, filters));
      return memo.get(k);
    },
    salesReason = (s, year) => (!s.rows?.length ? (total ? 'No sales in this selection.' : `Not sold in ${year}`) : s.reason || 'Sales unavailable.');
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
    } else if (c.kind === 'year' || c.kind === 'py') {
      const y = c.kind === 'py' ? cy : c.year,
        s = sum(y, m);
      v = s.value;
      if (v == null) r = salesReason(s, y);
    } else if (c.kind === 'share') {
      v = cur.value != null && company[m] > 0 ? (cur.value / company[m]) * 100 : null;
      if (v == null) r = cur.value == null ? salesReason(cur, fy) : 'Company total unavailable for this period.';
    } else if (c.kind === 'ppg' || c.kind === 'growth' || c.kind === 'change') {
      const prev = sum(cy, m);
      if (cur.value != null && prev.value != null) v = c.kind === 'change' ? cur.value - prev.value : prev.value > 0 ? ((cur.value - prev.value) / prev.value) * 100 : null;
      if (v == null) r = prev.value == null ? salesReason(prev, cy) : cur.value == null ? salesReason(cur, fy) : `No ${cy} sales to grow from.`;
    } else if (c.kind === 'target' || c.kind === 'ach' || c.kind === 'gap') {
      const t = total ? targetSum(ctx.records, { year: fy }, products, ctx.months, m, ctx.selection, annual) : portfolioTarget(ctx.records, { year: fy }, product, ctx.months, m, ctx.selection, annual);
      if (c.kind === 'target') v = t;
      else if (c.kind === 'ach') v = cur.value != null && t > 0 ? (cur.value / t) * 100 : null;
      else v = cur.value != null && t != null ? cur.value - t : null;
      if (v == null) r = t == null ? (total ? 'One or more selected products have no complete target.' : 'No target for this product and period.') : t === 0 && c.kind === 'ach' ? 'Zero target: achievement is undefined.' : salesReason(cur, fy);
    }
    out[c.key] = v;
    if (r) why[c.key] = r;
  }
  return { cells: out, reasons: why };
}

export function productsTableData(ctx, { measures = [ctx.measure], targetBasis = 'period', search = '', period = '' } = {}) {
  const cols = tableColumns(ctx, measures, period),
    annual = targetBasis === 'annual' && ctx.hasTargets,
    company = Object.fromEntries(measures.map((m) => [m, comparableSummary(ctx.records, ctx.focusYear, ctx.months, m, {}).value])),
    universe = productUniverse(ctx),
    names = universe.map((u) => u.product);
  const total = { product: 'Total (selection)', total: true, ...cells(ctx, cols, ctx.selection, { total: true, products: ctx.products, annual, company }) };
  const rows = universe.map((u) => ({ product: u.product, line: u.line, ...cells(ctx, cols, { ...ctx.selection, product: [u.product] }, { product: u.product, annual, company }) }));
  const term = search.trim().toLowerCase(),
    view = term ? rows.filter((r) => r.product.toLowerCase().includes(term)) : rows;
  return { cols, total, rows, view, count: names.length, company };
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
  if (ctx.yearMode === 'single') for (const r of list) if (r.cells[key('sales')] != null && r.cells[`py:${m}`] != null) r.cells[key('change')] = r.cells[key('sales')] - r.cells[`py:${m}`];
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
  const additive = new Set(['sales', 'year', 'py', 'target', 'gap', 'change', 'share']);
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
export function cellHTML(row, c, maxSales) {
  const v = row.cells[c.key],
    reason = row.reasons[c.key];
  if (v == null) return `<td title="${esc(reason || 'Not available')}" data-reason="${esc(reason || 'Not available')}">—</td>`;
  if (c.kind === 'share') return `<td>${v.toFixed(1)}%</td>`;
  if (c.kind === 'ppg' || c.kind === 'growth') return `<td class="variance ${v < 0 ? 'negative' : 'positive'}">${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%</td>`;
  if (c.kind === 'ach') {
    const k = achClass(v);
    return `<td><span class="ach ach-${k}">${v.toFixed(0)}%</span><span class="ach-bar ach-${k}" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span></td>`;
  }
  if (c.kind === 'gap' || c.kind === 'change') return `<td class="variance ${v < 0 ? 'negative' : 'positive'}">${v < 0 ? '−' : '+'}${num(Math.abs(v))}</td>`;
  if (c.bar && !row.total && !row.subtotal && maxSales > 0) {
    const w = Math.max(0, Math.min(100, (v / maxSales) * 100));
    return `<td class="sales-bar-cell"><span class="sales-bar" aria-hidden="true"><i style="width:${w.toFixed(1)}%"></i></span><span class="sales-num">${num(v)}</span></td>`;
  }
  return `<td>${num(v)}</td>`;
}

export function productsTableHTML(data, ctx, { sort, desc, measures, showAll = false, grouped = false }) {
  const { cols, total } = data,
    primary = measures[0],
    barKey = ctx.yearMode === 'multi' ? `year:${primary}:${ctx.focusYear}` : `sales:${primary}`;
  for (const c of cols) c.bar = c.key === barKey;
  const sorted = sortRows(data.view, ctx, sort, desc, primary),
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
      : r.subtotal
        ? `<th scope="row" class="sticky-col">${esc(r.product)} <small>subtotal</small></th>`
        : `<td class="sticky-col"><button data-select-product="${esc(r.product)}" title="Show ${esc(r.product)} on Overview">${esc(r.product)}</button></td>`;
    return `<tr${r.total ? ' class="total-row pinned-total"' : r.subtotal ? ' class="subtotal-row"' : ''}>${first}${cols.map((c) => cellHTML(r, c, maxSales)).join('')}</tr>`;
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
  const card = (r) => {
    const s = r.cells[sk],
      second = cols.some((c) => c.key === ak) ? ['Ach.', r.cells[ak], (v) => v.toFixed(0) + '%'] : cols.some((c) => c.key === gk) ? ['Growth', r.cells[gk], (v) => (v > 0 ? '+' : '') + v.toFixed(1) + '%'] : ['Share', r.cells[share], (v) => v.toFixed(1) + '%'];
    const tag = r.total ? 'div' : 'button',
      attrs = r.total ? '' : ` type="button" data-select-product="${esc(r.product)}"`;
    return `<${tag} class="portfolio-card${r.total ? ' pinned-total' : ''}"${attrs}><span class="pc-name">${esc(r.product)}</span><span class="pc-sales">${s == null ? '—' : num(s)} <small>${unit}</small></span><span class="pc-second"><small>${second[0]}</small> ${second[1] == null ? '—' : second[2](second[1])}</span></${tag}>`;
  };
  const cards = card(total) + (grouped ? sorted : visible).map(card).join('') || '<p class="chart-note">No matching products.</p>';
  const more = capped ? `<button type="button" class="link-button pt-show-all" data-pt-all="on">Show all ${sorted.length}</button>` : showAll && sorted.length > TOP_ROWS + 2 && !grouped ? `<button type="button" class="link-button pt-show-all" data-pt-all="off">Show top ${TOP_ROWS}</button>` : '';
  return { head, body, cards, more, shown: grouped ? sorted.length : visible.length, matched: sorted.length, sorted };
}
