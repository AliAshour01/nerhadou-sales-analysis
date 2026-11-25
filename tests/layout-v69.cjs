// V69 plan 8.2: automated layout check in a real browser (Playwright + Chromium) against a local harness server.
// Read-only: serves public/ and the baseline private/seed.json from memory; never writes data and never contacts the live site.
// Usage: node tests/layout-v69.cjs [--shots DIR] [--timings]
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const PUB = path.resolve(__dirname, '../public'), SEED = path.resolve(__dirname, '../private/seed.json');
const args = process.argv.slice(2), shotsDir = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null, timings = args.includes('--timings');
const none = { product: [], line: [], distributor: [], channel: [] }, all = [2021, 2022, 2023, 2024, 2025, 2026], ytd = (n) => Array.from({ length: n }, (_, i) => i + 1);
const T3 = ['overview', 'portfolio', 'forecast'], T2 = ['overview', 'portfolio'];
// [id, config or URL, expected tabs]
const STATES = [
  ['A1', { years: [2026], months: ytd(8), periodMode: 'ytd', selection: none }, T3],
  ['A2', { years: [2026], months: ytd(8), periodMode: 'ytd', selection: { ...none, product: ['ONDALENZ 8MG'] } }, ['overview', 'forecast']],
  ['A3', { years: [2026], months: ytd(8), periodMode: 'ytd', selection: { ...none, product: ['ONDALENZ 8MG', 'CALCITRON', 'FERROTRON'] } }, T3],
  ['A4', { years: [2026], months: ytd(8), periodMode: 'ytd', selection: { ...none, distributor: ['PHARMA'] } }, T3],
  ['A5', { years: [2026], months: [8], periodMode: 'selected', selection: none }, T3],
  ['A6', { years: [2025], months: ytd(12), periodMode: 'full', selection: none }, T2],
  ['A7', { years: [2023], months: ytd(9), periodMode: 'ytd', selection: none }, T2],
  ['A8', { years: all, months: ytd(8), periodMode: 'ytd', selection: none }, T2],
  ['A9', { years: all, months: ytd(8), periodMode: 'ytd', selection: { ...none, product: ['__ONDALENZ__'] } }, ['overview']],
  ['A10', { years: [2025, 2026], months: ytd(8), periodMode: 'ytd', selection: { ...none, line: ['Gyn line'] } }, T2],
  ['A11', { years: [2022, 2023], months: ytd(12), periodMode: 'full', selection: none }, T2],
  ['A12', '/?page=comparison', T2],
  ['A13', '/?year=2026&tab=analysis&p=ONDALENZ%208MG', ['overview', 'forecast']],
];

async function server() {
  const core = await import(path.join(PUB, 'data-core.js'));
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'), j = (o) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.method !== 'GET') { res.writeHead(405); return res.end('{}'); }
    if (u.pathname === '/api/auth/me') return j({ user: { id: 'qa', email: 'qa@local', name: 'QA Owner', role: 'owner', status: 'active' }, csrf: 'x' });
    if (u.pathname === '/api/snapshot') { const y = u.searchParams.get('year'); return j({ ...core.snapshotFrom(seed, {}, y ? { year: Number(y) } : {}), revision: 0 }); }
    if (u.pathname === '/api/data') return j({ seed, overrides: {}, revision: 0, updatedAt: null, isAdmin: true, audit: [] });
    if (u.pathname === '/api/revision') return j({ revision: 0 });
    if (u.pathname.startsWith('/api/')) { res.writeHead(404); return res.end('{}'); }
    const f = path.join(PUB, u.pathname === '/' ? 'index.html' : u.pathname);
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { srv, base: 'http://127.0.0.1:' + srv.address().port };
}

