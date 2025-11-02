# Enhancements & Optional Features

Purpose: Track non-core polish and optional improvements. Core functionality remains the focus; we will circle back to these once core paths are solid.

Status: Created 2025-10-21; updated 2025-10-28

## Completed in 0.3.0

- [x] In-app toast notifications replacing alerts, with Undo for deletes.
- [x] SABnzbd live queue: Pause/Resume/Remove and Open from Activity.
- [x] Item Detail: NZB upload button (multipart) and Re-grab of last.

## Downloads & Clients

- [ ] SABnzbd: NZB drag-and-drop upload with picker, display response/job ID, reuse last category automatically.
- [ ] qBittorrent: Queue polling (progress/speeds), actions (pause/resume/cancel), default category per kind (series/movies/books/music).
- [ ] NZBGet: Category mapping, queue status/polling and actions via JSON-RPC.
- [ ] Unified categories: optional per-kind defaults + overrides in Settings.

## Activity & History

- [ ] Live activity sourced from all client queues (replace last-grab snapshots).
- [ ] Persist a full grab history (append-only) with filters (client/kind/ok/status) and time range.

## Wanted & Scheduler

- [ ] Settings UI for scheduler: enable/disable, interval, next run, last run summary.
- [ ] Server-side search scoring and multi-selection to queue best results.
- [ ] Auto-enqueue rules per quality profile (cutoff/size caps/indexer allowlist).

## Calendar

- [ ] Month/Week/Agenda views, grouped by day with sticky headers.
- [ ] Inline "Add to Wanted" for untracked items; show tracked state.
- [ ] Color coding per kind and proximity (today/tomorrow/this week).

## Search & Indexers

- [ ] Manual search UI: advanced filters (size, quality, seeders, protocol), indexer selection with saved presets.
- [ ] Indexer connectivity tests and per-kind enablement in Settings.

## Library UX

- [ ] Release lists for movies and season/episode grid for series.
- [ ] Rich badges: last verify severity, last file name/size/bitrate.
- [ ] Virtualized lists for performance on large libraries.

## Artwork

- [ ] Remote fetchers (TMDB/TVDB/etc.) with quick-set suggestions.
- [ ] Batch apply/revert with side-by-side previews.

## Notifications

- [ ] Webhook/Discord notifications (download started/completed, failures).

## Quality & Verification

- [ ] Auto-verify after download completion with surfaced results in Activity and Item Detail.
- [ ] Media info display (codec/container/bitrate/resolution) and thresholds.

## Testing & Tooling

- [ ] Playwright smoke coverage for: Add to Wanted + Scan + Queue; Grab + Last Grab panel; Calendar navigation.
- [ ] Unit tests for settings normalization and downloader adapters.
- [ ] CI hooks: lint, typecheck, test in PRs.

## System & DevOps

- [ ] Logs UI with filters/search and download.
- [ ] Backup/restore UI for config/state files.
- [ ] Health panel with linked external service checks (qBittorrent/SAB/NZBGet/indexers).

## Accessibility & Internationalization

- [ ] Keyboard navigation, focus states, ARIA roles/labels.
- [ ] i18n scaffolding and language switcher.

---

Propose an enhancement by opening a PR that appends to this list with:

- Area (one of the sections above)
- Short description and acceptance criteria
- Priority (P3 default for optional items)
