# Sales V73 review fixes · handoff

Branch `claude/project-thread-xc79gd` from `main` 98068fc (V72). Source plan: Sales V73 review plan (N-01–N-18, from the review of V72). Ali approved implementing it and deploying straight to live (merge to `main`, Cloudflare Workers Builds deploys), without a separate preview step. Rollback target: V72 on `main` at 98068fc.

Hard rules kept: missing values are unknown, never zero; targets stay product-level (never allocated, never double-counted); `effectiveRecords` and the management-core helpers (`movement`, `movementTotals`, `comparableSummary`, `seasonalProjection`, `runRateProjection`) are reused, no new aggregation math; no change to `private/`, `deployment/source-baseline/`, auth, `app/api/*`, D1 or source data.

## Status per item

| Item | Status | Notes |
|---|---|---|
| N-01 historical bridge by comparison name | Done | **Rule chosen (step 2): the year rule.** A single-year bridge with dimension Products or Month uses `comparisonRecords()` when `min(a,b) < latestYear − 1` (any year before 2025). 2025 → 2026 keeps raw names, so the S1 bridge is unchanged. Product selections are translated with `translateProducts(…,'multi')`; bar names use `productDisplayNames().multi`; clicking a bar selects every focus-year source name of that comparison product (`selectProduct` in app.js now accepts a list). S8: Methyltechno +27,431,427, residual 16.1M (was "Unmatched +847.2M"). 2022 → 2023 residual −3.1M (was −431.9M). Products table: the previous-year side is looked up by comparison name when the compare year is before latest − 1, **only when the focus year has exactly the selected source names under that comparison name**; when a product is split into several price versions in the focus year, the cell stays unknown with "2024 splits this product into several price versions; see What drove the change" (counting the whole product against one price version would be wrong). 2025 view: 31 of 33 products now show 2024 sales; 2024 view: 23 of 111 rows. |
| N-02 like-for-like KPI cards | Done | Big number stays the full period; the subtitle shows `Jan–Sep: EGP 1.03B vs EGP 789.9M (2023)` (sales, units, price) and `Jan–Sep avg: EGP 114.5M vs EGP 87.8M` (average), so the chip % follows from the two numbers. Bridge end bars print the months ("Jan–Sep") on a second line and in the tooltip. |
| N-03 multi-year caption | Done | `periodNoYear()` → "2025 → 2026 · YTD Aug in both years". Single-year captions also drop the year. |
| N-04 phone KPI clip | Done | Root cause: `#kpis .kpi{max-height:150px;overflow:hidden}` made the flex children shrink, cutting the value. Cap removed, value/label/chip `flex-shrink:0`, label is a wrapping flex row, phones drop "· EGP" from the label. Layout test now checks value-below-label and value height. |
| N-05 phone bridge note | Done | HTML note above the chart on phones. |
| N-06 phone monthly 12 months | Done | ≤12 months never skip labels; initials when slots are narrow. One "unknown" label per run of unknown months. Bar labels (growth/achievement/value) print only when the widest fits its slot, else none and "… in tooltip and table" under the chart. Neighbour step-up threshold 4 → 8 px. |
| N-07 filter row | Done | `#filter-actions` row (More filters · Reset filters · chips), Period select min 150 px, Months summary "Mar" / "Jan, Mar" / "5 months", phone summary drops "No other filters". |
| N-08 2023 banner | Done | "Oct–Dec 2023 are not in the source. Figures below cover Jan–Sep only." Old text only when no month is recorded. |
| N-10 compact rounding | Done | `compact()` (module + app.js copy): 2 decimals below 10 of the unit, else 1; trailing zeros dropped; callers no longer pass digits. Sales by year uses it too. |
| N-11 sign after currency | Done | `sAmt()`: "EGP +576.5M"; Needs attention uses it. |
| N-12 status strip | Done | Multi-year "Jan–Aug, 2021–2026"; Selected months shows the months; "2023 includes estimates" when 2023 is selected; "No manual edits" / "Edited 3 Nov by <name>" (revision in the tooltip). `updatedBy` comes from the latest audit entry in data-manager.js. |
| N-13 mix panels | Done | One layout (name + value line, bar under) at every width; Sales by line top 6 + "Show all (n)" on desktop. |
| N-14 phone Forecast | Done | Narrow chart uses the full width; end values in a row under the chart; Products at risk as cards on phones; new "Projected FY (seasonality)" column from `seasonalProjection` per product (also in the export). |
| N-15 Needs attention merge | Done | Same product as change driver and target gap → one card ("Growing, but below target": "+2,184,070 units vs 2025, but 56% of target (1,749,761 to go)"). |
| N-16 one KPI format per row | Done | If any EGP value in the row is compacted, all EGP values ≥ 10,000 are. |
| N-17 tab change message | Already working | V72 already shows "Forecast needs one open year. Select 2026 only." when the user is moved off Forecast; verified in a browser and covered by `tests/sales-v73.mjs`. No code change. |
| N-18 Sales by year values | Done | First and focus years always labelled; others above the bar when the label fits its slot (11 or 10 px), else inside the bar (white 10 px) when the bar is ≥18 px tall and wide enough. Plain "inside the bar" was unreadable when the text overflowed the bar, so the above-the-bar 10 px option comes first. |

## Tests

- `tests/sales-v73.mjs` (logic + linkedom DOM): N-01, N-02, N-03, N-06, N-07, N-08, N-10, N-11, N-12, N-15, N-16, N-17, N-18.
- `tests/layout-v72.cjs`: new N-04 and N-06 checks; 12 states × tabs × 1440/390 pass (known warning: S9 Monthly card 135 px short).
- `tests/sales-v72-ui.mjs`: the Products-at-risk gap column moved from index 4 to 5 (new seasonality column).
- `tests/chart-utils.mjs`: new compact rule cases.

## Known limitations

- 2023 and 2024 Products rows stay per price version; their previous-year cells are filled only where no other price version shares the comparison name.
- S9 Monthly card still ends ~135 px above its neighbour (unchanged, reported by the layout test).
- Targets tooltip wording (R-15) still waits for Ali.
