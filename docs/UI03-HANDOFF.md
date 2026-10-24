# UI03 approved MagicPath design rollout

Approved design: MagicPath project 464812414785957888, component 464812467516768256, revision 464812467516768257. User approved the interactive prototype and requested application-wide styling and publication.

## Scope
public/polish.css is loaded after existing application styles. It provides the shared cobalt/white visual system, featured sales KPI, typography, controls, navigation, panels, tables, comparison selectors, data management, approvals and dialogs. public/auth/auth.css adds the same design language to registration, login and account forms. Existing DOM, auth handlers, analytics and export code remain authoritative. Prototype mock figures, fixed PPG, demo target allocations and placeholder actions must never enter the real app.

## Motion and access
Short CSS entry transitions apply to tab sections and disclosures; interactive controls have subtle hover/press states. prefers-reduced-motion disables animations/transitions. Chart calculations and chart identities are not changed. Existing server role authorization and owner-only release notes are preserved.

## Validation and rollout
Run npm run build then node scripts/verify-security.mjs. Inspect the application with the shared stylesheet, especially summary/Breakdown, comparison and admin tables. Source JSON, D1, auth configuration and secrets are not modified. Keep production build/deployment evidence in the PR. Code-only rollback removes polish.css link, reverts the appended auth styles and restores UI02 labeling; never restore sales data for a style rollback.
