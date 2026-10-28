# V58 — Compact YTD period labels

Private preview only. Historical YTD mode now says YTD Sep / YTD Aug in context, chart tooltips, KPI notes and Excel subtitles, and passes the same periodLabel to the Historical Movement bridge. Monthly axes retain month names. Explicit month selection still lists its individual months. Common complete consecutive months use their actual cutoff; gaps say common months only, and empty intersections say no common months. No arithmetic, sales data or security changes. Cache-bust comparison.js and management.js together to historical-v58 on publication. The company site remains unchanged.

Private published source: 44f6ba7f57432abd6b6dcc51e70da2793bfeb13b; saved version appgprj_6acfda6514988191b70ce8587b602beb~appgver_da5dc143218081919c6a68d2871658f6. URL https://nerhadou-commercial-hub.ali-ashour01.chatgpt.site. Prior V57 source aa1c16cb0d5799594bec7de5e995c67e7a49b264. No database rollback needed.

Historical DOM regression checks verify Sep/Aug cutoff changes, common-month mode, table subtitles and arbitrary month distinction. Management integration's old Common months label assertion is updated to compact YTD plus bridge context. Browser validation remains gated by the owner's ChatGPT sign-in.
