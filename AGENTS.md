# Nerhadou Commercial Hub

## Release numbering

The user requires a clearly numbered version for every completed update so a prior release can be requested by number.
- Before editing, read the current saved Site version and retain its exact version ID and source commit.
- Each completed update must have a new saved/published version. Use the returned Site version number, not a separate invented sequence. Keep the visible footer, Version history, asset cache versions and docs/RELEASES.md consistent.
- Add the new feature summary and retain prior saved version IDs/commits in docs/RELEASES.md. Source workflow owns commits and pushes.
- Returning to an app version is a code/deployment operation. It must not roll back sales data unless explicitly requested. Warn about any incompatible data behavior before deploying an older application.

## Sales and line analysis

- Keep source workbooks, private/data.json and private/seed.json unchanged unless a source-data update is explicitly requested.
- Use effectiveRecords for analytics so overrides, excluded cutoffs and full-replacement removals remain respected.
- Source line names and year-specific reviewed mappings are separate. Do not infer historic lines from the current organization or silently merge distinct line names.
- Breakdown Leading products and Sales by line percentages use the selected sales after all filters. Portfolio and Historical comparison company shares retain full company sales for the same period, before dimension filters. Target-gap shares use selected positive shortfall.
- Missing values are unknown, not zero; retain signed adjustments and growth coverage policies.
- Product targets are not allocated automatically to multiple lines or distributor/channel subsets. Do not double-count shared product targets.
- Preserve the existing Company/Product comparison, import/replacement/undo behavior, owner-only audience and server-side administrator authorization.

## Security boundary

- Never put source sales JSON or backups in public assets. Source bytes remain unchanged when moving files.
- AUTH_MODE must be explicit. Platform mode is restricted to the original private Site origin. Independent deployments must use standalone; never trust caller-supplied platform headers there.
- No default/admin-first-signup account or client metadata authorization. Check approval, provider identity, current role and revocation on the server. The owner explicitly chose AUTH_REGISTRATION_POLICY=admin_review for staging: no signup email confirmation; the administrator must verify the requester out of band. Provider auto-confirmation is not proof of mailbox ownership. Retain email_verified as the fallback policy.
- Keep employee sign-in and all standalone data closed until external configuration and documented acceptance checks pass. Explicit AUTH_OWNER_SETUP=true permits only the configured Owner email to register/sign in and verify TOTP while AUTH_SETUP_VERIFIED stays false; it never grants workspace or administrative API access. Read docs/security before modifying auth, deployment or rollback.
- Report incomplete tests and open dependency advisories accurately. Never describe a mock-provider test as a completed live penetration test.
