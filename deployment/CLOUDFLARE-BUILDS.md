# Independent Cloudflare build preparation

This is build infrastructure for the existing V32 application and requested name. It is not a new hosted Site release. No live Worker settings, users or sales have been changed.

## Verified locally

- `node --test tests/cloudflare-config.mjs`: explicit existing D1 identity, authentication activation, rate-limiter binding, independent origin and runtime-secret exclusion checks.
- `npm run build:cloudflare`: real Vite/Vinext build with an isolated, ignored build-check configuration. It does not contact or deploy to the named Worker.
- `node scripts/release-gate.mjs`: no public sales JSON/source maps; Worker-first assets.
- The protected original private input bytes are unchanged. They were supplied only to this ignored local checkout for verification; they are still absent from GitHub.

## Required before enabling production builds

1. Authenticate to the existing Cloudflare account and inspect the Worker named `sales`. Capture its current configuration, deployed version and exact D1 binding for rollback. Do not substitute a new database.
2. Supply the existing, reviewed nonsecret runtime configuration as build variable `NERHADOU_DEPLOYMENT_CONFIG` (JSON). It must retain the actual standalone origin, registration policy, provider configuration, rate limiter, existing migrations and notification schedule. No activation or setup defaults are generated. For a local build, the same configuration may be placed in ignored `deployment/runtime.json`.
3. Supply the original `private/seed.json` and `private/data.json` through an agreed protected build-input mechanism. Keep runtime sales updates in the existing D1. Do not infer that all baseline source sales are in D1: this version imports the source JSON at build time.
4. Preserve the existing Cloudflare runtime secrets. They are separate from build variables and must not be copied into this repository or plaintext deployment configuration.
5. Run a clean dependency installation, configuration checks, build, data reconciliation and authenticated acceptance tests with reviewed settings before connecting the production branch.
6. Only then connect this GitHub repository to the existing Worker. Build command: `npm run build:cloudflare`; deploy command: `npx wrangler deploy --config dist/server/wrangler.json`. Worker name must match the reviewed input configuration. Do not apply migrations or seed/reset the live database automatically.

The portable build does not require `.openai/hosting.json` or platform-local mock identity. Existing Sites build behavior is retained when `NERHADOU_STANDALONE_BUILD` is not set.

## Current external blocker

The Cloudflare Google login returned `Unable to sign in. Try again or use your email and password.` The account configuration and production binding have not been read or changed. A successful supported login is required to finish the steps above. No automatic production deployment has been enabled.

References:

- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://developers.cloudflare.com/workers/vite-plugin/tutorial/
