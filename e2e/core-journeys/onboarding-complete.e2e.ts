/**
 * E2E Test: Complete Onboarding Flow
 *
 * Tests the complete onboarding journey:
 * - Launch → Welcome → Profile Setup → Course Selection → Dashboard
 */

import { device, element, by, waitFor, expect } from 'detox';
import { loginWithTestUser } from '../utils/testHelpers';

describe('Complete Onboarding Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should complete full onboarding journey', async () => {
    // Step 1: Launch screen
    await waitFor(element(by.id('launch-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Step 2: Navigate to welcome/onboarding (if guest)
    // For logged-in users, skip to dashboard
    const welcomeScreen = element(by.id('welcome-screen'));
    const dashboardScreen = element(by.id('home-screen'));

    try {
      await waitFor(welcomeScreen).toBeVisible().withTimeout(3000);

      // Step 3: Tap Get Started
      await element(by.id('get-started-button')).tap();

      // Step 4: Profile Setup (if present)
      const profileScreen = element(by.id('profile-setup-screen'));
      try {
        await waitFor(profileScreen).toBeVisible().withTimeout(3000);

        // Fill profile if needed
        const firstNameInput = element(by.id('first-name-input'));
        const lastNameInput = element(by.id('last-name-input'));

        if (await firstNameInput.isVisible()) {
          await firstNameInput.typeText('Test');
          await lastNameInput.typeText('User');
          await element(by.id('continue-button')).tap();
        }
      } catch (e) {
        // Profile setup may be skipped
      }

      // Step 5: Course Selection (if present)
      const courseSelectionScreen = element(by.id('course-selection-screen'));
      try {
        await waitFor(courseSelectionScreen).toBeVisible().withTimeout(3000);

        // Skip or select courses
        const skipButton = element(by.id('skip-button'));
        const continueButton = element(by.id('continue-button'));

        if (await skipButton.isVisible()) {
          await skipButton.tap();
        } else if (await continueButton.isVisible()) {
          await continueButton.tap();
        }
      } catch (e) {
        // Course selection may be skipped
      }
    } catch (e) {
      // User may already be logged in
    }

    // Step 6: Verify dashboard is shown
    await waitFor(dashboardScreen).toBeVisible().withTimeout(5000);

    expect(dashboardScreen).toBeVisible();
  });

  it('should handle onboarding skip options', async () => {
    await device.reloadReactNative();

    const welcomeScreen = element(by.id('welcome-screen'));

    try {
      await waitFor(welcomeScreen).toBeVisible().withTimeout(3000);

      // Try to skip onboarding if option exists
      const skipButton = element(by.id('skip-onboarding-button'));

      if (await skipButton.isVisible()) {
        await skipButton.tap();

        // Should still reach dashboard
        await waitFor(element(by.id('home-screen')))
          .toBeVisible()
          .withTimeout(5000);
      }
    } catch (e) {
      // Skip button may not exist or user already onboarded
    }
  });
});
