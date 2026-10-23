# Security verification — release 30

Scope: authorized source review, deterministic attack/regression tests, local built-Worker tests and a narrowly scoped domain-guard test in the newly created Supabase staging project. No destructive scan or password-guessing traffic was sent to the live sales Site or any third-party service.

This is not an independent penetration-test certification and does not establish that the app has no vulnerabilities.

## Findings addressed

| Finding | Status / evidence |
|---|---|
| Sales seed/snapshot in public assets | Relocated unchanged to server-private files; artifact gate and actual Worker requests reject access. |
| Platform identity would be unsafe if copied to independent hosting | Explicit mode and exact platform-origin restriction; forged platform headers rejected in standalone mode. |
| Missing standalone approval enforcement | Pending/rejected/suspended users denied data; viewer cannot approve self, edit sales or elevate roles. |
| Session replay after suspension/logout | Local revocation checked on every request; suspension/role decisions revoke sessions atomically. |
| Editable metadata used as authority | Roles/status come from D1. Injected owner metadata creates only a pending viewer. |
| Recovery token potentially usable for data | Separate recovery purpose with 10-minute lifetime, denied data regardless of approval. |
| CSRF / privilege-field injection | Exact origin, session CSRF token and strict schema; adversarial requests rejected. |
| Concurrent guessing could bypass in-memory limits | Durable Object counter storage transaction; 30 parallel attempts admit exactly 5 under a five-attempt policy. |
| Large request could exhaust memory before validation | Bounded stream reader enforces byte limits before JSON parsing. |
| Known framework/runtime package advisories | Next, React/RSC, Vinext, Vite, Cloudflare tooling and vulnerable transitive libraries updated; runtime-only npm audit returns zero known advisories. |
| Direct provider signup could bypass app's domain input | Supabase hook function plus enabled database trigger; external-domain insert rejected, no probe user left behind. |

## Open release blocker

Full development/build dependency audit still reports a high advisory in `braces@3.0.3`, propagated through micromatch/fast-glob and build/lint tools (including Vinext). Registry lookup reported 3.0.3 as the latest available braces version; 3.0.4 does not exist. The flagged consumers are development/build tools, not a deployed dev server. No evidence of runtime exploitation was established, but this remains unresolved and must not be described as “all High findings closed.”

Do not publicly launch the standalone deployment as security-cleared until this build-chain finding is resolved or a documented, reviewed mitigation and explicit risk decision exists. No forced framework downgrade or unreviewed vendor patch was applied.

## Verification performed

- Existing 100-assertion server/storage suite against SQLite, including import, dynamic periods, replacement, stale revisions and exact undo.
- 71 standalone security assertions: real SQLite and ES256 signatures/JWKS; real Supabase SDK with mocked provider HTTP; approval/MFA checks, opaque/encrypted sessions, replay protection, domain spoofing, OTP replay behavior, recovery isolation and per-email throttling.
- Built Worker tested with real workerd, D1 and assets. Both platform and independent modes tested. Public auth screen loads; static dashboard and API are gated; source JSON is unavailable; original owner retains access.
- Existing dashboard/comparison/data-management UI and numerical regression suites, as listed in the release verification output.
- Supabase SQL domain tests: exact company email allowed by hook, fake suffix/public domain denied, hook executable by auth service only, not anon/authenticated. Database trigger external insertion probe rejected; remaining probe user count zero. Security advisors returned no lints.
- Live sales database backup at revision 1: workspace_state 1, record_overrides 1557, audit_log 1, audit_changes 1557. Read before/after state matched. Restored into fresh SQLite, exact table rows reconciled and 71 historical monthly groups matched units/value/missing coverage. Source files unchanged byte-for-byte.

## Not yet verified / external prerequisites

- No live corporate-email verification or recovery message delivery; custom SMTP is not configured.
- No real Turnstile widget or Supabase CAPTCHA settings test.
- No real employee signup, owner bootstrap or actual-phone TOTP test.
- No authenticated browser test or visual QA: supported browser-control capability was unavailable; no improvised browser was installed.
- Playwright, ZAP, Semgrep and Gitleaks were not run; executable tools were unavailable. Their absence is not represented as a pass. Manual source/dependency review and explicit attack tests were performed instead.
- No standalone Cloudflare deployment or cutover: owner account, exact owner email, dedicated D1 and external secrets still required.
- The Before User Created hook setting is not yet enabled in Auth settings. The trigger is enabled and independently enforces the domain.
- Supabase signing-key, session timeout, direct endpoint rate-limit/CAPTCHA and leaked-password-protection settings require final configuration and live verification. Some features may require a paid plan; none was enabled without a nonzero cost decision.

## Reproduction

Run the files in tests/security/ plus the existing tests directory. Build first for worker.mjs and scripts/release-gate.mjs. backup-restore.mjs requires the protected backup path and must not put its data in the public directory or git. See IMPLEMENTATION.md for deployment prerequisites.

## Version 28 policy change

Owner explicitly chose manual approval instead of mailbox verification for initial staging. No user can access sales solely because Supabase auto-confirms their email; pending/role/MFA enforcement is unchanged. UI no longer claims mailbox ownership was verified. No signup-code or email recovery path is available in this mode, and application notifications do not send. Admins must verify each employee out of band; address reservation/impersonation remains a risk of this explicitly selected policy. Re-registration does not overwrite or adopt existing accounts. Provider configuration and real registration/MFA still require live acceptance. Local security tests cover immediate pending registration, duplicates, provider-confirm mismatch, no-mail routes, owner approval, session revocation and approved login. Prior open build advisory remains unresolved.

Version 28 validation: all 16 suites passed, including 92 security assertions and 23 built-Worker assertions. Provider HTTP remains mocked in the auth suite. No real staging signup, real CAPTCHA or browser penetration test was performed.

## Version 29 controlled enrollment

Owner-only enrollment under AUTH_OWNER_SETUP=true does not activate AUTH_SETUP_VERIFIED. Employee BFF requests, provider identity session adoption, static dashboard, sales APIs and administrator APIs remain denied during setup. Even an active MFA Owner cannot bypass the activation boundary. Existing open advisory and live acceptance limitations remain.

Version 29 security harness passed 109 assertions using real SQLite/signatures and mocked provider HTTP, including explicit owner-only enrollment, no employee provider calls, cookie adoption denial and unconditional data/admin closure even for an active MFA Owner.

## Version 30 password policy

Owner explicitly chose minimum eight characters plus uppercase/digit/symbol. BFF signup and password mutations enforce this; existing sign-in credentials are not subjected to a new composition rule. Boundary/component tests cover seven/eight characters, missing components, whitespace, no lowercase requirement, maximum byte bound and predictable prefix blocking. This change does not imply NIST compliance. All prior open/live verification limitations remain.
