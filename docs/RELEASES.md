# Nerhadou Commercial Hub releases

Use the visible Version number to identify a release. Each completed feature update receives a new saved Site version and an entry here. Deployment is separate from data revisions: publishing old application code does not restore old sales data. Sales changes remain audited and use their own Undo workflow. Do not restore a database when asked only to return to an application version.


## V32 · UI03 — Approved MagicPath visual polish

- Applies the selected interactive design direction through public/polish.css: refined cobalt identity, featured sales card, readable typography, lighter panels, segmented controls, navigation and modest disclosure/tab motion. Reduced-motion preferences disable animation.
- Existing data calculations, target policies, filters, chart renderers, exports and authorization retain their implementation. No demo numbers or MagicPath prototype code enter production.
- Rollback: remove the added stylesheet reference and restore UI02 label; no database rollback. This branch is a review candidate until publication is confirmed.

## V32 · UI02 — Compact breakdown and owner-only details

- Approved Top 8 product and Top 6 line charts, shared Units/Value, sales/shortfall, and searchable/sortable full-detail dialog with Excel export and line drilldown. Percentages retain the full selected denominator.
- Release history moves behind a server-authorized owner endpoint; technical revisions are owner-only. Business coverage warnings remain visible.
- Preserves numeric editing, all-year line corrections, Tender identity and auth/import/Undo behavior. No sales writes, source changes, migrations or key changes.
- See docs/UI02-HANDOFF.md. Automatic context-aware chart substitutions remain proposals, not part of this release.

## V32 · UI01 — Approved interface refresh

- Applies the owner-approved Design Review 01 to the functional application: simplified sign-in branding and form, concise navigation/chart/import labels, disclosure-based help, lighter panels and tabs. Real authentication, approval, CAPTCHA, analytics, import previews and saves retain their handlers and server boundaries; the disconnected demo is not deployed as the application.
- Analytics/source identity remains V32; UI01 identifies this presentation revision independently of historical Sites version numbers. No Site version number is invented for this external GitHub release.
- Base commit: c557b666f88822fbf91b8a25de0e7f5556cb80e4. Rollback is code-only; source sales and D1 records are unchanged.
- Validation: production compilation and private artifact gate passed; all 18 validation suites passed, including 580 data-management assertions, 111 SQLite route assertions, 142 authentication assertions and 23 built-Worker assertions. Sign-in layout was visually checked with a local configuration stub; no real provider login was performed.
- Integrated with PR #5 / 0dd156a88aa8bd8cd93cc310321e8a9a2d4e6aa0, preserving deployed direct numeric editing, all-year product line corrections and historical Tender separation. These retain administrator checks, source/revision guards, audit and Undo. No production data write or schema migration is part of deployment.

## Cloudflare Worker version 19 — Editable data tables and product line corrections

- Data tables allow direct editing of supported numeric cells, including explicit zero, negative adjustments, CLEAR/empty-as-unknown and RESET. Review and save are separate; pending edits survive table filtering/paging. Stale data or source revisions invalidate a draft. Grid saves always use update mode, independently of the paste editor's replacement mode.
- Product lines has a dropdown editor for each source product. At the owner's explicit request, a correction applies to **all years**, all channels/distributors and future imports of that same source product (case/whitespace aliases only). Pack/Tender names remain separate; historical product names are not guessed from canonical brand mappings. Original source lines remain available for traceability and incoming-sheet matching. Corrections can be reset to source lines.
- Line assignments use separate metadata entries in the existing per-record overrides table; no migration or source input changes. Shared revision/source guards, administrator authorization, atomic audit and Undo apply. Line changes do not change numeric figures; Undo restores exactly the prior assignment. Old app code would ignore the new line metadata without deleting it; code rollback must not restore sales data.
- Validation: line-assignment unit checks, 580 data-management assertions, 111 SQLite route assertions, data-manager UI regression, new-series/replacement/dynamic-update checks and production build passed. A Chromium fixture verified direct cell editing/CLEAR, review before save, discard, concurrent/source refresh rejection, all-year line corrections and Undo. No production sales edits were performed during validation.
- Published on 2026-10-23: Worker version **19**, ID `b7a1e6be-f69c-4a0a-a598-be694c31da62`, verified active at 100%. Deployment used local branch `optional-admin-authenticator`, base commit `20ed69316e9b975b3fd7220ec3e1ca5bedc96ed7`, plus then-uncommitted Data Management and Tender changes. The deployed application source is now preserved on `data-management-editing-all-years`; no redeployment or sales-data changes are part of that source handoff.
- Previous published Worker: version 18, `2af662c4-65ea-41af-b935-aae073235696`; analytics UI V32.

## Cloudflare Worker version 18 — Separate Tender in Historical comparison

