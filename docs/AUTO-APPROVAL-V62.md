# V62 — Owner-controlled automatic approval

## User behavior

Users & access now has an owner-only ON/OFF switch for **new company accounts**. Default is OFF. OFF keeps the existing pending/manual review flow. ON gives newly created application accounts immediate **Viewer** access after the existing Supabase identity, exact @nerhadou.com, CAPTCHA and rate-limit checks. No account gets Administrator or Owner automatically.

Existing pending, suspended, rejected or active accounts and their roles do not change when toggling or signing in. Turning OFF affects future new accounts, not already active accounts. A recovery-first account is not automatically activated. The assistant deploys the feature OFF by default; only the owner decides whether to enable it. No current production user or setting is changed during deployment.

## Security and policy

The current `admin_review` provider enrollment does **not prove mailbox ownership**: Supabase may auto-confirm the entered company address. Auto approval bypasses the app's human identity review while ON. The owner receives an explicit warning before enabling; the API requires acknowledgement for that provider policy and records it in audit. Existing provider verification settings, domain checks, CAPTCHA, throttling, data permissions, session protection and password policy are unchanged. It is not described as verified-email SSO.

Only a current active standalone Owner with a session less than 15 minutes old and valid same-origin CSRF can change the policy. Administrators/viewers/anonymous callers/private platform mode cannot change it. Strict payload validation rejects extra role/status fields. A shared revision protects against stale/concurrent updates. If sign-in is too old, sign out and in again before toggling.

## Persistence without migration

`lib/security/approval-policy.ts` stores append-only `auto-approval-enabled` / `auto-approval-disabled` events in the **existing approval_events table**, under reserved target `workspace:auto-approval`. The latest rowid defines the state, and its actor must still be an active Owner. No browser storage, environment variable or sales workspace payload is used. The existing cleanup removes security_events, not approval_events, so settings survive scheduled cleanup and redeploys.

`ensureUser` uses one SQLite/D1 atomic batch: insert a new Viewer according to the current policy, record any automatic approval once, and queue a manual request only when pending. ON CONFLICT never updates an existing account. Role, verified identity and policy authorization come from the server, never editable user_metadata. Approval checks remain on every data request. Settings updates are a single conditional INSERT with compare-and-swap and current-owner guard.

No Supabase/Cloudflare dashboard setup, service-role key, schema migration or data import is needed for this feature. No company sales, targets, stock, source baselines, secret values or provider configuration are changed.

## Files

- `lib/security/approval-policy.ts`: persistence, CAS and owner/freshness checks.
- `lib/security/admin-service.ts`: owner-only settings in the existing Users API and strict mutation schema.
- `lib/security/store.ts`: new-account-only activation, immutable existing statuses and one-time audit.
- `lib/security/auth-service.ts`: correct active/pending signup message.
- `public/approvals.js`, `public/index.html`, `public/ui06-preview.css`: owner switch, explicit warning, shared state, saving/error handling and OFF/ON labels.
- `public/auth/auth.js`, `public/auth/index.html`: neutral signup subtitle and cache token; post-signup account view already handles active/pending correctly.

## Validation

Expanded security suite: default OFF, owner/admin/viewer/anonymous/platform restrictions, fresh session, CSRF, strict schema, domain-only acknowledgement, stale/concurrent writes, durable policy, immediate new Viewer access, real signup route, no role escalation, untouched old pending/suspended/rejected/active accounts, no duplicate audit, no pending queue for active users, recovery exclusion, external-domain rejection, no sales workspace mutation and scheduled-cleanup survival. Real SQLite/ES256 signatures with mocked Supabase HTTP; not a live penetration-test certification.

UI suite: owner-only visibility, OFF default, ON/OFF confirmation, acknowledgement/revision payload, cancellation, no privileged provider key requirement, save errors and refresh of actual server state. Existing password and auth UI tests plus standalone build, source/config, calculation and private-artifact checks remain in the validation path.

## Release and rollback

Prior company main `8a821a4b29a34ac16b2b8990f948ef26c491c0a4`, Worker `7a5eda01-4131-408a-88d5-3a8d89d6dd0c`. Prior private Site V61 `appgprj_6acfda6514988191b70ce8587b602beb~appgver_480397c873708191b3c7d92e7bf91ad7`, source `6f186df18733551294205085058829555dd19ddb`.

Application rollback does not remove accounts already approved while ON; review/suspend those separately if required. Old code ignores policy events and creates new accounts pending. Reinstalling V62 reads the durable latest policy again, so turn OFF through the owner control before rollback if future reinstalls should stay manual. Never restore sales/account databases or rotate secrets just to roll back the UI.

Provider identity reference: https://supabase.com/docs/guides/auth/users (user_metadata is not safe for authorization; provider confirmation is separate from company membership).
