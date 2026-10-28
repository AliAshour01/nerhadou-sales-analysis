# V64 — selected readability + clearer filters

## Owner-approved scope

Items 2,3,4,5,6,7,8,9,10,11,12,13,14,15,17,19 were selected, then item16 (one contribution panel adapting to company/product) approved explicitly. Owner additionally requested version number visible to Owner only and more noticeable filter bars in the preview. No production authorization.

Starting point: private V63 source07604cb7dbad2b8657c7ef8089a475e143d68b79, saved appgprj_6acfda6514988191b70ce8587b602beb~appgver_6272dc03c76c81918977ee04718f6162. Production remains main V62 abcd3d2693c6a6d0078fd042c576ecb48289706b; PR17 is a draft, never merged.

## Changes over V63

- Removed the extra manager Overview headline and its now-unused renderer (unselected item1).
- Removed the extra Historical requested-month coverage alert and its additional monthly model evaluations (unselected item18). Original coverage chips, missing-data guards and collapsed definitions remain; data is never treated as zero because a banner is removed.
- Unified Historical contribution panel remains: company selection shows all-product contribution ranking; selected product shows its share of company by year. Clear scope returns company totals. No aggregation math changed.
- Footer version span is hidden by default with data-owner-only and the existing workspace-access visibility routine. Owner sees V64; Admin/Viewer/unknown do not see the version or release history. Public CSS/cache URLs naturally identify asset versions; this is UI disclosure control, not secret metadata or an authorization barrier.
- Both Actual Sales and Historical filter regions have an accessible region name and compact Filters icon/header, pale blue background, blue left accent and border, stronger white inputs, selected-state contrast, 44px controls and keyboard focus outline. Actual selected-filter chips and More filters count remain functional. No filter behavior changed.
- Retains V63 responsive charts, 11/12px type roles, year patterns/markers, Top8+Other fitted bridge, Top5 mobile lines, clear scope chips, central release/cache config, aligned Historical title, CSS load-order documentation and Owner/Admin Forecast UI.
- Personal Powered by Ali Ashour credit left unchanged. No new decision made about credit or PR14 (still open/untouched).

## Files and tests

Changed UI: public/index.html, management.js, comparison.js, ui06-preview.css. Asset cache updates: public/breakdown.js, auth/index.html and trial HTML. Release config/history/notes and focused tests updated.

New tests/owner-version-v64.mjs uses the real Linkedom DOM plus existing workspace-access.js. Checks Owner/Admin/Viewer/unknown role version/history visibility, named filter bars, removal of unselected headline/banner and unified panel scope switching. It imports the management UI suite, retaining its math/interaction assertions. tests/readability-v63.mjs continues 75 simulated chart geometry measurements, updated to current selected scope rather than asserting removed features. Release expectations follow V64.

No management-core.js, data-core.js, focus-comparison-core.js calculations; targets; private seed/data; auth/server routes; roles; D1 schema; secrets or Cloudflare config changed. Branch keeps production build-cloudflare.mjs entry; private Site retains its existing build adapter.

## Verification limits and deferred parts of retained tasks

Browser screenshots/real rendered fonts/sticky-header measurements (item7 and visual parts of 4–12,19) remain unverified because the managed preview daemon previously failed with another vinext server at /site PID15. Do not label simulated DOM geometry as browser evidence. Owner can inspect the private published preview. No unrelated server killed or alternative browser stack/auth bypass used.

Item13: old Line analysis IDs/renderers already absent. bd-legacy remains actively referenced by app/management renderer paths; do not delete its HTML alone. Removal requires a combined renderer/state refactor and visual regression coverage. Only the newly unused headline renderer was removed here.

Item14: CSS load order documented in CSS-CASCADE-V63.md; old rules not deleted/reordered without visual diffs. Filter styles are a bounded additive layer. Old headline/coverage CSS is inert and retained under that no-delete rule.

## Publication and rollback

Publish the private Site only; preserve its existing Owner-only audience and runtime env revision4. Update draft PR17 with V64 preview evidence; no merge/main update/production deployment. Exact saved V64/deployment IDs go in the PR after success.

To undo this preview, redeploy private V63 saved version above. To withdraw all readability changes, private V62 is appgprj_6acfda6514988191b70ce8587b602beb~appgver_67c4a1daea2c8191a79b2e93fccc1faf / source af1b50887ace556f0c0a0ef1f1b89ebedde99661. Never restore a database for a code rollback.
