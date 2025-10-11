# Sprint Planning Notes

## 2025-09-23

- Reset `feature/db-integration-tests` to `origin/feature/db-integration-tests` after a wrong-repo scaffold push.
- Re-ran quality gates (`npm install`, `npm run lint`, `npm test`) to confirm branch health.
- Action items: tighten branch protection + required CI checks, expand DB integration coverage, clean up lint debt.

## Next Focus

- Extend DB migrations/tests beyond `media_items` (requests, jobs, constraints).
- Wire branch protection rules once CI is finalised.
- Iterate on adapter/worker implementations to replace in-memory stubs.

## 2025-09-24

- Implemented sqlite-backed API routes and inline/BullMQ queue wiring.
- Hardened migrations/seeding + added dashboard overview endpoint and UI refresh.
- Added worker orchestration hooks and integration tests around request/jobs pipelines.
- Delivered qBittorrent/NZBGet/SABnzbd adapters for download orchestration.
- Documented branch protection + required CI gates.

## Backlog / To Revisit

- UI: Library-first navigation and subpage UX
  - Context: Library UI refined to improve clarity and reduce duplication.
  - Changes delivered:
    - Sticky Library kind tabs under the header within the main scroll area.
    - Left nav nests Library sub-items (Library main, Series, Movies, Books, Music, Add New, Library Import).
    - Add New and Library Import moved from list pages into left nav; duplicate page tabs removed.
    - Sidebar fixed; only main content scrolls; removed outer-page white border.
  - Remaining items:
    - Populate artwork grids with real items when API wiring is complete.
    - Evaluate react-router for cleaner routing and state.
    - Visual polish pass once data is present (hover/active states, focus order, a11y).
  - Owner: UI/Front-end
  - Status: In Progress
