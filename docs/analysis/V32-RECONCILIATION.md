# Version 32 — Actual figures reconciliation

## Defects corrected

Version 31 reused `comparison_product` (a historical brand/strength grouping) in Actual management views. This merged distinct Tender and pack source labels in some new views, while the original Actual table retained them. The target resolver then rejected several resulting multiple-target matches. The selection predicate could also expand a regular product selection to Tender through the historical grouping. These were application defects; source sales were not deleted or changed.

Actual analysis now matches source product identity with case/whitespace normalization only. Tender and pack suffixes remain significant. Historical comparison retains its reviewed grouping explicitly; it is not applied implicitly to Actual or its targets. Multiple genuine target rows for the same source identity still require review rather than guessing a sum.

The current Actual workbook is a sparse monthly transaction report. Recorded numeric rows are summed after verifying the company reporting months exist; absent source rows are not manufactured, and explicit unknown metric cells or excluded reporting months still make the result unavailable. An entirely absent product/period remains unavailable, not zero. Historical matrix coverage rules remain stricter and owner-approved 2023 exceptions stay bounded.

## Reconciliation checks

1. Unchanged baseline source: all 67 current source products checked individually for Units and Value against `snapshotFrom` / original Actual source rows. Unit and value targets checked separately against the original source target for every product. Product totals reconcile to company totals. No missing source target or missing source actual total remains in this complete current-source scope.
2. Existing protected backup, saved data revision 1: effective overrides applied read-only. All 67 products across January–September 2026 checked for Units, Value and both target measures, plus company totals. This verifies saved imported data without changing or restoring either live database. It does not certify a fresh live database read.
3. Regression examples: ONDALENZ 8MG period unit target Jan–Aug = 600,000; ONDALENZ 8MG - TENDER = 53,333.333… under the existing annual/12 convention. Regular source sales never include Tender. Source zero targets remain zero; achievement with a zero denominator is not defined.
4. Missing metric cells, entire unavailable months, reporting exclusions, new product baselines, source-name spacing aliases and duplicate contribution labels tested. No new zero assumptions, no imputation and no replacement of recorded sales values.

## User-visible corrections

- Actual summary, product detail, heatmaps, line detail, target gaps, insights and report exports share the same source identity and target resolver.
- Historical bridge and common-month selection explicitly use the historical reviewed identity.
- Zero-target achievement has explanatory text. Unmatched bridge amounts expand into a named list with their unavailable comparison reason.
- Analysis tabs render on selection instead of calculating every hidden chart on every filter change.
- Version 31 remains saved for rollback; data revisions remain independent from app versions. The independent Cloudflare deployment is unchanged.

## Validation scope

Production build and real built-Worker routing/auth checks must pass before publication. Management pure calculations and DOM interactions, Actual regression, historical comparison model/UI/export, dynamic updates, replacement and authentication tests passed. DOM tests cover displayed company Units/Value, company achievement, source identity, product details, period controls, saved/shared views, common months and report preview. These are not visual browser tests or an external penetration test.

Source hashes unchanged:

- private/seed.json: 77df866c0ef8253b9a32b9a241e643ebc7338d782bbcb6cf41097dc7c97f426f
- private/data.json: 08c68c0ba898f8b3e03cd68a4fd49eb88245deb35b5d422f5cef9433d1402084

Existing source estimates and provisional Target2 assumptions remain labelled. A genuinely unavailable prior-year detail or unallocated target is still shown as unavailable with context; it is not replaced by a fabricated figure.
