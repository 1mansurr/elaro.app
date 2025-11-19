/**
 * Complete Navigation Flow E2E Test
 *
 * Tests the complete user journey:
 * Launch → Auth → Onboarding → Main App
 */

describe('Complete Navigation Flow', () => {
  beforeAll(async () => {
    // Setup: Clear any existing auth state
    // This would typically clear AsyncStorage or reset app state
  });

  afterAll(async () => {
    // Cleanup: Reset app state
  });

  it('should navigate: Launch → Auth → Onboarding → Main', async () => {
    // 1. Launch screen should be visible initially
    await expect(element(by.id('launch-screen'))).toBeVisible();

    // 2. Wait for auth check to complete
    // Should show Auth screen for unauthenticated users
    await waitFor(element(by.id('auth-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // 3. Switch to signup mode if needed (using toggle button)
    // The toggle button switches between signup and signin
    await element(by.id('toggle-auth-mode-button')).tap();

    // 4. Fill signup form (using actual test IDs from AuthScreen)
    await element(by.id('first-name-input')).typeText('Test');
    await element(by.id('last-name-input')).typeText('User');
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('Test1234!');

    // Agree to terms (if checkbox exists)
    // Note: Terms checkbox may need testID added

    // 5. Submit signup
    await element(by.id('submit-button')).tap();

    // 6. Should navigate to Onboarding
    await waitFor(element(by.id('onboarding-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // 7. Complete onboarding steps
    // Step 1: Profile
    await element(by.id('onboarding-username-input')).typeText('testuser');
    await element(by.id('onboarding-next-button')).tap();

    // Step 2: Courses (can skip)
    await element(by.id('onboarding-skip-button')).tap();

    // 8. Should navigate to Main app
    await waitFor(element(by.id('main-tab-navigator')))
      .toBeVisible()
      .withTimeout(5000);

    // 9. Verify main app screens are accessible
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should restore navigation state after app restart', async () => {
    // Navigate to a specific screen
    await element(by.id('courses-tab')).tap();
    await expect(element(by.id('courses-screen'))).toBeVisible();

    // Simulate app restart (close and reopen)
    // This would typically use device.reloadReactNative() or similar
    await device.reloadReactNative();

    // Verify same screen is shown (if state restoration is working)
    // Note: This depends on navigation state persistence implementation
    await waitFor(element(by.id('courses-screen')))
      .toBeVisible()
      .withTimeout(3000);
  });

  it('should handle deep links correctly', async () => {
    // Test deep link to task detail
    const deepLink = 'elaro://task/study_session/123';
    await device.openURL({ url: deepLink });

    // Should navigate to task detail screen
    await waitFor(element(by.id('task-detail-screen')))
      .toBeVisible()
      .withTimeout(3000);
  });

  it('should prevent unauthenticated access to authenticated features', async () => {
    // Sign out first
    await element(by.id('account-tab')).tap();
    await element(by.id('logout-button')).tap();

    // Should return to Auth screen
    await expect(element(by.id('auth-screen'))).toBeVisible();

    // Try to access protected screen via deep link
    const deepLink = 'elaro://task/study_session/123';
    await device.openURL({ url: deepLink });

    // Should redirect to Auth, not show task detail
    await expect(element(by.id('task-detail-screen'))).not.toBeVisible();
    await expect(element(by.id('auth-screen'))).toBeVisible();
  });
});
