# MediaOS — Product Requirements Document (PRD)

## 1. Vision

MediaOS is a unified, single-container media management platform that replaces the arr ecosystem (Sonarr, Radarr, Lidarr, Readarr, Overseerr, Prowlarr, Bazarr) with a cohesive experience. It manages the complete media lifecycle: scan/import → request → search → acquire → post-process → library, while adding AI-assisted quality control, artwork management, and natural-language automation.

**Initial deployment target:** Synology NAS (Docker/Container Manager)

## 2. Core Objectives

- **Single Container Solution:** Provide one container with all core functionality
- **Modern Stack:** Clean UI (React + Vite) + REST API backend (Fastify + TypeScript)
- **Database Flexibility:** SQLite by default (Postgres optional)
- **Minimal Dependencies:** Keep external dependencies minimal (qBittorrent/SABnzbd/NZBGet integration optional)
- **Local Import:** Support local scan/import of existing media at setup
- **Artwork Management:** Add artwork lock/revert/history to prevent metadata "bad art" issues
- **Scheduling:** Ship a calendar for air dates and job scheduling
- **NAS Optimization:** Provide NAS-friendly defaults: 2–4GB RAM, single process cluster

## 3. Major Modules

### 3.1 Library & Metadata

- Track movies, series, music, books
- Match and normalize filenames
- Store metadata (title, year, season/episode, quality, codecs, artwork)
- Support multiple artwork slots: Poster, Background, Banner, Season
- **Artwork Lock/Revert:** Prevent unwanted updates with history tracking

### 3.2 Scanner & Importer

- **Setup Phase:** Scan existing directories, hash and match media
- **Ongoing:** Watch folders for new files
- Support rename, hardlink, or copy operations
- Detect duplicates and stale files
- Safe dry-run capability for initial imports

### 3.3 Requests (Overseerr Replacement)

- Users can request media through intuitive interface
- Rules for quota, approval, duplicate detection
- Approvals can be automatic or moderated
- Related content suggestions
- Request history and status tracking

### 3.4 Indexer Hub (Prowlarr Replacement)

- Manage torrent and Usenet indexers
- Health checks (latency, rate-limit monitoring)
- API keys, categories, caps mapping
- Unified search endpoint across all configured indexers
- Indexer ranking based on success rate and performance

### 3.5 Acquisition & Post-Processing

- **External Downloaders:** qBittorrent, SABnzbd, NZBGet integration
- **Optional Built-in:** Torrent/NZB clients
- **Post-processing Pipeline:**
  - Verify and rename files
  - Extract subtitles automatically
  - Refresh metadata/artwork
  - Auto-upgrade to better quality if available

### 3.6 Subtitles (Bazarr Replacement)

- Multi-language policy configuration (e.g., EN, JA, ES)
- Provider adapters (OpenSubtitles, Subscene, Assrt)
- Retiming/QC checks for subtitle quality
- OCR image subs → text conversion
- Subtitle history and version management

### 3.7 Calendar & Jobs

- Air dates for episodes and releases
- Scheduled jobs (refresh metadata, cleanups)
- Show in UI with filters and views
- Job status monitoring and logging

### 3.8 Telemetry Lite (Tautulli-lite)

- Summaries of library growth, downloads, requests
- Per-user activity overview
- System health KPIs (uptime, storage %, active downloads)
- Performance metrics and analytics

### 3.9 Updater

- Auto-refresh provider definitions and indexer caps
- Manual container update trigger (Watchtower not bundled)
- Version management and rollback capabilities

## 4. AI Enhancements

### 4.1 Natural Language Commands

- **Example:** "Download Demon Slayer season 1 dual-audio 1080p" → automatically fills request form
- Intelligent parsing of user requests
- Context-aware suggestions

### 4.2 Smart Quality Profiles

- Learn preferred codecs, file sizes, bitrates
- Adaptive quality selection based on user patterns
- Automatic quality upgrades when better versions become available

### 4.3 Indexer Ranking

- Reorder by success rate, latency, ban history
- Machine learning-based indexer performance optimization
- Dynamic indexer selection for optimal results

### 4.4 Subtitle QC

- Flag drift or poor encodes automatically
- Quality assessment and recommendations
- Automatic subtitle improvement suggestions

### 4.5 Artwork Assistant

- Suggest artwork but never overwrite without permission
- Keep comprehensive revert history
- AI-powered artwork quality assessment

## 5. UI Pages

### 5.1 Dashboard

- System stats and health overview
- Recent requests and downloads
- Quick access to common functions
- System alerts and notifications

### 5.2 Library (Movies/Series/Music/Books)

- Grid view with filtering capabilities
- **Art Modal:** Comprehensive artwork control with lock/revert functionality
- Metadata editing and management
- Quality and file information display

### 5.3 Requests

- List with approval status and filtering
- Request submission interface
- Approval workflow management
- Related content suggestions

### 5.4 Indexers

- Add/edit/test indexer configurations
- Health monitoring and performance metrics
- API key management
- Category and capability mapping

### 5.5 Subtitles

- Provider configuration and management
- Language policy settings
- Subtitle quality monitoring
- Manual subtitle management

### 5.6 Downloads

- Active queue with progress tracking
- Download history and statistics
- Post-processing status
- Error handling and retry mechanisms

