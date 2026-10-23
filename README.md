# Nerhadou Sales Analysis

Private company sales dashboard. Production: https://sales.nerhadou.workers.dev

## Build and deploy

- Install dependencies: `npm ci --include=dev --include=optional`
- Configuration and baseline checks: `npm run check:deployment`
- Production build: `npm run build`
- Cloudflare deployment: `npx wrangler deploy --config dist/server/wrangler.json`

Cloudflare Builds may use the existing `npm run build` and `npx wrangler deploy` commands. Vite writes the generated configuration redirect. Exact account, existing database, runtime preservation and private baseline handling are documented in [deployment/CLOUDFLARE-BUILDS.md](deployment/CLOUDFLARE-BUILDS.md).

The repository must remain private: compressed server-side baseline sales are included as verified build inputs. Runtime secrets are held only in Cloudflare. Live sales edits stay in D1 and are separate from code deployment.

## Historical implementation notes

The following sections document earlier app releases and may describe superseded behavior. See `docs/RELEASES.md` and current code for V32 semantics. Source JSON files previously located in `public/` are now server-private.


Private dashboard and shared data editor. Public HTML/JS preserves dashboard v7; Vinext routes protect edits and persist overrides in D1.

## Source and data

- `public/data.json`: original 2026 snapshot; unchanged source reference.
- `public/seed.json`: normalized historical source rows and grouped current-year actuals. Source IDs preserve pack/channel/distributor distinctions.
- `scripts/prepare-data.py`: read-only workbook extraction and reconciliation. Source filenames and row locations are embedded for traceability. Never edits the workbooks.
- `public/data-core.js`: pure import validation, missing-value semantics, effective values, and dashboard projection.
- `app/api/data/route.ts`: authenticated reads, admin-only imports/product registration/undo; server validates the original pasted text independently.
- `app/api/snapshot/route.ts`: authenticated 2026 dashboard snapshot from source plus shared overrides.

Annual-price estimates use the original reported annual value divided by units. The original ratio remains fixed. Editing units recalculates estimated value; a manual value (including CLEAR) overrides the estimate. RESET removes the override. Source annual controls are never silently adjusted. 2022 Spasulance hospital monthly/annual discrepancy remains flagged.

Blank, omitted, JSON null and dash mean no update. Numeric zero is explicit. CLEAR means unknown. Unknown/ambiguous IDs, conflicting identity columns, duplicate cells, malformed numbers and unsupported metrics block the entire batch. Maximum 500 cells changed per import. New periods require an existing catalog product ID; new product registrations are reviewed separately. Targets currently use annual amounts. Stock is a dated monthly snapshot.

D1 contains a single revisioned overrides document and immutable audit entries. Compare-and-swap plus an atomic batch prevents concurrent saves overwriting each other. Undo reverses only the latest revision and creates another audit entry. The initial empty state is inserted lazily; source records remain in the immutable build data, outside migrations.

Administrator: the owner email already authorized on this private Site (`ali.ashour01@gmail.com`), checked server-side together with authenticated user ID. Other authenticated visitors can read; they cannot write. Site audience remains unchanged. No external AI service receives data: Copy AI instructions uses the browser clipboard only.

## Validation

`node tests/data-management.mjs`

`node tests/data-server.mjs` (real in-memory SQLite with mocked Cloudflare binding; tests route authorization, persistence, CAS, undo and registration)

`node tests/regression.cjs` (existing dashboard filters, charts, targets and CSV regression coverage)

Build and publish using the Sites plugin helpers. The schema-only migration under `drizzle/` is applied by hosting. No browser QA was available in this execution environment.

## History v10 and comparison

Run `scripts/prepare-data.py` with the supplied workbooks to regenerate the legacy references, then the script automatically applies `scripts/refresh-history.py` for the approved replacements. Refresh is idempotent. New 2024 source row IDs and 2025 pasted-report IDs supersede the old source rows; old rows are marked `retired` and excluded from actual comparisons and the active catalog. Existing overrides remain separate; retired rows cannot be edited.

2021 blanks were confirmed no sales. 2022 full-year comparisons sum the twelve months and retain the annual control as a separate reconciliation. 2023 missing months use the authorized residual average after aligning explicit product/strength/pack and combining price variants. There are source-scope conflicts (notably monthly hospital Methyltechno vs the unsplit annual source) and negative residuals, so 2023 remains provisional and all growth/movers involving it are withheld. Its annual source also contains blank amount components. Missing values are not zero.

2024 uses the complete monthly workbook, with all 155 leaf rows reconciled to annual units and annual company value. Monthly values use per-row fixed annual average prices. 2025 uses only the newly pasted rounded Actual Value report; `Sum of Target` is never used as Actual Units. Preserve rounding differences; no arbitrary balancing entry is injected.

Comparison has overview, monthly, product movers and detail/data quality tabs, year swap, unit/value measure, YTD, explicit selected months, full year, multi-product filters, and an estimate inclusion switch. Missing baselines are not new launches or zero. Growth requires complete, verified pairs with a positive baseline. 2026 full year remains incomplete. Current-year company YTD coverage is based on actual reporting months; missing distributor combinations are not treated as missing company reports.

