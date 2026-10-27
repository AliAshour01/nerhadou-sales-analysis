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

## V46 — match monthly control layout
Single-product/drawer monthly controls now place Units / EGP value and Actual + target / Add previous year together below the Monthly performance title and period caption, matching company order and compact sizing. No full-width prior-year strip.

## V47 — section tabs, total row and Trends cleanup
Monthly Total rows now carry an explicit total-row class; all cells including the sticky first label share the same background. Removed Planning tools & data readiness markup and its obsolete stock-readiness rendering/import. Sales section tabs now have larger 44px targets, clear borders and a blue selected state, visible keyboard focus and horizontal overflow on narrow screens. Data and calculations unchanged.

## V48 — company Sales Analysis
Company/multi-product navigation consolidates Trends, Movement and Breakdown into Sales Analysis, presenting existing sections in a continuous page with headings and no nested tabs. Controls, charts and exports are reused; analysis renders movement and breakdown together. Single-product navigation retains Trends and Movement; Breakdown remains hidden. Legacy saved company sections normalize to analysis. Switching from company analysis to one product returns to Overview. No data/calculation changes.

## V49 — Sales Analysis refinements
Hide global Compare against control on combined Sales Analysis (still available in Portfolio); remove redundant injected Breakdown heading. Breakdown captions use YTD cutoff for contiguous YTD, retaining explicit months for noncontiguous selections. Movement bridge now allocates 144px per category with 14-character label wrapping, including long tokens; full names remain in keyboard/hover tooltips. Preserve residual reconciliation and missing-versus-zero behavior.

## V50 — owner-confirmed new sales rule in Movement
Owner confirmed absent product/channel rows mean sales had not begun. Movement now counts absent rows as zero only when the company report covers all selected months and has no incomplete flag or unknown metric. Explicit null values, absent company months and unverifiable historical coverage stay unknown. New prior-zero/absent groups receive newSales/activity labels; table PPG shows New, never infinity. All deltas reconcile. Other comparison/forecast calculations remain unchanged.

## V51 — seasonal forecast and rounding-only residual
Replaced Target Achievement Forecast with Historical Seasonality Forecast: current YTD / (prior-year same-month actual / prior-year full-year actual). Same scope and cutoff, strict 12-month prior coverage, positive prior denominators, no missing/estimated/unverified/negative amounts; new products without history show a reason. Forecast tooltips disclose exceptional tender/launch sensitivity. Movement ignores only machine-precision residuals scaled to aggregate magnitude (EPSILON × scale × 32); genuine unmatched amounts remain. Verified bundled value residual was 0.0000011920928955078125 EGP with zero unmatched products.

## V52 — Breakdown measure placement and remove Heatmap
Moved Breakdown Units/Value into the product card options immediately beside Sales / Target shortfall, wrapping together on narrow screens. Removed Heatmap navigation, section markup, rendering functions, delegated controls and saved UI state handling. Old Heatmap sections safely fall back to Overview (including saved views). No data/calculation changes.

## V53 — independent Breakdown measures
Product performance/Target shortfall retains its own metric; Sales by line now has a separate Units/Value control and model. Tooltips, View all, line drilldown and Excel export use the originating chart metric. Saved views persist lineMetric; legacy views fall back to their former shared metric. Header period no longer implies one shared measure.

## V54 — integer Breakdown display and single-product Sales Analysis
Breakdown amount labels/tooltips now format whole numbers; compact millions have no decimal. Percentage precision and underlying calculations/Excel numeric cells remain intact. For exactly one selected product, Sales Analysis displays Trends, Movement and Portfolio as continuous sections with no nested tabs; company retains Trends, Movement and Breakdown, with separate Portfolio. Visibility responds to changing product scope while the combined page is open. Old single-product section links restore into Sales Analysis.

## V55 — fixed company email suffix and attribution
Sign-in/sign-up and other email forms show a fixed @nerhadou.com suffix. Username input accepts local part or a pasted full company email; blur normalizes display and submit builds one full address. Foreign domains, extra @, empty local parts and malformed dot placement are rejected client-side; authoritative server domain/auth policy unchanged. Powered by Ali Ashour appears in common dashboard footer and auth/account footer. No user data or auth provider configuration changes. Private preview still uses protected platform authentication; company login backend is exercised only on standalone deployment.

## Production publication and owner password management
Owner authorized direct production publication after automated checks, with no further preview approval. Password policy now min 6 characters, no composition/common-password exclusion; provider 72-byte limit remains. Owner set-password uses masked fields, fresh standalone owner session, CSRF/version validation, server-only admin API, session revocation and audit without the password. Requires SUPABASE_SERVICE_ROLE_KEY in company Worker. Provider min length and required characters must match application. External setup/live password mutation acceptance are distinct from mocked tests.
