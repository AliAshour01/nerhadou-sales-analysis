# Secure access implementation — release 30

## Optional authenticator — owner-approved change

At the owner's request, authenticator enrollment is optional for all accounts, including owner/admin. Owner/admin roles are exempt from aal2 enforcement even with an enrolled provider factor; the authenticator panel is hidden for those roles. Enrolled viewer accounts still require aal2 until the factor is removed. Account security offers removal of the current verified TOTP factor, requiring CSRF and an aal2 application session created in the last 15 minutes. Removal revokes all application sessions and clears the cookie; sign in again with the password. If multiple authenticators exist, remove each separately after verification. Lost-factor recovery remains operator-assisted, with independent identity verification; this is not an unauthenticated MFA reset. Password-only sign-in reduces protection if a password is stolen. Approval, role checks, CAPTCHA, throttling, recovery isolation and workspace activation remain enforced.

This change is based on commit f1828e345ac4b2a97177f6558b35c1b90bc1325a (V32 analytics). The owner authorized publishing it to the existing sales Cloudflare Worker. Previous production Worker version: 15 / a58dee01-fab3-46fc-b44f-a5e361a65be5. No real account factor is removed by deploying code; removal is an explicit action by the signed-in account owner. See docs/RELEASES.md for deployment evidence. Do not invent a legacy Site version number.


## Password policy (Version 30)

The owner explicitly requested minimum 8 characters with an uppercase English letter, digit and symbol on 18 October 2026. Enforced in the BFF for signup and all password changes, with matching client-side guidance. Lowercase is not required; whitespace is not a symbol. The 72 UTF-8-byte maximum remains for provider compatibility, and known predictable prefixes remain disallowed. Existing login does not reapply the composition rule. This supersedes the prior 15-character minimum and is not represented as NIST-compliant single-factor policy. Supabase Email provider minimum should be set to 8 (not 15); application checks remain authoritative for app requests. Provider direct-signup accounts still cannot obtain app data approval automatically. No user account or password is created by this source update.

## Controlled enrollment (Version 29)

`AUTH_OWNER_SETUP=true` with `AUTH_SETUP_VERIFIED=false` enables only the configured Owner email's account creation/sign-in, status and account security. Server checks the submitted address before provider calls and rechecks the provider identity on every session request. All sales/static dashboard/admin APIs remain closed regardless of account role, active status or MFA. The operator can therefore verify real registration and TOTP without claiming external security acceptance or opening employee access. No account is auto-promoted. Set AUTH_OWNER_SETUP=false after testing, and only activate AUTH_SETUP_VERIFIED after the remaining release checks and controlled operator bootstrap. This supersedes the earlier all-or-nothing sign-in setup restriction; data access remains closed throughout enrollment.

The user supplied logs show Cloudflare v28 deployment ID `261c675d-ec11-48ac-9e4c-9dbb105633a3`, all four D1 migrations applied and both required secrets present; user screenshot confirms public auth page. Public JWKS shows ES256. CAPTCHA, provider session and authenticator still require real acceptance; no secrets were pasted into chat.

## Current owner-approved policy (Version 28)

On 18 October 2026 the owner explicitly chose manual identity review without signup confirmation email for the initial rollout. Set `AUTH_REGISTRATION_POLICY=admin_review` and disable Supabase Authentication > Sign In / Providers > Email > Confirm email in the dedicated staging project. Do not disable CAPTCHA or app approvals. The provider will mark accounts confirmed automatically; **this is not evidence of mailbox ownership**. Pending accounts are untrusted. The administrator must independently identify each requester before approving. An impersonator could reserve a colleague's address first; do not approve based on the displayed email alone. Resolve misclaimed accounts through privileged operator review and revoke sessions before account changes.

Signup must return a provider session and immediately create a pending viewer in D1. If confirmation remains enabled, registration fails closed with a setup error. Existing identities are never overwritten by duplicate signup. App email verification, resend and recovery endpoints are blocked for manual policy; notification delivery is disabled even if credentials exist. SMTP is not a prerequisite for this policy. There is no public password-reset bypass; forgotten-password support is operator-assisted, with identity verification, session revocation and secure credential handoff. Logged-in password changes and authenticator checks remain supported. No admin is auto-provisioned.

