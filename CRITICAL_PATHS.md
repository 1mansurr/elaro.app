# Critical Paths Requiring 70%+ Test Coverage

This document identifies the critical paths in the ELARO app that require at least 70% test coverage before beta launch.

## Priority 1: Authentication Flow

**Target Coverage:** 70%+  
**Current Status:** Needs testing

### Files:
- `src/features/auth/services/authService.ts` - Core authentication logic
- `src/contexts/AuthContext.tsx` - Authentication state management
- `src/features/auth/screens/AuthScreen.tsx` - Authentication UI
- `src/services/supabase.ts` - Supabase client and auth methods

### Test Scenarios:
- [ ] User sign up (email/password)
- [ ] User sign in (email/password)
- [ ] User sign out
- [ ] Session management (auto-refresh)
- [ ] Password reset flow
- [ ] Apple Sign-In (if implemented)
- [ ] Error handling (invalid credentials, network errors)
- [ ] Account lockout after failed attempts

---

## Priority 2: Task Management

**Target Coverage:** 70%+  
**Current Status:** Needs testing

### Files:
- `src/hooks/useTaskMutations.ts` - Task CRUD operations
- `src/features/assignments/services/mutations.ts` - Assignment mutations
- `src/features/assignments/screens/AddAssignmentScreen.tsx` - Task creation UI
- `src/features/lectures/screens/AddLectureScreen.tsx` - Lecture creation
- `src/features/studySessions/screens/AddStudySessionScreen.tsx` - Study session creation

### Test Scenarios:
- [ ] Create assignment
- [ ] Update assignment
- [ ] Delete assignment (soft delete)
- [ ] Complete task
- [ ] Restore task
- [ ] Query invalidation after mutations
- [ ] Optimistic updates
- [ ] Error handling
- [ ] Offline queue handling

---

## Priority 3: Navigation

**Target Coverage:** 70%+  
**Current Status:** Needs testing

### Files:
- `src/navigation/AppNavigator.tsx` - Main navigation logic
- `src/navigation/AuthenticatedNavigator.tsx` - Authenticated routes
- `src/navigation/GuestNavigator.tsx` - Guest routes
- `src/navigation/utils/RouteGuards.ts` - Route access validation

### Test Scenarios:
- [ ] Navigation based on auth state
- [ ] Route guards (prevent unauthorized access)
- [ ] Deep linking
- [ ] Navigation state persistence
- [ ] Back button handling (Android)
- [ ] Onboarding flow navigation

---

## Priority 4: Offline Sync

**Target Coverage:** 70%+  
**Current Status:** Needs testing

### Files:
- `src/services/syncManager.ts` - Offline queue management
- `src/hooks/useOfflineMutation.ts` - Offline mutation handling
- `src/utils/cacheRecovery.ts` - Cache recovery logic

### Test Scenarios:
- [ ] Queue actions when offline
- [ ] Auto-sync when online
- [ ] Priority-based queue processing
- [ ] Temp ID → Real ID replacement
- [ ] Conflict resolution
- [ ] Queue eviction
- [ ] Circuit breaker behavior
- [ ] Retry logic

---

## Priority 5: Security (RLS Policies)

**Target Coverage:** 70%+  
**Current Status:** Partially tested

### Files:
- All RLS policies in `supabase/migrations/*.sql`
- `tests/rls/*.test.ts` - RLS test files

### Test Scenarios:
- [ ] User can only access their own data
- [ ] RLS policies prevent unauthorized access
- [ ] Soft delete policies work correctly
- [ ] Admin access works correctly
- [ ] Guest access restrictions

---

## Coverage Goals

### Overall Coverage:
- **Minimum:** 50% for all code
- **Critical Paths:** 70%+ (as listed above)
- **Security:** 80%+ (RLS policies)

### Current Status:
- Overall: 3.5% (needs improvement)
- Critical Paths: TBD (needs testing)
- Security: Partially tested

---

## Testing Strategy

1. **Start with Priority 1** (Authentication) - Highest risk if broken
2. **Then Priority 2** (Task Management) - Core functionality
3. **Then Priority 3** (Navigation) - User experience
4. **Then Priority 4** (Offline Sync) - Reliability
5. **Finally Priority 5** (Security) - Already partially covered

---

## Success Criteria

Phase 1 is complete when:
- [ ] Authentication flow: 70%+ coverage
- [ ] Task management: 70%+ coverage
- [ ] Navigation: 70%+ coverage
- [ ] Offline sync: 70%+ coverage
- [ ] All critical path tests passing
- [ ] Coverage thresholds enforced in CI/CD

