# Test Consolidation Quick Start Guide

## 🎯 Goal
Eliminate redundant test files and organize tests by priority order.

## 📊 Current State
- **25 test files** with ~8-10 redundant files
- Tests scattered across multiple locations
- Some features tested in 2-3 different files

## ✅ Target State
- **18 test files** (28% reduction)
- Clear priority-based organization
- One test file per feature
- Pass-based tests for CI/CD quick validation

---

## 🚀 Quick Actions (Start Here)

### Immediate Actions (Can do now)

1. **Remove starter.test.js** (redundant)
   ```bash
   rm e2e/starter.test.js
   ```

2. **Review consolidation plan**
   ```bash
   cat e2e/TEST_REDUNDANCY_ANALYSIS.md
   ```

### Phase 1: High Priority (This Week)

#### Step 1: Consolidate Onboarding
```bash
# 1. Review both files
code e2e/onboarding.test.js
code e2e/core-journeys/onboarding-complete.e2e.ts

# 2. Merge unique tests from onboarding.test.js into onboarding-complete.e2e.ts
# 3. Remove onboarding.test.js after merge
rm e2e/onboarding.test.js
```

#### Step 2: Consolidate Profile/Settings
```bash
# 1. Review both files
code e2e/pass4-profile-flow-validation.test.ts
code e2e/core-journeys/profile-settings.e2e.ts

# 2. Add detailed tests from pass4 to profile-settings.e2e.ts
# 3. Make pass4 lightweight (reference core-journeys)
```

#### Step 3: Consolidate Study Sessions
```bash
# 1. Review both files
code e2e/pass3-study-flow-validation.test.ts
code e2e/core-journeys/study-session-complete.e2e.ts

# 2. Merge unique tests
# 3. Make pass3 lightweight
```

---

## 📋 File Status Checklist

### ✅ Keep As-Is
- [x] `pass1-setup-verification.test.ts`
- [x] `pass2-auth-flow-validation.test.ts`
- [x] `pass5-error-edge-cases.test.ts`
- [x] `pass6-reporting.test.ts`
- [x] All `core-journeys/*.e2e.ts` (new priority-based tests)
- [x] All `sync/*` tests (specialized domain)

### ⚠️ Update/Refactor
- [ ] `pass3-study-flow-validation.test.ts` → Make lightweight
- [ ] `pass4-profile-flow-validation.test.ts` → Make lightweight
- [ ] `main-app.test.js` → Refactor to `main-app-integration.e2e.ts`
- [ ] `navigation-flows.e2e.ts` → Merge navigation tests
- [ ] `priority-test-runner.e2e.ts` → Update references

### ❌ Remove After Merge
- [ ] `onboarding.test.js` → Merge into `onboarding-complete.e2e.ts`
- [ ] `navigation/complete-flow.test.ts` → Merge into `navigation-flows.e2e.ts`
- [ ] `starter.test.js` → Redundant with pass1

---

## 🔍 How to Identify Redundancies

### Pattern 1: Same Feature, Multiple Files
**Example:** Onboarding tested in 3 files
- ✅ Solution: Keep one comprehensive file, merge others

### Pattern 2: Partial Coverage in Multiple Files
**Example:** Home screen tests in `main-app.test.js` and `home-screen-display.e2e.ts`
- ✅ Solution: Extract to dedicated file, remove from main-app

### Pattern 3: Pass Tests vs Core Journey Tests
**Example:** Profile tests in pass4 and core-journeys
- ✅ Solution: Keep detailed in core-journeys, make pass lightweight

---

## 📝 Merge Checklist Template

When merging two test files:

- [ ] Review both files for unique test cases
- [ ] Identify overlapping tests
- [ ] Merge unique tests into target file
- [ ] Update test IDs to match implementation
- [ ] Verify tests still pass
- [ ] Update any imports/references
- [ ] Remove source file
- [ ] Update documentation

---

## 🧪 Testing After Consolidation

```bash
# Run all priority tests
npm run e2e:test:priority

# Run individual test suites
npm run e2e:test:lecture
npm run e2e:test:home
npm run e2e:test:calendar

# Run all E2E tests
npm run e2e:test:ios
```

---

## 📚 Documentation Updates Needed

After consolidation, update:
- [ ] `e2e/README.md` - Test structure section
- [ ] `e2e/TEST_REDUNDANCY_ANALYSIS.md` - Mark completed tasks
- [ ] `package.json` - Update test scripts if needed
- [ ] Project documentation - Test strategy

---

## ⚡ Quick Reference: File Mapping

| Old File | Action | New Location |
|----------|--------|--------------|
| `onboarding.test.js` | Merge | `core-journeys/onboarding-complete.e2e.ts` |
| `pass4-profile-flow-validation.test.ts` | Merge | `core-journeys/profile-settings.e2e.ts` |
| `pass3-study-flow-validation.test.ts` | Merge | `core-journeys/study-session-complete.e2e.ts` |
| `navigation/complete-flow.test.ts` | Merge | `navigation-flows.e2e.ts` |
| `main-app.test.js` | Refactor | `main-app-integration.e2e.ts` |
| `starter.test.js` | Remove | (redundant) |

---

## 🎯 Success Criteria

Consolidation is complete when:
- ✅ No duplicate test coverage
- ✅ All tests organized by priority
- ✅ Pass tests are lightweight smoke tests
- ✅ Core-journeys tests are comprehensive
- ✅ All tests pass
- ✅ Documentation updated

---

**Next Step:** Start with Phase 1, Task 1.1 (Onboarding consolidation)
