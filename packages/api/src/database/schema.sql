-- MediaOS Database Schema
-- Compatible with PostgreSQL and SQLite

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Library items table
CREATE TABLE IF NOT EXISTS library_items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('movie', 'series', 'book', 'music')),
  title TEXT NOT NULL,
  poster_url TEXT,
  background_url TEXT,
  banner_url TEXT,
  season_artwork_json TEXT, -- JSON object for season-specific artwork
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_library_kind ON library_items(kind);
CREATE INDEX IF NOT EXISTS idx_library_title ON library_items(title);

-- Wanted items table
CREATE TABLE IF NOT EXISTS wanted_items (
  id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  added_at TEXT NOT NULL,
  last_scan_at TEXT,
  last_scan_found INTEGER DEFAULT 0,
  last_scan_grabbed INTEGER DEFAULT 0,
  PRIMARY KEY (kind, id)
);

CREATE INDEX IF NOT EXISTS idx_wanted_kind ON wanted_items(kind);

-- Download grabs table
CREATE TABLE IF NOT EXISTS download_grabs (
  key TEXT PRIMARY KEY, -- Format: "kind:id"
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  client TEXT NOT NULL,
  protocol TEXT NOT NULL,
  status TEXT,
  ok BOOLEAN,
  at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_grabs_kind_id ON download_grabs(kind, id);
CREATE INDEX IF NOT EXISTS idx_grabs_at ON download_grabs(at DESC);

-- Indexers table
CREATE TABLE IF NOT EXISTS indexers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('torrent', 'usenet')),
  url TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Verify results table
CREATE TABLE IF NOT EXISTS verify_results (
  key TEXT PRIMARY KEY, -- Format: "kind:id"
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  ok BOOLEAN,
  missing_count INTEGER,
  duration_ms INTEGER,
  at TEXT NOT NULL,
  details_json TEXT -- JSON object with full details
);

CREATE INDEX IF NOT EXISTS idx_verify_kind_id ON verify_results(kind, id);
CREATE INDEX IF NOT EXISTS idx_verify_at ON verify_results(at DESC);

-- Quality profiles table
CREATE TABLE IF NOT EXISTS quality_profiles (
  kind TEXT PRIMARY KEY CHECK (kind IN ('series', 'movies', 'books', 'music')),
  allowed_json TEXT NOT NULL, -- JSON array of allowed qualities
  cutoff TEXT,
  updated_at TEXT NOT NULL
);

-- Settings table (key-value store for various settings)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Requests table (user requests for media)
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  approved_by TEXT,
  approved_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_requests_user ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);

-- Calendar events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  season INTEGER,
  episode INTEGER,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_calendar_item ON calendar_events(kind, item_id);
