# Release Process

This document defines how we version and cut releases for MediaOS.

## Versioning

- We follow Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`.
  - MAJOR: breaking API changes or migrations required
  - MINOR: new features, non‑breaking behavior changes
  - PATCH: bug fixes and internal improvements (no API or UX breakage)
- Monorepo: we tag the repository with a single version (e.g., `v0.3.0`). Package versions may lag the app tag; bump them when publishing packages.

## Changelog

- A single root `CHANGELOG.md` is maintained (Keep a Changelog format).
- Changes land under `## [Unreleased]` during development.
- When cutting a release:
  1. Move entries from Unreleased into a new section `## [x.y.z] - YYYY-MM-DD`.
  2. Leave `Unreleased` with "Nothing yet." or new items.

## What constitutes a release?

- MINOR release when ALL apply:
  - Feature/theme is complete (e.g., SAB‑only build) and user‑facing flows work end‑to‑end.
  - Acceptance/smoke checks pass (see below).
  - Docs updated: CHANGELOG, setup/ENV notes.

- PATCH release when:
  - A defect is fixed or a small enhancement is shipped with low risk, no intentional UX/API break.

## Acceptance / Smoke Checklist (SAB‑only build)

- Settings > Download Clients: SAB configured and testable
- Item Detail: NZB upload and Re‑grab succeed; Last Grab updates
- Activity > Queue: job visible with progress/ETA; Pause/Resume/Remove work
- Activity > History: shows recent SAB completions
- Optional: auto‑verify on completion logs job trigger
- Wanted: Scan & Queue enqueues Usenet and appears in queue
- Calendar: event links navigate to item detail

## Release Steps

1. Ensure `CHANGELOG.md` has a section for the release and Unreleased is clean.
2. Update package versions if desired; otherwise rely on the git tag.
3. Tag the repo: `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. Create a GitHub Release from the tag; paste the changelog section.
5. Monitor for hotfixes; if needed, cut a PATCH with the same steps.

## Pre‑releases

- Use `-alpha.N` / `-beta.N` suffixes for early drops: `v0.4.0-beta.1`.
- Keep them lightweight; treat like normal releases without marketing.

## Cadence

- Aim for small, cohesive MINOR releases when a vertical slice is complete.
- Use PATCH as needed between MINOR releases.

## Backlog vs. Build Scope

- Critical items are implemented fully within the release.
- Nice‑to‑have items are implemented in‑line if trivial and cohesive, or added to `docs/ENHANCEMENTS.md` and deferred.
