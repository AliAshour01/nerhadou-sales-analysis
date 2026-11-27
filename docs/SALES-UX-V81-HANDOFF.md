# Sales UX V81 Design Fixes Handoff (G-01 to G-27)

Branch: `gemini/v81-design` (based on `main` at `ba7a4dd`, V80).
No numbers, aggregations, filters, or calculation modules (`compare-core.js`, `management-core.js`, `view-context.js`, `data-core.js`, `price-core.js`, `breakdown-core.js`) were changed.

## Step-by-step status

| ID | Status | Files | How to check |
|---|---|---|---|
| G-01 | Done | `public/app.css` | Tab through Overview at 1440 px; every button, select, tab, and focusable SVG bar shows a visible focus ring (`:focus-visible`). |
| G-02 | Done | `public/app.css` | `grep -n "background-clip" public/app.css` returns nothing; forced-colors mode renders title and KPI values clearly. |
| G-03 | Done | `public/app.css` | At 390 px, interactive controls in `#sales` and `.app-header` enforce `min-height: 44px` (and 44×44 hit box on `.target-definition summary`). |
| G-04 | Done | `public/index.html`, `public/app.js`, `public/app.css` | Scroll 1,000 px at 1440 px and 390 px; only `#sales-sticky-bar` (scope summary + tabs) stays pinned, opaque `var(--surface)`, no `backdrop-filter`. |
| G-05 | Done | `public/chart-utils.js`, `public/app.js`, `public/management.js`, `public/app.css`, `tests/sales-v77.mjs` | `node tests/sales-v77.mjs` passes (zero raw 6-digit hex colors outside comments in all 4 JS files); `?years=2025,2026` uses navy/grey solid lines with filled 6 px end dots and direct labels. |
| G-06 | Done | `public/app.css` | Controls, table cells, subtitles, and KPI context lines use `--text-small` (13 px); attention/price/facts/notes use `--text-body` (14 px); card titles `--text-title` (16 px); captions/ticks `--text-caption` (12 px). |
| G-07 | Done | `tests/sales-v69.mjs`, `tests/sales-v76.mjs`, `public/app.css` | Phase 1 checkpoint: all 17 baseline JS/UI tests and `tests/layout-v72.cjs` pass; grid panels aligned to start (`align-items: start`). |
| G-08 | Done | `public/management.js`, `public/app.css` | At 1440 px, `header.app-header` is hidden on Sales; Refresh and Full screen sit in `.heading` as 36 px icon buttons left of Views. Phone (< 700 px) keeps the top bar. |
| G-09 | Done | `public/management.js`, `public/app.css` | Scope subtitle appears once under the title; phone Filters toggle shows `Filters · n`; chart subtitles show only delta context (`vs monthly target`, `2025 → 2026`); `?years=2023` shows one partial-year notice under the scope line without the duplicate `2023 data notes` pill. |
| G-10 | Done | `public/index.html`, `public/app.js`, `public/app.css` | At 1440 px, `.filters` is a frameless single row with a keyboard-operable Years popover (`#years-popover`), 36 px controls, and active filter chips on a second row only when present. |
| G-11 | Done | `public/management.js`, `public/app.css` | `#data-health` renders one 13 px `--ink-2` line (`Actual data through Aug 2026 · Targets provisional ⓘ · Data notes`) with no green "Data: complete"; `?years=2023` shows `⚠ Some 2023 values are estimated` in `--warning`. |
| G-12 | Done | `public/management.js`, `public/app.css` | All 4 KPI tiles are uniform white (`var(--surface)`, 1 px `--border`, 20 px padding, no shadow); deltas are plain text (`▲ 39.6% vs 2025`), progress bars are 6 px `--accent` on `--border` track with a 2 px `--ink` tick. |
| G-13 | Done | `public/management.js`, `public/app.css` | Section tabs are underline text buttons (14 px 500 `--ink-2`, active `--ink` 600 with 2 px `--accent` underline); disabled tabs expose reasons via `title` and `aria-describedby`. |
| G-14 | Done | `public/app.js` | Monthly bars capped at 24 px with 4 px rounded top (`rx="4"`), over-target segment in `--context-2`, 2 px `--ink` target tick, and `%` labels shown only on months below target. |
| G-15 | Done | `public/management.js`, `public/app.css` | Needs attention rendered as a plain 1 px divider list (no tinted cards, no left borders, no pills, no "Show this product →"); rule explanation moved into a title `ⓘ` disclosure. |
| G-16 | Done | `public/panel-registry.js` | `salesByYear` hides when exactly 2 years are selected (`?years=2025,2026`) so Monthly sales by year spans full width; 3+ years still show `Sales by year`. |
| G-17 | Done | `public/products-table.js`, `public/app.css` | Headers renamed to `vs 2025` and `% of target` (Excel export headers unchanged); `% of target` is plain text + `▲`/`▼` with no pill or bar; inline 4 px bar moved to Share; Group by line rows styled as 600-weight subtotals with 1 px `--ink-3` top border; pack rows show pack suffix (`30 film`, `20 film`) with full source name in `title` and Pack vs Price version tooltip. |
| G-18 | Done | `public/management.js`, `public/app.css` | Price increases styled as divider rows (`Price +20.8%`, `EGP 85.3 → 103.0 per unit since Mar 2026`, `Units since then: ▲/▼ ...`); detection definition moved into title `ⓘ` disclosure. |
| G-19 | Done | `public/management.js`, `public/app.css` | Forecast values are compact everywhere with exact values in `title`; default chart is a horizontal range-vs-target figure (two scenario dots, `--accent-soft` band, 2 px `--ink` FY target tick) with a "Show monthly path" toggle for the Jan–Dec cumulative view. |
| G-20 | Done | `public/management.js` | Forecast copy tightened: one-line `vs FY target`, concise `Required to hit target` sentence, one-sentence `forecastWhy`, and method explanations folded inside `ⓘ Method` disclosures. |
| G-21 | Done | `public/management.js`, `public/app.css` | Forecast risk table adds a `Status` column (`▼ Both miss`, `▼ YTD average misses`, `— Seasonality unavailable`), removes inline red text under product names, and renders `Projected % of target` as plain text; `exportForecastRisk` unchanged. |
| G-22 | Done | `public/app.css` | Sidebar set to 216 px, frameless logo, active item uses `--accent-soft` background + `--accent` 600 text with no dot or left bar. |
| G-23 | Done | `public/app.css` | At 390 px, Products rows are flat 1 px divider lists (no nested cards), mix tabs use underline style, and cards use 16 px padding / 12 px gaps. |
| G-24 | Done | `public/index.html`, `public/app.css`, `public/polish-motion.js` (deleted) | Removed `polish-motion.js` and all `translateY(` / `nh-card-refresh` / `pm-rise` / `nh-enter` animations; refetch dims `#sales[aria-busy="true"]` to 60% opacity. |
| G-25 | Done | `public/management.js` | Bridge uses diverging zero-line driver bars and text-only total rows at all widths; Price vs volume draws a 1 px `--border` divider between like-for-like effects and new/tender effects and notes `Shown in EGP: price needs value.` when page measure is Units. |
| G-26 | Done | `public/management.js` | Copy pass applied across KPI labels (`Units sold`), bridge note (`Each % is the change as a share of the 2025 total, so they add up to +39.6%.`), bridge/PV legends, and desktop `Select` wording. |
| G-27 | Done | `public/management.js`, `public/app.js` | Single selected pack shows filter chip `Pack: 30 film (TADANERFI 5MG)` and KPI comparison `2025 not recorded by pack` instead of `— no comparison`. |

## Known limits & notes

- `tests/chrome.mjs`, `tests/responsive-v60.mjs`, `tests/comparison-xlsx.mjs`, `tests/data-management.mjs`, and `tests/data-server.mjs` remain pre-existing environment/baseline failures noted in the brief.
- Updated old-markup test assertions in `tests/sales-v69.mjs`, `tests/sales-v72-ui.mjs`, `tests/sales-v73.mjs`, `tests/sales-v76.mjs`, and `tests/sales-v80.mjs` where V81 intentionally changed copy, token colors, default forecast chart, or risk-table columns; no numeric, tender, pack, PHARMA, or decimal assertion was weakened.
- New static test suite added at `tests/sales-v81.mjs`.
