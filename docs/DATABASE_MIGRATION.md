# Database Migration Plan

Strategic plan for migrating MediaOS from file-based storage to a proper database system.

## Table of Contents

- [Overview](#overview)
- [Current State](#current-state)
- [Target Architecture](#target-architecture)
- [Database Schema](#database-schema)
- [Migration Strategy](#migration-strategy)
- [Implementation Phases](#implementation-phases)
- [Risk Mitigation](#risk-mitigation)
- [Rollback Plan](#rollback-plan)

## Overview

### Goals

1. **Scalability**: Support multiple concurrent users and larger datasets
2. **Performance**: Improve query performance for complex operations
3. **Data Integrity**: Ensure ACID compliance for critical operations
4. **Multi-User Support**: Enable proper session management and concurrent access
5. **Query Capabilities**: Enable complex filtering, sorting, and aggregation

### Non-Goals

- **Breaking Changes**: Maintain API compatibility during migration
- **Data Loss**: Zero tolerance for data loss during migration
- **Downtime**: Minimize or eliminate production downtime

## Current State

### File-Based Storage

Currently, MediaOS stores data in JSON files:

```
config/
├── users.json          # User accounts and credentials
├── library.json        # Media library items
├── downloaders.json    # Download client configurations
├── indexers.json       # Search indexer configurations
├── wanted.json         # Wanted items list
├── quality.json        # Quality profiles
└── verify-jobs.json    # Verification jobs
```

### Limitations

1. **Concurrency**: File locking issues with concurrent writes
2. **Performance**: O(n) operations for searches and filters
3. **Scalability**: Memory constraints with large datasets
4. **Transactions**: No atomic operations across multiple files
5. **Queries**: Limited query capabilities (no JOINs, aggregations)
6. **Sessions**: No proper session management for JWT token blacklisting

## Target Architecture

### Database Options

#### Option 1: SQLite (Recommended for v1.0)

**Pros:**

- Zero configuration, single file
- Perfect for NAS deployment (low resource usage)
- ACID compliant with full transaction support
- Excellent for read-heavy workloads
- No separate database server needed
- Built-in full-text search (FTS5)

**Cons:**

- Limited concurrent write performance
- Not ideal for high-traffic production (but fine for NAS use case)
- No network access (requires same filesystem)

**Recommendation**: **Use SQLite for v1.0** - Perfect fit for Synology NAS deployment with 2-4GB RAM.

#### Option 2: PostgreSQL (Future Consideration)

**Pros:**

- Excellent concurrent write performance
- Advanced features (JSONB, full-text search, CTEs)
- Industry standard for multi-user applications
- Horizontal scaling capabilities

**Cons:**

- Requires separate database server
- Higher resource requirements (not ideal for NAS)
- More complex deployment and management

**Recommendation**: Consider for v2.0 if scaling beyond single-NAS deployment.

### Chosen Architecture: SQLite + File Hybrid

**Phase 1 (v1.0)**: SQLite for structured data, files for large blobs

- Users, sessions, library metadata → SQLite
- Download configurations → SQLite (encrypted credentials)
- Wanted items, quality profiles → SQLite
- Large artwork files → File system (referenced in DB)

**Phase 2 (v2.0)**: Optional PostgreSQL migration path

- Provide migration scripts for users who need it
- Maintain SQLite as primary supported option

## Database Schema

### Core Tables

#### Users Table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### Sessions Table (JWT Token Blacklist)

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

#### Library Items Table

```sql
CREATE TABLE library_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  kind TEXT NOT NULL CHECK(kind IN ('movie', 'series', 'music', 'book')),
  title TEXT NOT NULL,
  poster_url TEXT,
  background_url TEXT,
  metadata JSONB, -- Additional flexible metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(kind, title)
);

CREATE INDEX idx_library_kind ON library_items(kind);
CREATE INDEX idx_library_title ON library_items(title COLLATE NOCASE);
CREATE INDEX idx_library_created_at ON library_items(created_at DESC);
```

#### Downloaders Table

```sql
CREATE TABLE downloaders (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  client_type TEXT NOT NULL CHECK(client_type IN ('qbittorrent', 'nzbget', 'sabnzbd')),
  enabled BOOLEAN NOT NULL DEFAULT 1,
  base_url TEXT NOT NULL,
  username TEXT,
  encrypted_password TEXT, -- AES-256-GCM encrypted
  encrypted_api_key TEXT,  -- For SABnzbd
  category TEXT,
  timeout_ms INTEGER DEFAULT 5000,
  config JSONB, -- Additional client-specific config
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_type) -- Only one config per client type
);
```

#### Indexers Table

```sql
CREATE TABLE indexers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('torrent', 'usenet')),
  base_url TEXT NOT NULL,
  encrypted_api_key TEXT,
  enabled BOOLEAN NOT NULL DEFAULT 1,
  priority INTEGER DEFAULT 0,
  config JSONB,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_indexers_enabled ON indexers(enabled);
CREATE INDEX idx_indexers_type ON indexers(type);
CREATE INDEX idx_indexers_priority ON indexers(priority DESC);
```

#### Wanted Items Table

```sql
CREATE TABLE wanted_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  library_item_id TEXT,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'wanted' CHECK(status IN ('wanted', 'searching', 'found', 'failed')),
  search_query TEXT,
  last_search_at DATETIME,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  FOREIGN KEY (library_item_id) REFERENCES library_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_wanted_status ON wanted_items(status);
CREATE INDEX idx_wanted_added_at ON wanted_items(added_at DESC);
CREATE INDEX idx_wanted_library_item_id ON wanted_items(library_item_id);
```

#### Quality Profiles Table

```sql
CREATE TABLE quality_profiles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  min_quality TEXT,
  max_quality TEXT,
  preferred_qualities JSONB, -- Array of preferred qualities
  config JSONB,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Verify Jobs Table

```sql
CREATE TABLE verify_jobs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  library_item_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  phase TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed')),
  result JSONB,
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (library_item_id) REFERENCES library_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_verify_jobs_status ON verify_jobs(status);
CREATE INDEX idx_verify_jobs_library_item_id ON verify_jobs(library_item_id);
CREATE INDEX idx_verify_jobs_created_at ON verify_jobs(created_at DESC);
```

### Triggers for Updated_At

```sql
-- Auto-update updated_at timestamp
CREATE TRIGGER update_users_updated_at
  AFTER UPDATE ON users
  FOR EACH ROW
  BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Repeat for other tables with updated_at column
```

## Migration Strategy

### Approach: Dual-Write Pattern

**Phase 1: Add Database Layer (No Breaking Changes)**

1. Add SQLite database alongside existing file storage
2. Implement database repositories with same interface as file storage
3. Write to both database and files (dual-write)
4. Read from files (maintain current behavior)
5. **Result**: Zero risk, fully reversible

**Phase 2: Switch Read Path**

1. Change read operations to use database
2. Continue dual-write to files as backup
3. Implement data consistency checks
4. Monitor for discrepancies
5. **Result**: Performance improvements, file backup maintained

**Phase 3: Remove File Writes (Optional)**

1. Stop writing to JSON files
2. Files become backup/export format only
3. **Result**: Single source of truth in database

### Data Consistency Strategy

```typescript
// Example: Dual-write with consistency checking
async function saveLibraryItem(item: LibraryItem): Promise<void> {
  // Write to database (primary)
  await db.insert('library_items', item);

  // Write to file (backup)
  try {
    await writeToJsonFile('library.json', item);
  } catch (error) {
    logger.warn('Failed to write backup file', { error });
    // Don't fail the request - database is source of truth
  }
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Tasks:**

1. Add SQLite dependencies (`better-sqlite3`)
2. Create database schema and migrations framework
3. Implement database connection management
4. Create base repository pattern
5. Add database initialization on startup

**Deliverables:**

- Database schema definitions
- Migration framework
- Connection pooling setup
- Health check integration

### Phase 2: User & Session Management (Week 3-4)

**Tasks:**

1. Migrate users table
2. Implement session table for JWT blacklisting
3. Add data migration script (JSON → SQLite)
4. Implement dual-write for users
5. Add logout with token blacklisting

**Deliverables:**

- User repository (database-backed)
- Session management service
- Migration script: `users.json` → `users` table
- Token blacklist functionality

### Phase 3: Library & Media (Week 5-6)

**Tasks:**

1. Migrate library_items table
2. Implement search and filtering
3. Add pagination support
4. Migrate wanted_items table
5. Add quality_profiles table

**Deliverables:**

- Library repository with advanced queries
- Search and filter endpoints
- Pagination middleware
- Migration scripts for library data

### Phase 4: Download Clients & Indexers (Week 7-8)

**Tasks:**

1. Migrate downloaders table with encrypted credentials
2. Migrate indexers table
3. Implement verify_jobs table
4. Add database-backed job queue

**Deliverables:**

- Downloader repository
- Indexer repository
- Verify jobs repository
- Migration scripts for all config data

### Phase 5: Testing & Optimization (Week 9-10)

**Tasks:**

1. Comprehensive integration tests
2. Performance benchmarking
3. Data consistency validation
4. Migration testing with real data
5. Rollback procedure testing

**Deliverables:**

- Test coverage > 80%
- Performance benchmarks
- Migration validation tool
- Rollback scripts

### Phase 6: Production Deployment (Week 11-12)

**Tasks:**

1. Backup existing data
2. Run migration in production
3. Monitor for issues
4. Gradual rollout (canary deployment)
5. Remove file-based storage (optional)

**Deliverables:**

- Production migration playbook
- Monitoring dashboards
- Rollback documentation
- User migration guide

## Risk Mitigation

### Risk 1: Data Loss During Migration

**Mitigation:**

- Automatic backups before migration
- Dual-write period maintains file backup
- Data validation after migration
- Easy rollback to file-based storage

**Validation Script:**

```typescript
async function validateMigration(): Promise<ValidationReport> {
  const fileData = await loadFromJsonFiles();
  const dbData = await loadFromDatabase();

  return {
    usersMatch: compareUsers(fileData.users, dbData.users),
    libraryMatch: compareLibrary(fileData.library, dbData.library),
    // ... other checks
  };
}
```

### Risk 2: Performance Degradation

**Mitigation:**

- Comprehensive benchmarking before switch
- Gradual rollout with monitoring
- Database query optimization
- Proper indexing strategy
- Connection pooling

**Performance Tests:**

```typescript
describe('Database Performance', () => {
  it('should query 10,000 library items in < 100ms', async () => {
    const start = Date.now();
    await db.query('SELECT * FROM library_items LIMIT 100');
    expect(Date.now() - start).toBeLessThan(100);
  });
});
```

### Risk 3: Concurrent Access Issues

**Mitigation:**

- SQLite WAL mode for better concurrency
- Proper transaction isolation
- Row-level locking where needed
- Retry logic for SQLITE_BUSY errors

**Configuration:**

```typescript
const db = new Database('mediaos.db', {
  fileMustExist: false,
});

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = 10000');
db.pragma('temp_store = MEMORY');
```

### Risk 4: Migration Failures

**Mitigation:**

- Atomic migrations with transactions
- Migration version tracking
- Automatic rollback on failure
- Dry-run mode for testing

**Migration Framework:**

```typescript
interface Migration {
  version: number;
  up: (db: Database) => Promise<void>;
  down: (db: Database) => Promise<void>;
}

async function runMigrations(db: Database): Promise<void> {
  const currentVersion = await getCurrentVersion(db);
  const pendingMigrations = migrations.filter(
    (m) => m.version > currentVersion
  );

  for (const migration of pendingMigrations) {
    try {
      await db.transaction(() => migration.up(db));
      await setVersion(db, migration.version);
    } catch (error) {
      logger.error('Migration failed, rolling back', { migration, error });
      await migration.down(db);
      throw error;
    }
  }
}
```

## Rollback Plan

### Scenario 1: Migration Fails

**Steps:**

1. Stop application
2. Restore file-based storage from backup
3. Remove database file
4. Restart with file-based storage
5. **Result**: Back to previous stable state

### Scenario 2: Issues After Migration

**Steps:**

1. Switch reads back to file storage
2. Stop dual-write to database
3. Investigate and fix issues
4. Re-run migration when ready
5. **Result**: Zero data loss, minimal downtime

### Scenario 3: Performance Issues

**Steps:**

1. Enable query logging
2. Identify slow queries
3. Add missing indexes
4. Optimize queries
5. If unfixable: Rollback to files
6. **Result**: Can revert to files at any time

## Testing Strategy

### Unit Tests

- Database repository functions
- Migration scripts (up and down)
- Query builders
- Validation functions

### Integration Tests

- End-to-end migration flow
- Concurrent access patterns
- Data consistency checks
- Performance benchmarks

### Load Tests

- 1,000+ concurrent requests
- 100,000+ library items
- Multiple simultaneous migrations
- Connection pool exhaustion

## Timeline Summary

| Phase                       | Duration | Key Milestone                 |
| --------------------------- | -------- | ----------------------------- |
| Phase 1: Foundation         | 2 weeks  | Database infrastructure ready |
| Phase 2: Users & Sessions   | 2 weeks  | Authentication migrated       |
| Phase 3: Library & Media    | 2 weeks  | Core data migrated            |
| Phase 4: Clients & Indexers | 2 weeks  | All data migrated             |
| Phase 5: Testing            | 2 weeks  | Production-ready              |
| Phase 6: Deployment         | 2 weeks  | Fully migrated                |

**Total: 12 weeks** for complete migration with zero data loss risk.

## Future Enhancements

### v2.0 Considerations

1. **PostgreSQL Support**: For users who need it
2. **Sharding**: For very large deployments
3. **Read Replicas**: For high-traffic scenarios
4. **Full-Text Search**: Enhanced search capabilities
5. **Audit Logs**: Track all data changes
6. **Multi-Tenancy**: Support multiple isolated instances

## References

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [better-sqlite3 Package](https://github.com/WiseLibs/better-sqlite3)
- [SQLite Performance Tips](https://www.sqlite.org/performance.html)
- [Database Migration Best Practices](https://www.prisma.io/dataguide/types/relational/migration-strategies)
