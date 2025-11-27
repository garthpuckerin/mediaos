# Changelog

All notable changes to MediaOS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Complete JWT Authentication System (Phase 2 - PR #46)**
  - AES-256-GCM encryption service for sensitive credentials (passwords, API keys)
  - PBKDF2 key derivation (100k iterations) with automatic credential encryption
  - JWT token generation with HMAC-SHA256 signing
  - Access tokens (15 min expiry) and refresh tokens (7 day expiry)
  - File-based user store with bcrypt password hashing and RBAC (admin/user roles)
  - Authentication routes: register, login, refresh, logout
  - 56 comprehensive tests covering encryption, JWT, and user management
  - Environment variables: JWT_SECRET and ENCRYPTION_KEY

- **API Route Protection & Rate Limiting (Phase 3 - PR #47)**
  - JWT authentication middleware protecting all API routes
  - Granular per-route rate limiting (100/min general, 20/min search, 5/min auth, 30/min downloads)
  - Per-IP tracking with automatic cleanup
  - Protected routes: library, indexers, downloads, wanted, activity, settings
  - Admin-only endpoints for sensitive operations (settings updates)
  - Brute-force protection on authentication endpoints

- **Comprehensive Documentation (Phase 1)**
  - Complete authentication setup guide with JWT flow diagrams and API examples
  - Production deployment guide with Docker, HTTPS, monitoring, and backup strategies
  - Full API reference documentation for all endpoints
  - Enhanced README with organized documentation structure and security setup

- **Security Hardening (Phase 2)**
  - Environment variable validation on startup with detailed error messages
  - Strong password requirements (uppercase, lowercase, numbers, special chars)
  - Common password prevention (blocks weak passwords like "password123")
  - Password strength scoring system (weak/medium/strong ratings)
  - Comprehensive validation tests for environment and password security

- **App.tsx Component Refactoring (PR #45)**
  - Reduced App.tsx from 3,761 lines to 876 lines (77% reduction)
  - Extracted 16 specialized components with proper separation of concerns
  - Centralized routing utilities and toast notification system
  - Improved maintainability and code organization

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
- **Package-aware pre-push hook for monorepo optimization**
  - Only runs lint/type-check/tests for affected workspaces
  - Automatically detects changed packages via git diff
  - Cross-platform support (Windows + Unix)
  - Performance: Single package changes now ~5-10s vs ~30s full repo check

### Changed

- Enhanced AI guardrails with systematic root cause framework
- Updated documentation structure with comprehensive sync requirements
- Improved branch protection rules and merge strategies
- Enhanced quality gates with documentation validation
- **Improved TypeScript type safety in settings.ts - replaced `any` types with proper type definitions**
- **Reduced ESLint warnings from 192 to 182 (-5.2%) through type safety improvements**
- Pre-push hook now package-aware for faster validation

### Fixed

- TypeScript strict mode compliance in settings.ts (exactOptionalPropertyTypes, noPropertyAccessFromIndexSignature)
- Index signature access patterns using bracket notation for type safety
- Optional property assignment patterns to avoid undefined violations
- **Settings configuration now respects CONFIG_DIR environment variable for test isolation**
- **Security: SABnzbd API key no longer exposed in GET responses (properly sanitized)**
- **Settings test endpoint now validates required client parameter and client type**
- **API tsconfig allows cross-package imports (removed rootDir constraint)**

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

### Performance

- Package-aware prepush reduces validation time from ~30s to ~5-10s for single package changes

## [0.3.1] - 2025-11-26

### Security

- **CRITICAL**: Fixed SABnzbd API key exposure in GET /api/settings/downloaders responses

### Added

- Comprehensive integration tests for settings API (20 tests, 100% pass rate)
- Settings test endpoint now validates required client parameter and client type
- Test isolation support via CONFIG_DIR environment variable

### Changed

- Improved TypeScript type safety in settings.ts - replaced 11 `any` types with proper type definitions
- Reduced ESLint warnings from 192 to 182 (-5.2%) through type safety improvements
- Settings downloader enabled status now properly inferred from baseUrl presence

### Fixed

- Settings configuration respects CONFIG_DIR environment variable for test isolation
- API tsconfig allows cross-package imports (removed rootDir constraint)
- API response structure properly documented and tested
- Import order corrections for lint compliance

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
