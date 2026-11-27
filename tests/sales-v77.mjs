// V77 design foundation checks (design review D-01..D-07): one token file, one app stylesheet, self-hosted Inter,
// no gradients, the type scale, and colour-blind-safe chart colours. Static checks only; layout is in layout-v72.cjs.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('public/index.html', 'utf8');
const tokens = fs.readFileSync('public/tokens.css', 'utf8');
const app = fs.readFileSync('public/app.css', 'utf8');
const mgmt = fs.readFileSync('public/management.js', 'utf8');

// D-07: the Sales page loads two stylesheets, tokens first.
const sheets = [...html.matchAll(/<link rel="stylesheet" href="([^"?]+)/g)].map((m) => m[1]);
assert.deepEqual(sheets, ['tokens.css', 'app.css']);
for (const old of ['premium.css', 'polish.css', 'ui06-preview.css']) assert(!fs.existsSync('public/' + old), old + ' is removed');

// D-01: Inter is served from /fonts/ (the CSP allows same-origin fonts only) and nothing calls Google Fonts.
for (const w of [400, 500, 600]) {
  assert(fs.existsSync(`public/fonts/inter-${w}.woff2`));
  assert(tokens.includes(`font-weight:${w};font-display:swap;src:url("fonts/inter-${w}.woff2")`));
}
for (const text of [tokens, app, html]) assert(!/googleapis|gstatic/.test(text));
assert(/body\s*\{[^}]*font-family:var\(--font\)/.test(app));

// D-06: no gradients anywhere.
for (const [name, text] of [['tokens', tokens], ['app', app], ['index', html]]) assert(!/gradient/i.test(text), name + ' has a gradient');

// D-04: font sizes only from the scale, three weights, no uppercase or letter-spacing (except -0.01em on big text).
for (const m of app.matchAll(/font-size:\s*([^;}!]+)/g)) assert(/^var\(--(text-|chart-)/.test(m[1].trim()) || m[1].trim() === 'inherit', 'font-size ' + m[1]);
for (const m of app.matchAll(/font-weight:\s*([^;}!]+)/g)) assert(['400', '500', '600', 'inherit'].includes(m[1].trim()), 'font-weight ' + m[1]);
assert(!/text-transform:\s*uppercase/.test(app));
for (const m of app.matchAll(/letter-spacing:\s*([^;}]+)/g)) assert.equal(m[1].trim(), '-.01em');
for (const m of mgmt.matchAll(/font-size="(\d+)"/g)) assert(Number(m[1]) >= 12, 'SVG font-size ' + m[1]);

// Colours: app.css takes every colour from a token (attribute selectors that match chart markup are not colours).
const values = app.replace(/\[[^\]]*\]/g, '');
assert.deepEqual([...values.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]), []);

// Token contrast: text tokens pass 4.5:1 on white and on the tinted table rows.
const lum = (h) => { const v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const tok = (name) => tokens.match(new RegExp(`--${name}:(#[0-9A-Fa-f]{6})`))[1];
for (const t of ['ink', 'ink-2', 'ink-3', 'accent', 'decrease', 'good', 'warning', 'critical']) {
  assert(ratio(tok(t), '#ffffff') >= 4.5, t);
}
assert(ratio(tok('ink-3'), '#eef2f7') >= 4.5);

// D-02: the bridge uses accent (increase), --decrease and --ink-2 (totals); no green / red pair is left.
assert(!/#39836e|#bc665b/i.test(mgmt));
assert(/increase:'var\(--accent\)'/.test(mgmt) && /decrease:'var\(--decrease\)'/.test(mgmt) && /total:'var\(--ink-2\)'/.test(mgmt));
// D-03: no numbered key or axis break in the bridge; names are wrapped, never cut.
assert(!/bridge-key|axis-break/.test(mgmt.replace(/data-bridge-keyed/g, '')));
// D-05: mix bars take no categorical colour.
assert(!/categoryColor\(/.test(mgmt));
console.log('V77 design foundation checks passed.');
