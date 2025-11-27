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
- **npm** 9+ (package manager)
- **Docker** (for containerized deployment)
- **Git** (for version control)

## 🛠️ Quick Start

### Development Setup (npm)

```bash
# 1) Clone repository
git clone https://github.com/mediaos/mediaos.git
cd mediaos

# 2) Install dependencies
npm install

# 3) Generate security keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # ENCRYPTION_KEY

# 4) Setup environment
cp .env.example .env
# Edit .env and add the generated keys:
# JWT_SECRET=your-generated-jwt-secret
# ENCRYPTION_KEY=your-generated-encryption-key

# 5) Start development servers
npm run dev

# 6) Register first user (automatically becomes admin)
# Visit http://localhost:5173 and use the registration form
```

### Production Build (npm)

```bash
# Build all packages
npm run build

# Start production server
npm start
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
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 🔧 Development Scripts

| Command              | Description                    |
| -------------------- | ------------------------------ |
| `npm run dev`        | Start development servers      |
| `npm run build`      | Build all packages             |
| `npm test`           | Run unit tests                 |
| `npm run test:e2e`   | Run E2E tests                  |
| `npm run lint`       | Run ESLint                     |
| `npm run lint:fix`   | Fix ESLint issues              |
| `npm run format`     | Format code with Prettier      |
| `npm run type-check` | Run TypeScript type checking   |
| `npm run db:migrate` | Run database migrations        |
| `npm run db:seed`    | Seed database with sample data |

## 🐳 Docker Volumes (Synology)

- `/config` — Configuration, SQLite DB, logs, artifacts
- `/media` — Read-only media libraries
- `/downloads` — Download processing directory

## 📚 Documentation

### Getting Started

- [Authentication Guide](docs/AUTHENTICATION.md) - Complete authentication setup and usage
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment with Docker
- [API Reference](docs/API.md) - Complete API endpoint documentation

### Development

- [Development Setup](DEVELOPMENT.md) - Development environment guide
- [Contributing Guidelines](CONTRIBUTING.md) - How to contribute
- [AI Guardrails](AI_GUARDRAILS.md) - AI development standards and protocols
- [Branch Management](BRANCH_MANAGEMENT.md) - Git workflow and branch strategy

### Reference

- [Product Requirements Document](PRD.md) - Complete feature specifications
- [Architecture Documentation](ARCHITECTURE.md) - Technical architecture details
- [Sprint Planning & Roadmap](SPRINT_PLANNING.md) - Development sprints and milestones
- [Changelog](CHANGELOG.md) - Version history and changes

## 🔒 Security

- **Authentication** - JWT-based authentication with access/refresh tokens (see [Authentication Guide](docs/AUTHENTICATION.md))
- **Encryption** - AES-256-GCM encryption for sensitive credentials
- **Password Hashing** - PBKDF2 with SHA-512 (100k iterations)
- **Role-Based Access Control** - Admin and user roles with protected routes
- **Rate Limiting** - Per-route rate limiting (5 req/min for auth, 100 req/min general)
- **Input Validation** - Comprehensive request validation
- **Secrets Management** - Environment-based secrets with Docker support

**Required Environment Variables:**

- `JWT_SECRET` - 64-character hex string for signing JWT tokens
- `ENCRYPTION_KEY` - 64-character hex string for encrypting credentials

See [Authentication Guide](docs/AUTHENTICATION.md) for complete setup instructions.

## 🚀 CI/CD Pipeline

- **Automated Testing** - Unit, integration, and E2E tests
- **Code Quality** - ESLint, Prettier, TypeScript checking
- **Security Scanning** - Vulnerability and dependency scanning
- **Docker Builds** - Multi-architecture container builds
- **Release Management** - Automated releases and versioning

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](contributing.md) for details.

1. Fork the repository
2. Create a feature branch from the latest sprint branch
3. Make your changes with tests
4. Run quality checks: `npm run lint && npm test && npm run type-check`
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
