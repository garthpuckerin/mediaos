# MediaOS Repository Review
**Date:** 2025-11-18
**Version Reviewed:** 0.3.0
**Reviewer:** Claude Code
**Branch:** claude/review-repo-015dHLYHvHFTmYfFNpTfHHqX

---

## Executive Summary

MediaOS is an ambitious **unified media management platform** designed to replace the arr ecosystem (Sonarr, Radarr, etc.) with a modern TypeScript/React stack. The project shows **strong architectural foundations** with a well-designed database schema, modern tooling, and solid security defaults. However, it suffers from **critical inconsistencies** in package management, **incomplete core features**, **minimal test coverage**, and **significant technical debt** in the frontend codebase.

**Overall Status:** 🟡 **Development Stage - Not Production Ready**

---

## Critical Issues Requiring Immediate Attention

### 1. Package Manager Inconsistency ⚠️ **BLOCKING**

**Impact:** Build failures, deployment issues, dependency mismatches

**Details:**
- **Dockerfile** uses `pnpm` exclusively (lines 10, 12):
  ```dockerfile
  RUN pnpm install --frozen-lockfile || pnpm install
  RUN pnpm -w build
  ```
- **Release workflow** (`.github/workflows/release.yml`) uses `pnpm`
- **CI workflow** (`.github/workflows/ci.yml`) uses `npm`
- **All documentation** references `npm` commands
- **Git hooks** (`.husky/pre-push`) use `npm`
- Repository has **both** `package-lock.json` (514KB) and `pnpm-workspace.yaml`

**Recommendation:**
- **Option A (Preferred):** Standardize on `npm`
  - Update Dockerfile to use npm
  - Update release.yml to use npm
  - Remove pnpm-workspace.yaml
- **Option B:** Standardize on `pnpm`
  - Update CI workflow to use pnpm
  - Update all documentation
  - Update git hooks
  - Add pnpm-lock.yaml
  - Remove package-lock.json

---

### 2. Security: Plain-Text Credential Storage 🔒 **HIGH SEVERITY**

**Impact:** Credentials exposed in file system, potential data breach

**Files Affected:**
- `/config/downloaders.json` - Stores qBittorrent passwords, SABnzbd API keys
- `packages/api/src/routes/settings.ts:69` - apiKey exposed to frontend
- `packages/api/src/routes/settings.ts:96-98` - Password persistence without encryption

**Current Implementation:**
```typescript
// settings.ts:66-70
const sab: SAB = {
  enabled: !!obj?.sabnzbd?.enabled,
  baseUrl: obj?.sabnzbd?.baseUrl || undefined,
  apiKey: obj?.sabnzbd?.apiKey || undefined,  // ⚠️ Plain text
  hasApiKey: !!obj?.sabnzbd?.apiKey,
};
```

**Issues:**
1. No encryption at rest
2. API keys/passwords stored in plain-text JSON
3. `hasPassword`/`hasApiKey` flags leak credential existence to frontend
4. No secrets management integration
5. No credential rotation mechanism

**Recommendations:**
- [ ] Implement encryption for sensitive fields (use `crypto.subtle` or `bcrypt`)
- [ ] Use environment variables for credentials (never store in files)
- [ ] Integrate with secrets managers (HashiCorp Vault, AWS Secrets Manager)
- [ ] Add credential audit logging
- [ ] Implement proper JWT-based authentication (currently no auth layer)

---

### 3. Monolithic Frontend Component 📦 **TECHNICAL DEBT**

**Impact:** Unmaintainable, untestable, poor performance

**File:** `packages/web/src/ui/App.tsx`
- **3,761 lines** in a single component
- **15+ page components** defined inline
- **All styling** defined as inline `React.CSSProperties` objects
- **All business logic** mixed with presentation
- **No component library** or design system

**Component Breakdown:**
```typescript
// All defined in App.tsx:
function IndexersSettings()      // Line 893
function QualitySettings()       // Line 1016
function VerifySettings()        // Line 1122
function WantedPage()            // Line 1271
function CalendarPage()          // Line 1438
function ActivityQueue()         // Line 1569
function ActivityHistory()       // Line 1838
function LibraryList()           // Line 1972
function LibraryItemDetail()     // Line 2498
function manageArtwork()         // Line 3497
function LibraryAdd()            // Line 3534
function LibraryImportSection()  // Line 3554
function FileBrowser()           // Line 3577
function pushToast()             // Line 3739
```

