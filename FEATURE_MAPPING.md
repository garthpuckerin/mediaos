# Feature Mapping: Suggested Features vs Parity Report

This document maps the suggested next features from earlier discussions to the parity report categories and roadmap.

---

## Suggested Features Analysis

### A. Notifications System

**Parity Category:** Request System, Automation, General Infrastructure  
**Current Status:** ❌ Not Implemented (0%)  
**Priority:** High

**Where it fits:**

- **Request System (25% parity)** - Critical missing feature
  - Email alerts for request approvals
  - Notifications when requests are fulfilled
  - Download complete notifications
- **Automation (38% parity)** - Enhances existing automation
  - Failed download notifications
  - Quality upgrade available alerts
  - System health alerts

**Implementation Impact:**

- Would increase **Request System** parity from 25% → 40%
- Would increase **Automation** parity from 38% → 45%
- Overall parity: +2% (52% → 54%)

**Roadmap Placement:**

- **Phase 2 (Weeks 5-8)** - Request System phase
- Can be implemented alongside approval workflow
- Estimated effort: 3-4 weeks (email service, webhooks, templates, preferences, queue system, UI)

**Dependencies:**

- Request approval workflow (Phase 2)
- Failed download handling (Phase 4)
- User management system (Phase 2)

---

### B. Media Server Integration (Plex/Jellyfin/Emby)

**Parity Category:** Unique Feature / Enhancement  
**Current Status:** ❌ Not Implemented (0%)  
**Priority:** Medium-High

**Where it fits:**

- **Request System (25% parity)** - Overseerr feature
  - Check availability in Plex/Jellyfin before allowing requests
  - Auto-refresh library after import
  - Sync watch status
- **Library Management (80% parity)** - Enhancement
  - Trigger library scans on media server
  - Sync metadata changes
  - Notify media server of new content

**Implementation Impact:**

- Would increase **Request System** parity from 25% → 35%
- Would increase **Library Management** parity from 80% → 85%
- Overall parity: +2% (52% → 54%)

**Roadmap Placement:**

- **Phase 2 (Weeks 5-8)** - Request System phase
- Can be implemented after basic request workflow
- Estimated effort: 2-3 weeks (Plex API, Jellyfin API, library refresh, availability checking, watch status sync)

**Dependencies:**

- Request system (Phase 2)
- Library management (already complete)

**Note:** This is a unique feature that enhances the platform beyond basic parity.

---

### C. Statistics & Analytics

**Parity Category:** Analytics/Telemetry (Tautulli)  
**Current Status:** ⚠️ Partially Implemented (25% parity)  
**Priority:** Medium

**Where it fits:**

- **Analytics/Telemetry (25% parity)** - Direct mapping
  - Library growth charts ✅ (partially - basic stats exist)
  - Download history charts ❌
  - Storage usage by category ❌
  - Quality distribution graphs ❌
  - Activity timeline ❌

**Implementation Impact:**

- Would increase **Analytics/Telemetry** parity from 25% → 70%
- Overall parity: +3% (52% → 55%)

**Roadmap Placement:**

- **Phase 5 (Weeks 17-20)** - Analytics & Polish phase
- Estimated effort: 4-5 weeks (data aggregation, chart libraries, historical storage, export, multiple chart types, dashboard UI)

**Dependencies:**

- Library management (already complete)
- Download history (already tracked)
- Activity tracking (already exists)

**Current State:**

- Basic dashboard stats exist
- Activity queue/history exists
- Need to add: charts, graphs, export, historical data

---

### D. System Health Dashboard

**Parity Category:** Analytics/Telemetry (Tautulli) + Infrastructure  
**Current Status:** ⚠️ Partially Implemented (30%)  
**Priority:** Medium

**Where it fits:**

- **Analytics/Telemetry (25% parity)** - System health KPIs
  - Disk space monitoring ❌
  - Service status (download clients, indexers) ⚠️ (basic)
  - CPU/RAM usage ❌
  - Log viewer with search/filter ❌
