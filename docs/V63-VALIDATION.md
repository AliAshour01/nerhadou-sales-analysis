# V63 validation

`npm ci --ignore-scripts --no-audit --no-fund` succeeded. Linkedom supplied through NERHADOU_DOM_MODULE. Results below are local test results, not live security or browser certification.

| Suite | Result |
| --- | --- |
| `tests/management.mjs` | PASS |
| `tests/comparison.mjs` | PASS |
| `tests/focus-comparison.mjs` | PASS |
| `tests/comparison-ui.mjs` | PASS |
| `tests/breakdown.mjs` | PASS |
| `tests/management-ui.mjs` | PASS |
| `tests/data-server.mjs` | PASS |
| `tests/chrome.mjs` | PASS |
| `tests/breakdown-ui.mjs` | PASS |
| `tests/regression.cjs` | PASS |
| `tests/meeting-report-v61.mjs` | PASS |
| `tests/readability-v63.mjs` | PASS |

Additional checks: scripts/sync-release.mjs --check, responsive-v60.mjs, Site npm run build, scripts/release-gate.mjs, tests/security/worker.mjs (28 built-Worker assertions), standalone build wrapper with existing production config: PASS. Standalone wrapper includes 8 deployment/source-baseline tests and math reconciliation; no deployment command executed.

Baseline failures: data-server missing esbuild (resolved by npm ci); breakdown-ui fake DOM threw on dynamically-created bd-full-chart (replaced with real Linkedom DOM, not skipped). Intentional label/version/top5/Forecast-owner-admin test expectations updated; numeric checks not relaxed.

Browser screenshots, real rendered fonts and sticky-header overlap at scroll offsets 0/400/1200: BLOCKED by the managed preview environment (another vinext dev server at /site PID15). No fabricated screenshots or substitute browser stack. Full CSS consolidation/dead renderer removal deferred. See READABILITY-V63-HANDOFF.md.
