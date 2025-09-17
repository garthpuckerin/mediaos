-- MediaOS Database Seeding
-- Version: 1.0.0
-- Description: Seed data for development and testing

-- Insert default admin user
INSERT OR IGNORE INTO users (username, email, password_hash, role, is_active) VALUES
('admin', 'admin@mediaos.local', '$2b$10$rQZ8K9vX7Y2H3J4K5L6M7N8O9P0Q1R2S3T4U5V6W7X8Y9Z0A1B2C3D4E5F6', 'admin', true);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value, type, description) VALUES
('app.name', 'MediaOS', 'string', 'Application name'),
('app.version', '1.0.0', 'string', 'Application version'),
('app.debug', 'false', 'boolean', 'Debug mode'),
('library.movies.path', '/media/movies', 'string', 'Movies library path'),
('library.tv.path', '/media/tv', 'string', 'TV shows library path'),
('library.music.path', '/media/music', 'string', 'Music library path'),
('library.books.path', '/media/books', 'string', 'Books library path'),
('downloads.path', '/downloads', 'string', 'Downloads directory'),
('subtitles.languages', '["en", "es", "fr"]', 'json', 'Default subtitle languages'),
('quality.profiles', '{"movie": ["1080p", "720p"], "tv": ["1080p", "720p", "480p"]}', 'json', 'Quality profiles'),
('indexers.enabled', 'true', 'boolean', 'Enable indexers'),
('ai.features.enabled', 'true', 'boolean', 'Enable AI features'),
('telemetry.enabled', 'true', 'boolean', 'Enable telemetry');

-- Insert sample indexers
INSERT OR IGNORE INTO indexers (name, type, url, is_enabled, priority) VALUES
('The Pirate Bay', 'torrent', 'https://thepiratebay.org', true, 1),
('1337x', 'torrent', 'https://1337x.to', true, 2),
('RARBG', 'torrent', 'https://rarbg.to', true, 3),
('NZBGeek', 'usenet', 'https://nzbgeek.info', true, 4);

-- Insert sample media items
INSERT OR IGNORE INTO media_items (title, year, type, path, quality, resolution, is_available) VALUES
('The Matrix', 1999, 'movie', '/media/movies/The Matrix (1999)/The Matrix (1999).mkv', '1080p', '1920x1080', true),
('Breaking Bad', 2008, 'tv', '/media/tv/Breaking Bad', '1080p', '1920x1080', true),
('Dark Side of the Moon', 1973, 'music', '/media/music/Pink Floyd/Dark Side of the Moon', 'FLAC', 'CD', true);

-- Insert sample requests
INSERT OR IGNORE INTO requests (user_id, title, year, type, status, requested_quality) VALUES
(1, 'Inception', 2010, 'movie', 'pending', '1080p'),
(1, 'Game of Thrones', 2011, 'tv', 'approved', '1080p'),
(1, 'Abbey Road', 1969, 'music', 'fulfilled', 'FLAC');

-- Insert sample calendar events
INSERT OR IGNORE INTO calendar_events (title, event_type, start_date, is_all_day) VALUES
('System Maintenance', 'job', datetime('now', '+1 day', '09:00:00'), false),
('Library Scan', 'job', datetime('now', '+7 days', '02:00:00'), false),
('Metadata Refresh', 'job', datetime('now', '+1 day', '03:00:00'), false);