- **Infrastructure** - Operational monitoring
  - Uptime tracking ⚠️ (basic)
  - Performance metrics ❌
  - Error rate monitoring ❌

**Implementation Impact:**

- Would increase **Analytics/Telemetry** parity from 25% → 50%
- Overall parity: +2% (52% → 54%)

**Roadmap Placement:**

- **Phase 5 (Weeks 17-20)** - Analytics & Polish phase
- Can be done in parallel with Statistics & Analytics
- Estimated effort: 3-4 weeks (metrics collection, real-time monitoring, alert system, log viewer with search, performance tracking)

**Dependencies:**

- System monitoring APIs
- Log aggregation
- Health check endpoints (already exist)

**Current State:**

- Basic health check endpoint exists (`/api/system/health`)
- System info endpoint exists
- Need to add: real-time monitoring, alerts, dashboards

---

### E. Watch Progress & History

**Parity Category:** Unique Feature / Enhancement  
**Current Status:** ❌ Not Implemented (0%)  
**Priority:** Low-Medium

**Where it fits:**

- **Library Management (80% parity)** - Enhancement
  - Track what's been watched
  - Resume from where you left off
  - Watched status sync
- **Analytics/Telemetry (25% parity)** - User activity tracking
  - Per-user watch history
  - Consumption patterns
  - Watch statistics

**Implementation Impact:**

- Would increase **Analytics/Telemetry** parity from 25% → 40%
- Would increase **Library Management** parity from 80% → 85%
- Overall parity: +2% (52% → 54%)

**Roadmap Placement:**

- **Post-Phase 5** - Stretch goal / v1.1 feature
- Estimated effort: 3-4 weeks (watch tracking system, resume functionality, UI for progress, sync with media servers, analytics integration)

**Dependencies:**

- Library management (already complete)
- User management (Phase 2)
- Media server integration (optional, but recommended)

**Note:** This is a unique feature that adds value beyond parity. Could integrate with Plex/Jellyfin for sync.

---

### F. Scheduled Tasks Manager

**Parity Category:** Automation, Calendar & Jobs  
**Current Status:** ⚠️ Partially Implemented (40%)  
**Priority:** Medium

**Where it fits:**

- **Automation (38% parity)** - Task scheduling
  - View/edit all scheduled jobs ✅ (basic)
  - Custom task creation ❌
  - Cron-style scheduling ⚠️ (basic interval-based)
  - Task history and logs ⚠️ (partial)
- **Calendar & Jobs** - Job management
  - Scheduled jobs interface ⚠️ (basic)
  - Job status monitoring ✅
  - Job logging ⚠️ (partial)

**Implementation Impact:**

- Would increase **Automation** parity from 38% → 55%
- Overall parity: +2% (52% → 54%)

**Roadmap Placement:**

- **Phase 1 (Weeks 1-4)** - Core Automation phase
- Can be implemented alongside RSS monitoring
- Estimated effort: 2 weeks (enhanced UI, custom task creation, cron parser, task history/logs, testing)

**Dependencies:**

- Job queue system (already exists)
- Calendar system (already exists)

**Current State:**

- Basic job scheduling exists
- Calendar view exists
- Need to add: custom tasks, advanced scheduling, better UI

---

### G. Backup & Restore

**Parity Category:** Infrastructure / Operational  
**Current Status:** ❌ Not Implemented (0%)  
**Priority:** Medium

**Where it fits:**

- **Infrastructure** - Data protection
  - Export all settings/configuration ❌
  - Database backup ❌
  - Restore from backup ❌
  - Migration tools ❌
- **Not in parity report** - But critical for production use

**Implementation Impact:**

- Does not directly affect platform parity percentages
- Critical for production readiness
- Reduces risk of data loss

**Roadmap Placement:**

- **Phase 5 (Weeks 17-20)** - Analytics & Polish phase
- Or earlier if data loss risk is a concern
- Estimated effort: 2 weeks (database backup, config export/import, restore functionality, migration tools, testing restore scenarios)

