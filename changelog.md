# Changelog

All notable changes to MediaOS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [0.3.0] - 2025-10-22

### Added

- Library: file-backed persistence at `config/library.json`; `PATCH /api/library/:id`, `DELETE /api/library/:id`.
- SAB-focused downloads:
  - NZB upload (multipart) from Item Detail; category respected when configured.
  - Live SAB queue with actions (Pause/Resume/Remove) via `GET /api/activity/live` and `POST /api/activity/action`.
  - SAB history merged into Activity → History.
  - Optional auto-verify on completion (SAB history poller; dedup via `config/monitor.json`).
- Item Detail: Last Grab panel with Re-grab, Open in SAB, and manual Verify.
- Activity UI: Verify/"Verify again" actions; progress, ETA, and quick Open.
- Calendar: clickable events navigate to item detail; highlight soon events.
- Wanted: richer stub scan results (mix of Usenet/Torrent with sizes/qualities); Scan & Queue prefers Usenet.
- In-app toast notifications replace alerts; Undo for library delete.
- Settings: SAB category, qBittorrent category (configurable; SAB-focused by default).
- Docs: enhancements backlog at `docs/ENHANCEMENTS.md` and release process at `docs/RELEASE.md`.
  Nothing yet.

## [0.3.0] - 2025-10-22

### Added

- Library: file-backed persistence at config/library.json; PATCH /api/library/:id, DELETE /api/library/:id.
- SAB-focused downloads:
  - NZB upload (multipart) from Item Detail; category respected when configured.
  - Live SAB queue with actions (Pause/Resume/Remove) via GET /api/activity/live and POST /api/activity/action.
  - SAB history merged into Activity → History.
  - Optional auto-verify on completion (SAB history poller; dedup via config/monitor.json).
- Item Detail: Last Grab panel with Re-grab, Open in SAB, and manual Verify.
- Activity UI: Verify/"Verify again" actions; progress, ETA, and quick Open.
- Calendar: clickable events navigate to item detail; highlight soon events.
- Wanted: richer stub scan results (mix of Usenet/Torrent with sizes/qualities); Scan & Queue prefers Usenet.
- In-app toast notifications replace alerts; Undo for library delete.
- Settings: SAB category, qBittorrent category (configurable; SAB-focused by default).
- Docs: enhancements backlog at docs/ENHANCEMENTS.md

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

#### UX polish

- Library lists show badges for failed grabs and warn/error verification state
- Post‑grab flows fetch ` /api/downloads/last` to update UI immediately

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