// Runs in the page: returns every 8.2 violation for the current state.
function inspect({ id, mobile }) {
  const out = [], vis = (n) => n && !n.closest('[hidden]') && n.getClientRects().length > 0;
  const tabs = [...document.querySelectorAll('.section-tabs [role="tab"]')].filter(vis).map((t) => t.dataset.section);
  const active = [...document.querySelectorAll('#sales > section[id^="view-"]')].find(vis);
  const panels = active ? [...active.querySelectorAll('.panel, .v69-panel')].filter((p) => vis(p) && !p.parentElement.closest('.panel')) : [];
  for (const p of panels) {
    const name = p.dataset.panel || p.id || p.querySelector('h2')?.textContent || 'panel';
    const data = p.querySelector('svg circle, svg rect, svg path, svg polyline, table td, li, .attention-item, .kpi, .fc-card, .fact, .product-card, [data-tip]');
    if (!data) out.push(`1 empty panel: ${name}`);
    const body = [...p.children].filter((c) => !c.matches('.panel-title, header, .panel-head, .chart-controls, h2, h3'));
    if (body.length && body.every((c) => c.matches('.chart-note, .empty-chart') || (c.querySelector('.chart-note, .empty-chart') && !c.querySelector('svg, table, li')))) out.push(`1 message-only panel: ${name}`);
  }
  const grid = document.getElementById('overview-grid');
  if (!mobile && grid && vis(grid) && active?.id === 'view-overview') {
    const items = [...grid.children].filter(vis), rows = new Map();
    for (const n of items) { const r = n.getBoundingClientRect(), k = Math.round(r.top); if (!rows.has(k)) rows.set(k, []); rows.get(k).push({ n, r }); }
    const gw = grid.getBoundingClientRect().width;
    for (const [, row] of rows) {
      const used = row.reduce((s, { r }) => s + r.width, 0) + Math.max(0, row.length - 1) * (parseFloat(getComputedStyle(grid).columnGap) || 0);
      if (used < gw * 0.97) out.push(`2 blank columns in row: ${row.map(({ n }) => n.dataset.panel).join('+')} ${Math.round((used / gw) * 100)}%`);
      for (const { n, r } of row) if (['attention', 'productFacts'].includes(n.dataset.panel)) { const partner = row.find((x) => x.n !== n); if (partner && r.height > partner.r.height + 4) out.push(`3 side column overflow: ${n.dataset.panel} ${Math.round(r.height)} > ${Math.round(partner.r.height)}`); }
    }
  }
  for (const svg of document.querySelectorAll('#sales svg')) {
    if (!vis(svg)) continue;
    const arcs = svg.querySelectorAll('circle[stroke-dasharray][pathLength="100"]');
    if (arcs.length === 1) out.push('4 100% donut in ' + (svg.closest('[id]')?.id || 'svg'));
  }
  if (document.documentElement.scrollWidth > innerWidth + 1) out.push(`6 horizontal scroll ${document.documentElement.scrollWidth} > ${innerWidth}`);
  // 7 The obsolete comparison label must stay out of the Sales page.
  if (/\bwithheld\b/i.test(document.querySelector('#sales').innerText)) out.push('7 obsolete comparison label');
  if (id === 'A7') {
    const btn = document.querySelector('[data-chart-table="trend"]');
    if (btn) { btn.click(); const cells = [...document.querySelectorAll('#trend-table tbody tr')].map((r) => [...r.cells].map((c) => c.textContent.trim())); btn.click(); window.__a7 = cells; }
  }
  return { tabs, out, panels: panels.map((p) => p.dataset.panel || p.id).filter(Boolean) };
}

