# Changelog

All notable changes to MediaOS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive development infrastructure setup
- ESLint and Prettier configuration for code quality
- Vitest testing framework with coverage reporting
- Playwright E2E testing setup
- Pre-commit hooks with Husky and lint-staged
- CI/CD pipeline with GitHub Actions
- Database migration and seeding system
- Comprehensive documentation (PRD, Architecture, Contributing)
- TypeScript strict configuration
- Development environment configuration

### Changed
- Updated package.json files with development dependencies
- Enhanced project structure with proper tooling
- Improved Docker configuration for development

### Security
- Added security scanning in CI pipeline
- Implemented proper .gitignore for sensitive files
- Added environment variable validation

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
