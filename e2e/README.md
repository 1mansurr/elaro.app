# ELARO E2E Testing

This directory contains end-to-end (E2E) tests for the ELARO app using Detox.

## Setup

### Prerequisites

- iOS Simulator installed (iPhone 14, iOS 17.5+)
- Detox CLI installed globally: `npm install -g detox-cli`
- App built for simulator: `npm run e2e:build:ios`

### Running Tests

```bash
# Build the app (first time and after code changes)
npm run e2e:build:ios

# Run all E2E tests
npm run e2e:test:ios

# Run priority tests in order
npm run e2e:test:priority

# Run individual test suites
npm run e2e:test:lecture
npm run e2e:test:home
npm run e2e:test:calendar
npm run e2e:test:templates
npm run e2e:test:profile

# Run Pass 1 setup verification only
npm run e2e:test:setup
```

## Test Structure

### Core Journey Tests (`core-journeys/`)

Comprehensive feature-specific tests organized by priority:

1. **onboarding-complete.e2e.ts** - Complete onboarding flow
2. **course-creation.e2e.ts** - Course creation and management
3. **lecture-creation.e2e.ts** - Lecture creation (includes error boundary testing)
4. **assignment-lifecycle.e2e.ts** - Assignment creation and management
5. **home-screen-display.e2e.ts** - Home screen and task display
6. **calendar-view.e2e.ts** - Calendar navigation and display
7. **study-session-complete.e2e.ts** - Study session flow
8. **templates.e2e.ts** - Template creation and usage
9. **offline-recovery.e2e.ts** - Offline functionality
10. **notification-flow.e2e.ts** - Notification handling
11. **profile-settings.e2e.ts** - Profile and settings navigation
12. **task-management-complete.e2e.ts** - Complete task lifecycle

### Pass-Based Tests (Lightweight Smoke Tests)

Quick validation tests for CI/CD:

- **pass1-setup-verification.test.ts** - Setup and infrastructure validation
- **pass2-auth-flow-validation.test.ts** - Authentication flows
- **pass3-study-flow-validation.test.ts** - Study session smoke test (comprehensive tests in core-journeys)
- **pass4-profile-flow-validation.test.ts** - Profile/Settings smoke test (comprehensive tests in core-journeys)
- **pass5-error-edge-cases.test.ts** - Error handling and edge cases
- **pass6-reporting.test.ts** - Test reporting and summaries

### Integration Tests

- **main-app-integration.e2e.ts** - Cross-feature workflows, performance, accessibility
- **navigation-flows.e2e.ts** - Comprehensive navigation testing (tabs, stack, modals, deep links)

### Specialized Tests

- **sync/** - Sync and offline functionality tests
- **priority-test-runner.e2e.ts** - Master test runner (runs all priority tests in order)

### Mock Services

Located in `e2e/mocks/`:

- `mockSupabaseAuth.ts` - In-memory Supabase auth mock for testing

### Test Utilities

Located in `e2e/utils/`:

- `testHelpers.ts` - Reusable test helper functions
- `testReporter.ts` - Test reporting utilities

### Configuration

- `detox.config.js` - Detox configuration (root directory)
- `e2e/jest.config.js` - Jest configuration for E2E tests
- `e2e/setup.ts` - Global test setup and teardown

## Test Organization

Tests are organized by priority order to ensure critical flows are tested first:

1. **Authentication & Onboarding** (blocks everything)
2. **Course Creation** (required for tasks)
3. **Lecture Creation** (critical feature)
4. **Assignment Creation** (critical feature)
5. **Home Screen & Task Display** (core UI)
6. **Calendar View** (core UI)
7. **Study Sessions** (key feature)
8. **Templates** (productivity feature)
9. **Offline Functionality** (resilience)
10. **Notifications** (user engagement)
11. **Profile/Settings** (account management)

## Running Specific Test Suites

```bash
# Run all priority tests in order
npm run e2e:test:priority

# Run specific feature tests
npm run e2e:test:lecture    # Lecture creation (includes error boundary test)
npm run e2e:test:home       # Home screen tests
npm run e2e:test:calendar   # Calendar view tests
npm run e2e:test:templates  # Template tests
npm run e2e:test:profile    # Profile/Settings tests

# Run pass-based tests
npm run e2e:test:setup      # Pass 1 only
npm run e2e:test:ios        # All tests
```

## Test Phases

### Pass 1: Setup ✅

- Detox configuration
- Mock Supabase auth service
- Test utilities
- Verification tests

### Pass 2: Auth Flow Validation ✅

- Launch → Login → Dashboard
- Launch → Signup → Dashboard
- Logout → Guest state
- Auth state persistence
- Auth mode toggle

### Pass 3: Study Flow Validation ✅ (Lightweight)

- Quick smoke test for study session navigation
- Comprehensive tests in `core-journeys/study-session-complete.e2e.ts`

### Pass 4: Profile Flow Validation ✅ (Lightweight)

- Quick smoke test for profile/settings navigation
- Comprehensive tests in `core-journeys/profile-settings.e2e.ts`

### Pass 5: Error and Edge Cases ✅

- Session expiration redirect
- Offline state handling
- Rapid tab switching
- Concurrent navigation
- App lifecycle (background/foreground)

### Pass 6: Reporting ✅

- Test report generation
- Summary statistics
- Screen coverage tracking

## Reports

Test reports are generated in `e2e/reports/`:

- `setup-verification-report.json` - Pass 1 results
- `e2e-report.json` - Final comprehensive report (Pass 6)

## Notes

- Tests use mock Supabase client (no real API calls)
- App runs in light mode only for consistency
- iOS Simulator: iPhone 14
- All tests run in non-interactive mode
- Core-journeys tests are comprehensive feature tests
- Pass-based tests are lightweight smoke tests for CI/CD
- Integration tests cover cross-feature scenarios
