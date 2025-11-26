# Changelog

All notable changes to MediaOS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comprehensive AI guardrails with documentation synchronization standards
- Branch management strategy with GitHub integration
- CODEOWNERS file for automated review assignments
- GitHub issue templates for features and bugs
- Pull request template with systematic review checklist
- Branch protection configuration for main, develop, and feature/2.2
- Emergency procedures and hotfix workflows
- Automated branch monitoring and cleanup rules
- Documentation synchronization enforcement mechanisms
- Real-time documentation update protocols
- Weekly/monthly/quarterly documentation review cycles
- **Sprint Planning & Roadmap document with 15-sprint development plan**
- Comprehensive integration tests for settings API (GET/POST endpoints, persistence, validation)

### Changed

- Enhanced AI guardrails with systematic root cause framework
- Updated documentation structure with comprehensive sync requirements
- Improved branch protection rules and merge strategies
- Enhanced quality gates with documentation validation
- **Improved TypeScript type safety in settings.ts - replaced `any` types with proper type definitions**
- **Reduced ESLint warnings from 192 to 182 (-5.2%) through type safety improvements**

### Fixed

- TypeScript strict mode compliance in settings.ts (exactOptionalPropertyTypes, noPropertyAccessFromIndexSignature)
- Index signature access patterns using bracket notation for type safety
- Optional property assignment patterns to avoid undefined violations
- **Settings configuration now respects CONFIG_DIR environment variable for test isolation**

### Tests

- Added comprehensive integration tests for settings normalization and downloader configuration
- Tests cover: API endpoints, persistence, concurrent writes, data sanitization, validation
- All tests use actual implementation with temporary file system for isolation

### Security

- Added security scanning in CI pipeline
- Implemented proper .gitignore for sensitive files
- Added environment variable validation
- Enhanced branch protection with security requirements
- Settings API properly sanitizes sensitive data (passwords, API keys) in responses

## [0.3.0] - 2025-10-28

### Added

- SAB-focused slice: Item Detail shows Last Grab (client, timestamp, status) with Re-grab action.
- NZB upload to SAB from Item Detail (multipart); respects SAB category from settings.
- Live SAB queue in Activity with Pause/Resume/Remove and Open-in-client.
- SAB history merged into Activity History; optional auto-verify trigger on completion (poller).
- Wanted: server scan endpoint and UI Scan button; optional enqueue prefers Usenet.
- Calendar: generated events are rendered and clickable to item detail.
- Library persistence (file-backed) with PATCH/DELETE; UI edit/delete on cards and item detail.
- Manual Search filters: protocol, min seeders, min/max size (stubbed results for now).
- In-app toasts (replace alerts) with Undo for deletes.

### Changed

- Unified settings for SAB (timeout, category) used by grabs and uploads.
- Verify panel auto-refreshes briefly to surface background results after load.

### Docs

- Added docs/RELEASE.md (release process), docs/SAB_SETUP.md (SAB-only setup), docs/ENHANCEMENTS.md (backlog).

### Notes

- Background pollers are optional; enable SAB auto-verify via `ENABLE_SAB_VERIFY_ON_COMPLETE=true`.

## [0.1.0] - 2025-09-17

### Added

- Initial project structure with monorepo setup
- Fastify API server with TypeScript
- React frontend with Vite
- Worker package for background processing
- Adapters package for external integrations
- Docker containerization
- Basic SQLite database setup
- API route structure for all major modules

### Infrastructure

- pnpm workspace configuration
- Docker multi-stage build
- Basic environment configuration
- Initial database schema
