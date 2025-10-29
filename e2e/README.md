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

# Run Pass 1 setup verification only
npm run e2e:test:setup
```

## Test Structure

### Pass 1: Setup Verification (`pass1-setup-verification.test.ts`)
Validates that:
- App launches successfully
- App starts in guest state
- Mock auth service works correctly
- Test helper utilities function correctly

### Mock Services

Located in `e2e/mocks/`:
- `mockSupabaseAuth.ts` - In-memory Supabase auth mock for testing

### Test Utilities

Located in `e2e/utils/`:
- `testHelpers.ts` - Reusable test helper functions

### Configuration

- `detox.config.js` - Detox configuration (root directory)
- `e2e/jest.config.js` - Jest configuration for E2E tests
- `e2e/setup.ts` - Global test setup and teardown

## Test Phases

### Pass 1: Setup ✅
- Detox configuration
- Mock Supabase auth service
- Test utilities
- Verification tests

### Pass 2: Auth Flow Validation (Next)
- Launch → Onboarding → Login → Dashboard
- Launch → Signup → MFA Enrollment → Dashboard
- Logout → Back to Guest state

### Pass 3: Study Flow Validation (Upcoming)
- Dashboard → TaskCard → StudySession → Result
- StudySession → Pause → Resume → Complete

### Pass 4: Profile Flow Validation (Upcoming)
- Dashboard → Profile → Settings → Back
- Settings → DeviceManagement → LoginHistory → Back

### Pass 5: Error and Edge Cases (Upcoming)
- Session expiration redirect
- Offline state handling
- Rapid tab switching

## Reports

Test reports are generated in `e2e/reports/`:
- `setup-verification-report.json` - Pass 1 results
- `e2e-report.json` - Final comprehensive report (Pass 6)

## Notes

- Tests use mock Supabase client (no real API calls)
- App runs in light mode only for consistency
- iOS Simulator: iPhone 14
- All tests run in non-interactive mode

