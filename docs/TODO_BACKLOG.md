# TODO Backlog

**Last Updated:** January 2025  
**Total TODOs:** 6  
**Status:** Categorized and Prioritized

---

## Overview

This document tracks all TODO, FIXME, XXX, and HACK comments in the codebase. Items are categorized by priority and impact.

---

## Priority Categories

- **Critical**: Blocks functionality or causes bugs
- **High**: Important feature or improvement
- **Medium**: Nice-to-have enhancement
- **Low**: Minor improvement or cleanup

---

## TODO Items

### 1. **SRS Reminder Rescheduling**

**File:** `src/services/notifications.ts:391`  
**Priority:** Medium  
**Category:** Feature Enhancement  
**Status:** Pending

**Description:**

```typescript
// TODO: Implement the logic to schedule new reminders here instead of calling itself.
```

**Context:**

- Currently, when updating SRS reminders, the code cancels old reminders but doesn't schedule new ones
- This is in the `updateSRReminders` function
- Impact: Users may not receive updated reminders after modifying SRS sessions

**Recommendation:**

- Implement proper reminder scheduling logic
- Ensure reminders are properly synced with session updates
- Add tests for reminder rescheduling

---

### 2. **SRS Queue Length Method**

**File:** `src/hooks/useSyncDebug.ts:109`  
**Priority:** Low  
**Category:** Development Tool  
**Status:** Pending

**Description:**

```typescript
srsQueueLength: 0, // TODO: Add method to get queue length
```

**Context:**

- Debug hook that provides sync statistics
- Currently returns hardcoded 0 for SRS queue length
- Impact: Debug information is incomplete

**Recommendation:**

- Add method to query actual SRS queue length from service
- Or remove if not needed for production

---

### 3. **AddAssignmentNavigator Integration**

**File:** `src/navigation/AddAssignmentNavigator.tsx:7`  
**Priority:** Medium  
**Category:** Architecture  
**Status:** Pending

**Description:**

```typescript
/**
 * TODO: Either integrate this navigator into the navigation structure or extract the types
 * to a separate file and remove this navigator.
 */
```

**Context:**

- Navigator exists but may not be fully integrated
- Types may need extraction for reuse
- Impact: Potential code organization issue

**Recommendation:**

- Verify if navigator is used in navigation structure
- If unused, remove or integrate properly
- Extract types to shared location if needed

---

### 4. **Task Count Query Implementation**

**File:** `src/features/auth/permissions/PermissionService.ts:191`  
**Priority:** High  
**Category:** Feature Implementation  
**Status:** Pending

**Description:**

```typescript
// TODO: Implement actual task count query
// This would query the database to get current task count for the user
const current = 0; // Placeholder
```

**Context:**

- Permission service checks task limits
- Currently uses placeholder value
- Impact: Task limit enforcement may not work correctly

**Recommendation:**

- Implement actual database query for task count
- Use React Query or similar for caching
- Add proper error handling

---

### 5. **Streak Service Re-implementation**

**File:** `src/services/supabase.ts:194`  
**Priority:** Low  
**Category:** Feature Deferred  
**Status:** Deferred

**Description:**

```typescript
// TODO: Streak service logic was here. Re-implement from scratch if/when streaks are reintroduced.
```

**Context:**

- Streak functionality was removed
- May be reintroduced in future
- Impact: None currently (feature removed)

**Recommendation:**

- Keep as-is until feature is prioritized
- Document in deferred features list
- Consider removing if streaks won't be reintroduced

---

### 6. **Sync Manager Phase 3 Implementation**

**File:** `src/services/syncManager.ts:217`  
**Priority:** Medium  
**Category:** Feature Enhancement  
**Status:** Pending

**Description:**

```typescript
// TODO: Phase 3 - Check if online and start sync
console.log(
  '🔄 SyncManager: syncImmediately requested (will be implemented in Phase 3)',
);
```

**Context:**

- Sync manager has phased implementation
- Phase 3 includes online checking and immediate sync
- Impact: Immediate sync may not work as expected

**Recommendation:**

- Implement online connectivity check
- Add immediate sync trigger
- Ensure proper error handling for offline scenarios

---

## Summary by Priority

- **Critical:** 0
- **High:** 1 (Task Count Query)
- **Medium:** 3 (SRS Reminders, Navigator Integration, Sync Phase 3)
- **Low:** 2 (SRS Queue Length, Streak Service)

---

## Action Items

### Immediate (High Priority)

1. ✅ Implement task count query in PermissionService
   - **Estimated Effort:** 2-3 hours
   - **Impact:** Critical for task limit enforcement

### Short Term (Medium Priority)

2. ✅ Implement SRS reminder rescheduling
   - **Estimated Effort:** 3-4 hours
   - **Impact:** Better user experience for SRS updates

3. ✅ Integrate or remove AddAssignmentNavigator
   - **Estimated Effort:** 1-2 hours
   - **Impact:** Code organization

4. ✅ Implement Sync Manager Phase 3
   - **Estimated Effort:** 4-5 hours
   - **Impact:** Improved sync reliability

### Long Term (Low Priority)

5. ⏸️ Add SRS queue length method (if needed)
6. ⏸️ Re-implement streak service (if prioritized)

---

## Notes

- All TODOs are tracked in code comments
- No critical blockers identified
- Most items are feature enhancements or deferred work
- Consider creating GitHub issues for tracking

---

**Next Review:** Monthly or when significant changes are made
