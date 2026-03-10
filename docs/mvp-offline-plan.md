# ELARO → Offline-First MVP: Execution Plan

> Branch: `mvp-offline` | Based on: `docs/analysis.md`
> Rule: App must compile after every phase. Commit after each checkpoint.

---

## Table of Contents

1. [Phase 1 — External Analytics & Monitoring](#phase-1--external-analytics--monitoring) — **Quick**
2. [Phase 2 — Standalone Feature Folders](#phase-2--standalone-feature-folders) — **Quick**
3. [Phase 3 — Contexts with No Surviving Dependents](#phase-3--contexts-with-no-surviving-dependents) — **Quick**
4. [Phase 4 — Onboarding & User Profile Screens](#phase-4--onboarding--user-profile-screens) — **Quick**
5. [Phase 5 — Auth Services, Permissions & Shared Components](#phase-5--auth-services-permissions--shared-components) — **Medium**
6. [Phase 6 — Auth Screens & Navigator Rewrite](#phase-6--auth-screens--navigator-rewrite) — **Medium**
7. [Phase 7 — Install SQLite & Build Local Data Layer](#phase-7--install-sqlite--build-local-data-layer) — **Heavy**
8. [Phase 8 — Rewrite Feature Services to SQLite](#phase-8--rewrite-feature-services-to-sqlite) — **Heavy**
9. [Phase 9 — Replace AuthContext](#phase-9--replace-authcontext) — **Medium**
10. [Phase 10 — Remove Supabase Core](#phase-10--remove-supabase-core) — **Medium**
11. [Phase 11 — Package Cleanup](#phase-11--package-cleanup) — **Medium**
12. [Phase 12 — Final Navigation Cleanup](#phase-12--final-navigation-cleanup) — **Quick**

---

## Phase 1 — External Analytics & Monitoring

**Effort: Quick (under 30 min)**

These are leaf nodes — nothing in the app imports from them except `App.tsx` initialization calls. Deleting them first prevents cascading type errors in later phases.

### Steps

**1.1 Delete analytics services**

```bash
rm src/services/analytics.ts
rm src/services/mixpanel.ts
rm src/services/analyticsEvents.ts
```

**1.2 Delete error tracking**

```bash
# Check for alternate path first:
grep -r "errorTracking\|sentry" src/services/ --include="*.ts" -l
rm src/services/errorTracking.ts
# If a monitoring/sentry.ts exists:
rm -rf src/services/monitoring/
```

**1.3 Delete RevenueCat service**

```bash
rm src/services/revenueCat.ts
```

**1.4 Delete monitoring/performance services**

```bash
rm src/services/healthCheckService.ts
rm src/services/networkMonitoring.ts
rm src/services/cacheMonitoring.ts
rm src/services/bundleSizeTracking.ts
rm src/services/PerformanceMonitoringService.ts
```

**1.5 Remove initialization calls from `App.tsx`**

Open `App.tsx` and:
- Remove `import` statements for: `revenueCat`, `analytics`/`mixpanel`, `errorTracking`/`Sentry`
- Remove the `initialize()` / `init()` call for each of those three services
- Remove any `try/catch` blocks wrapping those calls if they become empty

**1.6 Verify `App.tsx` still imports cleanly**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Fix any "Cannot find module" errors from removed imports before continuing.

---

### Checkpoint 1

**Verify:** `npx tsc --noEmit` passes (or errors are only in files not yet touched).

**Commit:**
```
chore(mvp): phase 1 — delete analytics, monitoring, and RevenueCat services
```

---

## Phase 2 — Standalone Feature Folders

**Effort: Quick (under 30 min)**

These feature folders have no other features importing from them. Delete the folder, then remove the screen registrations from the navigator.

### ⚠️ VERIFY FIRST

**Check `src/features/dev/` before deleting:**

```bash
grep -r "NotificationTestScreen\|features/dev" src/ --include="*.tsx" --include="*.ts" -l
```

If this screen is referenced in a dev/debug menu you want to keep, do NOT delete `src/features/dev/`. Skip step 2.2 and leave it gated behind a dev menu. If it is only referenced in the navigator and you don't need it, delete it.

---

### Steps

**2.1 Delete `src/features/admin/`**

```bash
rm -rf src/features/admin/
```

**2.2 (Conditional) Delete `src/features/dev/`**

Only if verified above that notification testing is not needed:

```bash
rm -rf src/features/dev/
```

**2.3 Delete `src/features/support/` and its utility**

```bash
rm -rf src/features/support/
rm src/shared/utils/getSecureChatLink.ts
```

**2.4 Delete `src/features/system-health/`**

```bash
rm -rf src/features/system-health/
```

**2.5 Delete `src/features/data-management/`**

```bash
rm -rf src/features/data-management/
```

**2.6 Delete `src/features/subscription/`**

```bash
rm -rf src/features/subscription/
```

Then open `src/navigation/AuthenticatedNavigator.tsx` and remove:
- The `import` for `PaywallScreen`
- The `import` for `OddityWelcomeScreen`
- The `<Stack.Screen>` registrations for both screens

**2.7 Delete `src/features/settings/AnalyticsToggle.tsx`**

```bash
rm src/features/settings/AnalyticsToggle.tsx
```

Then grep for any imports of this file:

```bash
grep -r "AnalyticsToggle" src/ --include="*.tsx" --include="*.ts" -l
```

Remove those imports and usages.

---

### Checkpoint 2

**Verify:**
1. `npx tsc --noEmit` — no errors from deleted folders
2. `grep -r "from.*features/admin\|from.*features/support\|from.*features/subscription\|from.*features/system-health\|from.*features/data-management" src/ --include="*.ts" --include="*.tsx"` — should return nothing

**Commit:**
```
chore(mvp): phase 2 — delete standalone feature folders (admin, support, subscription, system-health, data-management)
```

---

## Phase 3 — Contexts with No Surviving Dependents

**Effort: Quick (under 30 min)**

Three contexts that serve only auth/subscription functionality can be removed cleanly now that the feature folders importing them are gone.

### Steps

**3.1 Delete `UsageLimitPaywallContext.tsx`**

```bash
rm src/contexts/UsageLimitPaywallContext.tsx
```

Then open `src/contexts/AppProviders.tsx` (or wherever contexts are composed) and:
- Remove the import
- Remove the `<UsageLimitPaywallContext.Provider>` wrapper

**3.2 Delete `SoftLaunchContext.tsx`**

```bash
rm src/contexts/SoftLaunchContext.tsx
```

Remove from `AppProviders.tsx`:
- Import
- Provider wrapper

**3.3 Delete `OnboardingContext.tsx`**

```bash
rm src/contexts/OnboardingContext.tsx
```

Remove from `AppProviders.tsx`:
- Import
- Provider wrapper

**3.4 Stub out `NetworkContext.tsx`**

Do NOT delete this file — components across the app call `useNetwork()`. Instead, replace its implementation so it always returns `{ isConnected: true, isInternetReachable: true }` without importing `@react-native-community/netinfo`:

Open `src/contexts/NetworkContext.tsx` and replace the body with:

```typescript
// MVP stub: app is always treated as connected (offline-first)
import React, { createContext, useContext } from 'react';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
}

const NetworkContext = createContext<NetworkState>({
  isConnected: true,
  isInternetReachable: true,
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NetworkContext.Provider value={{ isConnected: true, isInternetReachable: true }}>
    {children}
  </NetworkContext.Provider>
);

export const useNetwork = () => useContext(NetworkContext);
```

This lets Phase 11 uninstall `@react-native-community/netinfo` without hunting down every `useNetwork()` call site.

---

### Checkpoint 3

**Verify:**
1. `npx tsc --noEmit` — no errors
2. `grep -r "UsageLimitPaywall\|SoftLaunch\|OnboardingContext" src/ --include="*.ts" --include="*.tsx"` — only the deleted file paths, no living imports

**Commit:**
```
chore(mvp): phase 3 — remove paywall/softlaunch/onboarding contexts, stub NetworkContext
```

---

## Phase 4 — Onboarding & User Profile Screens

**Effort: Quick (under 30 min)**

Screens that are gated behind auth or deal with account/subscription management. The remaining `user-profile` screens (notifications settings, theme) are kept.

### Steps

**4.1 Delete the entire onboarding feature**

```bash
rm -rf src/features/onboarding/
```

Then open the navigator that mounts `OnboardingNavigator` and remove:
- The import for `OnboardingNavigator`
- The `<Stack.Screen>` for the onboarding stack

```bash
grep -r "OnboardingNavigator\|onboarding" src/navigation/ --include="*.tsx" -l
```

**4.2 Delete auth-only user-profile screens**

```bash
rm src/features/user-profile/screens/AccountScreen.tsx
rm src/features/user-profile/screens/DeviceManagementScreen.tsx
rm src/features/user-profile/screens/LoginHistoryScreen.tsx
rm src/features/user-profile/screens/DeleteAccountScreen.tsx
```

**4.3 Delete subscription component from user-profile**

```bash
rm src/features/user-profile/components/SubscriptionManagementCard.tsx
```

Grep for usages:

```bash
grep -r "SubscriptionManagementCard" src/ --include="*.tsx" -l
```

Remove all imports and JSX usages of this component.

**4.4 Remove deleted screens from `AuthenticatedNavigator.tsx`**

Open `src/navigation/AuthenticatedNavigator.tsx` and remove `<Stack.Screen>` entries for:
- `AccountScreen`
- `DeviceManagementScreen`
- `LoginHistoryScreen`
- `DeleteAccountScreen`

Remove their imports at the top of the file.

---

### Checkpoint 4

**Verify:**
1. `npx tsc --noEmit` — no errors
2. `grep -r "AccountScreen\|DeviceManagementScreen\|LoginHistoryScreen\|DeleteAccountScreen\|SubscriptionManagementCard" src/ --include="*.ts" --include="*.tsx"` — no living imports

**Commit:**
```
chore(mvp): phase 4 — delete onboarding feature and auth-only user-profile screens
```

---

## Phase 5 — Auth Services, Permissions & Shared Components

**Effort: Medium (30–90 min)**

This phase removes the permission/subscription-tier layer that gates features in shared components and hooks. Every `usePermissions()` call site needs to be updated.

### Steps

**5.1 Delete auth sub-services**

```bash
rm src/features/auth/services/AuthAnalyticsService.ts
rm src/features/auth/services/BiometricAuthService.ts
rm src/features/auth/hooks/useBiometricAuth.ts
rm src/features/auth/services/SessionTimeoutService.ts
rm src/features/auth/hooks/useSessionTimeout.ts
```

**5.2 Delete entire permissions sub-directory**

```bash
rm -rf src/features/auth/permissions/
```

This removes `PermissionService`, `PermissionCacheService`, `PermissionConstants`, and `permissionGuard`.

**5.3 Delete `usePermissions.ts`**

```bash
rm src/shared/hooks/usePermissions.ts
```

**5.4 Fix `useQuickAddForm.ts`**

This is the only surviving file known to import `usePermissions`. Open it and:
- Remove the `import { usePermissions }` line
- Find the task-limit enforcement block (usually an early return or disabled state based on a limit check)
- Remove it entirely — all task creation is now unconditional

Verify fix:
```bash
npx tsc --noEmit src/shared/hooks/useQuickAddForm.ts 2>&1
```

**5.5 Grep for any remaining `usePermissions` calls**

```bash
grep -r "usePermissions\|PermissionService\|permissionGuard\|PermissionCacheService\|PermissionConstants" src/ --include="*.ts" --include="*.tsx"
```

For each hit in a live file: remove the import and the usage. Replace any conditional `hasPermission` rendering with unconditional rendering of the previously-gated content.

**5.6 Delete auth-dependent shared components**

```bash
rm src/shared/components/AuthIssueModal.tsx
rm src/shared/components/UpgradeSuccessModal.tsx
rm src/shared/components/UsageLimitPaywall.tsx
rm src/shared/components/LockedItemsBanner.tsx
rm src/shared/components/OfflineBanner.tsx
rm src/shared/components/SyncIndicator.tsx
```

**5.7 Find and remove usages of deleted shared components**

```bash
grep -r "AuthIssueModal\|UpgradeSuccessModal\|UsageLimitPaywall\|LockedItemsBanner\|OfflineBanner\|SyncIndicator" src/ --include="*.tsx" --include="*.ts" -l
```

For each file listed: remove the import and the JSX usage. If the component was the sole content of a conditional block, remove the entire block.

**5.8 Audit `QueryStateWrapper` / `SimplifiedQueryStateWrapper`**

These are KEPT but may have auth-error-specific branches. Open both files and remove any branch that handles auth errors specifically (e.g., redirecting to login on 401). Leave only generic loading/error/success handling.

---

### Checkpoint 5

**Verify:**
1. `npx tsc --noEmit` — no errors
2. `grep -r "usePermissions" src/ --include="*.ts" --include="*.tsx"` — zero results

**Commit:**
```
chore(mvp): phase 5 — delete auth services, permissions layer, and subscription-gated shared components
```

---

## Phase 6 — Auth Screens & Navigator Rewrite

**Effort: Medium (30–90 min)**

This phase removes the entire auth UI and rewires the navigator to always go directly to the authenticated app.

### Steps

**6.1 Delete all auth screens**

```bash
rm -rf src/features/auth/screens/
```

This removes: `AuthScreen`, `EnhancedAuthScreen`, `MFAEnrollmentScreen`, `MFAVerificationScreen`, `ForgotPasswordScreen`, `ResetPasswordScreen`, `AppWelcomeScreen`.

If any of these files are at the feature root rather than in `screens/`:

```bash
grep -r "AuthScreen\|EnhancedAuthScreen\|MFAEnrollment\|MFAVerification\|ForgotPassword\|ResetPassword\|AppWelcomeScreen" src/ --include="*.tsx" -l
```

Delete any hits that are screen files.

**6.2 Delete `AuthNavigator.tsx`**

```bash
rm src/navigation/AuthNavigator.tsx
```

**6.3 Rewrite `AppNavigator.tsx`**

Open `src/navigation/AppNavigator.tsx`. Currently it branches on auth state to show either `AuthNavigator` or `AuthenticatedNavigator`. Replace with unconditional rendering:

- Remove the `import` for `AuthNavigator`
- Remove the `import` for `AuthContext` / `useAuth`
- Remove the auth-state conditional
- Always render `<AuthenticatedNavigator />`

The resulting file should be minimal — just a `NavigationContainer` wrapping `AuthenticatedNavigator`.

**6.4 Verify no remaining references to auth navigator or auth screens**

```bash
grep -r "AuthNavigator\|AuthScreen\|EnhancedAuthScreen\|ForgotPassword\|ResetPassword\|AppWelcomeScreen\|MFAEnrollment\|MFAVerification" src/ --include="*.ts" --include="*.tsx"
```

Remove any remaining imports or registrations.

**6.5 Remove remaining auth feature files (UserProfileService stays until Phase 9)**

Check what remains in `src/features/auth/`:

```bash
ls src/features/auth/
```

Delete anything that is no longer needed (services already deleted in Phase 5, screens deleted above). Leave `UserProfileService.ts` and the feature's `index.ts` for now — they are cleaned in Phase 9.

---

### Checkpoint 6

**Verify:**
1. `npx tsc --noEmit` — no errors
2. App launches directly to the main tab/stack (no login screen) when run on simulator: `npx expo start --ios`
3. Navigation works between main screens

**Commit:**
```
chore(mvp): phase 6 — remove auth screens and rewrite AppNavigator to always render authenticated app
```

---

## Phase 7 — Install SQLite & Build Local Data Layer

**Effort: Heavy (rewrite required)**

This phase creates the entire local persistence foundation. Nothing is deleted — only new files are added.

### Steps

**7.1 Install `expo-sqlite`**

```bash
npx expo install expo-sqlite
```

**7.2 Create `src/services/database.ts`**

This is the single SQLite entry point. It opens the database, runs migrations, and exports a `getDatabase()` function.

Create the file with the following structure:

```typescript
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'elaro.db';
const SCHEMA_VERSION = 1;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS courses (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    name        TEXT NOT NULL,
    code        TEXT,
    color       TEXT,
    icon        TEXT,
    schedule    TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    synced_at   TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    type            TEXT NOT NULL CHECK(type IN ('assignment','lecture','study_session')),
    title           TEXT NOT NULL,
    description     TEXT,
    course_id       TEXT REFERENCES courses(id) ON DELETE SET NULL,
    due_date        TEXT,
    start_time      TEXT,
    end_time        TEXT,
    is_completed    INTEGER NOT NULL DEFAULT 0,
    completed_at    TEXT,
    is_deleted      INTEGER NOT NULL DEFAULT 0,
    deleted_at      TEXT,
    metadata        TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    synced_at       TEXT
  );

  CREATE TABLE IF NOT EXISTS srs_items (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL,
    task_id             TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    topic               TEXT NOT NULL,
    interval_days       INTEGER NOT NULL DEFAULT 1,
    ease_factor         REAL NOT NULL DEFAULT 2.5,
    repetitions         INTEGER NOT NULL DEFAULT 0,
    next_review_date    TEXT NOT NULL,
    last_reviewed_at    TEXT,
    last_quality_rating INTEGER,
    is_active           INTEGER NOT NULL DEFAULT 1,
    created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    synced_at           TEXT
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id                    TEXT PRIMARY KEY,
    user_id               TEXT NOT NULL,
    task_id               TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    srs_item_id           TEXT REFERENCES srs_items(id) ON DELETE CASCADE,
    expo_notification_id  TEXT,
    title                 TEXT NOT NULL,
    body                  TEXT NOT NULL,
    scheduled_time        TEXT NOT NULL,
    reminder_type         TEXT NOT NULL CHECK(reminder_type IN ('task_due','study_session','srs_review')),
    is_cancelled          INTEGER NOT NULL DEFAULT 0,
    fired_at              TEXT,
    created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    synced_at             TEXT
  );

  CREATE TABLE IF NOT EXISTS templates (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    name          TEXT NOT NULL,
    description   TEXT,
    task_type     TEXT NOT NULL CHECK(task_type IN ('assignment','lecture','study_session')),
    template_data TEXT NOT NULL,
    is_built_in   INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    synced_at     TEXT
  );

  CREATE TABLE IF NOT EXISTS recurring_patterns (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    task_id         TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    frequency       TEXT NOT NULL CHECK(frequency IN ('daily','weekly','monthly')),
    interval_value  INTEGER NOT NULL DEFAULT 1,
    days_of_week    TEXT,
    day_of_month    INTEGER,
    end_date        TEXT,
    max_occurrences INTEGER,
    last_generated  TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    synced_at       TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_type         ON tasks(type);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date     ON tasks(due_date) WHERE is_deleted = 0;
  CREATE INDEX IF NOT EXISTS idx_tasks_course       ON tasks(course_id) WHERE is_deleted = 0;
  CREATE INDEX IF NOT EXISTS idx_srs_next_review    ON srs_items(next_review_date) WHERE is_active = 1;
  CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON reminders(scheduled_time) WHERE is_cancelled = 0;
`;

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(SCHEMA);
  dbInstance = db;
  return db;
}
```

**7.3 Create `src/utils/deviceId.ts`**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

const DEVICE_ID_KEY = '@elaro/device_id';

let cachedDeviceId: string | null = null;

export async function getOrCreateDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    cachedDeviceId = existing;
    return existing;
  }
  const newId = uuid.v4() as string;
  await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
  cachedDeviceId = newId;
  return newId;
}
```

**7.4 Create `src/hooks/useDeviceId.ts`**

```typescript
import { useEffect, useState } from 'react';
import { getOrCreateDeviceId } from '@/utils/deviceId';

export function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
  }, []);
  return deviceId;
}
```

**7.5 Initialize database on app startup**

Open `App.tsx` (or the root component) and add a database initialization call early in the startup sequence, before rendering:

```typescript
import { getDatabase } from '@/services/database';
import { getOrCreateDeviceId } from '@/utils/deviceId';

// In the app init effect or before SplashScreen.hideAsync():
await Promise.all([getDatabase(), getOrCreateDeviceId()]);
```

**7.6 Verify SQLite is working**

Add a temporary log in the database init to confirm it opens:

```typescript
const db = await getDatabase();
const result = await db.getAllAsync<{ name: string }>(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
);
console.log('Tables:', result.map(r => r.name));
```

Run the app and confirm the table list appears in the Metro console. Remove the log after confirming.

---

### Checkpoint 7

**Verify:**
1. `npx tsc --noEmit` — no errors in new files
2. App launches and database initializes (confirm via console log in step 7.6)
3. All 6 tables appear in the log output

**Commit:**
```
feat(mvp): phase 7 — install expo-sqlite, create local DB schema, device ID utility
```

---

## Phase 8 — Rewrite Feature Services to SQLite

**Effort: Heavy (rewrite required)**

Rewrite each feature's data layer one at a time. Keep the app compiling after each sub-phase. The React Query hooks above each service file do not change — only the `queryFn` / `mutationFn` internals change.

### Pattern for every rewrite

```typescript
// Before (Supabase)
const { data, error } = await supabase.from('tasks').select('*').eq('user_id', userId);
if (error) throw error;
return data;

// After (SQLite) — hook code above this does not change
const db = await getDatabase();
return db.getAllAsync<Task>('SELECT * FROM tasks WHERE user_id = ? AND is_deleted = 0', [userId]);
```

---

### 8.1 Courses service

**File:** `src/features/courses/services/queries.ts` and `mutations.ts`

- `getCourses(userId)` → `SELECT * FROM courses WHERE user_id = ? ORDER BY created_at DESC`
- `getCourseById(id)` → `SELECT * FROM courses WHERE id = ?`
- `createCourse(data)` → `INSERT INTO courses ...` with `uuid.v4()` as id
- `updateCourse(id, data)` → `UPDATE courses SET ... updated_at = ? WHERE id = ?`
- `deleteCourse(id)` → `DELETE FROM courses WHERE id = ?`

Remove any reference to `versionedApiClient`.

**Verify after:** Create a course in the UI. Navigate away and back. Course persists.

---

### 8.2 Assignments service

**Files:** `src/features/assignments/services/queries.ts` and `mutations.ts`

- `getAssignments(userId)` → `SELECT * FROM tasks WHERE user_id = ? AND type = 'assignment' AND is_deleted = 0`
- `getAssignmentById(id)` → `SELECT * FROM tasks WHERE id = ? AND type = 'assignment'`
- `createAssignment(data)` → `INSERT INTO tasks (type='assignment', ...)` with metadata JSON for `submission_method`, `priority`
- `updateAssignment(id, data)` → `UPDATE tasks SET ... WHERE id = ?`
- `deleteAssignment(id)` → `UPDATE tasks SET is_deleted = 1, deleted_at = ? WHERE id = ?` (soft delete)
- `completeAssignment(id)` → `UPDATE tasks SET is_completed = 1, completed_at = ? WHERE id = ?`

**Verify after:** Add an assignment. Mark it complete. Reopen app. State is persisted.

---

### 8.3 Lectures service

**Files:** `src/features/lectures/services/queries.ts` and `mutations.ts`

Same pattern as assignments with `type = 'lecture'`. Metadata JSON fields: `venue`, `is_recurring`, `recurrence_rule`.

**Verify after:** Add a lecture. View in calendar. State persists after restart.

---

### 8.4 Study sessions service

**Files:** `src/features/studySessions/services/queries.ts` and `mutations.ts`

- `getStudySessions(userId)` → `SELECT * FROM tasks WHERE user_id = ? AND type = 'study_session' AND is_deleted = 0`
- `createStudySession(data)` → `INSERT INTO tasks (type='study_session', ...)` with metadata: `session_type`, `estimated_duration_mins`
- After session completion → create or update `srs_items` row for the topic

**Verify after:** Complete a study session. SRS item appears in the review queue.

---

### 8.5 Recurring task service

**File:** `src/features/tasks/services/RecurringTaskService.ts`

Replace all 4 Supabase RPC calls with pure JS date arithmetic + SQLite reads/writes:

- `createPattern(request)` → `INSERT INTO recurring_patterns ...`
- `getUserRecurringTasks(userId)` → `SELECT rt.*, c.name as course_name FROM tasks t JOIN recurring_patterns rp ON rp.task_id = t.id ...`
- `calculateNextGenerationDate(patternId, currentDate)` → Pure JS:
  - `daily`: `addDays(currentDate, intervalValue)`
  - `weekly`: find next matching day of week
  - `monthly`: set day of month on next month
- `generateNextTasks(patternId)` → Pure JS: calculate next date, insert new task row, update `last_generated`

Remove the `processDueRecurringTasks()` Supabase RPC — replace with a JS loop over recurring patterns where `last_generated < today`.

**Verify after:** Create a recurring task. Confirm a new task is generated on the correct schedule.

---

### 8.6 SRS scheduling service

**File:** `src/features/srs/services/SRSSchedulingService.ts`

This is the most complex rewrite. Replace 5+ Supabase calls:

**SM-2 algorithm (pure JS):**

```typescript
export function calculateNextInterval(
  item: SRSItem,
  qualityRating: 1 | 2 | 3 | 4 | 5,
): SRSItem {
  const newItem = { ...item };
  if (qualityRating < 3) {
    newItem.repetitions = 0;
    newItem.interval_days = 1;
  } else {
    newItem.repetitions += 1;
    newItem.interval_days =
      newItem.repetitions === 1
        ? 1
        : newItem.repetitions === 2
          ? 6
          : Math.round(newItem.interval_days * newItem.ease_factor);
    newItem.ease_factor = Math.max(
      1.3,
      newItem.ease_factor +
        0.1 -
        (5 - qualityRating) * (0.08 + (5 - qualityRating) * 0.02),
    );
  }
  newItem.last_quality_rating = qualityRating;
  newItem.last_reviewed_at = new Date().toISOString();
  newItem.next_review_date = addDays(
    new Date(),
    newItem.interval_days,
  ).toISOString();
  return newItem;
}
```

**Replace subscription-tier branching** with a single fixed interval set: `[1, 3, 7, 14, 30]`.

**Replace Supabase notification insertion** with `expo-notifications`:

```typescript
import * as Notifications from 'expo-notifications';

async function scheduleLocalNotification(
  db: SQLite.SQLiteDatabase,
  reminder: { id: string; title: string; body: string; scheduled_time: string },
): Promise<void> {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.body,
      data: { reminderId: reminder.id },
    },
    trigger: { date: new Date(reminder.scheduled_time) },
  });
  await db.runAsync(
    'UPDATE reminders SET expo_notification_id = ? WHERE id = ?',
    [notificationId, reminder.id],
  );
}
```

**Replace Supabase RPC timezone scheduling** with local calculation: use `addDays(sessionDate, days)`, set hour to `config.preferredHour`, apply the existing `addDeterministicJitter()` helper (keep this logic — it's good).

**Verify after:** Complete a study session. Open the device notification center. SRS review notifications appear scheduled at the correct intervals.

---

### 8.7 SRS analytics service

**File:** `src/features/srs/services/SRSAnalyticsService.ts`

Replace Supabase reads with SQLite queries:

- `getReviewsDue()` → `SELECT * FROM srs_items WHERE next_review_date <= date('now') AND is_active = 1`
- `getReviewHistory(userId)` → `SELECT * FROM srs_items WHERE user_id = ? ORDER BY last_reviewed_at DESC`
- `getCompletionRate()` → compute from `srs_items` rows in JS

**Verify after:** SRS statistics screen shows data after completing a study session.

---

### 8.8 Template management

**File:** `src/features/templates/hooks/useTemplateManagement.ts`

- `getTemplates()` → `SELECT * FROM templates WHERE user_id = ? OR is_built_in = 1`
- `createTemplate(data)` → `INSERT INTO templates ...`
- `deleteTemplate(id)` → `DELETE FROM templates WHERE id = ? AND is_built_in = 0`

**Seed built-in templates on first launch** (in the database init or a one-time migration flag in AsyncStorage):

```typescript
const builtInCount = await db.getFirstAsync<{ count: number }>(
  'SELECT COUNT(*) as count FROM templates WHERE is_built_in = 1'
);
if (builtInCount?.count === 0) {
  // Insert default templates
}
```

**Verify after:** Templates screen shows built-in templates on a fresh install.

---

### Checkpoint 8

**Verify:**
1. `npx tsc --noEmit` — no errors
2. Full user flow: create course → add assignment → add lecture → complete study session → SRS notifications scheduled → templates visible
3. All data persists across app restarts (kill and reopen the app)

**Commit:**
```
feat(mvp): phase 8 — rewrite all feature services from Supabase to SQLite
```

---

## Phase 9 — Replace AuthContext

**Effort: Medium (30–90 min)**

`AuthContext` is the most widely imported context in the app. Every `useAuth()` call must be inspected and updated.

### Steps

**9.1 Grep for all `useAuth()` call sites**

```bash
grep -rn "useAuth\(\)" src/ --include="*.tsx" --include="*.ts"
```

Save this list. You will work through it systematically.

**9.2 Categorize each call site**

For each file in the list, identify which part of the auth object it uses:

| Usage pattern | Action |
|---|---|
| `const { user } = useAuth()` and only uses `user.id` | Replace with `const deviceId = useDeviceId()` |
| Checks `isLoading` / `session` | Remove the loading guard entirely |
| Calls `signOut()` | Remove the sign-out button and handler |
| Passes user to a child component | Update the child's prop type to accept `string` (deviceId) |

**9.3 Update each call site**

Work through the list from step 9.1. Change one file at a time and verify TypeScript after each:

```bash
npx tsc --noEmit 2>&1 | head -20
```

**9.4 Delete `AuthContext.tsx`**

Once all callers are updated:

```bash
rm src/contexts/AuthContext.tsx
```

Remove from `AppProviders.tsx`:
- The import
- The `<AuthContext.Provider>` wrapper

**9.5 Delete `UserProfileService.ts`**

```bash
rm src/features/auth/services/UserProfileService.ts
```

Grep for any remaining callers:

```bash
grep -r "UserProfileService" src/ --include="*.ts" --include="*.tsx"
```

**9.6 Delete remaining auth feature files**

```bash
ls src/features/auth/
```

Delete any remaining files (should be close to empty at this point). Then:

```bash
rm -rf src/features/auth/
```

---

### Checkpoint 9

**Verify:**
1. `npx tsc --noEmit` — no errors
2. `grep -r "useAuth\|AuthContext" src/ --include="*.ts" --include="*.tsx"` — zero results
3. App launches and all screens that previously used `user.id` now correctly use `deviceId`

**Commit:**
```
chore(mvp): phase 9 — replace AuthContext with useDeviceId across all call sites, delete auth feature
```

---

## Phase 10 — Remove Supabase Core

**Effort: Medium (30–90 min)**

The Supabase client and all sync/API infrastructure. By this point, no feature service should be importing from `supabase.ts`.

### Steps

**10.1 Verify no remaining Supabase imports in feature code**

```bash
grep -r "from.*services/supabase\|from '@supabase\|supabase\.from\|supabase\.rpc\|supabase\.auth" src/features/ src/shared/ src/contexts/ --include="*.ts" --include="*.tsx"
```

If any hits remain, they belong in Phase 8 or 9. Fix them before proceeding.

**10.2 Delete `supabase.ts`**

```bash
rm src/services/supabase.ts
```

**10.3 Delete auth service files**

```bash
rm src/services/authService.ts
rm src/services/authSync.ts
```

**10.4 Delete sync services**

```bash
rm src/services/syncManager.ts
rm src/services/navigationSync.ts
rm src/services/settingsSync.ts
rm src/services/studySessionSync.ts
```

**10.5 Delete the API layer**

```bash
rm -rf src/services/api/
```

This removes `queries.ts`, `mutations.ts`, `mappers.ts`, and `errors.ts`. Keep `errors.ts` only if it defines generic error types used outside the API layer — check first:

```bash
grep -r "from.*services/api/errors" src/ --include="*.ts" --include="*.tsx"
```

If used elsewhere, move the generic error types to `src/types/errors.ts` before deleting.

**10.6 Delete API versioning layer**

```bash
rm src/services/ApiVersioningService.ts
rm src/services/VersionedApiClient.ts
rm src/services/RequestDeduplicationService.ts
```

**10.7 Delete OTA update service**

```bash
rm src/services/updateService.ts
```

---

### Checkpoint 10

**Verify:**
1. `npx tsc --noEmit` — no errors
2. `grep -r "supabase" src/ --include="*.ts" --include="*.tsx"` — zero results
3. App launches and all data operations work (create/read/update/delete)

**Commit:**
```
chore(mvp): phase 10 — delete Supabase client, sync services, and API versioning layer
```

---

## Phase 11 — Package Cleanup

**Effort: Medium (30–90 min)**

Remove packages from `package.json` and `node_modules`. These must be uninstalled, not just unused — native modules that remain in `node_modules` still appear in the native build.

### ⚠️ VERIFY FIRST — Run all of these before uninstalling

**Check `expo-secure-store`:**

```bash
grep -r "expo-secure-store\|SecureStore" src/ --include="*.ts" --include="*.tsx"
```

If zero results → safe to uninstall. If results remain → confirm they are all biometric-auth files already deleted. If any live file uses it, keep the package.

**Check `expo-crypto`:**

```bash
grep -r "expo-crypto\|Crypto\." src/ --include="*.ts" --include="*.tsx"
```

If only in deleted auth files → safe to remove. If used elsewhere (e.g., UUID generation) → keep.

**Check `expo-device`:**

```bash
grep -r "expo-device\|Device\." src/ --include="*.ts" --include="*.tsx"
```

If only in deleted Sentry/biometric files → safe to remove.

**Check `nativewind` / `className=`:**

```bash
grep -r "className=" src/ --include="*.tsx"
```

If zero results → safe to uninstall both `nativewind` and `tailwindcss-react-native`. If any results remain → keep both packages and remove `className=` usage from those components first.

---

### Steps

**11.1 Uninstall confirmed-removable packages**

```bash
npm uninstall \
  @supabase/supabase-js \
  @invertase/react-native-apple-authentication \
  expo-apple-authentication \
  expo-auth-session \
  expo-local-authentication \
  react-native-purchases \
  mixpanel-react-native \
  @sentry/react-native \
  jsonwebtoken \
  react-native-qrcode-svg \
  react-native-webview \
  react-native-copilot \
  react-native-confetti-cannon \
  tinycolor2 \
  dotenv \
  @react-native-community/netinfo \
  expo-sharing \
  expo-image-picker \
  expo-image-manipulator \
  expo-av \
  expo-clipboard \
  expo-linking \
  expo-web-browser \
  expo-updates
```

**11.2 Conditionally uninstall based on verification above**

If `expo-secure-store` grep returned zero results:
```bash
npm uninstall expo-secure-store
```

If `expo-crypto` grep returned zero results:
```bash
npm uninstall expo-crypto
```

If `expo-device` grep returned zero results:
```bash
npm uninstall expo-device
```

If `nativewind` / `className=` grep returned zero results:
```bash
npm uninstall nativewind tailwindcss-react-native
```

**11.3 Run `expo-doctor`**

```bash
npx expo-doctor
```

Fix any warnings about unresolved native modules or version mismatches before continuing.

**11.4 Clean up `app.json` / `app.config.js`**

Remove plugin entries for uninstalled packages (e.g., `@sentry/react-native`, `expo-updates`, `expo-local-authentication`).

**11.5 Clean up `babel.config.js`**

Remove any plugin entries for uninstalled packages (e.g., `nativewind/babel` if nativewind was removed).

---

### Checkpoint 11

**Verify:**
1. `npx tsc --noEmit` — no errors
2. `npx expo-doctor` — no blocking issues
3. App builds without native module errors: `npx expo start --ios`

**Commit:**
```
chore(mvp): phase 11 — uninstall removed packages, clean app.json and babel config
```

---

## Phase 12 — Final Navigation Cleanup

**Effort: Quick (under 30 min)**

Polish pass: remove duplicate screen files, clean up any remaining auth/subscription registrations.

### ⚠️ VERIFY FIRST — Identify the active HomeScreen

```bash
grep -n "HomeScreen\|OptimizedHomeScreen\|RefactoredHomeScreen" src/navigation/AuthenticatedNavigator.tsx
```

Note exactly which variant is imported and rendered. That is the one to keep. The other two are deleted.

---

### Steps

**12.1 Audit `AuthenticatedNavigator.tsx` for lingering auth/subscription screens**

```bash
grep -n "Paywall\|Subscription\|Auth\|Onboarding\|Welcome\|MFA\|Biometric\|RevenueCat\|Intercom" src/navigation/AuthenticatedNavigator.tsx
```

Remove any remaining registrations for features deleted in earlier phases.

**12.2 Remove duplicate HomeScreen files**

Based on the verification above, identify the active variant. Then delete the unused ones:

```bash
# Example — adjust based on what you found:
rm src/features/dashboard/screens/OptimizedHomeScreen.tsx
rm src/features/dashboard/screens/RefactoredHomeScreen.tsx
```

Grep to ensure no other file imports the deleted variants:

```bash
grep -r "OptimizedHomeScreen\|RefactoredHomeScreen" src/ --include="*.ts" --include="*.tsx"
```

**12.3 Remove `AppWelcomeScreen` if still referenced**

```bash
grep -r "AppWelcomeScreen" src/ --include="*.ts" --include="*.tsx"
```

If any hits remain in live navigator files, remove the registration and import.

**12.4 Final comprehensive grep for deleted items**

```bash
grep -r "supabase\|AuthContext\|useAuth\|RevenueCat\|Mixpanel\|Sentry\|Intercom\|usePermissions\|PaywallScreen" src/ --include="*.ts" --include="*.tsx"
```

Any results here are regressions — fix before committing.

**12.5 Clean up `src/features/` for empty or near-empty folders**

```bash
find src/features -type d -empty
```

Delete any empty directories.

---

### Checkpoint 12

**Verify:**
1. `npx tsc --noEmit` — zero errors
2. `npx expo-doctor` — no blocking issues
3. Full end-to-end smoke test on simulator:
   - App launches directly to home screen (no login)
   - Create a course
   - Add an assignment with a due date
   - Add a lecture
   - Complete a study session
   - Verify SRS notifications are scheduled
   - Check calendar view shows tasks
   - Kill and reopen — all data persists
4. `grep -r "supabase\|AuthContext\|usePermissions" src/` — zero results

**Commit:**
```
chore(mvp): phase 12 — final navigation cleanup, remove duplicate HomeScreen variants
```

---

## Summary Table

| Phase | Description | Effort | Primary Risk |
|---|---|---|---|
| 1 | Delete analytics & monitoring services | Quick | None — leaf nodes |
| 2 | Delete standalone feature folders | Quick | `dev/` notification screen — verify first |
| 3 | Remove dead contexts, stub NetworkContext | Quick | None |
| 4 | Delete onboarding & auth-only profile screens | Quick | Navigator import cleanup |
| 5 | Delete permissions layer, auth sub-services, locked UI components | Medium | `usePermissions` call sites across shared components |
| 6 | Delete auth screens, rewrite AppNavigator | Medium | Navigator must compile after rewrite |
| 7 | Install SQLite, create schema + device ID | Heavy | Schema design is final — migration required to change it |
| 8 | Rewrite all feature services to SQLite | Heavy | Largest phase — do one feature at a time |
| 9 | Replace `AuthContext` / `useAuth()` across all files | Medium | Many call sites — categorize before editing |
| 10 | Delete Supabase client and all sync infrastructure | Medium | Must confirm zero Supabase imports before deleting `supabase.ts` |
| 11 | Uninstall removed packages | Medium | Conditional removals depend on grep verification |
| 12 | Final navigation cleanup, remove duplicate screens | Quick | Identify active HomeScreen variant before deleting |
