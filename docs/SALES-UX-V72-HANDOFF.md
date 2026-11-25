# Sales V72 review fixes · handoff

Branch `claude/project-thread-ps58n1` from `main` 291a26c (V71). Source plan: Sales V72 user review plan (R-01–R-23, 12-step acceptance list). **Not merged, not deployed.** Ali tests first.

Hard rules kept: missing values are unknown, never zero; targets stay product-level (never allocated, never double-counted); no change to `private/`, `deployment/source-baseline/`, auth, `app/api/*`, D1 or source data.

## Status per item

| Item | Status | Notes |
|---|---|---|
| R-01 bridge treats an unrecorded year as 0 | Done | `dimensionRecorded` / `dimensionGap` in management-core. Stricter than the plan: a year counts as recording a dimension only when **every** row in those months has a known value. 2025 sales type has an undivided "COMBINED / SOURCE" bucket, so sales-type filters against 2025 are withheld too. The Products table also hides PPG/change columns and gives the reason. |
| R-02 one 2023 rule | Done | Rule chosen: comparisons use the months **both** years record. 2024 vs 2023 = Jan–Sep, captioned "Jan–Sep only, Oct–Dec 2023 not recorded", in KPIs, monthly chart, bridge and Products. 2023 card 1 = "Sales Jan–Sep 2023 · EGP" with a Provisional chip. The other 2023 cards come from the normal slot logic (Avg per recorded month, Best month, Sales units) rather than the plan's exact list. A renderer can return `{empty: reason}` and the panel moves to "Not shown". Products show the recorded Jan–Sep subtotal for 2023. |
| R-03 full-year progress | Done | Only for a contiguous Jan…n period. |
| R-04 KPI clipping | Done | Compact above 14 characters; exact value in title, screen-reader text and `data-exact` (meeting report uses it). |
| R-05 / R-06 bridge labels | Done | Labels fitted to the slot; numbered keys only when a fitted name would be under 4 characters; month bridge always shows month names and values. Names are **not** title-cased: the display name is the latest-year source name (title-casing broke strengths such as "50MG"). |
| R-07 Needs attention | Done | No inner scrollbar; top 3 on desktop, 2 on phones, Show all expands in place. |
| R-08 blank areas | Done | One product over several years: Sales by year + Share by year side by side, Monthly and bridge full width. Product facts up to 6. Mix and Needs attention panels keep their own height. Remaining: S9 (one selected month) Monthly card ends ~135 px above its neighbour (reported by the layout test, not failing). |
| R-09 Sales by year | Done | Value labels only on bars ≥44 px; growth on one line (11 px, integer % if it would not fit); Table view. |
| R-10 concentration | Done | Skipped for one distributor or fewer than 2 groups. |
| R-11 tabs | Done | Unavailable tabs stay visible, disabled, with the reason and a fix-it link. |
| R-12 View restored | Done | Only dropped filters/years are named. |
| R-13 filter grid | Done | Stable desktop grid; Through stays visible (disabled) for Full year. On phones the chips are inside the filter sheet. |
| R-14 one primary action | Done | Full screen is a secondary button; header data state hidden on the Sales page only. |
| R-15 status strip | Done | "Targets are provisional" text kept as is; the targets tooltip wording still needs Ali's input. |
| R-16 mix bars | Done | All mixes use the bar renderer; donut code and CSS removed. |
| R-17 phone cards | Done | 2×2: Sales, vs PY/Growth, Ach (coloured), Variance. |
| R-18 share bar | Done | Under the number, 4 px. |
| R-19 Combine tender | Done | Combined sales and targets (Methyltechno 8,000,000), PPG recomputed, expandable members; tender variants indented in the picker; export labels "+ Tender". |
| R-20 Forecast | Done | Range band, one-line reason (S1 units: "19% apart… Sep–Dec were 44% of 2025 sales"), Products at risk table (top 10, Export, hidden under distributor / sales-type filters with the reason), end labels right of the plot with leader ticks. |
| R-21 phone Mix | Done | One Mix card with Distributor / Sales type / Line switch; attention top 2. |
| R-22 phone month labels | Done | All labels up to 9 months, 11 px; touching % labels step up one line. |
| R-23 historical names | Done | Needs attention, Products rows and cards use the display name; source name as a muted second line and tooltip. Not title-cased (see R-05). |

Nothing is BLOCKED.

## Known limitations

- 2022 → 2023 bridge shows a large "Unmatched" residual: 2022 and 2023 product names differ. Pre-existing V71 behaviour.
- 2023 Products rows show "—" for 2022 per product for the same reason (only the total compares).
- Test files that already fail on V71 `main` in this environment, unchanged by V72: `chrome.mjs` (expects an old asset-token prefix), `comparison-xlsx.mjs` (fixed scratch path), `data-management.mjs`, `data-server.mjs`, `layout-v69.cjs` (phone filter toggle not clickable). `npm run lint` was not run (no `node_modules` in the review container).

## Validation

- `node tests/<name>.mjs` for sales-v72, sales-v72-ui, sales-v69, regression-v69, management-ui, provisional-2023, view-context, products-table, product-identity, management, readability-v63, meeting-report-v61, responsive-v60 and the other UI suites: pass.
- `node tests/layout-v72.cjs [--shots DIR]`: 12 review states × available tabs × 1440/390 — no clipped KPI, no inner scrollbars, no overlapping bridge / Sales by year labels, every month label up to 9 months, no "View restored" on load, no horizontal scroll, no page errors.
- `npm run release:check`, `npm run check:deployment`: pass.

## Screenshots

`node tests/layout-v72.cjs --shots shots-v72` writes `S1…S12-{overview,portfolio,forecast}-{1440,390}.png`. Before/after pairs for S1, S3, S5–S10 (V71 vs V72) are in the project files under `sales-v72-shots/`.
