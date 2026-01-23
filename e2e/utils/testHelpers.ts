/**
 * E2E Test Helper Utilities
 */

import { device, element, by, waitFor } from 'detox';
import { mockSupabaseAuth } from '../mocks/mockSupabaseAuth';

export const TestHelpers = {
  /**
   * Ensure app launches in guest state
   */
  async ensureGuestState(): Promise<void> {
    // Reset auth state
    mockSupabaseAuth.reset();

    // Reload app to pick up guest state
    await device.reloadReactNative();

    // Wait a moment for app to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
  },

  /**
   * Wait for screen to be visible
   */
  async waitForScreen(screenId: string, timeout = 10000): Promise<void> {
    await waitFor(element(by.id(screenId)))
      .toBeVisible()
      .withTimeout(timeout);
  },

  /**
   * Wait for element to be visible (with flexible timeout)
   */
  async waitForElement(elementId: string, timeout = 10000): Promise<void> {
    await waitFor(element(by.id(elementId)))
      .toBeVisible()
      .withTimeout(timeout);
  },

  /**
   * Login with test credentials
   */
  async loginWithTestUser(): Promise<void> {
    const testUser = mockSupabaseAuth.getTestUser();

    // Wait for auth screen (if coming from guest home)
    await this.waitForElement('auth-screen', 5000).catch(() => {
      // Auth screen might already be visible, continue
    });

    // Toggle to sign in mode if needed (check if we're in signup mode)
    try {
      const signInText = element(by.text('Sign In'));
      await waitFor(signInText).toBeVisible().withTimeout(1000);
      // Already in sign in mode, continue
    } catch {
      // Might be in signup mode, try to toggle
      try {
        await element(by.id('toggle-auth-mode-button')).tap();
        await this.wait(500);
      } catch {
        // Already in sign in mode or toggle button not visible
      }
    }

    // Fill in email
    await element(by.id('email-input')).typeText(testUser.email);

    // Fill in password
    await element(by.id('password-input')).typeText(testUser.password);

    // Submit
    await element(by.id('submit-button')).tap();

    // Wait for navigation away from auth screen
    await this.wait(2000);
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    // This will be implemented in Pass 4 when we have Profile/Settings navigation
    // For now, using mock auth service directly
    mockSupabaseAuth.reset();
    await device.reloadReactNative();
    await this.waitForScreen('guest-home-screen', 5000);
  },

  /**
   * Take a screenshot (useful for debugging)
   */
  async takeScreenshot(name: string): Promise<void> {
    await device.takeScreenshot(name);
  },

  /**
   * Wait for a specific amount of time (useful for animations/transitions)
   */
  async wait(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  },
};

/**
 * Standalone export for loginWithTestUser for convenience
 */
export const loginWithTestUser = () => TestHelpers.loginWithTestUser();
