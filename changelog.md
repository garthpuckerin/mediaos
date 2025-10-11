# Changelog

All notable changes to MediaOS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- BullMQ-backed job orchestration with structured results and Redis/inline parity
- /api/dashboard/overview aggregate endpoint and refreshed React dashboard widgets
- SQLite seeding script for golden media, request, indexer, and subtitle data
- Dashboard integration tests covering summary metrics
- NZBGet and SABnzbd downloader adapters with typed API clients\n- /api/downloads endpoint, dashboard stats, and queue processing for torrent/Usenet jobs
- Settings API for downloader configuration
  - GET/POST /api/settings/downloaders + GET /api/settings
  - File-backed config at config/downloaders.json (overrides env) with secret masking
- Files API for safe library browsing (root-scoped)
  - GET /api/files/browse (roots or directory listing)
  - POST /api/files/artwork/assign (copy image to poster/background/banner/seasonXX filenames)
- UI: Library-first navigation with media kinds and shared subpages
  - Top-level: Library, Calendar, Activity, Settings, System
  - Library kinds: Series, Movies, Books, Music; pages: List, Add New, Library Import
  - Shared components for Add and Import; FileBrowser + Artwork actions

### UI

- Library tabs are now sticky under the header within the main content scroll area.
- Left navigation nests Library sub-items (Library main, Series, Movies, Books, Music, Add New, Library Import).
- Add New and Library Import moved from Library pages to the left nav; duplicate page tabs removed.
- Sidebar remains fixed; only main content scrolls; removed unwanted outer white border.
- Adapter client hardening (qBittorrent/NZBGet/SABnzbd)
  - Timeouts, bounded retries, improved error handling
- CI & governance
  - GitHub Actions CI (lint, type-check, tests)
  - CODEOWNERS and PR template
  - Branch strategy docs augmented with Copilot usage for PRs/conflicts

### Changed

- Database migrator now enforces unique keys, timestamp columns, and idempotent schema upgrades
- Job routes return parsed payload/result metadata and job lifecycle timestamps
- Frontend loads consolidated dashboard data instead of piecemeal REST calls
- /api/downloads returns richer telemetry
  - totals {total,pending,running,completed,failed}
  - providers map with per-provider totals and lastSuccess/lastFailure
  - recentFailures (capped) for alerts/panels
- Job processor config live-reload signature; safer queue add options (jobId optional)
- UI refactor to hash-based pages (no external router) pending react-router adoption

### Security

- TBD

## [0.2.0] - 2025-09-17

### Added

- Established npm workspaces (migrated from pnpm)
- CI workflow (lint, type-check, test, build) via GitHub Actions
- Husky hooks (pre-commit, commit-msg) and lint-staged
- Vitest test setup with coverage thresholds
- Dependabot weekly updates for npm
- SECURITY.md with policy and practices
- Development documentation aligned to npm

### Changed

- Updated root scripts to npm equivalents
- Normalized documentation filenames to lowercase and fixed links
- Hardened TypeScript config (strict) across packages

### Security

- Added automated dependency updates (Dependabot)
- Documented npm audit and CI fail-on-critical approach

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

---

## Development Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 8+
- Docker (optional)

### Quick Start

```bash
# Clone repository
git clone https://github.com/mediaos/mediaos.git
cd mediaos

# Install dependencies
corepack enable
pnpm install

# Setup environment
cp env.example .env

# Setup database
pnpm db:migrate
pnpm db:seed

# Start development
pnpm dev
```

### Available Scripts

- `pnpm dev` - Start development servers
- `pnpm build` - Build all packages
- `pnpm test` - Run tests
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm type-check` - Run TypeScript type checking

### Testing

- Unit tests: `pnpm test`
- E2E tests: `pnpm test:e2e`
- Coverage: `pnpm test:coverage`

### Docker

```bash
# Build image
docker build -t mediaos:latest .

# Run container
docker compose up -d
```

## Contributing

See [contributing.md](contributing.md) for detailed contribution guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
