# MediaOS Development Environment

## Node.js Version
- **Required:** Node.js 18+ (LTS recommended)
- **Package Manager:** pnpm (enabled via corepack)

## Environment Setup
```bash
# Enable pnpm
corepack enable || npm i -g pnpm

# Install dependencies
pnpm install

# Development mode
pnpm dev

# Production build
pnpm build
pnpm start
```

## Development Scripts
- `pnpm dev` - Start API + Web in development mode
- `pnpm build` - Build all packages for production
- `pnpm start` - Start production server
- `pnpm test` - Run all tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm lint` - Run ESLint on all packages
- `pnpm lint:fix` - Fix ESLint issues automatically
- `pnpm format` - Format code with Prettier
- `pnpm type-check` - Run TypeScript type checking
- `pnpm clean` - Clean build artifacts

## Code Quality Standards
- **ESLint:** Enforced code quality and style
- **Prettier:** Consistent code formatting
- **TypeScript:** Strict type checking enabled
- **Husky:** Pre-commit hooks for quality gates
- **lint-staged:** Run linters on staged files only

## Testing
- **Framework:** Vitest for fast testing
- **Coverage:** Minimum 80% coverage required
- **E2E:** Playwright for end-to-end testing
- **API Testing:** Supertest for API endpoint testing

## Database
- **Default:** SQLite with WAL mode
- **Migrations:** Version-controlled schema changes
- **Seeding:** Development data seeding
- **Backup:** Automated backup strategies

## Docker Development
```bash
# Build development image
docker build -t mediaos:dev .

# Run with development volumes
docker compose -f docker-compose.dev.yml up -d
```

## Contributing
1. Create feature branch from `feature/2.2`
2. Make changes with tests
3. Update documentation (mandatory per AI guardrails)
4. Run quality checks: `pnpm lint && pnpm test && pnpm type-check`
5. Commit with conventional commits
6. Create pull request for review

**Important:** All changes must follow our [AI Guardrails](AI_GUARDRAILS.md) and [Branch Management](BRANCH_MANAGEMENT.md) protocols.

## Architecture
- **Monorepo:** pnpm workspaces
- **API:** Fastify + TypeScript
- **Web:** React + Vite
- **Workers:** Background job processing
- **Adapters:** Modular integrations

---

**Document Version:** 1.0  
**Last Updated:** September 17, 2025  
**Next Review:** Q4 2025
