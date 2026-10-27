# UI09 / V41 candidate — 2026-10-27

User-approved requested scope implemented: YTD-average forecasts for all active users; year-aware Actual Sales labels and historical label; period controls in filters; eight single-measure KPI cards in requested order; prior-first product monthly table with aggregate Total; optional prior-year chart; company distributor/channel donuts; compact legends; header spacing; owner-only sales writes; administrator presence list; owner reset-link and permanent account removal.

## Deployment prerequisites and boundaries
Production is not deployed by this candidate. Existing main d0c1cfa903195582d92dbc4aa895b5f9e4a28b6a; prior Worker bd47f662-c27f-4255-b06d-197247ef8526.
Privileged delete/reset require SUPABASE_SERVICE_ROLE_KEY as a Worker secret (never frontend/Git). No such secret has been configured in this task. Capability flag hides actions until configured, server fails closed. Reset-link uses Supabase admin.generateLink recovery hashed token in URL fragment; client clears fragment then POSTs to restricted recovery exchange. No emails sent automatically; owner copies link to verified user. Provider one-use/expiry applies. Recovery purpose cannot access data or user-admin functions. Existing current-password change remains available.
Deletion rejects self/owner targets and non-owner actors, requires recent standalone sign-in; suspends and revokes first, deletes Supabase identity then app user/sessions; audit remains. Provider failures leave suspended account and return error. No live accounts were removed or passwords changed during development.
Presence uses server session timestamps, visible-page heartbeat 30s; Online is last authenticated connection within 90s. Last seen may include normal API requests. No new DB migration. Account list refresh 30s only while visible.

Core target math unchanged. Forecast math intentionally changed to average of ALL complete Jan-cutoff months, with missing/negative/estimated guards; one complete month allowed. No fabricated source data.

## V42 refinement
KPI order: selected period Actual/Target/Achievement/Remaining-or-Above; second row Previous-year sales/PPG/Annual target/Annual achievement. Two visual headings, compact spacing and 21–30px figures. V% is an Actual Sales note for scoped filters, never replaces Previous-year Sales. PPG subtitle uses exact prior-year period (YTD cutoff or explicit selected months). No calculation/auth changes in this refinement.

## V43 — identical company/product composition panels
Company Distributor mix and Sales-type mix now use the same mixPanelsTemplate and productMixDonut renderer as the single-product overview/drawer. Both panels occupy equal columns with identical headings, spacing, SVG dimensions, legend styling and responsive stacking. Company-only visible measure/comparison controls removed from these panels; measure follows the dashboard metric. Legacy hidden controls retained for base renderer compatibility. No sales calculations or stored data changed.

## V44 — independent mix measures
Distributor mix and Sales-type mix each have their own Units/Value toggle in company, single-product and product drawer views. Shared renderMixChart uses independently validated distributorMetric/channelMetric state, retained in saved views. Both numerator and denominator use the chart-specific metric and current filters/months. KPI/global metric is unaffected.

## V45 — shared company/product monthly renderer
Extracted the existing company Monthly performance SVG generation unchanged into actualDashboard.monthlyChartHTML(data,metric). Company, single-product and drawer default views all call it: same columns, target markers, overachievement fill, axis, tooltips and legend. Product view supplies product-filtered actuals/monthly targets; optional previous-year mode retains the same pairedChart renderer used by company. Removed product-specific fixed 300px/600px SVG sizing. No stored data or target math changes.
