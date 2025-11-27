-- MediaOS Initial Database Schema
-- SQLite migration for moving from file-based storage to database
-- Version: 1.0.0
-- Date: 2025-11-27

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- =====================================================
-- USERS TABLE
-- Stores user accounts with encrypted passwords
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'user')) DEFAULT 'user',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- =====================================================
-- SESSIONS TABLE
-- JWT token blacklist for logout functionality
-- =====================================================

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked_at ON sessions(revoked_at) WHERE revoked_at IS NOT NULL;

-- =====================================================
-- LIBRARY ITEMS TABLE
-- Media library items (movies, series, music, books)
-- =====================================================

CREATE TABLE IF NOT EXISTS library_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  kind TEXT NOT NULL CHECK(kind IN ('movie', 'series', 'music', 'book')),
  title TEXT NOT NULL,
  poster_url TEXT,
  background_url TEXT,
  metadata TEXT, -- JSON string for flexible additional data
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_kind_title UNIQUE(kind, title)
);

CREATE INDEX IF NOT EXISTS idx_library_kind ON library_items(kind);
CREATE INDEX IF NOT EXISTS idx_library_title ON library_items(title COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_library_created_at ON library_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_library_updated_at ON library_items(updated_at DESC);

-- =====================================================
-- DOWNLOADERS TABLE
-- Download client configurations (qBittorrent, SABnzbd, NZBGet)
-- =====================================================

CREATE TABLE IF NOT EXISTS downloaders (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  client_type TEXT NOT NULL CHECK(client_type IN ('qbittorrent', 'nzbget', 'sabnzbd')),
  enabled INTEGER NOT NULL DEFAULT 1, -- SQLite boolean (1=true, 0=false)
  base_url TEXT NOT NULL,
  username TEXT,
  encrypted_password TEXT, -- AES-256-GCM encrypted
  encrypted_api_key TEXT,  -- For SABnzbd
  category TEXT,
  timeout_ms INTEGER DEFAULT 5000,
  config TEXT, -- JSON string for client-specific config
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_client_type UNIQUE(client_type)
);

CREATE INDEX IF NOT EXISTS idx_downloaders_enabled ON downloaders(enabled);
CREATE INDEX IF NOT EXISTS idx_downloaders_client_type ON downloaders(client_type);

-- =====================================================
-- INDEXERS TABLE
-- Search indexer configurations (torrent and usenet)
-- =====================================================

CREATE TABLE IF NOT EXISTS indexers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('torrent', 'usenet')),
  base_url TEXT NOT NULL,
  encrypted_api_key TEXT, -- AES-256-GCM encrypted
  enabled INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 0,
  config TEXT, -- JSON string for indexer-specific config
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_indexers_enabled ON indexers(enabled);
CREATE INDEX IF NOT EXISTS idx_indexers_type ON indexers(type);
CREATE INDEX IF NOT EXISTS idx_indexers_priority ON indexers(priority DESC);
CREATE INDEX IF NOT EXISTS idx_indexers_name ON indexers(name COLLATE NOCASE);

-- =====================================================
-- WANTED ITEMS TABLE
-- Items wanted for download
-- =====================================================

CREATE TABLE IF NOT EXISTS wanted_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  library_item_id TEXT,
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('movie', 'series', 'music', 'book')),
  status TEXT NOT NULL DEFAULT 'wanted' CHECK(status IN ('wanted', 'searching', 'found', 'failed')),
  search_query TEXT,
  last_search_at DATETIME,
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT, -- JSON string for additional data
  FOREIGN KEY (library_item_id) REFERENCES library_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wanted_status ON wanted_items(status);
CREATE INDEX IF NOT EXISTS idx_wanted_added_at ON wanted_items(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_wanted_library_item_id ON wanted_items(library_item_id);
CREATE INDEX IF NOT EXISTS idx_wanted_kind ON wanted_items(kind);

-- =====================================================
-- QUALITY PROFILES TABLE
-- Quality settings for downloads
-- =====================================================

CREATE TABLE IF NOT EXISTS quality_profiles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  min_quality TEXT,
  max_quality TEXT,
  preferred_qualities TEXT, -- JSON array of preferred qualities
  config TEXT, -- JSON string for additional config
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quality_profiles_name ON quality_profiles(name COLLATE NOCASE);

-- =====================================================
-- VERIFY JOBS TABLE
-- Media verification jobs
-- =====================================================

CREATE TABLE IF NOT EXISTS verify_jobs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  library_item_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('movie', 'series', 'music', 'book')),
  title TEXT NOT NULL,
  phase TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed')),
  result TEXT, -- JSON string with verification results
  error TEXT,
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (library_item_id) REFERENCES library_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_verify_jobs_status ON verify_jobs(status);
CREATE INDEX IF NOT EXISTS idx_verify_jobs_library_item_id ON verify_jobs(library_item_id);
CREATE INDEX IF NOT EXISTS idx_verify_jobs_created_at ON verify_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verify_jobs_kind ON verify_jobs(kind);

-- =====================================================
-- MIGRATION TRACKING TABLE
-- Tracks database schema versions
-- =====================================================

CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =====================================================

-- Users
CREATE TRIGGER IF NOT EXISTS update_users_updated_at
  AFTER UPDATE ON users
  FOR EACH ROW
  BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Library Items
CREATE TRIGGER IF NOT EXISTS update_library_items_updated_at
  AFTER UPDATE ON library_items
  FOR EACH ROW
  BEGIN
    UPDATE library_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Downloaders
CREATE TRIGGER IF NOT EXISTS update_downloaders_updated_at
  AFTER UPDATE ON downloaders
  FOR EACH ROW
  BEGIN
    UPDATE downloaders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Indexers
CREATE TRIGGER IF NOT EXISTS update_indexers_updated_at
  AFTER UPDATE ON indexers
  FOR EACH ROW
  BEGIN
    UPDATE indexers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Quality Profiles
CREATE TRIGGER IF NOT EXISTS update_quality_profiles_updated_at
  AFTER UPDATE ON quality_profiles
  FOR EACH ROW
  BEGIN
    UPDATE quality_profiles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- =====================================================
-- SESSION CLEANUP TRIGGER
-- Automatically mark expired sessions as revoked
-- =====================================================

CREATE TRIGGER IF NOT EXISTS revoke_expired_sessions
  AFTER INSERT ON sessions
  FOR EACH ROW
  BEGIN
    UPDATE sessions
    SET revoked_at = CURRENT_TIMESTAMP
    WHERE expires_at < CURRENT_TIMESTAMP
      AND revoked_at IS NULL;
  END;

-- =====================================================
-- INITIAL MIGRATION RECORD
-- =====================================================

INSERT OR IGNORE INTO migrations (version, name) VALUES (1, '001_initial_schema');

-- =====================================================
-- VACUUM AND OPTIMIZE
-- =====================================================

-- Analyze tables for query optimizer
ANALYZE;

-- Compact database
VACUUM;
