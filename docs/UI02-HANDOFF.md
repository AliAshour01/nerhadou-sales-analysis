# V32 · UI02 handoff

Base production commit: ca6d3b99c260018ea81be49f1e6479a800a7e6c7. Ports the approved private preview while retaining GitHub production build and standalone auth configuration.

## Implementation
public/breakdown-core.js aggregates existing comparable summaries. public/breakdown.js renders compact Top 8 products/Top 6 lines, shared metric, sales/shortfall mode, searchable sortable details, line drilldown, saved-view state and Excel export. Legacy hooks remain hidden for compatibility. index.html/theme.css provide responsive layout. management/comparison/data-manager retain business warnings while reducing technical noise.

public/workspace-access.js uses verified server identity. lib/release-notes.ts and app/api/owner/release-notes/route.ts enforce owner-only release history with private no-store responses. Admin/viewer calls return 403; anonymous calls return 401.

## Numeric contracts
Top lists and search never renormalize shares. Preserve signed/zero/unknown data and Tender identity. Missing target is unknown; achievement needs positive target. Target basis never changes actuals. Product targets are not allocated automatically to distributor/channel/line subsets. Source files and production data remain unchanged.

## Validation
Run npm run build then node scripts/verify-security.mjs. New suites cover real-source reconciliation, top/full detail, shares, gaps, dialog/export and owner/admin/viewer visibility. Worker tests cover endpoint authorization. DOM fixtures are not live browser penetration tests. Preview accessibility inspection confirmed populated charts; complete screenshot/detail visual QA was blocked by browser timeouts. No production data writes are part of validation.

## Release and rollback
Main triggers Cloudflare Builds. Record successful build/check and merge commit in the PR. Preserve keep_vars, D1 bindings, secrets and standalone auth. Roll back code to the previous main commit only; do not restore sales data or rotate keys.

## Next work
Adaptive charts and removal of redundant analytics are proposals only. Agree with owner before implementation. Every later change requires release notes, PR explanation, tests/limitations and cross-module handoff when needed.
