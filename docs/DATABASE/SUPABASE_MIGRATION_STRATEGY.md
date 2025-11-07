# Supabase Migration Strategy

**Document Version:** 1.0  
**Last Updated:** 2025-01-31  
**Purpose:** Document the API abstraction layer and migration strategy for reducing vendor lock-in with Supabase.

---

## Overview

ELARO implements a partial API abstraction layer to facilitate potential migration away from Supabase. The app uses a combination of:

1. **API Layer** (Edge Functions) - Abstracted through `VersionedApiClient` and `ApiVersioningService`
2. **Direct Supabase Client** - Still used in many places (needs migration)

This document identifies what's abstracted, what's not, and provides a migration plan.

---

## Current Architecture

### ✅ API Abstraction Layer (Implemented)

**Location:** `src/services/VersionedApiClient.ts`, `src/services/ApiVersioningService.ts`

**What's Abstracted:**
- Course operations (CRUD)
- Assignment operations (CRUD)
- Lecture operations (CRUD)
- Study Session operations (CRUD)
- User profile operations
- Notification operations
- Analytics operations (home, calendar, streak)
- Batch operations

**How It Works:**
- Client app calls `VersionedApiClient` methods
- `VersionedApiClient` uses `ApiVersioningService` to make HTTP requests to Edge Functions
- Edge Functions (`api-v2`) handle business logic and database operations
- App never directly interacts with Supabase client for these operations

**Edge Functions Used:**
- `api-v2/courses/*`
- `api-v2/assignments/*`
- `api-v2/lectures/*`
- `api-v2/study-sessions/*`
- `api-v2/users/*`
- `api-v2/analytics/*`

**Benefits:**
- ✅ Business logic centralized in Edge Functions
- ✅ Version management and deprecation support
- ✅ Consistent error handling
- ✅ Rate limiting and security built-in
- ✅ Easy to swap backend (just change Edge Function implementations)

---

### ❌ Direct Supabase Usage (Needs Migration)

**Location:** Found in 87+ files using `import { supabase } from '@/services/supabase'`

**Current Direct Supabase Usage:**

#### 1. Authentication (`src/services/authService.ts`, `src/contexts/AuthContext.tsx`)
- **Usage:** User sign up, sign in, sign out, password reset
- **Supabase Feature:** `supabase.auth.*`
- **Migration Path:** Create Edge Functions:
  - `auth/signup`
  - `auth/signin`
  - `auth/signout`
  - `auth/reset-password`
  - `auth/verify-email`

#### 2. User Profile (`src/features/auth/services/UserProfileService.ts`)
- **Usage:** Fetch and update user profile
- **Supabase Feature:** Direct database queries to `users` table
- **Migration Path:** Already partially abstracted via `api-v2/users/profile` and `api-v2/users/update`

#### 3. Notifications (`src/services/notifications/*`)
- **Usage:** Notification preferences, delivery tracking, scheduling
- **Supabase Feature:** Direct queries to `notification_preferences`, `notification_deliveries`, `reminders`
- **Migration Path:** Create Edge Functions:
  - `notification-system/preferences`
  - `notification-system/deliveries`
  - `notification-system/schedule`

#### 4. Sync Services (`src/services/syncManager.ts`, `src/services/studySessionSync.ts`, `src/services/settingsSync.ts`)
- **Usage:** Offline sync, data synchronization
- **Supabase Feature:** Direct database mutations
- **Migration Path:** Use batch operations API or create dedicated sync Edge Functions

#### 5. Utilities (`src/utils/*`)
- **Usage:** Various utility functions (reminders, notifications, auth lockout, etc.)
- **Supabase Feature:** Direct database queries
- **Migration Path:** Move logic to Edge Functions or use existing API endpoints

#### 6. Real-time Subscriptions
- **Usage:** Not currently implemented
- **Migration Path:** If needed, use WebSocket connections or polling

---

## Migration Plan

### Phase 1: Complete API Layer for Core Features (Priority: High)

**Goal:** Move all core data operations through API layer

