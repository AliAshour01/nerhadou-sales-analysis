# Codex onboarding

Read AGENTS.md first, then this file, package.json, deployment/CLOUDFLARE-BUILDS.md and docs/RELEASES.md. Historical README entries may describe superseded behavior; check current source.

## First task: inspect and verify
This onboarding task is an audit, not a feature implementation.
- Identify checked-out branch and commit.
- Use the Node version in .nvmrc.
- Install the locked dependencies: npm ci --include=dev --include=optional
- Run npm run check:deployment
- Run npm run build
- Read scripts/build-cloudflare.mjs to understand the tests included in that command.
- Choose further targeted tests after inspecting relevant code and test setup.
- Build artifacts and ignored local test state are expected. Do not edit tracked application files, update dependencies, merge, deploy or mutate a remote service during this first task.
- If blocked, report the actual error and what remains unverified. Do not bypass checks.
- Do not request production credentials for this initial local audit.

## Where to look
- package.json: supported commands and dependencies.
- public/: dashboard, comparison and data-management browser code.
- app/api/: server routes and authorization.
- tests/: calculation, import, regression and security checks.
- scripts/: build, source validation and release checks.
- docs/RELEASES.md: existing application release history.
- docs/security/: security design and known verification limits.
- deployment/CLOUDFLARE-BUILDS.md: existing deployment workflow.

Use the existing repository configuration rather than creating new infrastructure. Preserve source inputs and application release identity. Follow AGENTS.md calculation and security rules.
Changes to the production branch can trigger deployment: propose later implementation work on a separate branch and through a pull request.

## Report to the owner
Use simple Egyptian Arabic. Explain:
1. What the application contains and how it runs.
2. Checks passed, failed and blocked, separately.
3. Verified defects, with file references and evidence.
4. Suggestions, clearly distinguished from verified defects.
5. Which import/update/replacement behaviors already exist.
6. One recommended next improvement and its acceptance checks.

Do not claim live authenticated QA or penetration testing from local or mocked checks. Do not invent missing figures or publish confidential data.