The remaining sections describe the original verified-email policy where applicable. `email_verified` remains the safe fallback if no registration policy is explicitly configured. For manual staging, the policy above supersedes email/SMTP requirements in steps 5, 8–10 below. Owner bootstrap requires exact UUID/email and independent operator identity verification; TOTP is optional; provider auto-confirm status alone never establishes identity.

User-reported Cloudflare setup: Worker `nerhadou-commercial-hub-staging` at `https://nerhadou-commercial-hub-staging.ali-ashour.workers.dev`, D1 `nerhadou-hub-staging-db` (`6453d359-6157-49d5-b6ff-f98d6efaed8a`) bound as `DB`; Turnstile keys stored in Worker and CAPTCHA enabled in Supabase. These dashboard changes are user-reported, not yet live-flow verified. Owner designation: `ali.ashour@nerhadou.com`.

## Deployment state

The existing owner-private Site continues to use its trusted platform identity. The standalone BFF is implemented but **must remain closed until the external configuration and acceptance tests below are complete**. There is no password fallback, demo account, default administrator or bypass switch.

- Existing Site: `appgprj_6acfda6514988191b70ce8587b602beb`.
- Preserved baseline: Version 26, source `59a5a5b367c7c8cbf80ad6f45ef33064f4c24f0c`.
- Dedicated Supabase staging project: `guusnvjkbzihhsxfhnsk`, `nerhadou-commercial-hub-staging`, Frankfurt.
- Organization explicitly selected by the owner: `uuxwhxncspekcaeynuho`.
- Creation quote returned $0/month. No paid plan, branch or nonzero charge was approved.
- Supabase API: `https://guusnvjkbzihhsxfhnsk.supabase.co`.
- Supabase database function and auth.users trigger enforce exact company domain. Test external insertion was rejected and left zero test users. Advisor run returned no lints.
- Before User Created function is installed and verified; enabling its Auth-dashboard hook setting remains required. The database trigger already supplies defense in depth.
- No company emails, passwords or real test accounts were invented. SMTP, Turnstile and standalone Cloudflare credentials have not been supplied.

## Implemented boundaries

`AUTH_MODE` is explicit. `platform` is accepted only for the exact original chatgpt.site origin; the independent deployment sets `standalone`. Missing configuration fails closed. `AUTH_SETUP_VERIFIED` defaults to false and must only be set to true after the external checklist is completed. Platform headers are ignored in standalone mode. The Sites integration remains intact on the original private Site.

Sales JSON is byte-identical to Version 26 but relocated from public/ to private/. The Worker runs before static assets and blocks source JSON, private paths and public source maps. Every sales API independently authorizes the request. Safe authentication assets contain no sales records.

Standalone authentication uses pinned supabase-js, server-side getUser and JOSE ES256/RS256 verification with expected issuer/audience. No provider refresh/access tokens reach the browser. An opaque 256-bit session cookie is Secure, HttpOnly, host-only and SameSite=Lax. Only a SHA-256 digest is stored as session lookup key. Provider credentials are AES-GCM encrypted with row-bound associated data and a separate runtime secret. Refresh updates use a database lock. Sessions expire after 24 hours or 30 minutes inactivity; recovery sessions expire after 10 minutes. All requests recheck current user status, current verified email, provider identity and revocation.

New verified accounts are always pending viewers. Administrative roles come from D1, not client metadata. Owner initialization requires an exact provider UUID/email and independent identity verification, using an operator-only script. Owner/admin roles are exempt from authenticator verification; enrolled viewer accounts require aal2. Role changes require a recent application sign-in (or authenticator verification when enrolled). Suspension and role changes revoke current application sessions. Recovery never grants approval or removes suspension.

POSTs require exact Origin and JSON; authenticated BFF mutations also require a random per-session CSRF header. Import JSON is read with a bounded byte stream. Schema validation rejects extra privilege fields. Approvals, version checks, session revocation and access-notification queueing share one database batch. User-controlled account information is rendered as text. Existing spreadsheet export uses inline strings, not formulas.

A Durable Object applies atomic per-IP and per-email request limits; counters expire. Application limits are additional to Supabase's independent CAPTCHA/rate-limit settings. Provider endpoints must be configured and tested directly; BFF limits do not cover direct provider calls. No service-role key is required in the web runtime.

