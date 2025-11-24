# Navigation Tests

This directory contains tests for navigation routes and flows.

## Test Files

### `NavigationRoutes.test.ts`

Unit tests that validate:

- StudySessionReview route registration and parameter types
- PaywallScreen route registration and optional parameters
- OddityWelcomeScreen route registration and variant types
- Type safety for all navigation routes

### `RouteRegistration.test.ts`

Validates that all critical routes are properly registered:

- Study flow routes (StudySessionReview, StudyResult)
- Subscription flow routes (PaywallScreen, OddityWelcomeScreen)
- Deprecated routes cleanup (TaskCreationFlow removal)

## Running Tests

```bash
# Run all navigation unit tests
npm run test:unit -- __tests__/unit/navigation

# Run specific test file
npm run test:unit -- __tests__/unit/navigation/NavigationRoutes.test.ts
npm run test:unit -- __tests__/unit/navigation/RouteRegistration.test.ts

# Run with coverage
npm run test:coverage -- __tests__/unit/navigation
```
