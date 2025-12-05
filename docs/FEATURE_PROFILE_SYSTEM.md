# Feature Specification: Profile System

**Status:** Planned (Sprint 8)  
**Priority:** High  
**Dependencies:** Library System, Indexer Integration

## Overview

The Profile System enables granular control over download preferences, allowing users to create named profiles for different content categories (Kids, Anime, 4K, Foreign Films, etc.) and assign them to specific media items.

## Problem Statement

Current implementation only supports one quality setting per media type (series, movies, etc.). Users need:

- Different quality preferences for different shows (e.g., kids shows in 720p, primetime in 1080p)
- Language-specific profiles (e.g., anime with dual-audio, foreign films with original audio)
- Release filtering (e.g., prefer BluRay releases, exclude CAM/TS)

## Solution Architecture

### Database Schema

```sql
-- Quality Profiles Table (extends existing)
CREATE TABLE quality_profiles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Quality Settings
  qualities TEXT NOT NULL,           -- JSON: ordered list of allowed qualities
  cutoff_quality TEXT,               -- Stop upgrading when reached
  upgrade_allowed BOOLEAN DEFAULT 1,
  min_size_mb INTEGER,
  max_size_mb INTEGER,

  -- Language Settings
  audio_languages TEXT,              -- JSON: preferred audio languages
  subtitle_languages TEXT,           -- JSON: required subtitle languages
  prefer_dual_audio BOOLEAN DEFAULT 0,
  include_original_language BOOLEAN DEFAULT 1,

  -- Release Filtering
  must_contain TEXT,                 -- JSON: required keywords
  must_not_contain TEXT,             -- JSON: excluded keywords
  preferred_terms TEXT,              -- JSON: boost matching releases
  indexer_ids TEXT,                  -- JSON: limit to specific indexers

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default profile assignment per media type
CREATE TABLE profile_defaults (
  kind TEXT PRIMARY KEY CHECK(kind IN ('movie', 'series', 'music', 'book')),
  quality_profile_id TEXT REFERENCES quality_profiles(id),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Per-item profile override
ALTER TABLE library_items ADD COLUMN quality_profile_id TEXT REFERENCES quality_profiles(id);
```

### API Endpoints

```
GET    /api/profiles                    -- List all profiles
POST   /api/profiles                    -- Create profile
GET    /api/profiles/:id                -- Get profile details
PUT    /api/profiles/:id                -- Update profile
DELETE /api/profiles/:id                -- Delete profile
POST   /api/profiles/:id/test           -- Test profile against sample releases

GET    /api/profiles/defaults           -- Get default profiles per kind
PUT    /api/profiles/defaults           -- Set default profiles

PUT    /api/library/:id/profile         -- Assign profile to item
DELETE /api/library/:id/profile         -- Remove profile override (use default)
```

### Profile Resolution Logic

```typescript
function getEffectiveProfile(item: LibraryItem): QualityProfile {
  // 1. Check item-specific override
  if (item.qualityProfileId) {
    return getProfile(item.qualityProfileId);
  }

  // 2. Fall back to default for media type
  const defaultProfile = getDefaultProfile(item.kind);
  if (defaultProfile) {
    return defaultProfile;
  }

  // 3. Fall back to system default (Any quality)
  return getSystemDefaultProfile();
}
```

### Release Scoring Algorithm

```typescript
function scoreRelease(release: Release, profile: QualityProfile): number {
  let score = 0;

  // Quality score (0-100)
  const qualityIndex = profile.qualities.indexOf(release.quality);
  if (qualityIndex === -1) return -1; // Not allowed
  score += (profile.qualities.length - qualityIndex) * 10;

  // Preferred terms boost (+5 each)
  for (const term of profile.preferredTerms) {
    if (release.title.toLowerCase().includes(term.toLowerCase())) {
      score += 5;
    }
  }

  // Must contain check
  for (const term of profile.mustContain) {
    if (!release.title.toLowerCase().includes(term.toLowerCase())) {
      return -1; // Required term missing
    }
  }

  // Must not contain check
  for (const term of profile.mustNotContain) {
    if (release.title.toLowerCase().includes(term.toLowerCase())) {
      return -1; // Excluded term found
    }
  }

  // Size constraints
  if (profile.minSizeMb && release.sizeMb < profile.minSizeMb) return -1;
  if (profile.maxSizeMb && release.sizeMb > profile.maxSizeMb) return -1;

  return score;
}
```

## UI Components

### Profile Manager Page (`/settings/profiles`)

