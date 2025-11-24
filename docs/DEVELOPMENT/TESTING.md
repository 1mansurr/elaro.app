# Testing Guide

## Overview

This guide covers testing strategies, tools, and best practices for the ELARO application.

## Testing Strategy

### Test Types

1. **Unit Tests**: Component and utility function testing
2. **Integration Tests**: Feature-level testing
3. **E2E Tests**: Critical user flow testing
4. **RLS Tests**: Row Level Security policy testing

## Running Tests

### All Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# RLS tests
npm run test:rls

# E2E tests
npm run test:e2e
```

## Unit Testing

### Component Testing

```typescript
import { render, screen } from '@testing-library/react-native';
import { PrimaryButton } from '@/shared/components';

test('renders button with title', () => {
  render(<PrimaryButton title="Save" onPress={jest.fn()} />);
  expect(screen.getByText('Save')).toBeTruthy();
});
```

### Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useDebounce } from '@/hooks/useDebounce';

test('debounces value changes', async () => {
  const { result, rerender } = renderHook(
    ({ value }) => useDebounce(value, 500),
    { initialProps: { value: 'test' } },
  );

  rerender({ value: 'updated' });
  expect(result.current).toBe('test');

  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 600));
  });

  expect(result.current).toBe('updated');
});
```

### Utility Testing

```typescript
import { validatePassword } from '@/utils/passwordValidation';

test('validates strong password', () => {
  const result = validatePassword('StrongPass123!');
  expect(result.isValid).toBe(true);
  expect(result.strength).toBeGreaterThan(3);
});
```

## Integration Testing

### API Integration Tests

```typescript
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssignmentScreen } from '@/features/assignments';

test('loads and displays assignments', async () => {
  const queryClient = new QueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <AssignmentScreen />
    </QueryClientProvider>
  );

  await waitFor(() => {
    expect(screen.getByText('Assignment 1')).toBeTruthy();
  });
});
```

## RLS Testing

### Testing Row Level Security

```typescript
import { createClient } from '@supabase/supabase-js';

test('user cannot access other users assignments', async () => {
  const user1Client = createClient(url, user1Token);
  const user2Client = createClient(url, user2Token);

  // User 1 creates assignment
  const { data: assignment } = await user1Client
    .from('assignments')
    .insert({ title: 'Test Assignment' })
    .select()
    .single();

  // User 2 cannot see it
  const { data: assignments } = await user2Client.from('assignments').select();

  expect(assignments).not.toContainEqual(
    expect.objectContaining({ id: assignment.id }),
  );
});
```

## E2E Testing

### Detox Setup

```typescript
import { by, element, expect } from 'detox';

describe('Assignment Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should create and complete assignment', async () => {
    await element(by.id('add-assignment-button')).tap();
    await element(by.id('assignment-title-input')).typeText('Test Assignment');
    await element(by.id('save-button')).tap();
    await expect(element(by.text('Test Assignment'))).toBeVisible();
  });
});
```

## Test Best Practices

### ✅ DO

- **Write tests for critical paths** first
- **Test user interactions**, not implementation details
- **Use descriptive test names** that explain what is being tested
- **Keep tests isolated** - each test should be independent
- **Mock external dependencies** (APIs, services)
- **Test error cases** as well as success cases
- **Maintain test coverage** above 70% for critical code

### ❌ DON'T

- Don't test implementation details
- Don't write tests that depend on other tests
- Don't skip testing error cases
- Don't ignore flaky tests (fix them)
- Don't test third-party library code
- Don't write tests that are too complex

## Test Coverage

### Coverage Goals

- **Critical paths**: 90%+ coverage
- **Business logic**: 80%+ coverage
- **UI components**: 70%+ coverage
- **Utilities**: 90%+ coverage

### Generate Coverage Report

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

## Testing Checklist

- [ ] Unit tests for utilities
- [ ] Component tests for shared components
- [ ] Integration tests for features
- [ ] RLS tests for security
- [ ] E2E tests for critical flows
- [ ] Test coverage above 70%
- [ ] All tests passing
- [ ] No flaky tests

## Additional Resources

- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Detox E2E Testing](https://wix.github.io/Detox/)
