# V60 — Actual Sales chart readability preview

Preview only. Company production and all data remain unchanged.

## What changed

- `public/app.js`: shared `chartWidth`, `plotSVG` and `monthStride` helpers. Monthly actual/target bars and the two-scale Units/EGP timeline derive their geometry from the actual chart host width. SVG user units equal CSS pixels; fonts stay 12px rather than shrinking a 640/960px image. Monthly plot height is 270px; timeline 410px. All points/bars and full tooltips remain, with fewer visible labels at narrow widths. Calendar gaps still break timeline lines.
- `public/management.js`: company, single-product and product-drawer monthly and previous-year charts use the same width helpers. Achievement/PPG stay 250px high. Signed mix/ranking fallbacks and distributor comparisons use width-aware rows. ResizeObserver watches the main content and Sales container; a debounced width-only fingerprint reflows current charts without data fetches, writes, filter changes or scroll navigation. Dialog/tab opening also schedules measurement. No polling, new observer per render or height-based loop.
- Movement shows the eight largest absolute matched changes, an exact signed Other sum, and any genuine residual separately. Starting/ending totals are preserved. All original contributions remain in the existing full numbers table; grouped Other also has its own details. Wide geometry is bounded to roughly 11–12 bars with 92px slots instead of 144px; horizontal scroll has an explicit hint, visible scrollbar and keyboard-focusable region. Long names wrap in bounded slots and are complete in tooltips.
- `public/breakdown.js`: horizontal product rows keep 12px labels. Narrow cards place names, bars, full numbers and shares on separate lines. Sales by line shows top four on narrow cards, top six otherwise. View all still opens every product/line in the same chart style, with keyboard scrolling for the wide line chart and vertical scrolling for product rows. Search, denominators, independent measure buttons, drilldown and exports are retained.
- `public/ui06-preview.css`: removes old SVG min-width/scaling conflicts for the new responsive SVG class, contains overflow, stacks cards on mobile, and adds clear tab/scroll affordances. Forecast tab text does not shrink/truncate; tabs remain keyboard focusable. Reduced-motion preference is retained.
- Cache tokens for app.js, management.js, breakdown.js and preview CSS are `responsive-v60`. Historical comparison code and calculations remain unchanged; its shared Movement renderer receives the improved bridge layout.

## Validation

- `tests/responsive-v60.mjs`: real Linkedom DOM with simulated card widths corresponding to 320, 375, 768 and 1440 viewports. Checks company and one-product views, target/PY charts, 1:1 SVG pixel geometry, >=11px text attributes, >=180px rate-chart height, top-four mobile lines/full detail, bounded bridge, keyboard regions, all data points and zero fetches on resize. This checks geometry contracts, not browser CSS layout or screenshots.
- Existing management DOM interactions, management calculation/seasonality/reconciliation, Breakdown model tests, comparison UI and XLSX, workspace access, Chrome/fullscreen tests and 171 source-data regression assertions passed.
- Two stale fixtures were corrected: regression's fake querySelectorAll now handles the current Sales section selector; Chrome accepts numbered preview labels and responsive cache tokens. The original regression fixture failed on unchanged V59 before correction; no application tab behavior was altered to satisfy it.
- Managed browser preview could not start: another Vinext dev server is already running at `/site` PID15. The process was not killed, the network/sandbox was not bypassed, and no substitute browser stack was installed. Physical mobile, rendered CSS, screenshots, sticky header and signed-in live browser QA remain unverified. The user must review the private preview before company publication.

## Boundaries and rollback

No edits to private/seed.json, private/data.json, source books, actual math, targets, missing-data rules, security config, passwords or schema. No company Cloudflare deployment. Private Site retains owner-only ChatGPT authentication. GitHub draft branch remains unmerged.

Prior private V59: `appgprj_6acfda6514988191b70ce8587b602beb~appgver_7dd6bd458e3c81919a57989fee7ef403`, source `843360c675ba11faafafe248b7515d9b029f3138`. Revert application code only; preserve the current APP_ORIGIN and all sales data.
