# V61 — Historical comparison, responsive Actual Sales, and meeting reports

Owner approved publication of all preview changes and asked to repair Meeting report before publishing.

## Meeting report repair

`premium.css` incorrectly selected `#meeting-report` in the primary button styles, painting the document blue and changing it on hover. The selectors now target the actual `#meeting-open` button. The report has its own neutral document styles, compact cards, clear scope and period, separate sections, readable tables, and Cairo generation time.

`management.js` no longer copies live dashboard panels, controls, IDs or the hidden company trend into the report. Actual reports are built from current effective records, selected filters, selected Units/Value and the existing target/summary helpers. Company and one-product reports use their own scoped monthly values. Monthly detail targets always refer to those months; product detail explicitly labels selected-period vs full-year targets. Contribution tables show Top 8 + exact signed Other and retain genuine residuals. Historical reports use the selected comparison model, years, period, measure, comparison baseline and coverage definitions; charts are read-only SVG snapshots, followed by annual and monthly tables. Chart copies remove IDs, data handlers and tab stops. No report contains actionable cloned dashboard buttons.

Print rules repeat table headers, avoid splitting rows, remove modal chrome and scrolling constraints, and use A4 landscape. Mobile reports stack cards and allow horizontal table/chart scrolling. Resize rebuilds the open report without fetching or writing data. No export/table download behavior or actual arithmetic changed.

## Included approved preview work

- V56: Historical summary and coverage, common months, selected/calendar growth basis, monthly/cumulative trends, company/product shares, ranking search/order, optional separate-product comparison, source line filters, annual/monthly tables and Excel exports.
- V57: exact private Site origin repair, retaining standalone fail-closed boundaries.
- V58–59: explicit YTD/full-year/selected-month, year, measure and number-meaning labels on all Historical charts.
- V60: card-width Actual SVG geometry, readable type and heights, shared company/product sizing, responsive Breakdown, Top 8 Movement + Other, complete detail and keyboard-visible scrolling/tabs.

See HISTORICAL-V56-HANDOFF.md, HISTORICAL-V59-CONTEXT.md and RESPONSIVE-V60-HANDOFF.md for details.

## Validation and limits

Meeting-report DOM regression covers company/product reports, Units/EGP, period and annual target labels, equality with the selected dashboard KPI, correct monthly bar count, Historical report years/share/coverage, no duplicate IDs or interactive copies, corrected button selector and print-table rules. Existing Actual geometry, historical DOM, financial regression, management calculations, security, source-baseline/config, production build and private-artifact checks are run before merge.

DOM and workerd checks are not rendered browser/PDF or physical-mobile certification. Managed preview remains unavailable because another Vinext dev process occupies the supplied preview environment; no process is killed or alternative browser stack installed. Production deployment is verified through the Cloudflare GitHub build and unauthenticated fail-closed endpoints. Real signed-in UI and PDF appearance need owner review.

## Publication and rollback

Repository AliAshour01/nerhadou-sales-analysis, main; company Worker sales at https://sales.nerhadou.workers.dev, company account 779017f931176fc4feefa3c69ef80304. Preserve current Cloudflare secrets, Supabase settings, D1 binding and standalone mode. The build/deploy does not migrate, import, restore or write sales/accounts/passwords. All source baseline bytes remain unchanged.

Prior company main 19e6251172b311d6cbc1e10bed3b39c9d9476f5c; prior Worker version fcdef59a-c77d-44d2-9347-b8204286f9dd. Prior private Site V60 appgprj_6acfda6514988191b70ce8587b602beb~appgver_f203065a9e148191a3a4da5c0f835121, source 2962f91c575262fdd370f4e512c3be1be3020df9. Roll back application code only, never sales data, account state or runtime secrets. Deployment evidence is recorded after confirmation.
