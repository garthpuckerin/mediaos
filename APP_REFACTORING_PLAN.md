# App.tsx Refactoring Plan

## Current State

**File**: `packages/web/src/ui/App.tsx`
**Size**: 3,761 lines
**Issues**:
- Monolithic structure makes maintenance difficult
- All components defined in single file
- Hard to test individual components
- Poor code organization

## Component Analysis

### Components to Extract (15 total)

#### 1. Utility Functions (100 lines)
- `parseHash()` → `src/utils/routing.ts`
- `pushToast()` → `src/utils/toast.ts`
- `manageArtwork()` → `src/utils/artwork.ts`

#### 2. Settings Components (600 lines)
- `IndexersSettings` (123 lines) → `src/pages/settings/IndexersSettings.tsx`
- `QualitySettings` (106 lines) → `src/pages/settings/QualitySettings.tsx`
- `VerifySettings` (149 lines) → `src/pages/settings/VerifySettings.tsx`

#### 3. Activity Components (500 lines)
- `ActivityQueue` (269 lines) → `src/pages/activity/ActivityQueue.tsx`
- `ActivityHistory` (134 lines) → `src/pages/activity/ActivityHistory.tsx`
- `WantedPage` (167 lines) → `src/pages/activity/WantedPage.tsx`

#### 4. Library Components (1,700 lines)
- `LibraryList` (526 lines) → `src/pages/library/LibraryList.tsx`
- `LibraryItemDetail` (996 lines) → `src/pages/library/LibraryItemDetail.tsx`
- `LibraryAdd` (20 lines) → `src/pages/library/LibraryAdd.tsx`
- `LibraryImportSection` (23 lines) → `src/pages/library/LibraryImportSection.tsx`
- `FileBrowser` (152 lines) → `src/pages/library/FileBrowser.tsx`

#### 5. Calendar Component (131 lines)
- `CalendarPage` → `src/pages/CalendarPage.tsx`

#### 6. Main App (800 lines remaining)
- Navigation logic
- Route handling
- State management
- Component composition

## Proposed Directory Structure

```
packages/web/src/
├── api/
│   └── client.ts ✅ (Created)
├── components/
│   ├── LoginForm.tsx ✅ (Created)
│   ├── ProtectedRoute.tsx ✅ (Created)
│   └── UserMenu.tsx ✅ (Created)
├── contexts/
│   └── AuthContext.tsx ✅ (Created)
├── pages/
│   ├── activity/
│   │   ├── ActivityQueue.tsx
│   │   ├── ActivityHistory.tsx
│   │   └── WantedPage.tsx
│   ├── library/
│   │   ├── LibraryList.tsx
│   │   ├── LibraryItemDetail.tsx
│   │   ├── LibraryAdd.tsx
│   │   ├── LibraryImportSection.tsx
│   │   └── FileBrowser.tsx
│   ├── settings/
│   │   ├── IndexersSettings.tsx
│   │   ├── QualitySettings.tsx
│   │   └── VerifySettings.tsx
│   └── CalendarPage.tsx
├── ui/
│   ├── App.tsx (refactored to ~800 lines)
│   └── ArtworkModal.tsx
├── utils/
│   ├── routing.ts
│   ├── toast.ts
│   └── artwork.ts
├── types/
│   └── index.ts (shared types)
├── AppWrapper.tsx ✅ (Created)
└── main.tsx ✅ (Updated)
```

## Refactoring Strategy

### Phase 1: Extract Utilities ✅ (Partially Complete)
1. Create `src/utils/routing.ts` with `parseHash()`
2. Create `src/utils/toast.ts` with `pushToast()` and types
3. Create `src/utils/artwork.ts` with `manageArtwork()`

### Phase 2: Extract Settings Pages
1. Create `src/pages/settings/` directory
2. Extract `IndexersSettings`, `QualitySettings`, `VerifySettings`
3. Share common types via `src/types/index.ts`

### Phase 3: Extract Activity Pages
1. Create `src/pages/activity/` directory
2. Extract `ActivityQueue`, `ActivityHistory`, `WantedPage`
3. Create shared hooks for activity data fetching

### Phase 4: Extract Library Pages
1. Create `src/pages/library/` directory
2. Extract all library-related components
3. Create shared hooks for library operations
4. Extract common library types

### Phase 5: Extract Calendar
1. Create `src/pages/CalendarPage.tsx`
2. Minimal dependencies, straightforward extraction

### Phase 6: Refactor Main App
1. Update imports to use extracted components
2. Simplify routing logic
3. Remove duplicated styles (consolidate to CSS modules or styled-components)
4. Clean up props passing

## Shared Types to Create

```typescript
// src/types/index.ts

export type KindKey = 'series' | 'movies' | 'books' | 'music';
export type TopKey = 'library' | 'calendar' | 'activity' | 'settings' | 'system';

export interface Route {
  top: TopKey;
  kind?: KindKey;
  page?: string;
  id?: string;
}

export interface LibraryItem {
  id: string;
  kind: 'movie' | 'series' | 'music' | 'book';
  title: string;
  posterUrl?: string;
  backgroundUrl?: string;
}

export interface DownloaderSettings {
  qbittorrent: {
    enabled: boolean;
    baseUrl: string;
    username: string;
    timeoutMs: number;
    hasPassword: boolean;
    category?: string;
  };
  nzbget: {
    enabled: boolean;
    baseUrl: string;
    username: string;
    timeoutMs: number;
    hasPassword: boolean;
  };
  sabnzbd: {
    enabled: boolean;
    baseUrl: string;
    timeoutMs: number;
    hasApiKey: boolean;
    category?: string;
  };
}

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}
```

## Benefits of Refactoring

1. **Maintainability**: Each component in its own file
2. **Testability**: Can test components in isolation
3. **Reusability**: Components can be reused across the app
4. **Performance**: Easier to implement code splitting
5. **Developer Experience**: Easier to find and modify code
6. **Collaboration**: Multiple developers can work on different components
7. **Bundle Size**: Can implement lazy loading per page

## Testing Strategy

After each extraction:
1. Verify build still passes
2. Test component functionality in browser
3. Ensure no regressions in existing features
4. Add unit tests for extracted components

## Estimated Effort

- **Phase 1** (Utilities): 30 minutes
- **Phase 2** (Settings): 1 hour
- **Phase 3** (Activity): 1 hour
- **Phase 4** (Library): 2-3 hours (largest components)
- **Phase 5** (Calendar): 20 minutes
- **Phase 6** (Refactor Main): 1 hour
- **Testing**: 1 hour

**Total**: ~7-8 hours

## Notes

- Maintain backward compatibility throughout
- Extract shared styles to a common location
- Consider using CSS modules or styled-components for better style encapsulation
- Add prop-types or TypeScript interfaces for better type safety
- Document each component with JSDoc comments
- Consider adding Storybook for component development

## Current Progress

✅ Authentication system added (AuthContext, LoginForm, ProtectedRoute, UserMenu)
✅ API client created with auth integration
✅ App wrapped with authentication
⏳ Component extraction pending (this plan)
