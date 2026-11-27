# Sales V76 review fixes · handoff

Branch `claude/project-thread-vz304e` from `main` 8234ce3 (V75). Source plan: `briefs/sales-v76-review-plan.md` (project files). **Not merged, not deployed.** Rollback target: V75 `main` 8234ce3.

## Status per item

| Item | Status | Notes |
|---|---|---|
| W-01 tender-safe seasonality | Done | `seasonalScenario()` in `management-core.js`: when a selection mixes tender and regular series, regular sales are projected seasonally and tender YTD is added unprojected. Card method, chart path and the "why" sentence say "regular (non-tender)". YTD-average scenario unchanged (method notes it includes tender). 2026 through Aug: EGP 2,893,130,701 (was 3,337,017,343). |
| W-02 prior year by comparison name | Done | `seasonalProjection(…, priorFilters)`; Forecast at-risk passes last year's source names of the same comparison product. Tadanerfi 5MG now finds 2025, but 2025 Jul is negative, so it still shows "Seasonality unavailable" with that reason. |
| W-03 returns | Done | Negative prior month → "2025 has returns larger than sales in Jan (EGP −24.6M)…". Products growth cell keeps the % and adds ⓘ "2025 Jan–Aug includes returns of …". Negative current sales → growth `—` ("Returns larger than sales…"). |
| W-04 NOPYRETRON packs | Done | `SOURCE_ALIASES` → NOPYRETRON 125MG. 2026: 64 products. Add the same rule to `scripts/refresh-history.py identity()` at the next data refresh. |
| W-05 tender growth | Done | Tender row whose previous same-period sales are under 25% of the previous full year → growth `—` with the reason. |
| W-06 matched base | Done | Extra column "2024 Jan–Sep" (focus year over the compared months) when the comparison is partial; phone label "vs 2023 Jan–Sep". |
| W-07 no target | Done | Zero target → Target/Ach./Variance `—` "No target for this product." Totals unchanged. Zero-sales rows already sort last. |
| W-08 FERROTRON vs Ferrotron Fort | No change needed | Owner confirmed 2026-11-27: Ferrotron Forte is a new 2026 launch and a separate product, so FERROTRON's 2026 growth is real and the two stay separate. |
| W-09 tender data note | Done | Definitions & data notes. |
| W-10 display names | Done | `tidyName()` in `view-context.js` (upper case, single spaces, "1.5MG", " - TENDER") for every year incl. the latest; source name subline only when the names really differ. Group toggle says "n packs" or "n price versions". |
| W-11 phone forecast | Done | Compact scenario amounts on phones; layout test checks they do not wrap. |
| W-12 line colours | Done | Explicit colours per sales line in `CATEGORY_COLORS`. |
| W-13 no target rows in AI catalog | Done | |
| W-14 smaller Update prompt | Done | "Catalog: latest year / all years" select next to Copy AI prompt; default latest (≈26 KB). |
| W-15 spellings / text | Done | `KNOWN_SPELLINGS` exported from `compare-core.js`; double full stop removed; rule (7) on packs. |
| W-16 carry-overs | Not changed | S9 Monthly 135 px warning; targets tooltip wording (R-15). |

## Tests
New `tests/sales-v76.mjs`. Updated for intended changes: `products-table.mjs` and `sales-v69.mjs` (64 products), `sales-v74.mjs` (display name METHYLTECHNO), `sales-v72-ui.mjs` (forecast "why" sentence), `data-manager-ui.mjs` (prompt checks), `layout-v72.cjs` (forecast amount wrap check).
