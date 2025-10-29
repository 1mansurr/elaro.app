/**
 * Global E2E Test Setup
 * Runs before all tests
 */

import { device } from 'detox';
import { mockSupabaseAuth } from './mocks/mockSupabaseAuth';

beforeAll(async () => {
  // Reset all auth state before test suite
  mockSupabaseAuth.reset();
  
  // Launch app
  await device.launchApp({
    newInstance: true,
    permissions: {
      notifications: 'YES',
      camera: 'YES',
      photos: 'YES',
    },
  });
});

beforeEach(async () => {
  // Reset auth state before each test
  mockSupabaseAuth.reset();
  
  // Reload app to ensure clean state
  await device.reloadReactNative();
  
  // Give app time to initialize
  await new Promise(resolve => setTimeout(resolve, 500));
});

afterAll(async () => {
  // Cleanup
  mockSupabaseAuth.reset();
});