- Historical product identity preserves explicit Tender source names/channels as a separate ` - TENDER` entry while retaining the existing reviewed product mapping. Regular-product totals, growth, rankings, company/product selection, common-month selection, contribution bridges and exports use that separation. Hospital rows are not inferred to be Tender. Missing Tender baselines remain unavailable.
- Sales inputs and overrides are unchanged; company totals and full-company share denominators are unchanged. Read-only revision-1 reproduction for Jan–Sep 2026: SPASULANCE 641,809.95 units; SPASULANCE - TENDER 5,091 units. Their former combined amount was 646,900.95.
- Validation: focused comparison model (including new Tender isolation cases), 481 comparison/source assertions and comparison UI checks passed. Published on 2026-10-23: Worker version 18, ID `2af662c4-65ea-41af-b935-aae073235696`, verified active at 100%; compare-core.js was uploaded. The public asset remains authentication-gated.
- Previous published Worker: version **17**, ID `abc85935-eb47-4055-8e56-1dc599104ace`; source main merge `c557b666f88822fbf91b8a25de0e7f5556cb80e4`. No new saved Site release number is invented for this local change.

## Cloudflare Worker version 16 — Owner/admin authenticator exemption

- Owner/admin accounts do not require authenticator verification even when a factor is already enrolled; their authenticator controls are hidden. Enrolled viewer accounts still require verification; removal revokes application sessions. Password changes and role changes remain protected by current-password / recent-session checks. No sales data, roles or production accounts were changed.
- Base source: `f1828e345ac4b2a97177f6558b35c1b90bc1325a`, V32 analytics. Existing Cloudflare production version before this change: number **15**, ID `a58dee01-fab3-46fc-b44f-a5e361a65be5`, read from Cloudflare on 2026-10-23. GitHub main has a successful Workers Builds: sales check. Keep sales data independent of code rollback.
- Published on 2026-10-23 with owner authorization: Cloudflare Worker version **16**, ID `91422aee-a370-4052-be0c-a9d6c865451f`, active at 100%. Deployed source commit: `57ce5f206e219129262c51b10b22761e6ee167e3`. The number comes from Cloudflare, not an invented Site sequence; the analytics UI retains V32 identity. PR #3 preserves the source change.
- The Workers Builds check failed; its detailed logs were inaccessible with the available token. The validated local build was deployed directly using the documented Wrangler command. Post-deploy checks: auth page 200, anonymous data API 401, private source 404; the served auth JS contains the owner/admin exemption. Live authenticated account flows were not tested. Existing database, runtime variables/secrets, bindings and cron were preserved; no migrations/imports were run.
- The preceding optional-enrollment patch passed all 17 suites. For this final role exemption, the 142 targeted authentication assertions, authentication UI check and production build passed; the broader suite was not rerun. Live provider unenrollment is not certified by the mocked provider tests.

## Version 32 — Reconciled Actual identity and targets

- Actual management analysis now uses source product identity, retaining Tender and pack variants separately like the original Actual table. Only case and whitespace differences are matched; the reviewed historical brand mapping remains explicitly confined to Historical comparison.
- Each source product target resolves independently instead of rejecting multiple canonical target rows. Zero targets remain zero; achievement percentages are unavailable with a clear explanation. No target is allocated to distributor/channel subsets or shared source lines.
- Sparse Current actual reports sum the numeric source rows while checking monthly company file coverage before dimension filters. No absent rows are created or assigned a zero, and explicit nulls / exclusions / unavailable reporting months still withhold totals.
- Product aliases appear once in contribution bridges; unmatched contributions have an expandable named explanation. Hidden analysis tabs load when selected.
- Full source reconciliation checks all 67 current source products, Units, Value, unit targets and value targets, against the original Actual snapshot and company totals. Tests also cover Tender isolation, sparse source rows, missing values, overrides and historical mapping separation.
- Source sales files, shared overrides, authentication and independent Cloudflare deployment unchanged. See docs/analysis/V32-RECONCILIATION.md.

## Version 31 — Management intelligence (private review)

- Saved version: `appgprj_6acfda6514988191b70ce8587b602beb~appgver_9bfa51b78a308191979898938155d208`.
- Source commit: `5be0371355d39e573e3986e660f112742b03d05b`.


