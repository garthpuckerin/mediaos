# MediaOS Development Environment

## Node.js Version

- **Required:** Node.js 18+ (LTS recommended)
- **Package Manager:** npm (workspaces)

## Environment Setup

```bash
# Install dependencies
npm install

# Development mode (API + Web)
npm run dev

# Production build
npm run build
npm start
```

## Development Scripts

- `npm run dev` - Start API + Web in development mode
- `npm run build` - Build all packages for production
- `npm start` - Start production server
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint on all packages
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Clean build artifacts

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

1. Create a feature branch from the latest sprint feature branch
2. Make changes with tests
3. Update documentation (mandatory per AI guardrails)
4. Run quality checks: `pnpm lint && pnpm test && pnpm type-check`
5. Commit with conventional commits
6. Create pull request for review

**Important:** All changes must follow our [AI Guardrails](AI_GUARDRAILS.md) and [Branch Management](BRANCH_MANAGEMENT.md) protocols.

## Architecture

- **Monorepo:** npm workspaces
- **API:** Fastify + TypeScript
- **Web:** React + Vite
- **Workers:** Background job processing
- **Adapters:** Modular integrations

---

**Document Version:** 1.0  
**Last Updated:** September 17, 2025  
**Next Review:** Q4 2025