### 5.7 Calendar

- Release dates and scheduled jobs
- Filterable views by media type
- Job scheduling interface
- Event management

### 5.8 Settings

- Library paths and configuration
- User accounts and authentication
- Notification preferences
- Quality profiles and policies
- System configuration

## 6. API Specification

### 6.1 Core Endpoints

- `/api/library` - CRUD operations for media items, artwork control
- `/api/requests` - Submit, approve, deny, list requests
- `/api/indexers` - Add, remove, search, health monitoring
- `/api/downloads` - Queue management, status, cancel operations
- `/api/subtitles` - Fetch, apply policy, audit functionality
- `/api/calendar` - Events, jobs, scheduling
- `/api/settings` - Configuration, user accounts, authentication
- `/api/system` - Health checks, version info, self-test

### 6.2 Data Format

- **Primary:** REST JSON API
- **Future:** GraphQL optional for complex queries
- **Authentication:** JWT tokens with RBAC
- **Rate Limiting:** Built-in protection against abuse

## 7. Storage Architecture

### 7.1 Database

- **Default:** SQLite WAL mode for optimal performance
- **Optional:** Postgres via `MEDIAOS_DB_URL` environment variable
- **Migrations:** Included with version control
- **Backup:** Automated backup strategies

### 7.2 File Storage

- **Artwork/Subtitle History:** Stored in `/config/artifacts`
- **Media Libraries:** Read-only access via `/media` mount
- **Downloads:** Processing area via `/downloads` mount
- **Configuration:** Persistent storage in `/config`

## 8. Deployment

### 8.1 Container Image

- **Image:** `mediaos:latest`
- **Port:** 8080 (UI/API unified)
- **Base:** Node.js 20 Alpine for minimal footprint

### 8.2 Volume Mounts

- `/config` - Database, settings, logs, artifacts
- `/media` - Read-only media library access
- `/downloads` - Download processing directory

### 8.3 Synology Integration

- Run via Container Manager with local bind mounts
- Optimized for Synology NAS hardware
- Resource monitoring and management

## 9. Security

### 9.1 Authentication

- **Local Accounts:** Built-in user management
- **OAuth Integration:** Plex, Google, GitHub
- **2FA:** Optional two-factor authentication
- **Session Management:** Secure token-based sessions

### 9.2 Authorization

- **RBAC:** Admin / Member / Guest roles
- **Permission System:** Granular access control
- **API Security:** Rate limiting and input validation

### 9.3 Data Protection

- **Secrets Management:** Redacted in UI/API responses
- **SSRF Protection:** Guard against metadata/subtitle fetcher attacks
- **DoS Prevention:** Built-in protection mechanisms

## 10. First-Run Flow

### 10.1 Setup Wizard

1. **Library Configuration:** Set media library paths
2. **Downloader Choice:** Select external or built-in downloaders
3. **Subtitle Languages:** Configure language preferences
4. **Indexer Setup:** Add indexers or load defaults
5. **User Accounts:** Create admin and user accounts

### 10.2 Initial Import

1. **Safe Scan:** Dry-run scan of existing directories
2. **Media Matching:** Hash and match existing media
3. **Metadata Population:** Fetch and store metadata
4. **Artwork Import:** Download and organize artwork

### 10.3 Ready State

- Dashboard shows requests and library status
- All core functionality available
- System health monitoring active

## 11. Stretch Goals (Post-v1)

### 11.1 Multi-tenancy Support

- Multiple user organizations
- Isolated libraries and configurations
- Enterprise-grade user management

### 11.2 Advanced Infrastructure

- Postgres + Redis + Meilisearch bundle
- Full high availability (multi-node)
- Horizontal scaling capabilities

### 11.3 Extensibility

- Plugin SDK for third-party extensions
- Custom adapter development
- Community marketplace

## 12. Success Metrics

### 12.1 Performance Targets

- **Time to First Import:** < 10 minutes
- **RAM Footprint:** ≤ 800MB baseline
- **Response Time:** < 200ms for API calls
- **Storage Efficiency:** Minimal disk usage for metadata

### 12.2 User Experience

- **Single-Click Updates:** Provider/indexer definitions
- **Complete Workflow:** Users can complete request → acquisition → library loop without CLI
- **Zero Configuration:** Works out-of-the-box with sensible defaults
- **Intuitive Interface:** No technical knowledge required for basic operations

### 12.3 Reliability

- **Uptime:** 99.9% availability target
- **Data Integrity:** Zero data loss during operations
- **Error Recovery:** Automatic retry and fallback mechanisms
- **Update Safety:** Seamless updates without data loss

## 13. Technical Architecture

### 13.1 Current Implementation

- **Monorepo:** pnpm workspaces with packages structure
- **API:** Fastify + TypeScript with plugin architecture
- **Web:** React + Vite for modern UI development
- **Workers:** Background job processing
- **Adapters:** Modular source integrations (indexers/subtitles/downloaders)

### 13.2 Development Workflow

- **Build System:** Concurrent development with hot reload
- **Testing:** Comprehensive test coverage for all modules
- **Deployment:** Single container with multi-stage Docker build
- **Monitoring:** Built-in health checks and logging

---

**Document Version:** 1.0  
**Last Updated:** September 17, 2025  
**Next Review:** Q4 2025
