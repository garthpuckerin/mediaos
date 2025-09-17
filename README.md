# MediaOS — Unified Media Management Platform

[![CI/CD Pipeline](https://github.com/mediaos/mediaos/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/mediaos/mediaos/actions)
[![Code Coverage](https://codecov.io/gh/mediaos/mediaos/branch/main/graph/badge.svg)](https://codecov.io/gh/mediaos/mediaos)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/docker/v/mediaos/mediaos?label=docker)](https://hub.docker.com/r/mediaos/mediaos)

MediaOS is a unified, single-container media management platform that replaces the arr ecosystem (Sonarr, Radarr, Lidarr, Readarr, Overseerr, Prowlarr, Bazarr) with a cohesive experience. It manages the complete media lifecycle: scan/import → request → search → acquire → post-process → library, while adding AI-assisted quality control, artwork management, and natural-language automation.

## 🚀 Features

- **Single Container Solution** - All functionality in one Docker container
- **Modern Stack** - React + Vite frontend, Fastify + TypeScript API
- **Comprehensive Testing** - Unit, integration, and E2E tests with 80%+ coverage
- **Quality Assurance** - ESLint, Prettier, pre-commit hooks, and CI/CD pipeline
- **Database Flexibility** - SQLite by default, PostgreSQL optional
- **AI Enhancements** - Natural language commands and smart quality profiles
- **Artwork Management** - Lock/revert functionality with history tracking
- **NAS Optimized** - Designed for Synology NAS with 2-4GB RAM requirements

## 📋 Prerequisites

- **Node.js** 18+ (LTS recommended)
- **pnpm** 8+ (package manager)
- **Docker** (for containerized deployment)
- **Git** (for version control)

## 🛠️ Quick Start

### Development Setup

```bash
# 1) Clone repository
git clone https://github.com/mediaos/mediaos.git
cd mediaos

# 2) Enable pnpm
corepack enable

# 3) Install dependencies
pnpm install

# 4) Setup environment
cp env.example .env
# Edit .env with your configuration

# 5) Setup database
pnpm db:migrate
pnpm db:seed

# 6) Start development servers
pnpm dev
```

### Production Build

```bash
# Build all packages
pnpm build

# Start production server
pnpm start
```

### Docker Deployment

```bash
# Build image
docker build -t mediaos:latest .

# Run with docker-compose
docker compose up -d
```

## 📁 Project Structure

```
packages/
├── api/           # Fastify API server + static serving
├── web/           # React + Vite frontend
├── workers/       # Background job processing
└── adapters/      # External service integrations
db/
├── migrations/    # Database schema migrations
└── seeds/         # Development data seeding
test/
├── e2e/           # End-to-end tests
├── helpers/       # Test utilities
└── setup.ts       # Test configuration
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

## 🔧 Development Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development servers |
| `pnpm build` | Build all packages |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run E2E tests |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix ESLint issues |
| `pnpm format` | Format code with Prettier |
| `pnpm type-check` | Run TypeScript type checking |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed database with sample data |

## 🐳 Docker Volumes (Synology)

- `/config` — Configuration, SQLite DB, logs, artifacts
- `/media` — Read-only media libraries
- `/downloads` — Download processing directory

## 📚 Documentation

- [Product Requirements Document](prd.md) - Complete feature specifications
- [Architecture Documentation](architecture.md) - Technical architecture details
- [Contributing Guidelines](contributing.md) - How to contribute
- [Development Setup](development.md) - Development environment guide
- [Changelog](changelog.md) - Version history and changes

## 🔒 Security

- **Authentication** - JWT tokens with RBAC
- **Input Validation** - Zod schema validation
- **Rate Limiting** - Built-in protection against abuse
- **Security Scanning** - Automated vulnerability scanning
- **Secrets Management** - Secure credential handling

## 🚀 CI/CD Pipeline

- **Automated Testing** - Unit, integration, and E2E tests
- **Code Quality** - ESLint, Prettier, TypeScript checking
- **Security Scanning** - Vulnerability and dependency scanning
- **Docker Builds** - Multi-architecture container builds
- **Release Management** - Automated releases and versioning

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](contributing.md) for details.

1. Fork the repository
2. Create a feature branch from `feature/2.2`
3. Make your changes with tests
4. Run quality checks: `pnpm lint && pnpm test && pnpm type-check`
5. Commit with conventional commits
6. Create a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation** - Check existing docs first
- **Issues** - Search existing issues or create new ones
- **Discussions** - Use GitHub Discussions for questions

---

**Status:** 🚧 In Active Development  
**Target:** Synology NAS deployment  
**Architecture:** Single-container monorepo  
**Last Updated:** September 17, 2025
