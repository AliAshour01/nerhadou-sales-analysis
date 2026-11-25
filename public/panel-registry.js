// V69 U-02: ordered panel registry and the per-row layout engine.
// Pure module: visibility, reasons and spans come from the view context (public/view-context.js);
// render functions are supplied by management.js through `api.renderers[id]`.
// Rows sum to exactly 12 columns after hidden panels are removed, so no row ends with an empty column.

const mixReason = (ctx, key, word, plural) => {
  const d = ctx.dims[key];
  if (!d) return null;
  if (d.categories === 0) return `${word} is not recorded for ${ctx.years.length > 1 ? 'the selected years' : ctx.focusYear}.`;
  if (d.categories === 1) return `Only one ${word.toLowerCase()} in this selection (100% ${d.single}).`;
  if (d.knownShare < 0.5) return `${word} is recorded for less than half of the selected sales.`;
  return null;
};
const mixShown = (ctx, key) => ctx.hasData && ctx.dims[key].categories >= 2 && ctx.dims[key].knownShare >= 0.5;

export const PANELS = [
  // ── Overview ──
  { id: 'salesByYear', tab: 'overview', row: 2, title: 'Sales by year', span: () => 4, show: (ctx) => ctx.yearMode === 'multi' && ctx.hasData, reason: () => null },
  { id: 'monthly', tab: 'overview', row: 2, title: 'Monthly sales', span: (ctx) => (ctx.yearMode === 'single' && ctx.monthCount === 1 ? 6 : 8), show: (ctx) => ctx.hasData && ctx.monthCount > 0, reason: (ctx) => (ctx.monthCount ? null : 'Select at least one month.') },
  { id: 'attention', tab: 'overview', row: 2, title: 'Needs attention', span: () => 4, show: (ctx, api) => ctx.yearMode === 'single' && ctx.productMode !== 'one' && ctx.hasData && api.attentionCount(ctx) > 0, reason: (ctx) => (ctx.yearMode === 'single' && ctx.productMode !== 'one' && ctx.hasData ? 'No items need attention for this selection.' : null) },
  { id: 'productFacts', tab: 'overview', row: 2, title: 'Product facts', span: () => 4, show: (ctx, api) => ctx.yearMode === 'single' && ctx.productMode === 'one' && ctx.hasData && api.factCount(ctx) > 0, reason: () => null },
  { id: 'shareByYear', tab: 'overview', row: 3, title: 'Share of company by year', span: () => 4, show: (ctx, api) => ctx.yearMode === 'multi' && ctx.productMode === 'one' && ctx.hasData && api.shareYears(ctx) >= 2, reason: (ctx) => (ctx.yearMode === 'multi' && ctx.productMode === 'one' ? 'Company share needs complete product and company sales in at least two selected years.' : null) },
  { id: 'bridge', tab: 'overview', row: 3, title: 'What drove the change', span: (ctx) => (ctx.yearMode === 'multi' && ctx.productMode === 'one' ? 8 : 12), show: (ctx, api) => ctx.hasData && api.bridgeOptions(ctx).length > 0, reason: (ctx) => (!ctx.hasData ? null : ctx.compareYear == null || !ctx.growthOk ? ctx.growthReason || 'No comparable previous-year data for this selection.' : 'No comparable previous-year data for this selection.') },
  { id: 'mixDistributor', tab: 'overview', row: 4, title: 'Distributor mix', span: () => 4, show: (ctx) => mixShown(ctx, 'distributor'), reason: (ctx) => (ctx.hasData ? mixReason(ctx, 'distributor', 'Distributor') : null) },
  { id: 'mixChannel', tab: 'overview', row: 4, title: 'Sales-type mix', span: () => 4, show: (ctx) => mixShown(ctx, 'channel'), reason: (ctx) => (ctx.hasData ? mixReason(ctx, 'channel', 'Sales type') : null) },
  { id: 'mixLine', tab: 'overview', row: 4, title: 'Sales by line', span: () => 4, show: (ctx) => ctx.productMode !== 'one' && mixShown(ctx, 'line'), reason: (ctx) => (ctx.hasData && ctx.productMode !== 'one' ? mixReason(ctx, 'line', 'Line') : null) },
  // ── Products ──
  { id: 'productsTable', tab: 'products', row: 1, title: 'Products', span: () => 12, show: (ctx) => ctx.productMode !== 'one' && ctx.productCount >= 2, reason: () => null },
  // ── Forecast ──
  { id: 'forecastScenarios', tab: 'forecast', row: 1, title: 'Year-end forecast scenarios', span: () => 12, show: (ctx) => ctx.yearMode === 'single' && ctx.isOpenYear && ctx.hasData, reason: () => null },
];

// Distribute 12 columns over a row's visible panels (layout rule 2).
export function rowSpans(spans) {
  const n = spans.length,
    sum = spans.reduce((a, b) => a + b, 0);
  if (!n) return [];
  if (sum === 12) return spans;
  if (n === 1) return [12];
  const base = Math.floor(12 / n);
  return spans.map((_, i) => base + (i < 12 - base * n ? 1 : 0));
}

export function layout(tab, ctx, api, { mobile = false } = {}) {
  const entries = PANELS.filter((p) => p.tab === tab && (!api.renderers || api.renderers[p.id])),
    visible = [],
    hidden = [];
  for (const entry of entries) {
    let show = false;
    try {
      show = !!entry.show(ctx, api);
    } catch (err) {
      show = false;
    }
    if (show) visible.push(entry);
    else {
      const reason = entry.reason(ctx, api);
      if (reason) hidden.push({ id: entry.id, title: entry.title, reason });
    }
  }
  const rows = [];
  for (const entry of visible) {
    let row = rows.find((r) => r.row === entry.row);
    if (!row) rows.push((row = { row: entry.row, panels: [] }));
    row.panels.push({ id: entry.id, entry, span: entry.span(ctx) });
  }
  rows.sort((a, b) => a.row - b.row);
  for (const row of rows) {
    const spans = mobile ? row.panels.map(() => 12) : rowSpans(row.panels.map((p) => p.span));
    row.panels.forEach((p, i) => (p.span = spans[i]));
  }
  return { rows, hidden, visible: visible.map((e) => e.id) };
}
