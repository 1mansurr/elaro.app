# API Layer Migration - Final 5% Completion Plan

**Document Version:** 1.0  
**Last Updated:** 2025-01-31  
**Status:** 🚧 **IN PROGRESS**  
**Current:** 95% → **Target:** 100%

---

## Overview

This document outlines the plan to complete the final 5% of the API layer migration, moving from 95% to 100% abstraction.

**Remaining Work:**
- ~19 files with direct Supabase usage
- Mostly feature-specific services and utilities
- Estimated: 8-12 days of work

---

## Phase 8: High-Priority Fixes (IN PROGRESS)

### ✅ 8.1: Fix Already-Migrated Files
**Status:** COMPLETE

- ✅ `src/features/auth/screens/ResetPasswordScreen.tsx` - Migrated to use `versionedApiClient.getSession()`
- ✅ `src/services/api/mutations/notificationPreferences.ts` - Migrated to use `versionedApiClient.updateNotificationPreferences()`
- ✅ `src/utils/notificationActions.ts` - Added migration note (analytics operations acceptable)

### ✅ 8.2: Migrate Legacy Service Methods
**Status:** COMPLETE

- ✅ `src/services/supabase.ts`:
  - ✅ Removed `createUserProfile` (handled by database trigger)
  - ✅ Migrated `getUserProfile` to use `versionedApiClient.getUserProfile()`
  - ✅ Migrated `updateUserProfile` to use `versionedApiClient.updateUserProfile()`
  - ✅ Updated `deleteUserAccount` to throw error (should use admin-system)
- ✅ `src/contexts/AuthContext.tsx` - Updated to wait for trigger instead of calling createUserProfile

### ✅ 8.3: Migrate Query Services
**Status:** COMPLETE

- ✅ `src/features/courses/services/queries.ts` - Migrated `coursesApi.getAll()` to use `versionedApiClient.getCourses()` with client-side filtering

### ⚠️ 8.4: Review Duplicate Services
**Status:** DOCUMENTED

- ⚠️ `src/features/auth/services/authService.ts` - Marked as duplicate/legacy, needs review

---

## Phase 9: Feature-Specific Services (TODO)

### 9.1: Task Services
**Files:**
- `src/features/tasks/services/RecurringTaskService.ts`
- `src/features/tasks/services/TaskDependencyService.ts`
- `src/features/tasks/services/AdvancedTemplateService.ts`

**Required API Endpoints:**
1. **Recurring Tasks API** (`/api-v2/recurring-tasks/*`):
   - `POST /api-v2/recurring-tasks/patterns` - Create recurring pattern
   - `GET /api-v2/recurring-tasks/patterns` - List patterns
   - `POST /api-v2/recurring-tasks` - Create recurring task
   - `GET /api-v2/recurring-tasks` - List recurring tasks
   - `PUT /api-v2/recurring-tasks/:id` - Update recurring task
   - `DELETE /api-v2/recurring-tasks/:id` - Delete recurring task
   - `POST /api-v2/recurring-tasks/:id/generate` - Generate tasks from pattern

2. **Task Dependencies API** (`/api-v2/task-dependencies/*`):
   - `POST /api-v2/task-dependencies` - Create dependency
   - `GET /api-v2/task-dependencies/:taskId` - Get dependencies for task
   - `DELETE /api-v2/task-dependencies/:id` - Remove dependency
   - `POST /api-v2/task-dependencies/validate` - Validate dependency graph

3. **Advanced Templates API** (`/api-v2/templates/*`):
   - `POST /api-v2/templates` - Create template
   - `GET /api-v2/templates` - List templates
   - `GET /api-v2/templates/:id` - Get template
   - `PUT /api-v2/templates/:id` - Update template
   - `DELETE /api-v2/templates/:id` - Delete template
   - `POST /api-v2/templates/:id/use` - Create task from template
   - `POST /api-v2/templates/:id/share` - Share template
   - `GET /api-v2/templates/public` - Get public templates

**Estimated Time:** 3-5 days

---

### 9.2: SRS Services
**Files:**
- `src/features/srs/services/SRSSchedulingService.ts`

**Required API Endpoints:**
1. **SRS Configuration API** (`/api-v2/srs/*`):
   - `GET /api-v2/srs/configuration` - Get SRS configuration
   - `PUT /api-v2/srs/configuration` - Update SRS configuration
   - `GET /api-v2/srs/preferences` - Get SRS user preferences
   - `PUT /api-v2/srs/preferences` - Update SRS preferences
   - `POST /api-v2/srs/schedule` - Schedule SRS reminders
   - `GET /api-v2/srs/performance` - Get SRS performance metrics

**Estimated Time:** 2-3 days

---

