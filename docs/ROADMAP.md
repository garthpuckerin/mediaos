# MediaOS Parity Roadmap

This roadmap captures parity targets with Arrs (Sonarr/Radarr/Lidarr/Readarr), Prowlarr, Bazarr, Overseerr, and Tautulli, plus areas where MediaOS will exceed them.

## Phase 1 — Foundations (Parity MVP)

- Library item detail views (Series/Movies/Books/Music)
- Manual search and interactive selection (per item)
- Indexers & download clients configuration
- RSS polling + automatic grabs
- Quality profiles (basic) and cutoffs
- Calendar and Wanted queues
- System: tasks, backups/restore, logs, health checks

## Phase 2 — Parity Complete

- Custom formats/scoring; delay/release/language profiles
- Requests (Overseerr parity): search, approvals, quotas, routing, roles
- Subtitles (Bazarr parity) and history/blocklist UX
- Indexer aggregation (Prowlarr parity) + propagation to managers

## Phase 3 — Exceed

- Cross‑media insights and upgrade planner
- Curated lists (Trakt/IMDb/Spotify/Goodreads) and dedup strategies
- Advanced notifications and automations
- Multi‑organization support; plugin framework

## Feature Matrix (high level)

- Library: roots, scan/import, monitored, tags, rename/organize
- Indexers: Torznab/Newznab, priorities, categories, release/delay profiles
- Downloaders: qBittorrent, SABnzbd, NZBGet; failed/retry; post‑processing
- Quality: profiles, cutoffs, custom formats, language profiles
- Releases: manual search, blocklist, history, filters, size/quality gates
- Scheduling: calendar, wanted/missing, backlog, upgrades, jobs
- System: tasks, backups/restore, logs, health, auth/API keys, notifications
- Requests: discovery, approvals, routing, quotas, user auth/roles
- Analytics: sessions/history/top/usage/bandwidth; library stats
- Subtitles: search/download/upgrade per item, providers config
- Aggregation: central indexers (Prowlarr‑like), propagation, health

---

This document evolves with implementation. Track progress via epics and issues.
