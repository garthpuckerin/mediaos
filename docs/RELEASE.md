# Release Process

This document defines how we version and cut releases for MediaOS.

## Versioning

- We follow Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`
  - MAJOR: breaking API changes or migrations required
  - MINOR: new features, non-breaking behavior changes
  - PATCH: bug fixes and internal improvements (no API or UX breakage)
- Monorepo: We tag the repository with a single version (e.g. `v0.3.0`). Package versions may lag the app tag; bump them when we publish packages.

## Changelog

- We keep a single root `CHANGELOG.md` (Keep a Changelog format).
- All changes land under `## [Unreleased]` during development.
- When cutting a release, we:
  1. Move relevant entries from Unreleased into a new section `## [x.y.z] - YYYY-MM-DD`.
  2. Leave `Unreleased` with "Nothing yet." or new items.

## What constitutes a release?

- Cut a MINOR release when ALL apply:
  - Feature/theme is complete (e.g., SAB-only build) and user-facing flows work end-to-end.
  - Acceptance/smoke checks pass (see below).
  - Docs updated: CHANGELOG, any setup/ENV notes.

- Cut a PATCH release when:
  - Fixes a defect or small enhancement with low risk, no intentional UX/API break.

## Acceptance / Smoke Checklist (SAB-only build)

- Settings → Download Clients: SAB configured and testable
- Item Detail: NZB upload and Re-grab succeed; Last Grab updates
- Activity → Queue: shows job, progress, ETA; Pause/Resume/Remove work
- Activity → History: shows recent SAB completes
- Optional: Auto-verify on completion logs job trigger
- Wanted: Scan & Queue enqueues Usenet and appears in queue
- Calendar: Event links navigate to item detail

## Release Steps

1. Ensure `CHANGELOG.md` has a new section for the release and Unreleased is clean.
2. Update versions only if publishing packages; otherwise rely on git tag.
3. Tag the repo: `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. Create a GitHub Release from the tag; paste the changelog section.
5. Monitor for hotfixes; if needed, cut a PATCH with the same steps.

## Pre-releases

- Use `-alpha.N` / `-beta.N` suffixes for early drops: `v0.4.0-beta.1`.
- Keep them lightweight; treat like normal releases without marketing.

## Cadence

- Aim for small, cohesive MINOR releases when a vertical slice is complete (e.g., weekly or feature-based).
- Use PATCH as needed between MINOR releases.

## Backlog vs. Build Scope

- Critical items are implemented fully within the release.
- Nice-to-have items are either implemented in-line if trivial and cohesive, or added to `docs/ENHANCEMENTS.md` and deferred.