## Phase 10: Utility Migrations (TODO)

### 10.1: Auth Lockout Utility
**File:** `src/utils/authLockout.ts`

**Required API Endpoints:**
1. **Auth Lockout API** (`/auth/*`):
   - `GET /auth/check-lockout?email=...` - Check if account is locked
   - `POST /auth/record-failed-attempt` - Record failed login attempt
   - `POST /auth/reset-attempts` - Reset failed attempts
   - `POST /auth/record-successful-login` - Record successful login

**Estimated Time:** 1-2 days

---

### 10.2: Notification Analytics RPC
**File:** `src/utils/notificationQueue.ts` (getNotificationAnalytics function)

**Required API Endpoint:**
1. **Notification Analytics API**:
   - `GET /notification-system/analytics` - Get notification engagement analytics

**Estimated Time:** 1 day

---

### 10.3: Cache Monitoring
**File:** `src/services/cacheMonitoring.ts`

**Status:** Acceptable as-is (monitoring utility using RPC)
- Uses RPC functions for cache metrics
- Can be migrated later if needed

---

## Phase 11: Final Cleanup (TODO)

### 11.1: Remove Legacy Code
- [ ] Remove duplicate `src/features/auth/services/authService.ts` if unused
- [ ] Clean up unused imports
- [ ] Remove deprecated methods

### 11.2: Documentation Updates
- [ ] Update `API_LAYER_MIGRATION_COMPLETE.md` to reflect 100% completion
- [ ] Update `API_REFERENCE.md` with new endpoints
- [ ] Delete this plan document

---

## Acceptable Exceptions (Keep As-Is)

These files should remain with direct Supabase usage:

1. **`src/utils/getFreshAccessToken.ts`**
   - **Reason:** Core auth token management utility required for API authentication
   - **Status:** ✅ Acceptable - Cannot be abstracted further

2. **`src/services/ApiVersioningService.ts`**
   - **Reason:** Required for API token retrieval
   - **Status:** ✅ Acceptable - Required for API layer

3. **`src/services/serviceHealthCheck.ts`**
   - **Reason:** Simple health check utility
   - **Status:** ✅ Acceptable - Monitoring utility

4. **`src/utils/exampleData.ts`**
   - **Reason:** Development-only utility
   - **Status:** ✅ Acceptable - Dev-only, not in production

5. **`src/services/authSync.ts`**
   - **Reason:** Low-level session synchronization (minimal Supabase auth calls)
   - **Status:** ✅ Acceptable - Core session management

6. **`src/services/cacheMonitoring.ts`**
   - **Reason:** Monitoring utility using RPC functions
   - **Status:** ✅ Acceptable - Can be migrated later if needed

7. **`src/utils/notificationActions.ts`**
   - **Reason:** Analytics tracking operations (performance-critical)
   - **Status:** ✅ Acceptable - Can be migrated later if needed

8. **`src/services/authService.ts` (MFA operations)**
   - **Reason:** MFA is Supabase-specific feature
   - **Status:** ✅ Acceptable - MFA operations can remain direct

---

## Migration Priority

### High Priority (Must Complete)
1. ✅ Phase 8.1-8.3 (High-priority fixes) - **COMPLETE**
2. ⚠️ Phase 8.4 (Review duplicates) - **IN PROGRESS**

### Medium Priority (Should Complete)
3. Phase 9.1 (Task services) - **TODO**
4. Phase 9.2 (SRS services) - **TODO**

### Low Priority (Can Complete Later)
5. Phase 10.1 (Auth lockout) - **TODO**
6. Phase 10.2 (Notification analytics) - **TODO**

### Optional
7. Phase 11 (Final cleanup) - **TODO**

---

## Success Criteria

### Code Metrics
- [ ] 0 direct `supabase.from()` calls (except acceptable exceptions)
- [ ] 0 direct `supabase.auth.*` calls (except acceptable exceptions)
- [ ] 100% data operations through API layer (except acceptable exceptions)
- [ ] All Edge Functions tested

### Documentation
- [ ] All API endpoints documented
- [ ] Migration completion report updated
- [ ] API reference updated
- [ ] Remaining exceptions documented

---

## Estimated Timeline

- **Phase 8:** ✅ COMPLETE (2 days)
- **Phase 9:** 5-8 days (feature services)
- **Phase 10:** 2-3 days (utilities)
- **Phase 11:** 1 day (cleanup)

**Total Remaining:** 8-12 days

---

## Notes

- Feature services (Phase 9) are complex and require careful API design
- Some utilities can remain as direct calls for performance (analytics, monitoring)
- MFA operations are Supabase-specific and acceptable as direct calls
- Focus on completing Phase 9 for maximum impact

---

**Last Updated:** 2025-01-31