A `sourceVersion` guard rejects save requests from an editor that loaded an older source release. Database optimistic revision checks still protect concurrent manual edits. Source requests and manual overrides both refresh the comparison after saving.

Additional validation: `node tests/comparison.mjs` and `node tests/comparison-ui.mjs`. The latter is a DOM interaction smoke test, not browser visual QA.

## History v11 supersedes v10 rules for 2023 and 2025

2025 is now sourced exclusively from `Pasted text(1).txt`: 34 product/line leaves with Actual Units and Actual Units Value for January–December. Line subtotals and Grand Total are excluded; duplicate HI-POTENCY names remain distinct signed line records. All monthly and annual units reconcile to 27,628,835 units. Rounded product-row annual values sum to EGP 2,391,061,163 against the displayed grand total EGP 2,391,061,165. No balancing sale is invented. Blank pivot cells denote no reported activity and are interpreted as zero within this complete report only. The prior value-only report is retired.

2023 uses reported Jan–Sep cells directly, keeping private and hospital/UPA source series separate. Values are labelled estimates using the same Jan–Sep source row's value/units ratio when available. Annual figures remain separate with unknown channel scope; no annual figure is used to backfill or balance months. Previous H23 residual allocations are retired and excluded from charts, active data tables, catalog and exports. October–December are unavailable, and growth remains withheld as requested. Nercafix's source monthly vs row-total difference remains flagged. The conditional example of 133,411 monthly Methyltechno units was never adopted.

The v11 sourceVersion invalidates editors loaded with older source data. Manual overrides remain separate. Earlier source rules and test counts above describe previous releases, not the v11 replacements.

## Version 12 — Growth intelligence
Comparison now has independent multi-year exploration (2021–2026), overlaid monthly trajectories, within-year seasonality heatmap, reconciled product contribution waterfall, size-vs-growth scatter and executive driver/concentration cards. Existing baseline/comparison selectors, period/metric/product filters, tables and exports remain. Source warnings are collapsible, while partial/estimated statuses remain attached to values. Waterfalls retain unmatched scope as a separate residual; no automatic new/lost-product assumptions. 2023 growth remains withheld. No source data or access policy changed. UI smoke tests cover new surfaces and incomplete-scope/empty-selection guards; browser visual QA unavailable in this environment.

## Version 13 — Years side by side
Primary comparison is now a multi-year sales matrix (2021–2026), with arbitrary year selection, units and value together, Units PPG%, Value PPG%, and V% of total company value. V% retains an unfiltered company denominator; PPG% always uses the preceding calendar year and the identical selected period, including an undisplayed predecessor. Missing/partial/unverified scopes withhold percentages. Product and source-supplied line grouping, units/value column modes, row search, latest-year sorting and multi-year CSV export are included. New charts show separate annual units/value, grouped product/year amounts, monthly overlays and a monthly year matrix, plus share/growth heatmaps. Two-year diagnostics are optional; selecting exactly two exploration years synchronizes that pair. Historical lines are not inferred. No source records or access configuration changed. Tests cover fixed-denominator shares, non-consecutive-year growth, scope/estimate guards, signed adjustments and UI selection/filter transitions. Visual browser QA remains unavailable.

## Version 14 — Company / Product, then Units / Value
Replaced the layered multi-year/pair comparison UI with two scope tabs, Company and Product, each retaining its own Units/Value selection. One table shows selected years with the current metric and PPG%; product Value additionally includes V% against the full company denominator. Company totals never inherit the product picker. Charts are tailored to scope: yearly sales, PPG%, monthly trajectories, company product contributions, and product value-share trajectory. The old optional-pair UI, row grouping modes, overlapping measure selectors, and obsolete multi-year model were removed.

Year selection supports all years or any subset. PPG% can use the previous calendar year or the preceding selected year, and every column names its baseline. Table export carries the current scope/measure/period and data status. Existing partial-data, estimate and 2023 scope guards remain. Source amounts are unchanged. Calculations, source reconciliation and DOM interaction smoke tests passed; browser visual QA remains unavailable.

## Version 15 — Vertical comparison table and native Excel export
Moved the year comparison table below all charts. Each selected year is now a row with sales, PPG%, its comparison year, optional product-value V%, and explicit notes explaining unavailable growth. Missing PPG% reasons now distinguish absent prior-year data, source-scope review, missing amount cells/periods, and non-positive baselines. The underlying source/comparability rules are unchanged.

The Export Excel action produces a real OOXML .xlsx snapshot in the browser: numeric amount and percentage cells, the same vertical year layout, scope/period metadata, data notes, readable widths and frozen headers. A standalone reader check opens generated output with openpyxl and verifies ZIP/XML integrity, values, percentage formats, missing cells and layout metadata. No external data upload or export dependency is required.

