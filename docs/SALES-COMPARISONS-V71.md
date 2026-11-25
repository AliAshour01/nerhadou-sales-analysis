# V71 recorded sales comparisons

The preceding production source is V70 at `c4be43144a60a30d17a30beec3ae3604d7bb216b`.

The owner approved using recorded 2023 amounts throughout Sales performance. `management-core.js` admits recorded amounts for a selected 2023 period when every chosen month contains a numeric amount within the scope and no source reporting interruption applies. Incomplete recorded subtotals retain their coverage flags, and estimated values retain their provenance. Calendar and selected-year comparisons use the same months on both sides. Common months is enabled by default for multi-year comparisons. When disabled, gaps remain unavailable. FY rows remain separate source controls and remain visible in Data management.

`management.js` uses these values in KPI cards, yearly and monthly charts, bridge, Products, meeting reports and spreadsheet exports. The data notes explain coverage, estimates and separate FY controls. `data-manager.js` updates the obsolete comparison instruction when rendering legacy notes. No source files, data revisions, account logic or deployment configuration are modified.

Regression coverage includes 2022 to 2023 and 2023 to 2024 comparisons for Units and EGP, bridge reconciliation, missing periods, estimate metadata, product comparisons, range KPIs and the meeting report. The seasonal forecast still requires complete, verified prior-year monthly amounts. The V70 inline More filters styles carry forward.
