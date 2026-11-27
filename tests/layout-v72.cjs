// V72 user-review layout checks (V73 adds N-04 / N-06 checks) in a real browser (Playwright + Chromium) against a local read-only harness.
// Serves public/ and the baseline private/seed.json from memory; never writes data and never contacts the live site.
// Usage: node tests/layout-v72.cjs [--shots DIR]
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const PUB = path.resolve(__dirname, '../public'), SEED = path.resolve(__dirname, '../private/seed.json');
const args = process.argv.slice(2), shotsDir = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
// The 12 review states (plan section 1).
const STATES = {
  S1: 'years=2026&period=ytd&through=8&measure=units',
  S2: 'years=2026&period=ytd&through=8&measure=value',
  S3: 'years=2026&period=ytd&through=8&measure=units&p=ONDALENZ%208MG',
  S4: 'years=2025,2026&period=ytd&through=8&measure=value',
  S5: 'years=2021,2022,2023,2024,2025,2026&period=ytd&through=8&measure=value',
  S6: 'years=2021,2022,2023,2024,2025,2026&period=ytd&through=8&measure=value&p=ONDALENZ%208MG',
  S7: 'years=2023&period=full&measure=value',
  S8: 'years=2024&period=full&measure=value',
  S9: 'years=2026&period=selected&months=3&measure=value',
  S10: 'years=2026&period=ytd&through=8&measure=value&d=PHARMA',
  S11: 'years=2026&period=ytd&through=8&measure=value&p=ONDALENZ%208MG&p=ONDALENZ%204MG',
  S12: 'years=2025&period=full&measure=value&l=Gyn%20line',
};
// Empty space at the bottom of a panel: strict where the plan promises it (S1, S3, S6), reported elsewhere.
const STRICT_GAP = new Set(['S1', 'S3', 'S6']);

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

// Runs in the page; returns violations for the visible tab.
function inspect({ mobile, strictGap }) {
  const out = [], warn = [], vis = (n) => n && !n.closest('[hidden]') && n.getClientRects().length > 0;
  if (document.documentElement.scrollWidth > innerWidth + 1) out.push(`horizontal scroll ${document.documentElement.scrollWidth} > ${innerWidth}`);
  // R-04: KPI numbers are never clipped.
  for (const s of document.querySelectorAll('#kpis .kpi strong')) if (vis(s) && s.scrollWidth > s.clientWidth + 1) out.push(`KPI clipped: ${s.textContent.trim()}`);
  for (const k of document.querySelectorAll('#kpis .kpi')) if (vis(k) && k.scrollHeight > k.clientHeight + 1) out.push(`KPI card overflow: ${k.querySelector('.label')?.textContent.trim()}`);
  // V73 N-04: the KPI value sits below its label and keeps its full line height (never shrunk or covered).
  for (const k of document.querySelectorAll('#kpis .kpi')) {
    const l = k.querySelector('.label'), s = k.querySelector('strong');
    if (!vis(s) || !l) continue;
    const lr = l.getBoundingClientRect(), sr = s.getBoundingClientRect(), fs = parseFloat(getComputedStyle(s).fontSize);
    if (sr.top < lr.bottom - 1) out.push(`KPI value covered by its label: ${l.textContent.trim()}`);
    if (sr.height < fs) out.push(`KPI value cut (${Math.round(sr.height)}px < ${fs}px): ${l.textContent.trim()}`);
  }
  // R-07/R-08: no inner scrollbars in Needs attention or Product facts.
  // V76 W-11: forecast scenario amounts stay on one line (compact on phones).
  for (const n of document.querySelectorAll('#view-forecast .projection-number')) if (vis(n)) { const lh = parseFloat(getComputedStyle(n).lineHeight) || parseFloat(getComputedStyle(n).fontSize) * 1.3; if (n.getBoundingClientRect().height > lh * 1.6) out.push(`forecast amount wraps: ${n.textContent.trim()}`); }
  for (const id of ['attention-list', 'product-facts']) { const n = document.getElementById(id); if (vis(n) && n.scrollHeight > n.clientHeight + 1) out.push(`${id} has an inner scrollbar`); }
  // R-05/R-06/R-09: axis and value labels in the bridge and Sales by year do not overlap.
  for (const id of ['movement-chart', 'sales-by-year']) {
    const svg = document.querySelector('#' + id + ' svg');
    if (!vis(svg)) continue;
    const boxes = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim()).map((t) => ({ t: t.textContent.trim(), r: t.getBoundingClientRect() }));
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i].r, b = boxes[j].r;
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push(`${id} labels overlap: "${boxes[i].t}" / "${boxes[j].t}"`);
    }
  }
  // R-22: up to 9 months, every month keeps its label.
  const trend = document.querySelector('#trend svg');
  if (vis(trend) && !document.querySelector('#trend .cumulative')) {
    const months = trend.querySelectorAll('[data-month]').length, labels = [...trend.querySelectorAll('text[y="250"]')].filter((t) => /^[A-Z][a-z]{2}$/.test(t.textContent)).length;
    if (months && months <= 9 && labels < months) out.push(`monthly chart shows ${labels} of ${months} month labels`);
    // V73 N-06: up to 12 months every month keeps a label (initials when narrow), and at most one "unknown" per run.
    const any = [...trend.querySelectorAll('text[y="250"]')].filter((t) => /^[A-Z]([a-z]{2})?$/.test(t.textContent)).length;
    if (months && months <= 12 && any < months) out.push(`monthly chart labels ${any} of ${months} months`);
  }
  // R-08: no panel ends with more than 120 px of empty space.
  if (!mobile) for (const p of document.querySelectorAll('#overview-grid .v69-panel:not([hidden])')) {
    if (!vis(p)) continue;
    const r = p.getBoundingClientRect(); let max = r.top;
    for (const c of p.querySelectorAll('*')) { if (!c.offsetParent && c.tagName !== 'svg') continue; const b = c.getBoundingClientRect(); if (b.height > 0 && b.width > 0) max = Math.max(max, b.bottom); }
    const gap = Math.round(r.bottom - max);
    if (gap > 120) (strictGap ? out : warn).push(`${p.dataset.panel} ends with ${gap}px empty`);
  }
  return { out, warn };
}

