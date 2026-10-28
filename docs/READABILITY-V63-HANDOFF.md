# V63 manager readability — private trial only

## Baseline and release boundary

Verified GitHub main on 28 October 2026: abcd3d2693c6a6d0078fd042c576ecb48289706b (V62), PR #16 merged. This work is a new branch from that exact commit; do not merge it without owner approval. The company Cloudflare Worker and its config remain unchanged. Only the existing owner-private ChatGPT Site is published for review.

Prior private Site: V62, `appgprj_6acfda6514988191b70ce8587b602beb~appgver_67c4a1daea2c8191a79b2e93fccc1faf`, source af1b50887ace556f0c0a0ef1f1b89ebedde99661. Production rollback baseline (if ever needed after an approved release): main abcd3d2 / Worker 3627438c-676a-4961-9937-a11babfd1a4d. Do not restore a database to roll back code.

## What changed

- Overview headline uses existing comparableSummary/changeBetween/targetSum helpers for selected-period achievement, same-period prior-year growth and number of products below period target. Each unavailable input produces —; it does not turn missing data into zero. Headline follows Units/Value and is hidden outside Overview. Targets remain product-level, with unallocated subsets withheld.
- Plain growth/share/provisional-target wording. Units share is explicitly units share, never called value share. Historical title and sidebar both say Actual Sales · Historical. Revision details retain existing owner-only visibility.
- Historical charts now measure their card width and redraw on debounced resize, without network requests or data mutation. Narrow annual sales/growth charts use horizontal rows so 6 year/value labels stay legible. Monthly labels are thinned, not monthly data points. Missing series segments still break; cumulative guards are unchanged.
- Historical year patterns and markers supplement colours, with labelled legend buttons. Existing partial/estimated indications and tooltips remain. Signed values retain minus signs and colour.
- One contribution panel contains company ranking or selected-product company-share view. Controls, company denominators and underlying model stay separate and unchanged. No second duplicate panel/heading.
- Historical selected-product chip clears to company scope. Existing Actual Sales product chip is retained. These apply to both analytics pages; account/data-management pages have no product analytics scope.
- Visible Historical coverage warning computes incomplete/unverified requested months before common-month intersection. In particular Full year containing 2023 warns Oct–Dec, even if the charts are reduced to Jan–Sep. A fully covered YTD Jan–Sep selection does not pretend those unavailable future months were selected.
- Movement keeps largest 8 matched changes + exact signed Other + any genuine residual + start/end totals. It now fits the container. Dense layouts use numbered bars and a readable name/value key instead of forcing horizontal overflow or truncating product names. Full table, signed totals and reconciliation note remain.
- Mobile line preview shows top 5 (desktop top 6); View all preserves all lines with its existing scroll cue. Actual chart font roles and heights from V60/V61 retained. Donut measure label increased so the fixed 180px donut is nominally above 11px.
- Tabs gain scroll snap and a visible edge treatment, keeping existing swipe hint and keyboard focus.
- Forecast UI restricted to Owner/Admin as required by this brief. Inspection found V62 renderPlanning checked only active status and exposed the tab to viewers; this patch hides the tab and returns a viewer's direct tab selection to Overview. No server authorization/role/auth changes and no forecast formula change.
- Central release.config.json drives footer and HTML script/style/image cache strings plus imports in the edited UI modules. scripts/sync-release.mjs generates them; --check is read-only. prebuild synchronises; release:check verifies. Auth HTML changes are cache strings only, not auth behavior. Production npm build entry must remain build-cloudflare.mjs; private Sites uses its existing run-framework adapter.
- docs/CSS-CASCADE-V63.md records the six current stylesheets and proposed future layers. No CSS rule was deleted or reordered without visual diffs.

## Dead-code inspection / PR #14

`view-lines`, `renderLine`, old Line analysis button and associated line-analysis IDs are already absent in V62. Do not recreate them.

`bd-legacy` is hidden but is not unreferenced: public/app.js controls/renderGroups/renderRankings/comparisonChart plus public/management.js renderExisting/wireDrilldowns still access leaders/achievements/lines-chart and related controls. Deleting the HTML alone would break refresh/render. It is retained, with a follow-up to remove renderer paths and state together after visual regression coverage; no unsupported claim of dead-code removal.

PR #14 remains OPEN, unchanged, not merged/rebased/closed. It targets ui09-v41-review from ui10-historical-single-view. Its optional product-filter single-view change is not fully present in V61/V62 (company/product scope controls still exist). Owner must choose close vs rebase; this UI patch does not import the stale branch.

## Owner decisions preserved

- Forecast Owner/Admin only per hard constraint; no wider visibility.
- Personal Powered by Ali Ashour footer unchanged pending explicit choice.
- Existing public version behavior unchanged; V63 is visible in the private preview only. No decision to expose more release internals.
- PR #14 closure/rebase pending owner choice.

## Validation / actual limits

Baseline before edits: management, comparison (518 assertions), focus-comparison, comparison-ui, breakdown, management-ui, chrome and regression (171 assertions) passed. data-server initially blocked by missing esbuild; npm ci --ignore-scripts --no-audit --no-fund then succeeded. breakdown-ui already failed on V62 because its fake getElementById asserted on dynamically-created bd-full-chart. Replaced that fixture with real Linkedom DOM and verified full chart, independent measures, search, drilldown/back and Excel. Numeric expectations were not relaxed.

After edits: all requested analytic/UI/server tests pass, including management, comparison, focus-comparison, comparison-ui, breakdown, management-ui, data-server, chrome, breakdown-ui and regression. Meeting report regression also passes. tests/readability-v63.mjs records 75 simulated chart measurements at 1440, 1024, 768, 390 and 360px; tests/responsive-v60.mjs also passes with top-5 expectation. See V63-CHART-GEOMETRY.md. Test release assertions updated for V63/cache and intentional copy/access changes only.

Private npm run build and built-artifact release gate pass. The real workerd/D1/private-routing suite passes 28 assertions. A separate standalone build uses the existing production config, without deploy/migration/data-write. Its initial plain npm command lacked standalone settings; rerun through the repository's build-cloudflare.mjs wrapper, not by changing Cloudflare settings.

**Browser verification BLOCKED, not passed.** sites-preview start returned “Another vinext dev server is already running”, PID 15, /site, localhost:4173; managed daemon reports stopped. Existing unrelated process was not killed, no alternative browser stack/port/network bypass was used, and no auth bypass was generated. Therefore there are no truthful browser screenshots, real 390/360px font measurements, sticky-header scroll captures at 0/400/1200px, full-page CSS visual diffs or physical mobile checks. Geometry is simulated DOM evidence only. Browser QA is still required before production approval; preview publication is for owner inspection.

No calculations in management-core.js/data-core.js/focus-comparison-core.js, target definitions, private sales bytes, auth/server routes, schema, Cloudflare settings or secrets changed. No real account or live sales write.

## Review and rollback

Open the owner-private ChatGPT Site with the authorised Gmail ChatGPT account, hard refresh, inspect Actual Sales company/product Overview, Sales Analysis, Portfolio and privileged Forecast; then Historical Units/Value, YTD/Full year, 2023 coverage, product scope/clear and rank search. Confirm account/data management untouched. Inspect all tabs at 1440/1024/768/390/360 and mobile scroll offsets 0/400/1200 before production.

To revert trial code, redeploy saved private V62 above, preserving audience/runtime and all database data. To withdraw GitHub candidate, close its PR without merge. This work performs no production deployment, so the company site needs no rollback.
