# V65 — oversized filter icon correction

Owner reported a huge icon occupying the page in the V64 preview. V64 filter headings added width/height=18 SVGs but did not constrain their CSS dimensions. Existing general chart rules include `svg { width:100%;height:auto }` and `#comparison svg { width:100%;height:auto }`. CSS overrides SVG presentation attributes, so the small decorative drawing expanded to its parent's full width.

Fix: remove both decorative SVG elements from `.filter-bar-title`, leaving the concise text “Filters”. This avoids chart-style inheritance entirely. Existing filter containers, controls, selected state, logic and other chart SVGs remain unchanged. No global SVG/CSS rule altered. Owner-only version continues via existing visibility logic; release/cache becomes V65.

Files: public/index.html, release.config.json, generated UI cache strings, lib/release-notes.ts, release docs, targeted release expectations. Existing Owner/Admin/Viewer version test uses release.config.json for the expected number. No new dependency, auth, data, schema, calculation or production config change.

Validation: existing owner/version + management DOM suite, comparison UI, central release/cache check, build, private-artifact gate and built workerd tests. Browser screenshots remain unverified: managed preview infrastructure was unavailable; the CSS cause is identified from the actual source cascade, not a measured screenshot. User can inspect the private published preview. Do not claim all-page visual certification.

Publish trial only. Main/company production remains V62. Prior private V64: saved appgprj_6acfda6514988191b70ce8587b602beb~appgver_1d9336bef06c819182f38380d551160b, source ee7daf219c0de966c8c304339851586af53c2008. Code rollback must never restore database data. Exact V65 deployment evidence goes in draft PR17.