**Issues:**
1. No code reusability
2. Impossible to unit test individual components
3. All re-renders affect entire application
4. No lazy loading or code splitting
5. Inline styles prevent themeing and responsive design
6. No accessibility features (despite `jsx-a11y` plugin)

**Recommendations:**
- [ ] **Phase 1:** Extract components to separate files (target: <200 lines/file)
- [ ] **Phase 2:** Implement component library (Shadcn UI, Chakra UI, or custom)
- [ ] **Phase 3:** Add state management (Zustand, React Context)
- [ ] **Phase 4:** Implement CSS-in-JS or Tailwind for styling
- [ ] **Phase 5:** Add React Router for proper routing

---

### 4. Incomplete Core Features 🚧 **FEATURE GAPS**

**Status of Core Packages:**

| Package | Status | Completeness | Issues |
|---------|--------|--------------|--------|
| `@mediaos/api` | ✅ Active | 73% | 4 stub routes, no auth |
| `@mediaos/web` | ✅ Active | 60% | Monolithic, no tests |
| `@mediaos/workers` | ❌ Stub | 0% | Only console.log |
| `@mediaos/adapters` | ⚠️ Partial | 33% | Only downloaders implemented |

**Missing Implementations:**

**Workers Package** (`packages/workers/src/index.ts`):
```typescript
console.log('Workers ready (stub)');
```
- No job queue (in-process or Redis)
- No background processing for:
  - Media scanning/import
  - Indexer searches
  - Download acquisition
  - Post-processing
  - Subtitle fetching
  - Metadata refresh

**Adapters Package:**
- ❌ `indexers.ts` - Not implemented (critical for search)
- ❌ `subtitles.ts` - Not implemented
- ✅ `downloaders.ts` - Fully functional (SABnzbd, qBittorrent, NZBGet)

**API Routes (Stubs):**
- `packages/api/src/routes/indexers.ts` - TODO comment
- `packages/api/src/routes/requests.ts` - TODO comment
- `packages/api/src/routes/quality.ts` - TODO comment
- `packages/api/src/routes/subtitles.ts` - TODO comment

**Impact:** Core media management workflows are non-functional without workers and indexers.

---

### 5. Minimal Test Coverage ❌ **QUALITY ASSURANCE**

**Configured Threshold:** 80% coverage (all metrics)
**Actual Coverage:** <10% (estimated)

**Test Files Found:**
1. `/packages/api/src/__tests__/sprint1.test.ts` - Basic health check only
2. `/test/basic.test.ts` - Minimal
3. `/playwright-tests/smoke.spec.ts` - Smoke tests
4. `/playwright-tests/dashboard.spec.ts` - UI smoke tests
5. `/test/e2e/sab.spec.ts` - SABnzbd integration test

**Critical Gap:** `vitest` not installed locally
```bash
$ npm test
> vitest run
sh: 1: vitest: not found
```

**Missing Test Coverage:**
- ❌ No API route tests (15 routes untested)
- ❌ No service/business logic tests
- ❌ No adapter integration tests
- ❌ No database migration tests
- ❌ No validation/security tests
- ❌ No frontend component tests
- ❌ No API contract tests

**Recommendations:**
- [ ] Install dependencies: `npm install`
- [ ] Write route handler tests (target: 70% coverage)
- [ ] Add adapter integration tests with mocked HTTP
- [ ] Implement frontend component tests (React Testing Library)
- [ ] Add API contract tests (OpenAPI validation)
- [ ] Configure coverage reporting in CI

---

## High Priority Issues

### 6. File-Based Data Persistence 💾

**Impact:** No ACID guarantees, race conditions, difficult migrations

**Current Implementation:**
All data stored as JSON files in `/config/`:
- `library.json` - Media library
- `downloaders.json` - Client configurations
- `grabs.json` - Download history
- `monitor.json` - SABnzbd monitor state
- `verify.*.json` - Verification results

**Issues:**
1. No transactions (multi-step operations can fail partially)
2. No concurrent access control (race conditions)
3. Manual JSON serialization/deserialization
4. No query optimization (must load entire file)
5. Database schema exists in `/db/migrations/` but is **unused**

