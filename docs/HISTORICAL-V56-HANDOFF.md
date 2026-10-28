# Historical V56 preview — 28 October 2026

Preview-only; do not merge or publish to the company Worker without owner approval.

## Delivered
- Explicit coverage chips per selected year and default common-complete-month comparison. Turn the common-month option off to inspect incomplete requested periods. Requested cutoff/year choices remain retained.
- Four compact actual/prior/change/growth cards, one active Units/Value measure. Auto growth baseline uses previous selected year for a two-year pair, otherwise calendar prior year; manual choice overrides auto.
- Monthly or January-based cumulative chart; cumulative unavailable for noncontiguous selection, incomplete month blocks subsequent running totals, estimated status carries forward. Click year legend to hide/show series without altering table totals.
- New activity rule in Historical only when product exists in catalog and full-company period is complete. Missing cells, unknown product names and explicit incomplete flags never become zero. Historical line filters use source-year labels only, with no inference from current organization.
- Product company share in Value (V%) or Units%; denominator always full company before historical line selection. Original model share field remains value-only for backward compatibility; unitShare is separate.
- Full scrollable product ranking retained with search/name/sales/change sorting. Growth ordering uses the preceding selected comparison year while bars retain actuals; note states this distinction.
- Optional latest-selected-year comparison of up to three separate products, using same period and measure. No aggregation of selected product identities.
- One bottom table region with annual/monthly mode. Annual rows show sales, absolute change, growth with comparison year, optional product share; one local Excel button exports selected table mode, unrounded numeric data and notes.
- Existing historical movement reuses product contributions for company, monthly contributions for one product; missing monthly contributions withhold the bridge rather than invent a value.

## Files
public/comparison.js, public/focus-comparison-core.js, public/management.js, public/index.html, public/ui06-preview.css. Existing general XLSX writer reused. Tests include core new-activity/coverage/line/share invariants, real DOM interactions and retained historical source fixtures.

## Limits
Source lines are not reconstructed for years lacking assignments. The three-product comparison uses the latest selected year; the main screen still handles multi-year comparison. Unknown/estimated 2023/full-year coverage rules remain. Product packs/Tender names preserve the reviewed comparison mapping. No new historical targets or inferred target achievement.

## Rollback
Previous private Site V55: appgprj_6acfda6514988191b70ce8587b602beb~appgver_d09d4e5f818c81919d444e582586aa85, source 71c87140d8ccea95671ab0b4419f2236f1cb212c. Company production base: 19e6251172b311d6cbc1e10bed3b39c9d9476f5c. Application-only rollback; never restore sales data.

## Validation
Existing comparison/source/model/UI/XLSX suites and new Historical V56 core/real-DOM tests pass. Managed browser preview could not start because its environment reported a different vinext dev server already running at /site (PID 15); no process was killed and no environment bypass attempted. Visual browser QA is therefore not verified. Native Site deployment and automated checks remain the delivery evidence.
