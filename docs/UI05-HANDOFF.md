# UI05 continuation

Parent: UI04 (merge commit 8451252c724ff0093ef9b6f60c8e80dd524064e3). Goal from the owner: a more professional interface within the approved blue/white identity.

Scope: presentation only. All new rules are in the UI05 block at the end of public/polish.css and are grouped as tokens, shell, saved views, filters, summary cards, tabs/panels, tables, comparison, dialogs/footer and small screens. public/index.html changes are limited to the stylesheet cache label, two navigation icons and the footer label. No change to app.js, management.js, data-core.js, API routes, auth, exports or deployment.

Design decisions to preserve:
- One primary action in the header (Meeting report). Other header actions are outlined.
- One field style for every select, input and the Products multi-select (40px, 9px radius, shared chevron). Older rules such as `.filters select` have higher specificity than bare `select`; keep new field rules at the same specificity or higher.
- KPI values use `container-type:inline-size` on `.kpi` and `clamp(16px,10.2cqi,32px)` with nowrap. Do not wrap the currency in extra markup; management.js and management-ui read these nodes.
- Sticky first table column relies on an opaque cell background; update both hover states if row colors change.
- Hidden eyebrows are markup that still exists; remove from markup only with a matching test update.

Preview without the live site: restore private/ from deployment/source-baseline with scripts/source-baseline.mjs, serve public/ with a small static server, answer /api/snapshot with snapshotFrom(seed,{},{year}), /api/data with {seed,overrides:{},revision:0,isAdmin:true,audit:[]} and /api/revision with {revision:0,sourceVersion}. This is a mock of the read paths only and proves nothing about live auth or data writes.

Not verified: authenticated production rendering, other browsers than Chromium, tests that require packages unavailable to the author (management-ui, data-server, security suites). Capture deployment evidence and the Worker version in the pull request.