- Management summary with Units and Value PPG, measure-specific achievement and signed target gap. Explicit selected scope, coverage, estimates and latest saved timestamp.
- Same-period product / line / distributor contribution bridges with exact total reconciliation. Missing or unmatched detail is a labelled residual, never an invented zero baseline. Historical bridge has an explicit pair of selected years.
- Product/month Achievement or PPG heatmaps, source-line analysis, product detail dialog, monthly comparisons, distributor prior-year view, absolute-change product rankings and signed target variance.
- Deterministic attention rules, account-scoped browser saved views, authenticated filter links, Excel detail exports and printable meeting reports. Common-month comparison is opt-in.
- Monthly target schedules are honoured when explicitly supplied; otherwise the existing annual / 12 convention is retained. Targets are withheld for unallocated subsets and shared product lines.
- Read-only run-rate scenario with prerequisites and explicit non-seasonal method. Stock / price-volume / IMS readiness explains unmet prerequisites; no unsupported market share, automatic stock coverage or causal conclusions.
- Sources, imports, replacement, undo, roles and authentication are preserved. No live sales writes or independent Cloudflare deployment. Browser visual QA unavailable in this environment; calculation, DOM interaction and Worker checks are documented in docs/analysis/V31-REVIEW.md.

## Version 30 — Owner-selected password policy

- Saved version: `appgprj_6acfda6514988191b70ce8587b602beb~appgver_bdf281672e748191bb24a64c75cd4c83`.
- Source commit: `85f9c7a22242cec0bdfc89c5fde9105ac2de727c`.


- At the owner's explicit request: minimum 8 characters, at least one ASCII uppercase letter, digit and non-letter/non-number/non-whitespace symbol. Lowercase is not required.
- Server validation applies to signup and password changes. Browser feedback mirrors the requirements; existing-account sign-in is not subjected to the new composition rules.
- The provider's 72 UTF-8-byte upper bound remains, with plain-language errors. Common predictable prefixes remain rejected. This is a user-selected departure from the earlier 15-character policy, not a claim of NIST compliance.
- Owner-only enrollment, CAPTCHA, MFA, pending approvals, workspace activation gate and sales data are unchanged. Align Supabase's minimum to 8; no paid feature is needed to enforce the BFF policy.

## Version 29 — Controlled owner setup

- Saved version: `appgprj_6acfda6514988191b70ce8587b602beb~appgver_82e6d21af6988191ba4a5a59f6c5fa8b`.
- Source commit: `7daf7241cde22f56391a5ff9ff9f185c9d71f18d`.

- Explicit `AUTH_OWNER_SETUP=true` enables account registration/sign-in and authenticator enrollment only for the exact configured Owner email while `AUTH_SETUP_VERIFIED=false`.
- All workspace/static dashboard access and admin APIs remain closed, even for an active Owner with MFA; no role bootstrap or approval bypass.
- Other emails are rejected before provider calls and during session identity validation. Direct provider signup can create no app data access.
- Setup UI explains remaining activation and never displays an Open workspace link during setup. Existing platform mode and sales data remain unchanged.

## Version 28 — Administrator-reviewed registration

- Saved version: `appgprj_6acfda6514988191b70ce8587b602beb~appgver_4d2cdc91ac988191bcdb68efe28918b0`.
- Source commit: `0dd788ea2fbe73d064106c32507b8b8a7cfc8ba7`.

- Explicit `admin_review` staging policy: company email/password signup creates a pending viewer immediately, with no signup verification message. The administrator verifies employee identity out of band before approval.
- Signup session is restricted to status/account security. Data remains denied until approved; no client role or auto-owner shortcut. Duplicate signup cannot replace an account.
- Email signup verification/resend/recovery routes and application email notifications are disabled for this policy. Forgotten passwords require operator assistance for now; ordinary authenticated password changes remain available.
- Provider confirmation settings mismatch fails closed. Email-confirmed timestamps under auto-confirm are technical provider state, not evidence of mailbox ownership.
- Exact staging origin, dedicated D1 ID, Supabase URL and Owner email recorded in deployment preparation. Independent rollout remains closed pending configuration and acceptance; no sales data changed.

## Version 27 — Secure access foundation

- Saved version: `appgprj_6acfda6514988191b70ce8587b602beb~appgver_6be8f748857081918ce9908c63835a09`.
- Source commit: `cce3b12fa0dba1b62efa9bd20a0265bfb7932f03`.

- Server-private sales sources; unchanged source bytes and sales calculations. Worker-first static protection and consistent server authorization.
- Standalone company signup/verification, pending approvals, role management, encrypted opaque sessions, MFA, CSRF, atomic throttling and recovery isolation.
- Dedicated Supabase staging project created with a free creation quote; domain policy applied and tested. External SMTP, Turnstile, Cloudflare and owner bootstrap remain unconfigured; independent access is disabled until setup and acceptance tests pass.
- Authentication design and Users & approvals are available on the current private Site; it retains platform authentication.
- Source/runtime dependencies patched; remaining high build-time braces advisory documented as an external release blocker. No claim of completed external penetration testing.
- Live revision-1 sales backup and exact restore reconciliation completed before deployment. See docs/security for evidence, prerequisites and operator instructions.

## Version 26 — Navigation controls