**Dependencies:**

- Database system (SQLite/Postgres)
- Configuration storage system (already exists)
- File system access

**Note:** This is operational infrastructure, not a parity feature, but essential for production.

---

## Summary Table

| Feature                         | Parity Category            | Current % | Impact            | Priority    | Phase   | Effort    |
| ------------------------------- | -------------------------- | --------- | ----------------- | ----------- | ------- | --------- |
| **A. Notifications**            | Request System, Automation | 0%        | +2% overall       | High        | Phase 2 | 3-4 weeks |
| **B. Media Server Integration** | Request System, Library    | 0%        | +2% overall       | Medium-High | Phase 2 | 2-3 weeks |
| **C. Statistics & Analytics**   | Analytics/Telemetry        | 25%       | +3% overall       | Medium      | Phase 5 | 4-5 weeks |
| **D. System Health Dashboard**  | Analytics/Telemetry        | 30%       | +2% overall       | Medium      | Phase 5 | 3-4 weeks |
| **E. Watch Progress**           | Library, Analytics         | 0%        | +2% overall       | Low-Medium  | Post-v1 | 3-4 weeks |
| **F. Scheduled Tasks Manager**  | Automation                 | 40%       | +2% overall       | Medium      | Phase 1 | 2 weeks   |
| **G. Backup & Restore**         | Infrastructure             | 0%        | N/A (operational) | Medium      | Phase 5 | 2 weeks   |

---

## Recommended Integration into Roadmap

### Updated Phase 1: Core Automation (Weeks 1-4)

**Add:** Scheduled Tasks Manager (F)

- Enhanced job scheduling UI
- Custom task creation
- Better task history/logs

### Updated Phase 2: Request System (Weeks 5-8)

**Add:** Notifications System (A) and Media Server Integration (B)

- Email/webhook notifications
- Plex/Jellyfin integration
- Request approval notifications

### Updated Phase 5: Analytics & Polish (Weeks 17-20)

**Add:** Statistics & Analytics (C), System Health Dashboard (D), Backup & Restore (G)

- Complete analytics dashboard
- System monitoring
- Data protection

### Post-v1.0 (Future)

**Add:** Watch Progress & History (E)

- User watch tracking
- Resume functionality
- Consumption analytics

---

## Combined Impact

If all suggested features are implemented:

| Metric                  | Current | After All Features | Change |
| ----------------------- | ------- | ------------------ | ------ |
| **Overall Parity**      | 52%     | **60%**            | +8%    |
| **Request System**      | 25%     | **45%**            | +20%   |
| **Automation**          | 38%     | **55%**            | +17%   |
| **Analytics/Telemetry** | 25%     | **70%**            | +45%   |
| **Library Management**  | 80%     | **85%**            | +5%    |

**Total Estimated Effort:** 19-26 weeks (realistic estimate accounting for complexity, testing, and integration)

---

## Priority Recommendation

**High Priority (Do First):**

1. **Notifications System (A)** - Critical for request workflow (3-4 weeks)
2. **Scheduled Tasks Manager (F)** - Enhances automation foundation (2 weeks)
3. **Media Server Integration (B)** - High user value (2-3 weeks)

**Medium Priority (Phase 5):** 4. **Statistics & Analytics (C)** - Completes Tautulli parity (4-5 weeks) 5. **System Health Dashboard (D)** - Operational necessity (3-4 weeks) 6. **Backup & Restore (G)** - Production readiness (2 weeks)

**Low Priority (Post-v1):** 7. **Watch Progress & History (E)** - Nice-to-have, unique feature (3-4 weeks)

---

## Conclusion

The suggested features align well with the parity roadmap and would significantly improve:

- **Request System** (from 25% → 45%)
- **Analytics/Telemetry** (from 25% → 70%)
- **Automation** (from 38% → 55%)

Most can be integrated into existing phases without major disruption. The notifications system and media server integration are particularly valuable as they directly support the request workflow (Phase 2).

---

_Last updated: January 2025_