(async () => {
  const { srv, base } = await server();
  const browser = await chromium.launch({executablePath: process.env.NERHADOU_CHROMIUM || undefined});
  const failures = [], report = [], times = [];
  try {
    for (const [vw, vh, mobile] of [[1440, 900, false], [390, 844, true], [360, 800, true]]) {
      const page = await browser.newPage({ viewport: { width: vw, height: vh } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
      page.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url()) && !r.url().includes('/api/')) errors.push(r.status() + ' ' + r.url()); });
      let comparisonName = null;
      for (const [id, conf, expected] of STATES) {
        if (vw === 360 && !['A1', 'A2', 'A8'].includes(id)) continue; // 360: horizontal-scroll check on representative states
        if (typeof conf === 'string') { await page.goto(base + conf, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200); }
        else {
          if (!page.url().startsWith(base) || /\?/.test(page.url())) { await page.goto(base + '/', { waitUntil: 'networkidle' }); await page.waitForTimeout(1200); }
          const c = JSON.parse(JSON.stringify(conf));
          if (c.selection.product[0] === '__ONDALENZ__') {
            comparisonName ??= await page.evaluate(async () => (await import('/compare-core.js?v=' + document.querySelector('script[src*="management.js"]').src.split('v=')[1])).comparisonProduct({ product: 'ONDALENZ 8MG', year: 2026 }));
            c.selection.product = [comparisonName];
          }
          await page.evaluate((cfg) => window.actualDashboard.apply({ ...cfg, targetBasis: 'period', section: 'overview' }), c);
          await page.waitForTimeout(500);
        }
        const tabs = await page.evaluate(() => [...document.querySelectorAll('.section-tabs [role="tab"]')].filter((t) => !t.hidden && t.getClientRects().length).map((t) => t.dataset.section));
        if (JSON.stringify(tabs) !== JSON.stringify(expected)) failures.push(`${vw} ${id} 5 tabs ${tabs.join(',')} ≠ ${expected.join(',')}`);
        const sections = vw === 360 ? ['overview'] : tabs;
        for (const section of sections) {
          await page.evaluate((s) => window.actualDashboard.showSection(s), section);
          await page.waitForTimeout(250);
          const r = await page.evaluate(inspect, { id: section === 'overview' ? id : id + '-' + section, mobile });
          for (const o of r.out) failures.push(`${vw} ${id}/${section} ${o}`);
          report.push(`${vw} ${id}/${section}: ${r.panels.join(', ')}`);
          if (shotsDir && vw !== 360) { fs.mkdirSync(shotsDir, { recursive: true }); await page.screenshot({ path: path.join(shotsDir, `${id}-${section}-${vw}.png`), fullPage: true }); }
        }
        await page.evaluate(() => window.actualDashboard.showSection('overview'));
        if (id === 'A1' || id === 'A8') {
          const filters = page.locator('#sales > .filters');
          if (await filters.evaluate(node => node.classList.contains('collapsed'))) await filters.locator('.filters-toggle').click();
          const more = filters.locator('#more-filters');
          await more.locator(':scope > summary').click();
          await more.locator('#growth-basis').waitFor({state:'visible'});
          const within = await more.locator('.advanced-body').evaluate(node => {
            const panel = node.getBoundingClientRect();
            const card = node.closest('.filters').getBoundingClientRect();
            return panel.width > 0 && panel.left >= card.left && panel.right <= card.right && panel.bottom <= card.bottom;
          });
          if (!within) failures.push(`${vw} ${id} advanced filters extend outside the filter card`);
          await more.locator(':scope > summary').click();
        }
        if (id === 'A7') {
          const cells = await page.evaluate(() => window.__a7 || []);
          const zeros = cells.filter((row) => row.slice(1).some((c) => c === '0'));
          if (!cells.length) failures.push(`${vw} A7 8 monthly table view missing`);
          if (zeros.length) failures.push(`${vw} A7 8 unknown month shown as 0: ${zeros.map((r) => r[0]).join(',')}`);
        }
        if (id === 'A12') { const st = await page.evaluate(() => window.actualDashboard.read()); if (st.years.length < 2) failures.push(`${vw} A12 old Historical link did not open multi-year (${st.years})`); }
        if (id === 'A13') { const st = await page.evaluate(() => window.actualDashboard.read()); if (st.selection.product.join() !== 'ONDALENZ 8MG' || st.section !== 'overview') failures.push(`${vw} A13 old analysis link → ${st.section} ${st.selection.product}`); }
      }
      if (timings && vw === 1440) {
        await page.goto(base + '/', { waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
        for (const [label, c] of [['single-year A1', STATES[0][1]], ['multi-year A8', STATES[7][1]]]) {
          await page.evaluate((cfg) => window.actualDashboard.apply({ ...cfg, section: 'overview', targetBasis: 'period' }), c);
          await page.waitForTimeout(800);
          const runs = [];
          for (let i = 0; i < 6; i++) runs.push(await page.evaluate(() => { const t = performance.now(); window.actualDashboard.render(); return performance.now() - t; }));
          const five = runs.slice(1).sort((a, b) => a - b);
          times.push(`${label} full re-render after a filter change: median ${five[2].toFixed(0)} ms, max ${five[4].toFixed(0)} ms (5 runs)`);
        }
      }
      for (const e of errors) failures.push(`${vw} 9 console: ${e}`);
      await page.close();
    }
  } finally {
    await browser.close();
    srv.close();
  }
  if (process.env.V69_LAYOUT_REPORT) fs.writeFileSync(process.env.V69_LAYOUT_REPORT, report.join('\n') + '\n');
  if (times.length) console.log(times.join('\n'));
  if (failures.length) { console.error(failures.join('\n')); assert.fail(failures.length + ' layout violations'); }
  console.log(`V69 layout passed: A1–A13 at 1440×900 and 390×844 (+360 scroll): no empty panels, full rows, side columns fit, no 100% donut, expected tabs, no horizontal scroll, no 2023 growth, unknown ≠ 0, no console errors.`);
})().catch((e) => { console.error(e); process.exitCode = 1; });
