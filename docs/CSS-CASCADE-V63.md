# CSS cascade and proposed consolidation

Current, retained order in public/index.html:
1. style.css — original layout, chart/table and component defaults.
2. theme.css — workspace navigation, header, typography, responsive/fullscreen presentation.
3. management.css — management views, drawer, comparison/forecast controls and report/dialog foundations.
4. polish.css — density, component polish and motion.
5. premium.css — final visual theme over earlier rules.
6. ui06-preview.css — approved later corrections (UI06 through V63), responsive plots, report and access panel fixes.

V63 adds scoped rules to layer 6 and deletes no existing CSS rule. CSS load order is unchanged.

Proposed eventual order: foundations/tokens → layout/navigation → components → analytics/charts → utilities/responsive → a small release override sheet. Migrate one component at a time only after before/after screenshots for Actual Sales all tabs in company/product scopes, Historical, Data management, Users & access, My account, dialogs and mobile navigation. No consolidation performed without these visual diffs.

Chart roles: --chart-axis-size 11px; --chart-label-size 12px; --chart-value-size 12px. Historical rendering uses matching named JS roles. Container-based SVG drawings retain a 1:1 pixel scale; year-legend markers intentionally use their own 36×16 drawing.
