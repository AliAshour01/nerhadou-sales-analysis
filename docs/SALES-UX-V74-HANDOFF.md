# Sales V74 review fixes · handoff

Branch `claude/project-thread-ujzoes` from `main` 807aa6b (V73). Source plan: `briefs/sales-v74-review-plan.md` (project files). Owner answers applied (2026-11-27): NERDECONG = NERDECONG 2.5MG, NERCAFIX 20/30 FILM = NERCAFIX 40MG, ZOLMASONE = ZOLMSOLAN, Ferrotron Fort is a separate product, pack sizes stay merged into one product line. **Not merged, not deployed.** Rollback target: V73 `main` 807aa6b.

## Status per item

| Item | Status | Notes |
|---|---|---|
| V-13 product aliases | Done | `KEY_ALIASES` / `SOURCE_ALIASES` in `public/compare-core.js`, applied inside `comparisonProduct()` (no source data edited). The same rules belong in `scripts/refresh-history.py` `identity()` at the next data refresh. |
| V-14 one row per product | Done | Products tab (single year) groups source names by comparison name; "n price versions" toggle lists the source rows (sales and share only). Group target = `targetSum` of its source names (never split). Bridges always match by comparison name (V73 year rule removed). Forecast "Products at risk" groups the same way. Excel export lists the price versions under each product. Overview product filter and URLs still use source names (selecting a product selects all its versions). Needs attention still lists source names. |
| V-01 safety net | Done | A row that stands for only some of a comparison product's price versions has an unknown previous year with the reason "Price versions change every year…" (Total row falls back to the KPI rule). |
| V-02 seasonality guard | Done | Share of last year's total by the cutoff below 25% → seasonality shown as `—` with the reason (product table and company card). |
| V-03 previous-year gaps | Done | Dashed ghost bars for months the previous year did not record plus the note "2023 Oct–Dec not recorded…". The in-chart label was dropped (it overlapped the bars). |
| V-04 grey bar | Done | "Not in 2023 data (n)" with the product names in the tooltip (provisional years only). |
| V-05 bridge labels | Done | Two-line product names, `fitTail` for any remaining duplicates. |
| V-06 repeated note | Done | Italic note removed from KPI cards (kept in the chip title); caption "2023 → 2024 · Jan–Sep in both years · … · 2023 includes estimates"; mix captions without "not recorded"; "(2023, includes estimates)". |
| V-07 KPI subtitles | Done | EGP amounts in subtitles are compacted when the row is compacted. |
| V-08 scenarios | Done | Each at-risk product shows "Misses in both scenarios / on YTD average only / Seasonality unavailable"; unavailable ranks with both (a miss in the only scenario); phone cards show seasonality. |
| V-09 pace wording | Done | "On pace (2.1 pts behind)", "Behind pace by 6.3 pts". |
| V-10 colours | Done | HOSPITALS / UPA = HOSPITALS colour; Sales by line uses the category palette. |
| V-11 multi-year mixes | Done | Caption "2026 only (focus year) · YTD Aug". |
| V-12 carry-overs | Not changed | S9 Monthly card still ends 135 px early (known warning). Targets tooltip wording still waits for Ali. |

## Tests
`tests/sales-v74.mjs` (new). Updated for intended changes: `products-table.mjs` and `sales-v69.mjs` (65 products in 2026 instead of 67: Tadanerfi 5MG packs and tender twins grouped), `sales-v72-ui.mjs` (price-version toggle, scenario order, tender seasonality), `sales-v73.mjs` (KPI wording).

## Known limitations
- Tadanerfi 5MG (20 FILM + 30 FILM) shows no seasonality projection (last year's names differ per pack); the YTD-average projection is shown.
- FERROTRON 2026 growth falls to −17.6% now that Ferrotron Fort is separate (it was mixed in before).
- Phone product cards do not expand price versions.