**Example (settings.ts:79-86):**
```typescript
async function loadDownloaders(): Promise<Downloaders> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf8');
    const json = JSON.parse(raw);
    return normalize(json);
  } catch (_e) {
    return normalize({});
  }
}
```

**Recommendations:**
- [ ] Implement database layer using Drizzle ORM or Prisma
- [ ] Migrate file-based stores to SQLite tables
- [ ] Add transaction support for multi-step operations
- [ ] Implement connection pooling
- [ ] Add database seeding for development

---

### 7. Fuzzy Title Matching Risk 🎯

**Impact:** Download verification can associate wrong media items

**File:** `packages/api/src/routes/verify.ts` (approximate location based on analysis)

**Issue:**
Download completion triggers verification via **sanitized title matching** rather than exact ID matching. This can incorrectly associate downloads with wrong media items.

**Example Scenario:**
```
Download: "The Office US S01E01"
Could match: "The Office" (UK version)
Result: Wrong item verified
```

**Recommendations:**
- [ ] Add exact ID matching using TMDB/TVDB IDs
- [ ] Implement fuzzy matching only as fallback
- [ ] Add confidence scoring to matches
- [ ] Require manual confirmation for low-confidence matches
- [ ] Log all auto-associations for audit

---

### 8. No Authentication/Authorization 🔐

**Impact:** API endpoints publicly accessible

**Current State:**
- No user authentication
- No session management
- No RBAC enforcement
- `users` table exists in database schema but unused

**Exposed Endpoints:**
```
GET  /api/library/*
POST /api/downloads/*
POST /api/settings/*
GET  /api/activity/*
```

**Recommendations:**
- [ ] Implement JWT authentication
- [ ] Add user registration/login endpoints
- [ ] Enforce RBAC using database `users.role` column
- [ ] Add rate limiting per user (currently global)
- [ ] Implement API key support for automation

---

### 9. CI/CD Configuration Issues ⚙️

**GitHub Actions Workflows:**

**CI Pipeline** (`.github/workflows/ci.yml`):
- ✅ Runs on push/PR
- ✅ Linting, type-check, build
- ⚠️ Uses `npm` (inconsistent with Dockerfile)
- ✅ Security audit (critical only)

**Release Pipeline** (`.github/workflows/release.yml`):
- ⚠️ Uses `pnpm` (inconsistent with CI)
- ❌ Asset upload broken (uploads directory, not tarball)
- ❌ Uses deprecated `actions/create-release@v1`
- ⚠️ No Docker image build/push

**Issues:**
```yaml
# release.yml:52-55
- name: Upload Release Assets
  with:
    asset_path: ./packages/api/dist/  # ❌ This is a directory
    asset_name: mediaos-${{ github.ref_name }}.tar.gz  # ❌ Not created
```

**Recommendations:**
- [ ] Standardize package manager across all workflows
- [ ] Fix release asset creation (add tar/gzip step)
- [ ] Upgrade to `ncipollo/release-action@v1`
- [ ] Add Docker image build to release workflow
- [ ] Add E2E tests to CI pipeline
- [ ] Implement code coverage reporting (Codecov)

---

### 10. Docker Configuration Issues 🐳

**File:** `Dockerfile`

**Issues:**

1. **Missing Health Check:**
```dockerfile
# Missing:
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });"
```

2. **No Resource Limits in Compose:**
```yaml
# docker-compose.yml missing:
services:
  mediaos:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

3. **Potential Permission Issues:**
```dockerfile
RUN mkdir -p /config /downloads /media && \
    adduser -D -u 1000 app && \
    chown -R app:app /app /config /downloads