- Saved version: `appgprj_6acfda6514988191b70ce8587b602beb~appgver_1ed2eccee9148191aa7d932ac9fbf6a4`.
- Source commit: `59a5a5b367c7c8cbf80ad6f45ef33064f4c24f0c`.
- More filters dismisses on outside click or Escape; selections stay unchanged.
- Fullscreen left-edge navigation overlays the dashboard, then hides when leaving. Menu button, keyboard access and Escape are supported in native fullscreen and expanded fallback.
- No sales calculations, data or access changes.

## Version 25 — Selected contribution

- Saved version: `appgprj_6acfda6514988191b70ce8587b602beb~appgver_303c66223a148191ac317b3cce5e6b9e`.
- Source commit: `d03299b54862ca28334e8d477e871cd1addd7368`.
- Actual performance Breakdown: Leading products and Sales by line use total selected sales after all filters as the percentage denominator, in both Units and Value.
- Labels and help text say % of selected. Target-gap shares, Portfolio and Historical comparison retain their existing meanings.
- Missing totals and nonpositive net totals show no percentage; signed adjustments remain signed. No sales data changed.

## Version 24 — Modern workspace (based on Version 22)

- Saved version: `appgprj_6acfda6514988191b70ce8587b602beb~appgver_5c2b8a86ce908191a7bf3ddb054868b1`.
- Source commit: `66c90fd35b234c7c7c471d46ae10b949b1c019bf`.
- The active Version 22 feature set is retained; the rejected Version 23 Line intelligence features are not reintroduced.
- Exact supplied official blue logo, with a professional light blue/navy theme, improved typography, cards, controls and tables.
- Fullscreen control hides the sidebar and expands the content. Native fullscreen is requested when supported; expanded view remains available if the browser restricts fullscreen.
- Exit button and Escape restore navigation; fullscreenchange handles browser-initiated exits.
- Responsive mobile drawer, backdrop dismissal and page breadcrumbs retain existing navigation handlers.
- No sales records, calculations, import semantics, targets, stock or permissions changed from Version 22.
- Version 22 remains a saved rollback target. Version 23 remains separately saved but was rolled back at the user's request.

## Version 23 — Line intelligence

- Saved version: `appgprj_6acfda6514988191b70ce8587b602beb~appgver_14b7f3b966d48191966e7136927eaa60`.
- Source commit: `d7dcc2f38d911f35dff3c932b2cc50e9aa414231`.
- Rolled back to Version 22 at the user’s request before Version 24.

- Visible Lines multi-select in Actual performance, with dependent Products options and explicit conflicting-filter handling.
- Actual Lines tab: Units/Value, sales/target/achievement/company-share cards; ranked lines or products; monthly sales and monthly targets; signed distributor bars and suitable sales-type donut; observations and Excel tables.
- Historical Line scope: any selected years, lines, matching periods and PPG baselines; sales, PPG, company contribution, monthly charts, bottom year tables and Excel.
- Growth drivers for one line and two selected years; missing baselines stay unknown.
- Historical Unassigned coverage and administrator-reviewed year/series line assignments; sources and sales amounts remain unchanged; updates are audited and reversible.
- Target allocations are withheld when ambiguous; shared product targets are counted once. No automatic historical line allocation or alias merging.
- Source sales and existing application data are not changed by this release.

## Version 22 — Full replacement

- Selected year/month sales replacement; remove omitted old sales from reporting, clear missing replacement metrics to unknown, retain targets and stock, atomic undo.
- Source commit: `9b88bf4302ce5d1a29a5e4503ccef6b91c9fbdb3`.
- Saved version: `appgprj_6acfda6514988191b70ce8587b602beb~appgver_fd98f7c2f43081918ca81df7c3865434`.

## Version 21 — One import

- Single paste or one CSV/TSV/TXT/JSON file; larger imports and no ZIP batches.
- Source commit: `7c8e9f739b948b281df133cb98ae13cfbb4bcb1a`.
- Saved version: `appgprj_6acfda6514988191b70ce8587b602beb~appgver_4454a0232ed48191837efddd94b16911`.

## Version 20 — New series in import

- Review and register previously unknown products/distributors/channels in the same transaction as their sales.
- Source commit: `fd1639850b17650bd4b1a80cd253c4dc347bae0f`.
- Saved version: `appgprj_6acfda6514988191b70ce8587b602beb~appgver_6ed129ae56848191be9afa3def387ff7`.

## Version 19 — Dynamic sales updates

- New month/year imports, old-period corrections, reversible reporting range, shared refresh and scalable audited storage.
- Source commit: `04727adfbf14250c50d3fb3e00594a183d051e7e`.
- Saved version: `appgprj_6acfda6514988191b70ce8587b602beb~appgver_829fe8e205608191bb3363acc810ad8f`.
