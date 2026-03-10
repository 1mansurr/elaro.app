/**
 * Master E2E Test Runner - Priority Order
 *
 * Runs all critical tests in priority order:
 * 1. Authentication & Onboarding
 * 2. Course Creation
 * 3. Lecture Creation (the error we found)
 * 4. Assignment Creation
 * 5. Home Screen & Task Display
 * 6. Calendar View
 * 7. Study Sessions
 * 8. Templates
 * 9. Offline Functionality
 * 10. Notifications
 * 11. Profile/Settings
 */

import { device } from 'detox';
import { TestHelpers } from './utils/testHelpers';

describe('ELARO Priority Test Suite', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: {
        notifications: 'YES',
        camera: 'YES',
        photos: 'YES',
      },
    });
  });

  // Priority 1: Authentication & Onboarding
  describe('Priority 1: Authentication & Onboarding', () => {
    require('./pass2-auth-flow-validation.test');
    require('./core-journeys/onboarding-complete.e2e');
  });

  // Priority 2: Course Creation
  describe('Priority 2: Course Creation', () => {
    require('./core-journeys/course-creation.e2e');
  });

  // Priority 3: Lecture Creation (THE ERROR WE FOUND)
  describe('Priority 3: Lecture Creation', () => {
    require('./core-journeys/lecture-creation.e2e');
  });

  // Priority 4: Assignment Creation
  describe('Priority 4: Assignment Creation', () => {
    require('./core-journeys/assignment-lifecycle.e2e');
  });

  // Priority 5: Home Screen & Task Display
  describe('Priority 5: Home Screen & Task Display', () => {
    require('./core-journeys/home-screen-display.e2e');
  });

  // Priority 6: Calendar View
  describe('Priority 6: Calendar View', () => {
    require('./core-journeys/calendar-view.e2e');
  });

  // Priority 7: Study Sessions
  describe('Priority 7: Study Sessions', () => {
    require('./core-journeys/study-session-complete.e2e');
  });

  // Priority 8: Templates
  describe('Priority 8: Templates', () => {
    require('./core-journeys/templates.e2e');
  });

  // Priority 9: Offline Functionality
  describe('Priority 9: Offline Functionality', () => {
    require('./core-journeys/offline-recovery.e2e');
  });

  // Priority 10: Notifications
  describe('Priority 10: Notifications', () => {
    require('./core-journeys/notification-flow.e2e');
  });

  // Priority 11: Profile/Settings
  describe('Priority 11: Profile & Settings', () => {
    require('./core-journeys/profile-settings.e2e');
  });
});
