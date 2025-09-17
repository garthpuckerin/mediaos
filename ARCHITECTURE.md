# MediaOS Architecture Documentation

## Overview

MediaOS is a unified media management platform built as a monorepo with a modern TypeScript stack. This document outlines the technical architecture and design decisions.

## Architecture Principles

- **Single Container:** All functionality in one Docker container
- **Modular Design:** Clear separation of concerns across packages
- **Type Safety:** Strict TypeScript throughout the codebase
- **Testability:** Comprehensive testing at all levels
- **Performance:** Optimized for NAS environments (2-4GB RAM)

## Technology Stack

### Core Technologies
- **Runtime:** Node.js 18+ (LTS)
- **Language:** TypeScript 5.6+
- **Package Manager:** pnpm 8+
- **API Framework:** Fastify 4+
- **Frontend:** React 18+ with Vite
- **Database:** SQLite (default), PostgreSQL (optional)
- **Containerization:** Docker with multi-stage builds

### Development Tools
- **Linting:** ESLint with TypeScript rules
- **Formatting:** Prettier
- **Testing:** Vitest (unit), Playwright (E2E)
- **Quality Gates:** Husky + lint-staged
- **CI/CD:** GitHub Actions
- **Branch Management:** Comprehensive Git workflow with protection rules
- **AI Guardrails:** Systematic development protocols and documentation sync

## Package Structure

```
packages/
├── api/           # Fastify API server
├── web/           # React frontend
├── workers/       # Background job processing
└── adapters/      # External service integrations
```

### API Package (`@mediaos/api`)

**Purpose:** REST API server with Fastify framework

**Key Components:**
- **Routes:** API endpoint handlers (`/api/*`)
- **Services:** Business logic layer
- **Models:** Data models and validation
- **Middleware:** Authentication, logging, error handling
- **Database:** SQLite/PostgreSQL integration

**Architecture:**
```
src/
├── index.ts           # Server entry point
├── routes/            # API route handlers
│   ├── library.ts     # Media library management
│   ├── requests.ts    # User requests
│   ├── indexers.ts    # Indexer management
│   ├── downloads.ts   # Download management
│   ├── subtitles.ts   # Subtitle management
│   ├── calendar.ts    # Calendar and scheduling
│   └── settings.ts    # Configuration
├── services/          # Business logic
├── models/            # Data models
├── middleware/         # Express middleware
├── utils/             # Utility functions
└── types/             # TypeScript definitions
```

### Web Package (`@mediaos/web`)

**Purpose:** React-based user interface

**Key Components:**
- **Components:** Reusable UI components
- **Pages:** Route-based page components
- **Hooks:** Custom React hooks
- **Services:** API client and state management
- **Utils:** Frontend utility functions

**Architecture:**
```
src/
├── main.tsx           # Application entry point
├── ui/
│   ├── App.tsx        # Main application component
│   ├── components/    # Reusable components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom hooks
│   ├── services/      # API clients
│   └── utils/         # Utility functions
└── types/             # TypeScript definitions
```

### Workers Package (`@mediaos/workers`)

**Purpose:** Background job processing

**Key Components:**
- **Job Queue:** Task scheduling and execution
- **Processors:** Specific job handlers
- **Schedulers:** Cron-like scheduling
- **Monitoring:** Job status and health

### Adapters Package (`@mediaos/adapters`)

**Purpose:** External service integrations

**Key Components:**
- **Indexers:** Torrent/Usenet indexer adapters
- **Downloaders:** qBittorrent, SABnzbd, NZBGet
- **Subtitles:** Subtitle provider adapters
- **Metadata:** TMDB, TVDB, MusicBrainz

## Database Architecture

### Schema Design

**Core Tables:**
- `media_items` - Movies, TV shows, music, books
- `requests` - User media requests
- `indexers` - Configured indexers
- `downloads` - Download queue and status
- `subtitles` - Subtitle management
- `users` - User accounts and permissions
- `settings` - Application configuration

### Migration Strategy

- **Version Control:** SQL migration files
- **Rollback:** Downward migrations supported
- **Seeding:** Development data seeding
- **Backup:** Automated backup strategies

## API Design

### RESTful Principles

- **Resources:** Clear resource-based URLs
- **HTTP Methods:** Proper use of GET, POST, PUT, DELETE
- **Status Codes:** Meaningful HTTP status codes
- **Error Handling:** Consistent error response format