#### Step 1: Authentication API
- [ ] Create `auth/signup` Edge Function
- [ ] Create `auth/signin` Edge Function
- [ ] Create `auth/signout` Edge Function
- [ ] Create `auth/reset-password` Edge Function
- [ ] Update `authService.ts` to use Edge Functions instead of `supabase.auth.*`
- [ ] Update `AuthContext.tsx` to use new auth API

#### Step 2: Notification API
- [ ] Extend `notification-system` Edge Function with:
  - `GET /notification-system/preferences` - Get preferences
  - `PUT /notification-system/preferences` - Update preferences
  - `GET /notification-system/deliveries` - Get delivery history
- [ ] Update `NotificationPreferenceService.ts` to use API
- [ ] Update `NotificationHistoryService.ts` to use API

#### Step 3: Sync API
- [ ] Extend `batch-operations` Edge Function for sync operations
- [ ] Update `syncManager.ts` to use batch API
- [ ] Update `studySessionSync.ts` to use batch API

**Estimated Files to Update:** ~15-20 files

---

### Phase 2: Abstract Utility Functions (Priority: Medium)

**Goal:** Move utility functions to Edge Functions or use existing APIs

- [ ] Review `src/utils/reminderUtils.ts` - Move to Edge Functions if needed
- [ ] Review `src/utils/notificationQueue.ts` - Use notification-system API
- [ ] Review `src/utils/notificationActions.ts` - Use notification-system API
- [ ] Review `src/utils/authLockout.ts` - Move to auth Edge Function
- [ ] Review `src/utils/exampleData.ts` - Can remain direct (dev-only)

**Estimated Files to Update:** ~10-15 files

---

### Phase 3: Database Abstraction (Priority: Low)

**Goal:** Abstract database-specific features

#### Supabase-Specific Features to Abstract:

1. **Row Level Security (RLS)**
   - Current: RLS policies enforced in Supabase
   - Migration: Move authorization logic to Edge Functions
   - Alternative: Use application-level authorization

2. **Database Functions**
   - Current: PostgreSQL functions called via RPC
   - Migration: Move logic to Edge Functions
   - Files: Any code using `.rpc()`

3. **Storage**
   - Current: Supabase Storage buckets
   - Migration: Abstract to generic storage interface
   - Implementation: Create `StorageService` interface

4. **Realtime**
   - Current: Not used
   - Migration: If needed, use WebSocket or polling

---

## Migration Benefits

### After Full Migration:

1. **Vendor Independence**
   - Can swap Supabase for any PostgreSQL database
   - Can use different auth providers
   - Can use different storage providers

2. **Better Testing**
   - Mock API endpoints instead of mocking Supabase
   - Easier integration testing

3. **Improved Security**
   - All database access goes through Edge Functions
   - Centralized authorization logic
   - No direct database credentials in client

4. **Better Monitoring**
   - All operations tracked via Edge Functions
   - Consistent logging and error handling

5. **Easier Scaling**
   - Can add caching layers
   - Can add rate limiting
   - Can add request deduplication

---

## Files Using Direct Supabase (87 files)

### High Priority (Core Features):
1. `src/services/authService.ts` - Authentication
2. `src/contexts/AuthContext.tsx` - Auth context
3. `src/services/notifications/NotificationPreferenceService.ts` - Preferences
4. `src/services/notifications/NotificationHistoryService.ts` - History
5. `src/services/syncManager.ts` - Sync manager
6. `src/services/studySessionSync.ts` - Study session sync
7. `src/services/settingsSync.ts` - Settings sync

### Medium Priority (Utilities):
8. `src/utils/reminderUtils.ts`
9. `src/utils/notificationQueue.ts`
10. `src/utils/notificationActions.ts`
11. `src/utils/authLockout.ts`

### Low Priority (Dev/Admin):
12. `src/utils/exampleData.ts` - Dev-only
13. Various admin screens - Can remain direct

---

## Edge Functions Already Abstracted

These Edge Functions already provide API abstraction:

- ✅ `api-v2/courses/*` - All course operations
- ✅ `api-v2/assignments/*` - All assignment operations
- ✅ `api-v2/lectures/*` - All lecture operations
- ✅ `api-v2/study-sessions/*` - All study session operations
- ✅ `api-v2/users/*` - User profile operations
- ✅ `api-v2/analytics/*` - Analytics operations
- ✅ `batch-operations` - Batch operations
- ✅ `export-user-data` - Data export
- ✅ `soft-delete-account` - Account deletion
- ✅ `restore-account` - Account restoration

