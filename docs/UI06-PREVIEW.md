# UI06 preview only

Base: 1dfcc5ec839ec33071bc5be1c551f18a2fa06b0b. No production deployment authorized yet.

- Removes runtime Line analysis section and dead state/exports. Old saved section=lines falls back to Overview; source line filters remain.
- Forecast tab retains admin/owner visibility and the existing runRateProjection function unchanged. Shows its method verbatim. A target-shaped cross-check uses existing summary/targetSum helpers, requires the run-rate prerequisite guard plus complete positive YTD target and complete nonnegative remaining targets, and retains unknown values. No source calculation math is altered.
- Drawer and single-product Overview call the shared renderProductView. A scoped product chip clears only product selection, preserving other filters. Breakdown hides for an explicit single-product selection and redirects to Overview. Product context maps via comparisonProduct from its actual record when entering Year comparison. Monthly detail export remains available in both views.
- Forecast visibility has NOT been widened. Owner must decide whether viewers should see planning scenarios before any such change.
- Preview uses read-only mock transport around original seed data, not production overrides; numbers may differ from the live edited database. No sales writes are supported here.

Checks: management calculation suite passed with 67 source-product reconciliation; browser verified both forecast figures, direct product filter CALCITRON, shared Overview and comparison carryover. Management DOM suite updated for removed Line tab and new Forecast/single-product/viewer denial behavior. Full production build/security suite remains a pre-publication gate.