### Authentication & Authorization

- **JWT Tokens:** Stateless authentication
- **RBAC:** Role-based access control
- **Session Management:** Secure session handling
- **API Keys:** External service authentication

### Rate Limiting & Security

- **Rate Limiting:** Per-IP and per-user limits
- **CORS:** Configurable cross-origin policies
- **Input Validation:** Zod schema validation
- **SQL Injection:** Parameterized queries

## Frontend Architecture

### Component Design

- **Atomic Design:** Component hierarchy
- **Composition:** Reusable component patterns
- **Props Interface:** Strict TypeScript interfaces
- **State Management:** React hooks and context

### Routing & Navigation

- **Client-Side Routing:** React Router
- **Protected Routes:** Authentication guards
- **Breadcrumbs:** Navigation context
- **Deep Linking:** URL-based state

### State Management

- **Local State:** React useState/useReducer
- **Global State:** React Context API
- **Server State:** React Query/SWR
- **Form State:** Controlled components

## Testing Strategy

### Test Pyramid

1. **Unit Tests (70%)**
   - Individual functions/components
   - Fast execution
   - High coverage

2. **Integration Tests (20%)**
   - API endpoints
   - Database interactions
   - Service integrations

3. **E2E Tests (10%)**
   - Complete user workflows
   - Cross-browser testing
   - Critical path validation

### Testing Tools

- **Vitest:** Fast unit testing
- **Playwright:** E2E testing
- **Supertest:** API testing
- **MSW:** API mocking

## Deployment Architecture

### Container Strategy

- **Single Container:** All services in one image
- **Multi-Stage Build:** Optimized production image
- **Health Checks:** Container health monitoring
- **Resource Limits:** Memory and CPU constraints

### Volume Management

- **Config Volume:** Persistent configuration
- **Media Volume:** Read-only media access
- **Downloads Volume:** Download processing
- **Artifacts Volume:** Artwork and subtitle history

### Environment Configuration

- **Environment Variables:** 12-factor app principles
- **Configuration Files:** JSON/YAML configs
- **Secrets Management:** Secure credential handling
- **Feature Flags:** Runtime feature toggles

## Performance Considerations

### Optimization Strategies

- **Database Indexing:** Optimized query performance
- **Caching:** In-memory and Redis caching
- **Lazy Loading:** On-demand resource loading
- **Code Splitting:** Bundle optimization

### Monitoring & Observability

- **Health Endpoints:** System health monitoring
- **Metrics Collection:** Performance metrics
- **Logging:** Structured logging
- **Error Tracking:** Error monitoring and alerting

## Security Architecture

### Security Layers

1. **Network Security**
   - HTTPS enforcement
   - CORS configuration
   - Rate limiting

2. **Application Security**
   - Input validation
   - SQL injection prevention
   - XSS protection

3. **Data Security**
   - Encryption at rest
   - Secure credential storage
   - Data anonymization

### Compliance

- **GDPR:** Data protection compliance
- **Security Audits:** Regular security reviews
- **Vulnerability Scanning:** Automated security scanning
- **Dependency Updates:** Regular dependency updates

## Scalability Considerations

### Horizontal Scaling

- **Stateless Design:** No server-side sessions
- **Database Scaling:** Read replicas
- **Load Balancing:** Multiple container instances
- **Caching Layer:** Distributed caching

### Vertical Scaling

- **Resource Optimization:** Memory and CPU efficiency
- **Database Tuning:** Query optimization
- **Code Optimization:** Performance profiling
- **Monitoring:** Resource usage tracking

## Future Architecture

### Planned Enhancements

- **Microservices:** Service decomposition
- **Event-Driven:** Event sourcing patterns
- **GraphQL:** Alternative API layer
- **Real-Time:** WebSocket support

### Technology Evolution

- **Node.js Updates:** Keep current with LTS
- **Framework Updates:** Regular dependency updates
- **New Technologies:** Evaluate and adopt carefully
- **Performance:** Continuous optimization

---

**Document Version:** 1.0  
**Last Updated:** September 17, 2025  
**Next Review:** Q4 2025

This architecture documentation will be updated as the project evolves. For specific implementation details, refer to the individual package documentation and code comments.