---

## Migration Checklist

### Phase 1: Core Features (High Priority)
- [ ] Create auth Edge Functions
- [ ] Migrate `authService.ts` to use Edge Functions
- [ ] Migrate `AuthContext.tsx` to use Edge Functions
- [ ] Extend notification-system Edge Function
- [ ] Migrate notification services to use API
- [ ] Extend batch-operations for sync
- [ ] Migrate sync services to use API

### Phase 2: Utilities (Medium Priority)
- [ ] Review and migrate utility functions
- [ ] Update all direct Supabase queries in utilities

### Phase 3: Database Abstraction (Low Priority)
- [ ] Abstract RLS logic
- [ ] Move database functions to Edge Functions
- [ ] Abstract storage operations
- [ ] Document any remaining Supabase dependencies

---

## Remaining Supabase Dependencies

Even after full migration, some Supabase features will remain:

### Critical (Cannot easily migrate):
1. **Supabase Auth** - Authentication provider
   - **Migration:** Use Auth0, Firebase Auth, or custom auth
   - **Effort:** High (requires full auth migration)

2. **Supabase Database** - PostgreSQL database
   - **Migration:** Use any PostgreSQL database (AWS RDS, Google Cloud SQL, etc.)
   - **Effort:** Medium (database migration)

3. **Supabase Storage** - File storage
   - **Migration:** Use AWS S3, Google Cloud Storage, etc.
   - **Effort:** Low (storage abstraction)

### Non-Critical (Can remain):
1. **Supabase Edge Functions** - Serverless functions
   - **Migration:** Use AWS Lambda, Google Cloud Functions, etc.
   - **Effort:** Medium (function migration)

---

## Recommended Migration Order

1. **Phase 1** (Core Features) - Complete first
   - Provides immediate benefits (better security, monitoring)
   - Reduces direct database access significantly

2. **Phase 2** (Utilities) - Complete second
   - Cleans up remaining direct Supabase usage
   - Improves code consistency

3. **Phase 3** (Database Abstraction) - Complete last
   - Only if planning to migrate away from Supabase
   - Can be done incrementally

---

## Testing Strategy

### During Migration:
1. **Feature Flags** - Use feature flags to switch between direct Supabase and API
2. **Parallel Testing** - Run both implementations and compare results
3. **Gradual Rollout** - Migrate one feature at a time
4. **Monitoring** - Track API usage and errors

### After Migration:
1. **Integration Tests** - Test all API endpoints
2. **Performance Tests** - Ensure no performance regression
3. **Load Tests** - Test Edge Function capacity

---

## Current Status Summary

| Category | Abstracted | Direct Usage | Migration Priority |
|----------|-----------|--------------|-------------------|
| **Core Data (Courses, Assignments, etc.)** | ✅ Yes | ❌ No | ✅ Complete |
| **Authentication** | ❌ No | ✅ Yes | 🔴 High |
| **Notifications** | ⚠️ Partial | ✅ Yes | 🔴 High |
| **Sync Services** | ⚠️ Partial | ✅ Yes | 🟡 Medium |
| **Utilities** | ❌ No | ✅ Yes | 🟡 Medium |
| **Storage** | ❌ No | ✅ Yes | 🟢 Low |

**Overall Migration Progress:** ~40% complete

---

## Next Steps

1. **Immediate:** Complete Phase 1 (Core Features) migration
2. **Short-term:** Complete Phase 2 (Utilities) migration
3. **Long-term:** Evaluate if Phase 3 (Database Abstraction) is needed

---

## Notes

- The Edge Functions abstraction is sufficient for most migration scenarios
- If migrating away from Supabase entirely, you'll need to:
  1. Replicate Edge Functions in new platform (AWS Lambda, etc.)
  2. Migrate database to new PostgreSQL instance
  3. Migrate auth to new provider
  4. Migrate storage to new provider

- The current API layer makes Steps 1-2 much easier (just change Edge Function implementations)

---

**Document Maintainer:** Development Team  
**Review Schedule:** Quarterly  
**Last Review Date:** 2025-01-31

