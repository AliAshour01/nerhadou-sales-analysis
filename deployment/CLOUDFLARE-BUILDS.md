# Cloudflare continuous deployment

Application: Nerhadou Sales Analysis (V32 UI and calculations).
Private repository: AliAshour01/nerhadou-sales-analysis.

## Reviewed production identity

- Worker: `sales`
- Origin: `https://sales.nerhadou.workers.dev`
- Cloudflare account: `779017f931176fc4feefa3c69ef80304` (company account)
- Existing D1: `6453d359-6157-49d5-b6ff-f98d6efaed8a`, bound as `DB`
- Existing rate limiter: `AUTH_RATE_LIMITER` / `AuthRateLimiter`
- Existing scheduler: `*/10 * * * *`
- Last owner-confirmed manual deployment: `4730a1a5-ffd7-410d-b3ec-06f8eb1c9951`

## Cloudflare Builds settings

- Production branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy` (uses the Vite-generated configuration redirect)
- An explicit equivalent deploy command is `npx wrangler deploy --config dist/server/wrangler.json`.
- Root directory: `/`
- Node: 22, declared in `.nvmrc`
- No extra build secrets are required for the source baseline.

The checked-in production configuration targets the company account, not the personal Gmail account. Provider keys and existing runtime secrets stay in Cloudflare. `keep_vars: true` retains dashboard variables absent from the checked-in configuration. No database migration/import/restore command is part of the build or deploy path.

## Baseline data confidentiality

`deployment/source-baseline/*.json.gz` is prepared locally and contains confidential, compressed server-side baseline sales. Upload to this PRIVATE repository is pending explicit owner authorization after the automatic review rejected the transfer. The GitHub build cannot complete until these inputs are available. Compression is not encryption. Keep this repository private and limit collaborator access. The build validates SHA-256 and restores exact original bytes into ignored `private/` files. The public asset directory never receives these input files. Live sales updates and approvals stay in the existing D1; they are not replaced by these baseline files.

Raw baseline hashes remain:
- seed.json: 77df866c0ef8253b9a32b9a241e643ebc7338d782bbcb6cf41097dc7c97f426f
- data.json: 08c68c0ba898f8b3e03cd68a4fd49eb88245deb35b5d422f5cef9433d1402084

## Verification

`npm run check:deployment`: 8 configuration/baseline tests.
`npm run build`: standalone Vite/Vinext build and private-artifact gate.
`node tests/security/worker.mjs`: 23 real built-Worker checks including standalone forged-identity rejection.
`node tests/management.mjs`: actual totals, identity and target regression checks.

These local tests do not certify an authenticated browser session on production or an independent penetration test. Cloudflare build success must be verified after merge. A failed build does not mean a failed deployment was promoted.

References:
https://developers.cloudflare.com/workers/ci-cd/builds/
https://developers.cloudflare.com/workers/wrangler/commands/workers/
