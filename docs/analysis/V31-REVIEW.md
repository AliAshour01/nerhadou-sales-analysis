# Version 31 — private management review

## Delivery scope

Deploy only to the existing owner-private ChatGPT Site for review. The independent Cloudflare Worker is not changed. Version 30 / commit `85f9c7a22242cec0bdfc89c5fde9105ac2de727c` is the saved rollback point. Returning to it must not restore or modify sales data.

## Implemented

- Management KPI summary, explicit PPG baseline and Units / Value achievement / remaining target; selected scope and data-health context.
- Same-month product, line and distributor bridges. Missing group baselines produce an explicit unmatched-detail residual; totals reconcile exactly. Product increase/decline rankings use absolute change.
- Monthly target markers with optional previous-year bars; monthly target scope ignores global Target basis. Explicit monthly schedules take precedence over annual / 12; incomplete schedules are unavailable.
- Distributor mix / previous-year comparison; signed target variance; single-product ranking replaced by labelled distributor detail.
- Scrollable product/month Achievement or PPG heatmap; product details preserve background filters; line analysis preserves year-specific source line names and withholds unallocated targets.
- Deterministic attention rules (decline, shortfall, units/value divergence, three-month decline, distributor concentration). Rules describe observations, not causes.
- Common available months toggle in Historical comparison; explicit year-pair bridge; existing Company/Product, Units/Value, table and Excel workflows retained.
- Account-scoped local saved views (same browser only), filter-only links requiring normal approval, Excel detail exports and printable meeting report. A blocked clipboard has a manual-copy fallback.
- Read-only, non-seasonal year-end run-rate scenario, gated on complete January-through-current data and at least three months. Estimated/negative recent values withhold the scenario. This is not a validated forecast.
- Stock readiness review only; automatic stock coverage, SKU price/volume decomposition, IMS market share and line-specific authorization are not enabled without reviewed inputs / a defined permissions policy. No unsupported values are invented.

## Data and security boundaries

All analysis reads effectiveRecords. Cutoffs, full replacement removals, manual edits and estimates remain respected. Blank = unknown, signed adjustments remain signed, PPG requires a positive prior baseline. The owner-approved 2023 available-company-total exception is not silently granted to a filtered product or line. Current-year target records are never assigned to historic lines. Company V% keeps the full-company denominator; Breakdown keeps selected sales; target gap shares keep selected shortfall.

Source hashes before changes:

- private/seed.json: `77df866c0ef8253b9a32b9a241e643ebc7338d782bbcb6cf41097dc7c97f426f`
- private/data.json: `08c68c0ba898f8b3e03cd68a4fd49eb88245deb35b5d422f5cef9433d1402084`

Only metadata added to authenticated GET responses: latest saved timestamp and explicit monthly target schedule. No public source data assets, auth bypass, new write route, credential exposure, dependency change or database migration.

## Verification

Calculation and integration results are recorded after the final check run. Linkedom DOM checks exercise events and DOM content; they are not visual browser QA. No control-browser skill is available in this environment; no unsupported preview/browser route was used. Existing dependency advisories and standalone acceptance limitations from Version 30 are not claimed fixed by this analytics release.

## Review checklist for Ali

1. Overview: Units/Value toggle, PPG same months, period/full-year target; monthly chart must not follow global target basis.
2. Movement: group by product/line/distributor, choose baseline year; totals and residual labels.
3. Heatmap: Units/Value and Achievement/PPG; grey unknown vs reported zero; click a product/month.
4. Line analysis: choose line; source names, unallocated target states, products and export.
5. Product dialog: metrics, prior year, company V%, target, distributor/channel mix, close preserves filters.
6. Historical comparison: arbitrary years, common-month toggle, explicit pair bridge; retain company/product table export.
7. Save / share view, preview meeting report, Print / Save PDF on desktop and mobile; approve layout before independent deployment.

Final validation:

- Production build: passed (existing framework sourcemap/config-loader advisories remain).
- Management pure calculations and Linkedom DOM interaction checks: passed, including real-data bridge reconciliation and repeated refresh without duplicated controls.
- Existing Actual regression: 171 assertions; comparison/source: 481; data management: 580; authenticated SQLite data server: 100; authentication: 118 (real signatures/JWKS, mocked provider HTTP); built Worker: 23 — passed.
- Focus comparison model/UI, XLSX export, dynamic updates, new-series import, bulk import, replacement/undo, fullscreen/navigation controls: passed. Chrome release-label/cache checks updated to Version 31; the official logo remains byte-identical.
- Existing protected Version 26 / data revision 1 backup restored in an isolated local in-memory database: exact reconciliation of 71 period groups, 1,557 overrides and 1,557 audit changes. This is a backup-format regression check, not a new backup or restore of either live deployment.
- Source sales hashes unchanged; no live sales writes made during this work.
- No visual browser review, external penetration test or independent Cloudflare deployment performed for this release.
