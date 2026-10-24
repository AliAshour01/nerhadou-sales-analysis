# UI04 continuation

Parent production: bfee090a8eb73ce855d53345dd7d729306cbfed9 (UI03). Addresses the owner feedback that the initial MagicPath port was too subtle. Retains the approved blue/white design while refining all existing screen controls, cards, tables, density and supporting type in public/polish.css. public/polish-motion.js observes only the summary container child list and adds short Web Animations without parsing or mutating numbers. It respects reduced-motion, hidden pages and disconnects on pagehide. No React/demo code, fixed PPG, target allocation, chart replacement, auth or data behavior changes.

Validate production build, existing 21 suites, live DOM/screenshot of summary and navigation. Capture deployment check and Worker version in the PR. Do not equate mocked API fixtures with live auth or data write verification.

Optional design plugins Figma/Lovable were suggested at owner request, but no paid plans authorized or required. Roll back code to parent only, never restore the database.
