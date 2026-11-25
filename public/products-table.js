// V69 U-09: the Products table (plan 4.8). Built from the view context so its pinned Total equals the KPIs
// in every state. Pure data (productsTableData) + HTML (productsTableHTML); management.js wires events.
import { comparableSummary, portfolioTarget, targetSum, scopeRecords, dimensionGap, tenderBase, productKey } from './management-core.js?v=sales-comparison-v71';
import { knownCategory, monthSpan } from './view-context.js?v=sales-comparison-v71';

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
      if (!memo.has(k)) memo.set(k, comparableSummary(ctx.records, year, ctx.dataMonths || ctx.months, m, filters));
      return memo.get(k);
    },
    partial = ctx.yearMode === 'single' && ctx.comparePartial,
    sumC = (year, m) => {
      if (!partial) return sum(year, m);
      const k = 'c' + year + m;
      if (!memo.has(k)) memo.set(k, comparableSummary(ctx.records, year, ctx.compareMonths, m, filters));
      return memo.get(k);
    },
    // V72 R-01: a year that does not record the filtered dimension is unknown, not "not sold".
    gapFor = (year) => (s) => (!s.rows?.length ? dimensionGap(ctx.records, year, ctx.months, ctx.selection) : null),
    salesReason = (s, year) => {
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
      if (v == null) r = prev.value == null ? salesReason(prev, cy) : now.value == null ? salesReason(now, fy) : `No ${cy} sales to grow from.`;
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
    company = Object.fromEntries(measures.map((m) => [m, comparableSummary(ctx.records, ctx.focusYear, ctx.dataMonths || ctx.months, m, {}).value])),
    universe = productUniverse(ctx),
    names = universe.map((u) => u.product);
  const total = { product: 'Total (selection)', total: true, ...cells(ctx, cols, ctx.selection, { total: true, products: ctx.products, annual, company }) };
  const rows = universe.map((u) => ({ product: u.product, line: u.line, ...cells(ctx, cols, { ...ctx.selection, product: [u.product] }, { product: u.product, annual, company }) }));
  const term = search.trim().toLowerCase(),
    view = term ? rows.filter((r) => r.product.toLowerCase().includes(term)) : rows;
  return { cols, total, rows, view, count: names.length, company, tender: tenderGroups(ctx, cols, rows, annual, company) };
}

// V72 R-19: "Combine tender with base product". Each base product and its tender twin(s) get one combined row computed
// like the Total row (sales summed from records, targets summed per product with targetSum, never allocated), so
// PPG / achievement are recomputed from the combined amounts.
function tenderGroups(ctx, cols, rows, annual, company) {
  const groups = new Map();
  for (const r of rows) {
    const key = productKey(tenderBase(r.product));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const out = new Map();
  for (const [key, members] of groups) {
    if (members.length < 2) continue;
    const names = members.map((m) => m.product),
      base = members.find((m) => tenderBase(m.product) === m.product.trim())?.product || tenderBase(members[0].product);
    const combined = cells(ctx, cols, { ...ctx.selection, product: names }, { total: true, products: names, annual, company });
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
    label = (name) => (shown(name) !== name ? `${esc(shown(name))}<small class="src-name">${esc(name)}</small>` : esc(name)),
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
      : r.member
        ? `<td class="sticky-col member-name"><button data-select-product="${esc(r.product)}" title="${tip(r.product)}">${label(r.product)}</button></td>`
      : r.subtotal
        ? `<th scope="row" class="sticky-col">${esc(r.product)} <small>subtotal</small></th>`
        : `<td class="sticky-col"><button data-select-product="${esc(r.product)}" title="${tip(r.product)}">${label(r.product)}</button></td>`;
    const own = `<tr${r.total ? ' class="total-row pinned-total"' : r.subtotal ? ' class="subtotal-row"' : r.combined ? ' class="combined-row"' : r.member ? ' class="member-row"' : ''}>${first}${cols.map((c) => cellHTML(r, c, maxSales)).join('')}</tr>`;
    return r.combined && expanded.has(r.key) ? own + r.members.map((m) => row({ ...m, member: true })).join('') : own;
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
      has(gk) && [ctx.yearMode === 'multi' ? 'Growth' : `vs ${ctx.compareYear}`, gk, (v) => `<b class="variance ${v < 0 ? 'negative' : 'positive'}">${signedPct(v)}</b>`],
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
      attrs = r.total || r.combined ? '' : ` type="button" data-select-product="${esc(r.product)}"`,
      cell = ([label, key, fmt]) => {
        const v = r.cells[key];
        return `<span class="pc-cell"><small>${esc(label)}</small>${v == null ? `<b title="${esc(r.reasons[key] || 'Not available')}">—</b>` : fmt(v)}</span>`;
      };
    return `<${tag} class="portfolio-card${r.total ? ' pinned-total' : ''}"${attrs}><span class="pc-name"${!r.total && !r.combined && shown(r.product) !== r.product ? ` title="Source name: ${esc(r.product)}"` : ''}>${r.total ? esc(r.product) : label(r.product)}${r.combined ? ' <small>+ Tender</small>' : ''}</span><span class="pc-grid"><span class="pc-cell"><small>Sales · ${unit}</small><b>${s == null ? '—' : num(s)}</b></span>${cellDefs.map(cell).join('')}</span></${tag}>`;
  };
  const cards = card(total) + (grouped ? sorted : visible).map(card).join('') || '<p class="chart-note">No matching products.</p>';
  const more = capped ? `<button type="button" class="link-button pt-show-all" data-pt-all="on">Show all ${sorted.length}</button>` : showAll && sorted.length > TOP_ROWS + 2 && !grouped ? `<button type="button" class="link-button pt-show-all" data-pt-all="off">Show top ${TOP_ROWS}</button>` : '';
  return { head, body, cards, more, shown: grouped ? sorted.length : visible.length, matched: sorted.length, sorted };
}
