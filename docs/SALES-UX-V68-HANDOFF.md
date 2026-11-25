# Sales UX V68 handoff

Branch: `claude/project-thread-u3zmv6`. Release token: `sales-ux-v68`. **Not deployed.** Production (sales.nerhadou.workers.dev) and the production D1 database were not touched. The Owner tests this branch before any deploy.

## Owner decision recorded

- **Forecast is visible to every active user, Viewers included.** This overrides the brief's "Owner/Admin only" and the V63 restriction. Records already reach all approved roles through `/api/data`, so the change is client-side only (tab no longer `data-admin-only`, `renderPlanning` checks `status==='active'` only).
- Version and Release history stay Owner-only. "Powered by Ali Ashour" footer kept. No Overview headline re-added.

## What changed, per item

| ID | Commit(s) | Summary |
|---|---|---|
| S-01 | dafa810 | `public/chart-utils.js`: `compact`, `niceStep` (1/2/2.5/5), `niceAxis`, `axisTicks`, `tickLabel`. Breakdown, Movement, Forecast and app.js charts use it (app.js keeps a byte-identical classic-script copy; `tests/chart-utils.mjs` checks parity). Ticks are within 0.5% of their labels. |
| S-02 | a426d21 | `PROVISIONAL_YEARS={2023}` and `growthAllowed(a,b)` in management-core. Growth/PPG/delta/bridge/PY/seasonality that uses 2023 on either side is withheld with "Growth withheld: 2023 data is provisional." |
| Forecast | a4b4b4e | Visible to every active user (see above). |
| S-03 | 8686520 | KPI labels follow the chosen period (YTD / Full-year / Selected-period). |
| S-04 | a60587d | Every unavailable figure carries a reason (KPI cards, Portfolio `—` cells via `title`/`data-reason`). |
| S-10 | eff27ec | H1 and actions on one row; ⋯ actions menu under 700px; source bar and period paragraph merged into the data-health strip. |
| S-11 | bc19e97 | Named filter chips, Clear all, Reset hidden at defaults, sticky compact filter summary. |
| S-12 | d294643 | Four KPI cards (Sales, Achievement, Full-year progress with pace marker, the other measure) with delta chips and status words. |
| S-13 | d1c1778 | Real ARIA tabs (Overview, Sales Analysis, Portfolio, Forecast), roving tabindex, arrow/Home/End keys, sticky under the filter bar; Target basis moved into Portfolio and Breakdown. |
| S-14 | bb33bfb | Overview: one Monthly performance chart with target marker, monthly/cumulative toggle; achievement % panel removed; row order fixed; narrow PPG chart fits at 360px. |
| S-15 | a0164a3 | One colour per category everywhere (`CATEGORY_COLORS`); NOT PROVIDED is neutral grey. |
| S-16 | fb559ac | Breakdown cards full width, shared horizontal bars, truncation with `…` (full name in aria-label/tooltip). |
| S-17 | d0043d5 | Movement bridge uses a truncated axis with a visible break and note; height 300. |
| S-18 | d2a4663 | Portfolio: two-row header, pinned Total row equal to KPIs, variance colours, ach bars, sticky header/column, phone card list, sort select, live "N of M products". |
| S-19 | 0681a16 | Forecast: each scenario vs FY target (gap and %), Required card (monthly pace needed vs pace so far), cumulative Jan–Dec path. |
| S-20 | 62b09f0 | Product clicks open the product drawer; distributor/sales-type/line clicks filter in place with an 8-second "Filtered to X · Undo" status toast; Undo restores the exact selection; no scroll jump. |
| S-30 | d459835, 1fbf442 | `--text-muted:#5b6b7f`, `--text-subtle:#64748b`; weak greys replaced in all CSS layers and SVG text. Follow-ups: mix legend uses real buttons, labelled SVG nodes get `role="img"`. |
| S-31 | 50fc33d | Records indexed by year/product once; hidden legacy panels and inactive tabs not rendered (rendered when shown); Portfolio search debounced 150ms. |
| S-32 | 775adc3, 1f7cf50 | Table toggle on every chart; tables are built from the chart's own tooltips so values match; captions; keyboard operable. |
| S-33 | 4996f07 | Removed the ALIGNED MONTHLY TRENDS badge and duplicate section H2s; cards renamed Sales trend / What drove the change / Breakdown; Definitions & data notes behind a "ⓘ Data notes" link. |
| S-34 | 71d3761 | Sales trend: dashed previous-year line (sums equal the KPI prior year; withheld for 2023/2024), Average price (EGP/unit) panel only for months where both parts are known; unknown months now leave gaps. |
| S-35 | c27f297 | Needs attention adds Largest growth driver and Biggest beat vs target, magnitude chips, sorting by impact, skips NOT PROVIDED in concentration. |
| S-36 | 8032ea2 | KPI/Monthly skeletons, inline error card with Retry, "Updated <relative time>" (or "Baseline data · no edits yet"). |
| S-37 | edfd786, 94f237e | URL query holds year, period, months, filters, tab, measure, basis; replaceState on change, pushState on tab change, restored on load and back/forward; invalid params ignored; months clamped to the year's available months. Copy link copies the URL; old `#view=` links still open. |
| V68 | a237ebe | `release.config.json` 68 / `sales-ux-v68`, synced by `scripts/sync-release.mjs`. |

P3 items (S-40 CSS consolidation, S-41 dark mode, S-42 sparklines) were not started; they need the Owner's go-ahead.

## Validation (local harness, baseline seed, Chromium)

- **S-31 timings, 5 runs, 1440px:** Overview filter change median 517ms → **77ms** (max 911 → 103). Tab switch median 162 → **36ms** (max 367 → 125). Full render 355 → 14ms.
- **S-36:** with the snapshot delayed 2.5s, the largest layout shift is 24px (desktop) and 1px (390px). A forced 500 shows the error card; Retry recovers without a reload.
- **axe-core (S-13/S-30), Overview/Analysis/Portfolio/Forecast at 1440 and 390:** 0 colour-contrast violations for 2026 YTD Aug, 2023 and the PHARMA view. Remaining non-contrast findings: `label-content-name-mismatch` on Breakdown bars (truncated visible names vs full accessible name) and one Forecast method `<summary>` with an explicit label.
- **Tests:** `node --test tests/cloudflare-config.mjs tests/source-baseline.mjs` 8/8 pass. All UI/core tests pass, including the new `tests/sales-v68.mjs`, `tests/provisional-2023.mjs` and `tests/chart-utils.mjs`. Pre-existing failures that fail identically on `main`: `tests/chrome.mjs` (expects an older asset-token naming), `tests/historical-v56-ui.mjs`. Not runnable here: `tests/data-server.mjs`, `tests/security/auth.mjs`, `tests/security/preview-origin.mjs` (need `esbuild`), `tests/security/worker.mjs` (needs `miniflare`), `tests/security/backup-restore.mjs` (needs a backup file argument). No server or auth code changed.
- Screenshots: project files `sales-v68-screens/` (desktop 1440×900 and mobile 390×844, 2026 YTD Aug, 2023, PHARMA).

## Known follow-ups

- The legacy hidden markup (`.bd-legacy`, the old distributor donut controls) is still in `index.html` because `tests/regression.cjs` exercises those renderers directly. It is no longer rendered in the page. Removing it means retiring those regression assertions.
- Breakdown bar accessible names could start with the visible (truncated) text to clear axe's experimental name-mismatch rule.

## Rollback

Code only: deploy the previous V67 commit. No data, schema or configuration migration is involved.