## Version 16 — Owner-confirmed 2022 / 2023 coverage
The owner instructed us to ignore the seven blank Spasulance hospital monthly cells in 2022 and confirmed the 2023 monthly source through September. Comparison coverage now excludes those exact 2022 cells without changing their raw values. Inactive 2022 value series with annual units/value both zero and all 12 monthly units zero no longer block aggregate growth. For approved Jan–Sep 2023 comparisons, blank no-activity cells do not block units and the broad 2023 scope flag is lifted. Annual 2023 and periods containing Q4 remain restricted.

Some 2023 packs still lack nonzero-activity value amounts. Product percentages remain guarded for those missing amounts; company value PPG may use the owner-approved available total, explicitly marked approximately (≈) in the chart/table, with missing-pack exclusions recorded in table and Excel notes. Raw source cells, reported totals and estimated prices are unchanged. Tests cover August/September, predecessor growth into 2024, approximation disclosure and retained annual/Q4 restrictions.

## Version 17 — Full contribution ranking and compact table
Company contribution now supports All years (summing the chosen period once for each globally selected year) or a single selected year. It lists every source product, with sales rank, exact amount and percentage of the matching company total in either Units or Value. There is no top-eight/Other cutoff; the SVG ranking is vertically scrollable. Unknown amounts remain unavailable and signed adjustments are retained. Approximate percentages based on incomplete amounts are identified.

Removed Compared with and Notes columns from the visible year table and matching Excel table. Growth baselines/data explanations remain in tooltips, the data-notes disclosure and Excel footer metadata. Export Excel now sits in the table header. Tests verify all-years aggregation without annual/monthly double-counting, full ranked ordering and shares/amounts reconciliation, clean table headers and independent opening of the revised XLSX output.

## Version 18 — Actual-performance ranked lists, contribution shares and Excel
Actual breakdown charts now list all products/lines with rank, exact sales/shortfall amounts and contribution percentages in bounded scroll areas. Sales contribution uses the total company's units or value for the same selected months, before dimension filters; target-gap percentages use the selected total positive shortfall instead. Product and line shares preserve signed adjustments and withhold percentages for unavailable/nonpositive company denominators. Existing month/target behavior and click-to-filter interaction are retained.

Portfolio Units/Value/Mix tables include the corresponding company contribution columns, and Export Excel is placed alongside the table search. It exports the current filtered/searched/sorted table to a real .xlsx with numeric amounts, percent formats and current period/target context. The OOXML packaging is shared with comparison export. Regression checks cover no top-N truncation, denominator invariance, totals and gap-share reconciliation, formula-like text safety and export placement. Both actual and comparison generated workbooks were independently read to check columns, numeric values, percentage formats and ZIP integrity. No source workbook/snapshot or access policy changed. Browser visual QA remains unavailable.

## Version 19 — Recurring updates and dynamic reporting periods
Actual performance is year-aware rather than fixed to 2026. Latest available year/month is followed by default; explicit older years, month cutoffs and month subsets are retained. New months, products and years refresh filters, summaries, charts, portfolio exports and comparison. Gaps between reported months remain unavailable instead of appearing as zero sales. New years do not inherit targets automatically. Where complete twelve-month histories exist, comparison annual totals are calculated from the current monthly records so backfills update annual results; original annual controls remain separately available for reconciliation (including small source rounding differences).

Data management includes a monthly template generator with exact source-series IDs and validated descriptive labels. It supports Units-only, Value-only or both, with up to 250 series per batch / 500 changed cells; the current 213-series 2026 catalog fits one batch. Blank template cells are no-ops. Existing records are updated, new periods are created, and new product series can be registered through the existing admin workflow.

An explicitly previewed reporting cutoff sets later actual periods (and out-of-scope FY actual controls) aside without deleting amounts or targets. Extending the range restores existing records; direct imports restore the supplied archived records. A partly restored period is marked incomplete until its range is restored/updated. Cutoff, import and undo are saved as shared revisions, restricted to the administrator. No automatic deletion is inferred from rows absent in a partial paste.

D1 now stores overrides and audit changes per record, removing the earlier 1.4MB whole-state storage cap. Schema migrations 0001/0002 only add tables and an audit index; the runtime atomically converts any existing legacy payload on first access. Legacy audit undo remains compatible. Batched writes retain compare-and-swap revision checks and all-or-nothing transactions. No source workbook or seed sales was modified.

A lightweight authenticated revision poll checks visible pages every 60 seconds and when returning to the tab. Changed data refreshes both views; Refresh data is also available manually. Stale edit previews are invalidated before saving against a newer revision.

Validation: real SQLite route tests cover old/new periods, 2027 actuals and targets, June cutoff/December restore, reimport/undo, auth and concurrent writers, legacy storage migration, state larger than the old cap, large undo and revision polling. Pure and DOM smoke tests cover monthly templates, save/refresh, old-month annual recalculation, June/December/new-year selectors, retained manual selections, coverage guards and existing dashboard behavior. Browser visual QA is unavailable in this environment. Tests use isolated data; no example sales were inserted into production.