(async () => {
  const { srv, base } = await server();
  const browser = await chromium.launch({ executablePath: process.env.NERHADOU_CHROMIUM || undefined });
  const failures = [], warnings = [];
  try {
    for (const [vw, vh, mobile] of [[1440, 900, false], [390, 844, true]]) {
      for (const [id, q] of Object.entries(STATES)) {
        const page = await browser.newPage({ viewport: { width: vw, height: vh } }), errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await page.goto(base + '/?' + q, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1200);
        // R-10 (acceptance 10): a refresh must not announce a restored view.
        if (await page.evaluate(() => /View restored/i.test(document.body.innerText))) failures.push(`${vw} ${id} shows "View restored" on load`);
        const tabs = await page.evaluate(() => [...document.querySelectorAll('.section-tabs [role="tab"]')].filter((t) => !t.hidden && t.getAttribute('aria-disabled') !== 'true').map((t) => t.dataset.section));
        for (const tab of tabs) {
          await page.evaluate((s) => window.actualDashboard.showSection(s), tab);
          await page.waitForTimeout(300);
          const r = await page.evaluate(inspect, { mobile, strictGap: STRICT_GAP.has(id) });
          for (const o of r.out) failures.push(`${vw} ${id}/${tab} ${o}`);
          for (const o of r.warn) warnings.push(`${vw} ${id}/${tab} ${o}`);
          if (shotsDir) { fs.mkdirSync(shotsDir, { recursive: true }); await page.screenshot({ path: path.join(shotsDir, `${id}-${tab}-${vw}.png`), fullPage: true }); }
        }
        for (const e of errors) failures.push(`${vw} ${id} page error: ${e}`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
    srv.close();
  }
  if (warnings.length) console.log('Known (not failing):\n  ' + warnings.join('\n  '));
  if (failures.length) { console.error('V72 layout failures:\n  ' + failures.join('\n  ')); process.exit(1); }
  console.log('V72 layout checks passed: 12 states × available tabs × 1440/390.');
})();
