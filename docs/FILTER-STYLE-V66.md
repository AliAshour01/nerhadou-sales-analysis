# V66 — modern filter styling, trial only

Owner rejected the V64/V65 filter presentation as dated and asked for a modern design. Scope: Actual Sales and Historical filter surfaces only; no full-dashboard restructure or production publication.

Changes: additive scoped CSS replaces the tinted blue slab/accent border/heavy input borders with a white 18px-radius surface, faint outline and soft elevation. Muted 11px field labels sit over 44px light filled controls. YTD/selected-month segmented buttons use a white selected pill, Historical years dark-neutral selected pills. Reset is a quiet tertiary action; hover/open/focus states and menu shadows are restrained. Mobile uses tighter spacing and 15px corners. Reduced-motion disables transitions. No decorative SVGs, so the oversized-icon regression cannot recur from this change.

No filtering markup/behavior, calculations, target rules, auth/routes/roles/schema, source data or production Cloudflare changes. Owner-only version retained. Main remains V62; draft PR17 remains unmerged. CSS changes are appended in ui06-preview.css, with no earlier rule deletion/reordering pending visual diffs.

Validation: existing comparison and Owner/version/management UI tests, release/cache check, build, private-artifact gate and real built-Worker suite. These do not establish visual modernity; browser screenshot/device QA is still unverified due to the previously blocked managed preview. Owner must inspect the trial. Do not claim screenshots were checked.

Rollback: previous private V65 saved appgprj_6acfda6514988191b70ce8587b602beb~appgver_dbb14f3ea660819191cfb012e3f171bd, source 3ffb9743fc666cd38ea5090a67845b1f16e716da. Redeploy code only, preserving private audience/runtime/data. Exact V66 native deployment evidence recorded in PR17.
