# 🧪 ELARO Testing Suite

This directory contains the comprehensive testing infrastructure for the ELARO app, implementing automated testing to replace the manual 474-line testing checklist.

## 📁 Directory Structure

```
__tests__/
├── setup/
│   ├── jest-setup.ts              # Jest configuration and mocks
│   └── integration-setup.ts       # Integration test setup
├── unit/
│   └── services/
│       ├── NotificationService.test.ts
│       ├── PermissionService.test.ts
│       └── SupabaseService.test.ts
├── integration/
│   └── api/
│       └── assignments.test.ts
├── utils/
│   └── testUtils.ts               # Test utilities and mocks
└── README.md                       # This file
```

## 🎯 Testing Strategy

### **Unit Tests** (Target: 80% coverage)
- **Services**: Core business logic and data operations
- **Components**: React components and hooks
- **Utilities**: Helper functions and data transformations
- **Hooks**: Custom React hooks

### **Integration Tests** (Target: 70% coverage)
- **API Endpoints**: Backend API functionality
- **Service Integration**: Cross-service communication
- **Database Operations**: Data persistence and retrieval
- **External Services**: Third-party integrations

### **E2E Tests** (Critical user flows)
- **Onboarding Flow**: Complete user onboarding process
- **Main App Navigation**: Core app functionality
- **Authentication**: Sign up, sign in, sign out
- **Task Management**: Create, update, delete tasks
- **Notifications**: Permission and delivery

## 🚀 Running Tests

### **All Tests**
```bash
npm run test:all
```

### **Unit Tests Only**
```bash
npm run test:unit
```

### **Integration Tests Only**
```bash
npm run test:integration
```

### **Coverage Report**
```bash
npm run test:coverage
```

### **Watch Mode**
```bash
npm run test:watch
```

### **CI Mode**
```bash
npm run test:ci
```

### **E2E Tests**
```bash
# iOS
npm run e2e:build:ios
npm run e2e:test:ios

# Android
npm run e2e:build:android
npm run e2e:test:android
```

## 📊 Coverage Targets

| Component | Target Coverage |
|-----------|----------------|
| **Global** | 85% |
| **Services** | 90% |
| **Auth/Permissions** | 95% |
| **Notifications** | 90% |
| **API Integration** | 70% |

## 🛠️ Test Utilities

### **Mock Data Factories**
```typescript
import { createMockUser, createMockAssignment } from '@tests/utils/testUtils';

const user = createMockUser({ subscription_tier: 'premium' });
const assignment = createMockAssignment({ title: 'Test Assignment' });
```

### **Mock Services**
```typescript
import { createMockSupabaseClient } from '@tests/utils/testUtils';

const mockSupabase = createMockSupabaseClient({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockResolvedValue({ data: [], error: null })
});
```

### **Assertion Helpers**
```typescript
import { expectToBeCalledWith, expectToThrow } from '@tests/utils/testUtils';

expectToBeCalledWith(mockFn, expectedArgs);
await expectToThrow(asyncFn, 'Expected error message');
```

## 🧩 Test Categories

### **Unit Tests**
- **Service Tests**: Business logic validation
- **Component Tests**: UI component behavior
- **Hook Tests**: Custom hook functionality
- **Utility Tests**: Helper function validation

### **Integration Tests**
- **API Tests**: Backend endpoint functionality
- **Database Tests**: Data persistence operations
- **Service Tests**: Cross-service communication
- **External Service Tests**: Third-party integrations

### **E2E Tests**
- **User Flow Tests**: Complete user journeys
- **Navigation Tests**: App navigation functionality
- **Performance Tests**: App performance validation
- **Accessibility Tests**: Screen reader and accessibility

## 🔧 Configuration Files

### **Jest Configuration**
- `jest.config.js` - Main Jest configuration
- `jest.config.integration.js` - Integration test configuration
- `jest.config.coverage.js` - Coverage-specific configuration

### **Test Setup**
- `__tests__/setup/jest-setup.ts` - Global test setup and mocks
- `__tests__/setup/integration-setup.ts` - Integration test setup

## 📈 CI/CD Integration

### **GitHub Actions**
- **Unit Tests**: Run on every push and PR
- **Integration Tests**: Run on every push and PR
- **E2E Tests**: Run on iOS and Android
- **Coverage Reports**: Generated and uploaded to Codecov
- **Security Scans**: Vulnerability checks
- **Performance Tests**: Bundle size and performance validation

### **Coverage Reports**
- **HTML Report**: `coverage/index.html`
- **LCOV Report**: `coverage/lcov.info`
- **JSON Report**: `coverage/coverage-final.json`
- **Text Summary**: Console output

## 🎯 Test Scenarios

### **Critical User Flows**
1. **Onboarding**: Complete user setup process
2. **Authentication**: Sign up, sign in, sign out
3. **Task Management**: Create, update, delete tasks
4. **Study Sessions**: Schedule and manage study time
5. **Notifications**: Permission and delivery
6. **Profile Management**: User profile updates

### **Error Scenarios**
1. **Network Errors**: Offline and timeout handling
2. **Validation Errors**: Form validation and error messages
3. **Permission Errors**: Access control and authorization
4. **Data Errors**: Invalid data handling
5. **Service Errors**: Third-party service failures

### **Performance Scenarios**
1. **Load Times**: Screen and component loading
2. **Memory Usage**: Memory leak detection
3. **Battery Impact**: Background task efficiency
4. **Network Usage**: Data consumption optimization

## 🔍 Debugging Tests

### **Verbose Output**
```bash
npm run test -- --verbose
```

### **Debug Specific Test**
```bash
npm run test -- --testNamePattern="specific test name"
```

### **Debug Coverage**
```bash
npm run test:coverage -- --verbose
```

### **Debug Integration Tests**
```bash
npm run test:integration -- --verbose --no-cache
```

## 📝 Writing Tests

### **Unit Test Example**
```typescript
describe('NotificationService', () => {
  let notificationService: NotificationService;
  
  beforeEach(() => {
    notificationService = NotificationService.getInstance();
  });
  
  it('should schedule notification successfully', async () => {
    const mockUser = createMockUser();
    const mockNotification = createMockNotification();
    
    const result = await notificationService.scheduleNotification(
      mockUser, 
      mockNotification
    );
    
    expect(result.success).toBe(true);
  });
});
```

### **Integration Test Example**
```typescript
describe('Assignments API', () => {
  it('should create assignment successfully', async () => {
    const response = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Assignment' })
    });
    
    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result.data.title).toBe('Test Assignment');
  });
});
```

### **E2E Test Example**
```typescript
describe('Onboarding Flow', () => {
  it('should complete onboarding successfully', async () => {
    await expect(element(by.id('welcome-screen'))).toBeVisible();
    await element(by.id('welcome-continue-button')).tap();
    await expect(element(by.id('profile-step'))).toBeVisible();
  });
});
```

## 🎉 Success Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Test Coverage** | 0% | 80% | 🟡 In Progress |
| **Unit Tests** | 3 | 50+ | 🟡 In Progress |
| **Integration Tests** | 1 | 20+ | 🟡 In Progress |
| **E2E Tests** | 1 | 10+ | 🟡 In Progress |
| **Manual Testing** | 474 lines | 50 lines | 🟡 In Progress |

## 🚀 Next Steps

1. **Complete Unit Tests**: Finish all service and component tests
2. **Expand Integration Tests**: Add more API and service tests
3. **Enhance E2E Tests**: Add more user flow scenarios
4. **Performance Tests**: Add performance and load testing
5. **Accessibility Tests**: Add comprehensive accessibility testing

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Status**: 🟡 In Progress
