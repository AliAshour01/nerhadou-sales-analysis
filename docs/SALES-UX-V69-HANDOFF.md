# Sales UX V69 handoff: one unified Sales page

Branch: `claude/project-thread-i3h9km` (built on V68, `claude/project-thread-u3zmv6`). Release token: `sales-ux-v69`. **Not deployed.** Production (sales.nerhadou.workers.dev) and the production D1 database were not touched. No change to `private/`, `deployment/source-baseline/`, auth, `app/api/*`, D1, Cloudflare configuration or source data. The Owner tests this branch before any deploy.

Plan: `briefs/sales-v69-unified-layout-plan.md`. Each step is one commit whose message starts with its ID.

## Owner decisions (plan section 9, defaults used)

1. Product drawer removed: a product click selects the product (with an Undo toast).
2. Monthly growth (PPG) panel removed: PPG appears as labels in the Monthly chart (Previous year mode) and in Sales by year.
3. Default Years selection: the latest year only.
4. Sidebar and page name: "Sales performance".

## What changed, per step

| ID | Commit | Summary |
|---|---|---|
| U-01 | 17d7bf1 | `public/view-context.js`: one frozen selection context (year mode, focus/compare year, growth rule, products, targets, dimensions, unknown months). |
| U-02 | 009d63f | `public/panel-registry.js`: ordered panel registry, 12-column row engine (rows always sum to 12), "Not shown for this selection" strip with reasons. |
| U-03 | 3ec2916 | One global Units / Value toggle in the filter bar. |
| U-04 | 442b5d9 | Monthly chart absorbs Sales trend and the PPG panel (Compare: Target / Previous year / None; monthly/cumulative). |
| U-05 | c55f618 | Needs attention becomes a one-column side panel next to Monthly. |
| U-06 | 31bc126 | What drove the change moves to Overview row 3. |
| U-07 | 34c149e | Composition row: Distributor mix · Sales-type mix · Sales by line (shown only with ≥2 known categories covering ≥50%). |
| U-08 | 6265a49 | Sales Analysis tab removed; tabs show only when they have content. |
| U-09 | c6391b9 | Products tab (`public/products-table.js`) replaces Portfolio and the Breakdown product chart; single- and multi-year columns, pinned Total, top 15 + Show all, group by line, export. |
| U-10 | 33c27b6 | Product clicks select the product; drawer removed. |
| U-11 | 263db3a | Single product: Product facts card, bridge by Month. |
| U-12 | 0aa6343 | KPI card sets per state with fallbacks; never a bare "—" card. |
| U-13 | 805bc02 | Years chips (Latest / Last 2 / All), Period control (YTD / Selected months / Full year), Growth comparison and Common months under More filters; title "Sales performance". |
| U-14 | 62bc405 | Multi-year panels: Sales by year, Monthly lines by year, Share of company by year. |
| U-15 | ff22d11 | Product identity across years (renamed packs, products missing in early years). |
| U-16 | e884353 | Historical page retired; `?page=comparison`, saved Historical views and old `tab=analysis` / `tab=portfolio` links open the equivalent state. |
| U-17 | ac8cb7c | Forecast: Required card only with targets; seasonality hidden when the prior year is provisional or missing. |
| U-18 | 2977bb8 | Mobile: filters collapse to "Filters (n)" with a summary; Years row full width. |
| U-19 | 196b928 | Meeting report follows the page: page KPIs, visible panels in page order, Products top 15, Not shown. |
| U-20 | 7c3e786, de84b5e | Dead code/CSS removed; tests updated (see below). |
| U-21 | this commit | V69 token, release notes, this handoff, acceptance screenshots in `docs/v69-acceptance/`. |

## Deviations from the plan and omissions

- The Products tab keeps the internal id `portfolio` (label "Products"; URLs write `tab=products`, and `tab=portfolio` still works).
- A lone composition panel, or a lone Forecast card, spans the full 12 columns (the plan's row rule).
- Full year is disabled for a single open year (it would show an incomplete year as "Full year").
- Clicking a year bar sets a focus-year override; the loaded snapshot remains the latest selected year.
- A10: line/distributor/sales-type options for years where the dimension is not recorded are disabled with "Not recorded for …" instead of being hidden.
- Sales by year PPG labels compare with the previous selected year.
- Mobile filters use a new collapse ("Filters (n)") because no existing bottom sheet was found.
- Deleted `public/breakdown.js`, `public/comparison.js` and their UI tests (`breakdown-ui`, `comparison-ui`, `historical-v56-ui`). `breakdown-core.js` and `compare-core.js` are kept (core tests and product identity use them).
- Old Historical views open with all years selected when they had none.
- `tests/regression.cjs` retired: it drove the V18 DOM (data-global buttons, the app.js product table and comparison charts) that no longer exists. Every invariant that still applies is in `tests/regression-v69.mjs`.

## Tests

DOM tests need `NERHADOU_DOM_MODULE` pointing at a local linkedom. Browser test needs Playwright with Chromium.

- Pass: `management-ui`, `sales-v69`, `regression-v69`, `meeting-report-v61`, `owner-version-v64`, `provisional-2023`, `readability-v63`, `responsive-v60`, `chrome` (was failing on V68; fixed), `view-context`, `products-table`, `product-identity`, `management`, `chart-utils`, `historical-v56`, `comparison`, `focus-comparison`, `breakdown`, `data-manager-ui`, `approvals-ui`, `auto-approval-ui`, the data-management/import tests, and `node --test tests/cloudflare-config.mjs tests/source-baseline.mjs` (8/8).
- `tests/layout-v69.cjs` (new, plan 8.2): A1–A13 at 1440×900 and 390×844 (+360 for scroll): no empty panel, full rows, side column fits, no 100% donut, expected tabs, no horizontal scroll, no growth beside 2023, unknown months never shown as 0, no console errors. Pass.
- Not runnable in this environment (same on V68): `data-server`, `security/auth` (need esbuild), `security/worker` (miniflare), `release-gate` (needs a build).
- axe colour-contrast on `#sales` for A1–A11, every visible tab, both viewports: 0 violations.
- Re-render after a filter change (`node tests/layout-v69.cjs --timings`, 1440, baseline seed, 5 runs): single-year A1 median 38 ms / max 47 ms; multi-year A8 median 37 ms / max 57 ms (targets ≤120 ms / ≤200 ms). Same harness on V68: 21 ms single-year.

## Rollback

Code only: redeploy the previous saved Site version. No data, schema or auth change to undo.

## V69.1 follow-up: multi-year KPI range

With 3+ selected years the KPI row summarises the range (first comparable selected year → focusYear): Sales in the start year, Change start → focus, average yearly growth (CAGR) + total, with the compareYear figures as subtitles. `multiYearRange(ctx,S)` in `public/management.js` picks the earliest selected year before focusYear that is growth-allowed (not provisional) and has a positive figure; when none exists the cards fall back to the compareYear pair. Two-year and single-year cards are unchanged. Tests: `tests/sales-v69.mjs` block A8b.
