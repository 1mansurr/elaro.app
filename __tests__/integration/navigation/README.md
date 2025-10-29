# Navigation Integration Tests

Integration tests for navigation flows that validate actual navigation calls.

## Test Files

### `NavigationFlows.test.tsx`
Integration tests that validate:
- StudySessionReview navigation from NextTaskCard
- PaywallScreen navigation via SafeNavigation
- OddityWelcomeScreen navigation after purchase
- Complete navigation flows (StudySessionReview → StudyResult, PaywallScreen → OddityWelcomeScreen)

## Running Tests

```bash
# Run all navigation integration tests
npm run test:integration -- __tests__/integration/navigation

# Run specific test file
npm run test:integration -- __tests__/integration/navigation/NavigationFlows.test.tsx
```

## Test Coverage

These tests validate:
1. Navigation calls are made with correct route names
2. Navigation parameters match expected types
3. Navigation flows work end-to-end
4. SafeNavigation utility works correctly

