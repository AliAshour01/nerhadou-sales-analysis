# Sales V78 October import fixes · handoff

Branch `claude/project-thread-ru7s87` from `main` 53a85dc (V77). Requested by the owner after seeing METHYLTECHNO and METHYLTECHNO - TENDER twice on the phone Products tab (2026 YTD Oct). **Not merged, not deployed.** Rollback: V77 `main` 53a85dc.

## Cause (live D1, read-only check 2026-11-27)

`record_overrides` holds 63 `CUSTOM_IMPORT_*` catalog series from the October 2026 import: channel `COMBINED / SOURCE`, distributor and line `NOT PROVIDED`, no `comparison_product`. `comparisonProduct()` fell back to the raw name, which was case- and space-sensitive, so "Methyltechno" and "METHYLTECHNO" were two products that both display as METHYLTECHNO. One September row has distributor "Pharma".

## Rules now

| Rule | Where | Notes |
|---|---|---|
| Canonical key for names without a reviewed `comparison_product` | `compare-core.js` `canonicalProductName`, `comparisonProduct` | Reviewed keys untouched. Add new misspellings to `CANON_SPELLINGS` (and `KNOWN_SPELLINGS` for the AI prompt). |
| Tender is never merged with the regular product | `comparisonProduct` | Owner rule, restated 2026-11-27. The Products tab "Combine tender" checkbox is the only place they are shown together. |
| Distributor upper-cased, unknown line one spelling | `compare-core.js` `dashboardRecords` | Called from `management.js` `records()`; cached per records array. |
| Missing line filled from the product's single line in the same year | `dashboardRecords` | Same year only, tender separate, never across years (AGENTS.md: no historic line inference). `line_inferred: true`, `source_line` kept. Products with two lines in that year are left Not provided. |
| New import series store `comparison_product` | `data-core.js` `previewImport` | `data-core.js` now imports `compare-core.js` (bare path, also bundled by the Worker; `npm run build` passes). |

## Owner answers (2026-11-27)

- Packs: product = all packs, packs listed under it and selectable one by one. `products-table.js` `withPacks` adds the "n packs" toggle and `pc-sub` cards on the phone; desktop sub-rows already existed (V74).
- EGY fractional units: hide decimals in display, keep them in calculations. All dashboard formatters already round to 0; `data-manager.js` `fmt` now does too. Editable Data table inputs keep exact values on purpose.
- Odd small-row prices are price increases; one-month spikes are bulk sales; TADANERFI 10MG target 0 because it is being discontinued. No change.

## Validation

- `tests/sales-v78.mjs` (new): October spellings → keys, tender separation, PHARMA, line fill, import `comparison_product`, and no two keys share a spelling after an October-style import on the baseline.
- Unchanged keys: every one of the 8,456 baseline records gives the same `comparisonProduct` as V77.
- Passing: product-identity, comparison, view-context, products-table, sales-v72/73/74/76/77/78, new-series-import, bulk-import, dynamic-updates, replacement-import, management, management-ui, focus-comparison, line-assignments, regression-v69, data-manager-ui, meeting-report-v61, owner-version-v64; `npm run release:check`; `npm run build`.
- Local harness with an October-style override set (the 58 live October names): phone Products tab 2026 YTD Oct had 3 duplicate cards in the first page on V77 and none on V78; Sales by line no longer has a "NOT PROVIDED" bar (EGP 283M before).
- `data-management.mjs` fails before and after (needs `private/data.json`, not in the container).

## Limits

- October distributor and sales type stay unknown; a detailed October re-import (by distributor, sales type and line) would fix them. Its rows will land on the same products now.
- The live October catalog rows still have no stored `comparison_product`; the canonical key covers them. Data tables show them as before.
