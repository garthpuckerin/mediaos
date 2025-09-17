-- MediaOS Database Schema
-- Version: 1.0.0
-- Description: Initial database schema for MediaOS

-- Users table for authentication and authorization
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member', 'guest')),
    is_active BOOLEAN DEFAULT true,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Media items (movies, TV shows, music, books)
CREATE TABLE IF NOT EXISTS media_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    year INTEGER,
    type VARCHAR(20) NOT NULL CHECK (type IN ('movie', 'tv', 'music', 'book')),
    imdb_id VARCHAR(20),
    tmdb_id INTEGER,
    tvdb_id INTEGER,
    path TEXT NOT NULL,
    file_size BIGINT,
    quality VARCHAR(50),
    codec VARCHAR(50),
    resolution VARCHAR(20),
    duration INTEGER, -- in seconds
    file_hash VARCHAR(64), -- SHA-256 hash
    metadata JSON, -- Additional metadata as JSON
    is_available BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- TV show seasons and episodes
CREATE TABLE IF NOT EXISTS tv_seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_item_id INTEGER NOT NULL,
    season_number INTEGER NOT NULL,
    title VARCHAR(255),
    overview TEXT,
    episode_count INTEGER DEFAULT 0,
    air_date DATE,
    poster_path VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
    UNIQUE(media_item_id, season_number)
);

CREATE TABLE IF NOT EXISTS tv_episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_item_id INTEGER NOT NULL,
    season_id INTEGER NOT NULL,
    episode_number INTEGER NOT NULL,
    title VARCHAR(255),
    overview TEXT,
    air_date DATE,
    duration INTEGER, -- in seconds
    path TEXT,
    file_size BIGINT,
    quality VARCHAR(50),
    codec VARCHAR(50),
    resolution VARCHAR(20),
    file_hash VARCHAR(64),
    is_available BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES tv_seasons(id) ON DELETE CASCADE,
    UNIQUE(media_item_id, season_id, episode_number)
);

-- User requests for media
CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    year INTEGER,
    type VARCHAR(20) NOT NULL CHECK (type IN ('movie', 'tv', 'music', 'book')),
    imdb_id VARCHAR(20),
    tmdb_id INTEGER,
    tvdb_id INTEGER,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'fulfilled', 'cancelled')),
    priority INTEGER DEFAULT 0,
    requested_quality VARCHAR(50),
    notes TEXT,
    approved_by INTEGER,
    approved_at DATETIME,
    fulfilled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Indexers configuration
CREATE TABLE IF NOT EXISTS indexers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('torrent', 'usenet')),
    url VARCHAR(255) NOT NULL,
    api_key VARCHAR(255),
    username VARCHAR(100),
    password VARCHAR(255),
    categories JSON, -- Array of category IDs
    caps JSON, -- Indexer capabilities
    is_enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    last_check DATETIME,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    average_response_time INTEGER DEFAULT 0, -- in milliseconds
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Download queue and status
CREATE TABLE IF NOT EXISTS downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER,
    indexer_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    download_url TEXT NOT NULL,
    download_type VARCHAR(20) NOT NULL CHECK (download_type IN ('torrent', 'nzb')),
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'downloading', 'completed', 'failed', 'cancelled')),
    progress DECIMAL(5,2) DEFAULT 0.00,
    file_size BIGINT,
    downloaded_bytes BIGINT DEFAULT 0,
    download_path TEXT,
    error_message TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE SET NULL,
    FOREIGN KEY (indexer_id) REFERENCES indexers(id)
);

-- Subtitle management
CREATE TABLE IF NOT EXISTS subtitles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_item_id INTEGER NOT NULL,
    episode_id INTEGER, -- For TV episodes
    language VARCHAR(10) NOT NULL, -- ISO 639-1 code
    provider VARCHAR(50) NOT NULL,
    provider_id VARCHAR(100),
    file_path TEXT NOT NULL,
    file_size INTEGER,
    is_embedded BOOLEAN DEFAULT false,
    is_forced BOOLEAN DEFAULT false,
    is_hearing_impaired BOOLEAN DEFAULT false,
    quality_score INTEGER DEFAULT 0, -- 0-100
    download_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
    FOREIGN KEY (episode_id) REFERENCES tv_episodes(id) ON DELETE CASCADE
);

-- Artwork management with history
CREATE TABLE IF NOT EXISTS artwork (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_item_id INTEGER NOT NULL,
    episode_id INTEGER, -- For TV episodes
    season_id INTEGER, -- For TV seasons
    type VARCHAR(20) NOT NULL CHECK (type IN ('poster', 'background', 'banner', 'fanart', 'thumb')),
    url TEXT NOT NULL,
    local_path TEXT,
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    is_locked BOOLEAN DEFAULT false,
    is_primary BOOLEAN DEFAULT false,
    provider VARCHAR(50), -- tmdb, tvdb, etc.
    provider_id VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
    FOREIGN KEY (episode_id) REFERENCES tv_episodes(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES tv_seasons(id) ON DELETE CASCADE
);

-- Calendar events and scheduled jobs
CREATE TABLE IF NOT EXISTS calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL, -- 'air_date', 'job', 'reminder'
    media_item_id INTEGER,
    episode_id INTEGER,
    start_date DATETIME NOT NULL,
    end_date DATETIME,
    is_all_day BOOLEAN DEFAULT false,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(100), -- cron expression
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'failed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
    FOREIGN KEY (episode_id) REFERENCES tv_episodes(id) ON DELETE CASCADE
);

-- Application settings
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    type VARCHAR(20) DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_sensitive BOOLEAN DEFAULT false,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System logs
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
    message TEXT NOT NULL,
    context JSON,
    user_id INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_media_items_type ON media_items(type);
CREATE INDEX IF NOT EXISTS idx_media_items_title ON media_items(title);
CREATE INDEX IF NOT EXISTS idx_media_items_year ON media_items(year);
CREATE INDEX IF NOT EXISTS idx_media_items_path ON media_items(path);
CREATE INDEX IF NOT EXISTS idx_media_items_hash ON media_items(file_hash);

CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(type);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);

CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
CREATE INDEX IF NOT EXISTS idx_downloads_indexer_id ON downloads(indexer_id);
CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at);

CREATE INDEX IF NOT EXISTS idx_subtitles_media_item_id ON subtitles(media_item_id);
CREATE INDEX IF NOT EXISTS idx_subtitles_language ON subtitles(language);

CREATE INDEX IF NOT EXISTS idx_artwork_media_item_id ON artwork(media_item_id);
CREATE INDEX IF NOT EXISTS idx_artwork_type ON artwork(type);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

-- Create triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_media_items_updated_at 
    AFTER UPDATE ON media_items
    BEGIN
        UPDATE media_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_indexers_updated_at 
    AFTER UPDATE ON indexers
    BEGIN
        UPDATE indexers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_settings_updated_at 
    AFTER UPDATE ON settings
    BEGIN
        UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;