```
┌─────────────────────────────────────────────────────────────┐
│ Quality Profiles                              [+ New Profile]│
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Kids 720p       │ │ Anime Dual-Audio│ │ 4K HDR Movies   │ │
│ │ ───────────     │ │ ───────────     │ │ ───────────     │ │
│ │ 480p, 720p      │ │ 720p, 1080p     │ │ 1080p, 2160p    │ │
│ │ Cutoff: 720p    │ │ Cutoff: 1080p   │ │ Cutoff: 2160p   │ │
│ │ English only    │ │ JP + EN audio   │ │ HDR required    │ │
│ │ [Edit] [Delete] │ │ [Edit] [Delete] │ │ [Edit] [Delete] │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Default Profiles                                             │
│ ┌──────────┬───────────────────────────────────────────────┐│
│ │ Series   │ [Dropdown: Select profile...              ▼] ││
│ │ Movies   │ [Dropdown: 4K HDR Movies                  ▼] ││
│ │ Music    │ [Dropdown: FLAC Preferred                 ▼] ││
│ │ Books    │ [Dropdown: EPUB Only                      ▼] ││
│ └──────────┴───────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Profile Editor Modal

```
┌─────────────────────────────────────────────────────────────┐
│ Edit Profile: Anime Dual-Audio                          [X] │
├─────────────────────────────────────────────────────────────┤
│ Name: [Anime Dual-Audio                               ]     │
│ Description: [For anime series with Japanese + English]     │
│                                                             │
│ ─── Quality ───────────────────────────────────────────     │
│ Drag to reorder (higher = preferred):                       │
│   ┌─────────────────────────────────────────────────┐       │
│   │ ≡ 1080p BluRay                              [x] │       │
│   │ ≡ 1080p WEB-DL                              [x] │       │
│   │ ≡ 720p BluRay                               [x] │       │
│   │ ≡ 720p WEB-DL                               [x] │       │
│   │ ≡ 480p                                      [ ] │       │
│   └─────────────────────────────────────────────────┘       │
│ Cutoff: [1080p BluRay               ▼]                      │
│ Size: Min [    ] MB  Max [8000] MB                          │
│                                                             │
│ ─── Languages ─────────────────────────────────────────     │
│ Audio: [x] Japanese [x] English [ ] Spanish [ ] French      │
│ Subtitles: [x] English [ ] Japanese [ ] Spanish             │
│ [x] Prefer dual-audio releases                              │
│                                                             │
│ ─── Release Filters ───────────────────────────────────     │
│ Must contain: [dual-audio, dual audio                  ]    │
│ Must NOT contain: [CAM, TS, HDTS, HC                   ]    │
│ Preferred: [BluRay, REMUX, x265                        ]    │
│                                                             │
│                              [Cancel]  [Save Profile]       │
└─────────────────────────────────────────────────────────────┘
```

### Item Detail Profile Assignment

In LibraryItemDetail, add profile selector:

```
┌─────────────────────────────────────────────────────────────┐
│ Quality Profile                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [x] Use default (Anime Dual-Audio)                      │ │
│ │ [ ] Override: [Dropdown: Select profile...          ▼]  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Example Profiles

### Kids 720p

```json
{
  "name": "Kids 720p",
  "description": "For children's content - smaller file sizes",
  "qualities": ["720p", "480p"],
  "cutoffQuality": "720p",
  "maxSizeMb": 2000,
  "audioLanguages": ["en"],
  "mustNotContain": ["UNRATED", "EXTENDED"]
}
```

### Anime Dual-Audio

```json
{
  "name": "Anime Dual-Audio",
  "description": "Anime with Japanese and English audio",
  "qualities": ["1080p BluRay", "1080p WEB-DL", "720p BluRay"],
  "cutoffQuality": "1080p BluRay",
  "audioLanguages": ["ja", "en"],
  "preferDualAudio": true,
  "mustContain": ["dual-audio"],
  "preferredTerms": ["BluRay", "FLAC", "x265"]
}
```

### 4K HDR Movies

```json
{
  "name": "4K HDR Movies",
  "description": "Premium quality for big screen viewing",
  "qualities": ["2160p REMUX", "2160p BluRay", "2160p WEB-DL", "1080p REMUX"],
  "cutoffQuality": "2160p BluRay",
  "minSizeMb": 5000,
  "mustContain": ["HDR", "DV"],
  "preferredTerms": ["REMUX", "Atmos", "TrueHD"]
}
```

## Migration Path

1. Create new `quality_profiles` table
2. Migrate existing `quality.json` settings to default profiles
3. Add `quality_profile_id` column to `library_items`
4. Update search/download logic to use profile resolution
5. Build profile management UI

## Success Metrics

- Users can create at least 5 named profiles
- Profile assignment works for individual items
- Search results are correctly filtered by profile
- Upgrade logic respects cutoff settings
- UI provides clear feedback on profile in use

## Future Enhancements (AI-002)

- Auto-suggest profile based on content analysis
- Learn user preferences from manual selections
- Recommend profile adjustments based on success rates
- Detect and suggest new profile categories