New auth and approval pages intentionally follow the existing HTML/CSS/JavaScript dashboard architecture. Server/security code is TypeScript. No dashboard framework rewrite was performed. Tests use the existing Node test harness, real SQLite and real workerd, rather than claiming a Vitest/Playwright run that did not occur.

## External setup — mandatory before testing with employees

1. Connect the owner's Cloudflare account or configure a narrowly scoped deployment token using secure secret entry. No Cloudflare integration or authenticated account was available in this session.
2. Build, run `node scripts/prepare-standalone.mjs`, and edit `dist/server/wrangler.standalone.json` with a dedicated staging D1 ID and actual staging origin. Do not deploy placeholder values or reuse the production Site's D1 binding.
3. Configure the variables in `deployment/env.example`. Generate the session key with a cryptographically secure generator (32 bytes, hex). Store the encryption key and all API secrets as Worker secrets. Use an enabled modern Supabase publishable key; the legacy anon name is accepted only for compatibility.
4. Create a Turnstile widget restricted to the actual staging hostname. Enable Supabase's own CAPTCHA with the matching widget secret. The provider consumes signin/signup/recovery tokens once. The application separately validates email-code flows, checking hostname and action. Do not consume the same token twice.
5. Configure custom SMTP with a verified sender, SPF/DKIM and delivery testing. Put `{{ .Token }}` in signup/recovery templates: these flows use explicitly entered email codes, not fragment tokens. Configure code expiration/attempt limits, confirmed email, minimum 8-character passwords with uppercase, digit and symbol and an appropriate maximum; disable anonymous, phone and unneeded OAuth providers. Set exact redirect allowlists, never wildcard production callbacks.
6. Enable `public.nerhadou_before_user_created` in Before User Created hooks. Keep the applied auth.users trigger; changing email is deliberately disabled in this release.
7. Use asymmetric Supabase signing keys (ES256 or RS256), supported by this verifier. Do not switch to unverified JWT parsing to make legacy HS256 work.
8. Confirm the owner's exact @nerhadou.com email. Register and independently verify identity (including mailbox verification under email_verified). TOTP enrollment and verification are optional. Run `scripts/bootstrap-owner.mjs` locally with the exact provider UUID and a server-only privileged key. Review and execute its SQL in the dedicated D1. It never makes the first registrant an owner and never removes the last owner. The service key must not be saved in git or the Worker.
9. Set a verified Resend sender/API key for access notifications. Supabase SMTP handles auth messages; the application outbox handles pending/access notices. A 10-minute scheduled task retries delivery and cleans expired session/short-lived logs. Access decisions do not roll back if email delivery fails.
10. Repeat real email delivery, domain bypass, provider CAPTCHA, authenticator, refresh/revocation, duplicate request and simultaneous login tests. Run browser QA and authorized authenticated ZAP scanning only against the dedicated staging environment.
11. Resolve the unpatched build-time dependency advisory recorded in SECURITY-REPORT.md before describing the external release as fully security-cleared. Do not use `npm audit fix --force` to downgrade to an incompatible old framework.
12. Import and reconcile the protected sales backup only after staging authentication passes. Transfer source records, overrides, workspace revision, audit log and audit_changes. Pause writes to the old site during final cutover; never operate two independent writable production datasets.

## Operator controls

- Users & approvals: pending/active/rejected/suspended lists; optimistic versioned decisions; owner-only role assignment; immutable access-event rows.
- Account security: password change, local logout, logout all devices, authenticator setup/verification.
- Password reset revokes all local sessions and attempts provider global logout. No approval status is changed.
- Lost owner authenticator: operator must verify the owner out of band, revoke provider and application sessions, reset factors using privileged Supabase administration, then re-enroll/verify TOTP. No public MFA-reset endpoint exists.
- Suspension blocks future data requests; it cannot erase already exported files.
- Restoring an application version must not restore old data. Never deploy the old header-trusting code on an independent public origin. Prefer a maintenance response to an unsafe rollback.

## References

https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook
https://supabase.com/docs/guides/auth/auth-mfa
https://supabase.com/docs/guides/auth/rate-limits
https://supabase.com/docs/guides/auth/auth-captcha
https://supabase.com/docs/guides/auth/auth-smtp
https://supabase.com/docs/guides/auth/signout
https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