```
- `/media` not owned by `app` user
- No `VOLUME` declarations

**Recommendations:**
- [ ] Add HEALTHCHECK directive
- [ ] Add resource limits to docker-compose.yml
- [ ] Fix `/media` ownership
- [ ] Add VOLUME declarations for `/config`, `/downloads`, `/media`
- [ ] Add restart policy: `restart: unless-stopped`

---

## Medium Priority Issues

### 11. Missing Observability 📊

**Current State:**
- Basic Fastify logging (stdout)
- No structured logging
- No metrics collection
- No distributed tracing
- No error tracking (Sentry, etc.)

**Recommendations:**
- [ ] Implement structured logging (Pino)
- [ ] Add Prometheus metrics endpoint
- [ ] Integrate error tracking (Sentry)
- [ ] Add request tracing (OpenTelemetry)
- [ ] Implement health check aggregation

---

### 12. Environment Configuration 🔧

**File:** `.env.example` (basic template exists)

**Missing Variables:**
- `JWT_SECRET` - Authentication secret
- `DATABASE_URL` - PostgreSQL connection (if used)
- `REDIS_URL` - Job queue (future)
- `SMTP_*` - Email notifications
- `SENTRY_DSN` - Error tracking
- `PLEX_TOKEN` - Plex integration
- `TMDB_API_KEY` - Metadata fetching

**Current Rate Limiting:**
```typescript
// Too permissive for production:
RATE_LIMIT_MAX=100       // 100 requests
RATE_LIMIT_WINDOW=60000  // per minute
```

**Recommendations:**
- [ ] Document all environment variables
- [ ] Add validation on startup (using Zod)
- [ ] Implement tiered rate limiting (per endpoint)
- [ ] Add feature flags for incomplete features
- [ ] Create `.env.production` template

---

### 13. Memory Leak Risks ⚠️

**File:** `packages/api/src/index.ts` (approximate)

**Issues:**
1. `setInterval` without cleanup on shutdown
2. Monitor state unbounded (500-item limit arbitrary)
3. No connection pooling for HTTP clients
4. Each fetch creates new AbortController

**Example:**
```typescript
// Potential leak - no cleanup
setInterval(async () => {
  // Monitor downloads
}, 30000);
```

**Recommendations:**
- [ ] Implement graceful shutdown
- [ ] Add cleanup for all intervals/timers
- [ ] Implement connection pooling
- [ ] Add memory usage monitoring
- [ ] Implement request debouncing

---

### 14. Hardcoded Values & Magic Numbers 🎱

**Examples:**
```typescript
// Scattered throughout codebase:
const CONFIG_FILE = '/config/downloaders.json';  // Hardcoded path
const TIMEOUT = 8000;                            // Magic timeout
const POLL_INTERVAL = 30000;                     // Magic interval
const MAX_ITEMS = 500;                           // Arbitrary limit
```

**Recommendations:**
- [ ] Extract to constants file
- [ ] Make configurable via environment
- [ ] Document rationale for values
- [ ] Add configuration validation

---

## Low Priority / Technical Debt

### 15. Code Organization 📁

**Issues:**
- No `middleware/` folder (despite ARCHITECTURE.md reference)
- No `models/` or `types/` folder (types scattered)
- No `utils/` folder (utilities scattered)
- Route plugin pattern inconsistent

**Recommendations:**
- [ ] Create organized folder structure
- [ ] Extract shared types to `@mediaos/types` package
- [ ] Extract utilities to `@mediaos/utils` package
- [ ] Standardize route plugin pattern

---

### 16. Documentation Gaps 📝

**Existing Docs:** ✅ Comprehensive
- README.md
- ARCHITECTURE.md
- CONTRIBUTING.md
- PRD.md
- SPRINT_PLANNING.md

**Missing:**
- ❌ API endpoint documentation (no OpenAPI/Swagger)
- ❌ Database schema documentation
- ❌ Deployment runbook
- ❌ Troubleshooting guide
- ❌ Performance tuning guide

**Recommendations:**
- [ ] Generate OpenAPI spec from routes
- [ ] Add Swagger UI at `/api/docs`
- [ ] Document database schema (dbdocs.io)
- [ ] Create deployment checklist
- [ ] Add troubleshooting guide

---

### 17. Frontend Improvements 🎨

**Issues:**
- No component library
- No design tokens (colors hardcoded)
- No accessibility testing
- No mobile responsive design
- React DevTools enabled in production

**Recommendations:**
- [ ] Implement design system
- [ ] Add accessibility audit
- [ ] Implement responsive breakpoints
- [ ] Disable React DevTools in production
- [ ] Add performance monitoring (Web Vitals)

---

### 18. Build & Performance ⚡

**Issues:**
- Source maps enabled in production
- No code splitting
- No lazy loading
- No bundle analysis

**Recommendations:**
- [ ] Disable source maps in production
- [ ] Implement route-based code splitting
- [ ] Add lazy loading for heavy components
- [ ] Add bundle analyzer (webpack-bundle-analyzer)
- [ ] Implement service worker for caching

---

## Strengths 💪

1. **Modern Tech Stack** - TypeScript, Fastify, React 18, Vite
2. **Comprehensive Database Design** - Well-normalized schema (14 tables, 27 indexes)
3. **Security Foundations** - Helmet, CORS, rate limiting configured
4. **Working Downloader Integration** - SABnzbd, qBittorrent, NZBGet functional
5. **Clean API Architecture** - Consistent Fastify plugin pattern
6. **Excellent Documentation** - Comprehensive planning docs
7. **NAS-Optimized** - Designed for resource-constrained deployments
8. **Docker Ready** - Multi-stage builds
9. **Development Tooling** - ESLint, Prettier, Husky configured
10. **Monorepo Structure** - Clean package separation

---

## Recommendations Summary

### Immediate (Week 1)
- [ ] **Fix package manager inconsistency** (npm vs pnpm)
- [ ] **Encrypt sensitive credentials** (passwords, API keys)
- [ ] **Add input validation** to all API routes (Zod)
- [ ] **Install dependencies** (`npm install` to fix vitest)
- [ ] **Fix release workflow** asset upload

### Short-term (Weeks 2-4)
- [ ] **Extract App.tsx components** (target: <200 lines/file)
- [ ] **Implement authentication/authorization**
- [ ] **Write API route tests** (target: 70% coverage)
- [ ] **Implement database layer** (Drizzle or Prisma)
- [ ] **Complete workers package** or remove dependency

### Medium-term (Months 2-3)
- [ ] **Migrate to database persistence** (remove file-based stores)
- [ ] **Implement state management** (Zustand or React Context)
- [ ] **Add observability** (structured logging, metrics, tracing)
- [ ] **Create component library**
- [ ] **Implement indexer adapters**

### Long-term (Quarter 2+)
- [ ] **GraphQL API layer** (optional)
- [ ] **Real-time updates** (WebSockets)
- [ ] **Multi-instance support**
- [ ] **Full subtitle adapter implementation**
- [ ] **Performance optimization**

---

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Package manager build failures | High | High | Standardize immediately |
| Credential exposure | Critical | Medium | Implement encryption |
| Production data loss | High | Medium | Add database layer |
| Race conditions | Medium | High | Implement transactions |
| Authentication bypass | Critical | High | Add auth layer |
| Memory leaks | Medium | Medium | Add cleanup handlers |
| Test coverage inadequacy | Medium | High | Write comprehensive tests |

---

## Metrics

| Metric | Value | Target |
|--------|-------|--------|
| **Total LoC** | ~6,650 | N/A |
| **Packages** | 4 | 4 |
| **Routes Implemented** | 11/15 | 15/15 |
| **Adapters Implemented** | 1/3 | 3/3 |
| **Test Coverage** | <10% | 80% |
| **Database Tables** | 14 | 14 |
| **Largest File** | 3,761 lines | <500 lines |
| **TypeScript Files** | 28 | N/A |

---

## Conclusion

MediaOS demonstrates **strong potential** as a unified media management platform with solid architectural foundations. The database schema is well-designed, the tech stack is modern, and the documentation is comprehensive. However, the project requires significant work to reach production readiness:

**Critical Blockers:**
1. Package manager inconsistency
2. Plain-text credential storage
3. Missing authentication layer
4. Incomplete core features (workers, indexers)
5. Minimal test coverage

**Technical Debt:**
1. Monolithic 3,761-line frontend component
2. File-based persistence instead of database
3. No observability or monitoring
4. Missing transaction support

**Recommendation:** With focused effort on the immediate and short-term recommendations, MediaOS could become a viable alternative to the arr ecosystem within 2-3 months. The foundation is solid, but **production deployment is not recommended** until authentication, testing, and credential security are addressed.

**Next Steps:**
1. Create GitHub issues for all critical/high priority items
2. Prioritize package manager standardization
3. Implement security fixes for credential storage
4. Begin App.tsx refactoring
5. Establish CI/CD test coverage requirements

---

**Review Completed:** 2025-11-18
**Recommended Re-review Date:** 2025-12-18 (after addressing critical issues)
