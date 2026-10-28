# V57 private preview login repair

The verified private Sites URL has changed to https://nerhadou-commercial-hub.ali-ashour01.chatgpt.site. The private runtime APP_ORIGIN must match this exact current address. The config guard allows only the original and new verified Site addresses, still requires platform mode, trusted platform identity and exact request-origin matching. Independent standalone deployments continue ignoring platform identity headers. Keep Site audience owner-only and never remove authentication to preview company sales.

Continue with ChatGPT is the expected initial private-host gate. Use the owner's ChatGPT account ali.ashour01@gmail.com, not the separate company application password.

Validation: tests/security/preview-origin.mjs passed, 146 existing private-preview auth assertions passed, build passed, and 28 built-Worker checks passed after correcting a stale UI02 footer expectation and testing the new origin. No live authenticated browser validation because the cloud browser is signed out. No company publication, password, data or schema changes.

Previous exact Site V56: appgprj_6acfda6514988191b70ce8587b602beb~appgver_c373710b23108191976be7186012c9e1, commit 0d255485ff5d1f3e79805e14b77dc2e4087cabe5. Reverting to V56 also requires reverting APP_ORIGIN to the old royal-fly address; never revert sales data. The company deployment remains standalone at sales.nerhadou.workers.dev.
