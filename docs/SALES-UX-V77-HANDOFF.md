# Sales V77 design foundation · handoff

Branch `claude/project-thread-9ud6t6` from `main` d14e708 (V76). Source: Claude Doc "Sales dashboard design review (V76)", items D-01–D-07 (V77 = foundation + P0). **Not merged, not deployed.** Rollback target: V76 `main` d14e708.

## Status per item

| Item | Status | Notes |
|---|---|---|
| D-07 tokens + one stylesheet | Done | `public/tokens.css` holds every token from the brief; `public/app.css` is the six old files concatenated in their old load order (same cascade) with every value rewritten as a token, legacy variables (`--navy`, `--teal`, `--brand`, `--pm-*`…) replaced by tokens, empty rules removed. The Sales page loads exactly these two files. `premium.css`, `polish.css`, `ui06-preview.css` deleted. `!important` 129 → 81: each flag was switched off in Chromium at 10 widths (1440–390) in 5 states plus Data management / Users & access, and dropped only where no computed style changed. The remaining ones beat inline styles or sit in hover/focus/print/[hidden] rules; reduce them component by component in V78. `style.css`, `theme.css`, `management.css` are kept only because `public/trial/*` still loads them. |
| D-01 Inter | Done | Inter 4 (latin subset, OFL, from @fontsource/inter 5.3.0) at `public/fonts/inter-{400,500,600}.woff2`, `@font-face` in `tokens.css` with `font-display:swap`. Google Fonts `@import` removed; CSP unchanged (`default-src 'self'` already allows same-origin fonts). `font-family:var(--font)` set once on `body`. |
| D-04 type | Done (CSS + chart SVG) | Sizes map: <12.5→12, 13, 14, 16, 24, 28 (KPI clamps → 28). Weights 550→500, 650+→600. SVG `font-size` 10/11 → 12 in `management.js`/`app.js`. Remaining in a sweep: a few 15.2 px SVG labels scaled by their viewBox and up to 11 text colours on the Forecast tab (forecast palette is D-19, V78). |
| D-06 gradients / lift shadows | Done | No `gradient` anywhere; SVG `<defs>` of `nh-premium-*` removed from `index.html`; chart rules that pointed at them use flat tokens. Card and button shadows removed; popovers use `--shadow-pop`. Hover lift and `polish-motion.js` are D-24 (V78). |
| D-02 bridge colours | Done | `drawBridge()` in `management.js`: increase `--accent`, decrease `--decrease`, totals `--ink-2`, unavailable detail `--context`; colours set with `style="fill:var(--…)"` so the old attribute-selector overrides no longer apply. Legend sentence updated. Signs kept on every label. |
| D-03 bridge labels | Done | Horizontal rows at every width, label column ~28% (desktop) / 42% (phone) wide, names wrap onto as many lines as needed (`wrapFull`), never truncated. Totals from zero, so no axis break; numbered phone key removed; phone shows the same 8 drivers + Other as desktop (decreases included). Tick count follows plot width (layout test checks overlaps). Clicks, tooltips, Other details and Table view unchanged. |
| D-05 mix colours | Done | `renderMixBars()`: accent bar on a `--border` track; with a filter on that dimension the selected bars stay accent and the rest are `--context`; Other / NOT PROVIDED `--context`, negatives `--decrease`. `categoryColor()` stays in `chart-utils.js` for other charts. |

## Accent
Owner's question (bright blue vs logo navy) was unanswered, so V77 uses the logo navy `#174A8D` (8.8:1 on white). Changing it is one line in `tokens.css` (`--accent`, `--accent-strong`, `--accent-soft`).

## How app.css was produced
A one-off postcss script (not committed) concatenated the six files and mapped colours by role: text → ink / ink-2 / ink-3 or a status colour by hue; backgrounds → surface / bg / border or a soft status tint; lines → border / context. From now on edit `app.css` directly and use tokens only (`tests/sales-v77.mjs` fails on any raw hex, gradient, off-scale font size or weight).

## Tests
New `tests/sales-v77.mjs`. Updated for intended changes: `sales-v69.mjs` (no axis break; mix colours are tokens; target marker colour; contrast check reads tokens/app.css), `meeting-report-v61.mjs` and `chrome.mjs` (read `app.css`). Pass: V77, V76, V74, V73, V72, V72 UI, V69, regression V69, management, management UI, chart utils, meeting report, products table, provisional 2023, view context, readability, owner version, product identity, data manager UI, focus comparison, historical V56, `layout-v72.cjs` (browser), `release:check`, `check:deployment`, full `npm run build`. Already failing on `main` (unchanged): `chrome.mjs` (old version-token regex), `responsive-v60.mjs` (on main it fails at the 10 px label check; V77 fixes that, so it now stops at the later "Narrow 12-month axis reduces label density" check, which main also fails).

## Next (V78)
D-08–D-24 in ID order: header, scope repetition, filter bar, status strip, identical KPI tiles (the first tile is still filled navy), tabs, monthly chart, attention list, line styles, products table, forecast.

## Review fixes (after review of PR #29)
F-01 phone bridge: on phones the driver bars are scaled by their change (decreases left of a zero line), totals are text rows, no connectors, label column 120 px; every bar is at least 3 px wide. F-02: Data management revision badge is accent text on accent-soft. F-03: the over-target segment and its legend swatch both use `--context-2`.
