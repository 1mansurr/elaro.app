const { device, element, by, expect } = require('detox');

describe('Onboarding Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Complete Onboarding Flow', () => {
    it('should complete onboarding successfully', async () => {
      // Wait for welcome screen
      await expect(element(by.id('welcome-screen'))).toBeVisible();

      // Tap continue button
      await element(by.id('welcome-continue-button')).tap();

      // Wait for profile step
      await expect(element(by.id('profile-step'))).toBeVisible();

      // Fill in profile information
      await element(by.id('first-name-input')).typeText('John');
      await element(by.id('last-name-input')).typeText('Doe');
      await element(by.id('university-input')).typeText('Test University');
      await element(by.id('program-input')).typeText('Computer Science');

      // Tap next button
      await element(by.id('profile-next-button')).tap();

      // Wait for courses step
      await expect(element(by.id('courses-step'))).toBeVisible();

      // Add a course
      await element(by.id('add-course-button')).tap();
      await element(by.id('course-name-input')).typeText('Data Structures');
      await element(by.id('course-code-input')).typeText('CS201');
      await element(by.id('save-course-button')).tap();

      // Complete onboarding
      await element(by.id('complete-onboarding-button')).tap();

      // Should navigate to main app
      await expect(element(by.id('main-screen'))).toBeVisible();
    });

    it('should handle onboarding with skip courses', async () => {
      // Complete welcome and profile steps
      await element(by.id('welcome-continue-button')).tap();

      await element(by.id('first-name-input')).typeText('Jane');
      await element(by.id('last-name-input')).typeText('Smith');
      await element(by.id('university-input')).typeText('Another University');
      await element(by.id('program-input')).typeText('Mathematics');
      await element(by.id('profile-next-button')).tap();

      // Skip courses
      await element(by.id('skip-courses-button')).tap();

      // Should show confirmation dialog
      await expect(element(by.id('skip-confirmation-dialog'))).toBeVisible();
      await element(by.id('confirm-skip-button')).tap();

      // Should navigate to main app
      await expect(element(by.id('main-screen'))).toBeVisible();
    });

    it('should handle back navigation', async () => {
      // Go through welcome step
      await element(by.id('welcome-continue-button')).tap();

      // Go to profile step
      await element(by.id('first-name-input')).typeText('Test');
      await element(by.id('profile-next-button')).tap();

      // Go back to profile step
      await element(by.id('courses-back-button')).tap();
      await expect(element(by.id('profile-step'))).toBeVisible();

      // Go back to welcome step
      await element(by.id('profile-back-button')).tap();
      await expect(element(by.id('welcome-screen'))).toBeVisible();
    });

    it('should validate required fields', async () => {
      // Try to proceed without filling required fields
      await element(by.id('welcome-continue-button')).tap();
      await element(by.id('profile-next-button')).tap();

      // Should show validation error
      await expect(element(by.id('validation-error'))).toBeVisible();
      await expect(element(by.text('First name is required'))).toBeVisible();
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error
      await device.setURLBlacklist(['.*']);

      await element(by.id('welcome-continue-button')).tap();
      await element(by.id('first-name-input')).typeText('John');
      await element(by.id('last-name-input')).typeText('Doe');
      await element(by.id('university-input')).typeText('Test University');
      await element(by.id('program-input')).typeText('Computer Science');
      await element(by.id('profile-next-button')).tap();
      await element(by.id('complete-onboarding-button')).tap();

      // Should show error message
      await expect(element(by.id('error-message'))).toBeVisible();
      await expect(
        element(by.text('Network error. Please try again.')),
      ).toBeVisible();

      // Restore network
      await device.clearURLBlacklist();
    });
  });

  describe('Onboarding Progress', () => {
    it('should show correct progress indicator', async () => {
      // Welcome step - step 1 of 3
      await expect(element(by.id('progress-indicator'))).toBeVisible();
      await expect(element(by.text('Step 1 of 3'))).toBeVisible();

      await element(by.id('welcome-continue-button')).tap();

      // Profile step - step 2 of 3
      await expect(element(by.text('Step 2 of 3'))).toBeVisible();

      await element(by.id('first-name-input')).typeText('John');
      await element(by.id('last-name-input')).typeText('Doe');
      await element(by.id('university-input')).typeText('Test University');
      await element(by.id('program-input')).typeText('Computer Science');
      await element(by.id('profile-next-button')).tap();

      // Courses step - step 3 of 3
      await expect(element(by.text('Step 3 of 3'))).toBeVisible();
    });

    it('should show progress bar correctly', async () => {
      // Welcome step - 33% progress
      await expect(element(by.id('progress-bar'))).toBeVisible();

      await element(by.id('welcome-continue-button')).tap();

      // Profile step - 66% progress
      await expect(element(by.id('progress-bar'))).toBeVisible();

      await element(by.id('first-name-input')).typeText('John');
      await element(by.id('last-name-input')).typeText('Doe');
      await element(by.id('university-input')).typeText('Test University');
      await element(by.id('program-input')).typeText('Computer Science');
      await element(by.id('profile-next-button')).tap();

      // Courses step - 100% progress
      await expect(element(by.id('progress-bar'))).toBeVisible();
    });
  });

  describe('Onboarding Data Persistence', () => {
    it('should persist data between steps', async () => {
      // Fill profile data
      await element(by.id('welcome-continue-button')).tap();
      await element(by.id('first-name-input')).typeText('John');
      await element(by.id('last-name-input')).typeText('Doe');
      await element(by.id('university-input')).typeText('Test University');
      await element(by.id('program-input')).typeText('Computer Science');

      // Go to courses step
      await element(by.id('profile-next-button')).tap();

      // Go back to profile step
      await element(by.id('courses-back-button')).tap();

      // Data should still be there
      await expect(element(by.id('first-name-input'))).toHaveText('John');
      await expect(element(by.id('last-name-input'))).toHaveText('Doe');
      await expect(element(by.id('university-input'))).toHaveText(
        'Test University',
      );
      await expect(element(by.id('program-input'))).toHaveText(
        'Computer Science',
      );
    });

    it('should handle app backgrounding during onboarding', async () => {
      // Start onboarding
      await element(by.id('welcome-continue-button')).tap();
      await element(by.id('first-name-input')).typeText('John');

      // Background the app
      await device.sendToHome();
      await device.launchApp();

      // Should return to onboarding with data intact
      await expect(element(by.id('profile-step'))).toBeVisible();
      await expect(element(by.id('first-name-input'))).toHaveText('John');
    });
  });

  describe('Onboarding Accessibility', () => {
    it('should support screen reader navigation', async () => {
      // Enable screen reader
      await device.setAccessibilityMode(true);

      // Navigate through onboarding with screen reader
      await expect(element(by.id('welcome-screen'))).toBeVisible();

      // Screen reader should announce welcome message
      await expect(element(by.id('welcome-title'))).toBeVisible();

      await element(by.id('welcome-continue-button')).tap();

      // Screen reader should announce profile form
      await expect(element(by.id('profile-step'))).toBeVisible();
      await expect(element(by.id('first-name-label'))).toBeVisible();

      await device.setAccessibilityMode(false);
    });

    it('should have proper focus management', async () => {
      // Navigate through form fields
      await element(by.id('welcome-continue-button')).tap();

      // First name field should be focused
      await expect(element(by.id('first-name-input'))).toBeFocused();

      // Tab to next field
      await element(by.id('first-name-input')).typeText('John');
      await element(by.id('first-name-input')).tapReturnKey();

      // Last name field should be focused
      await expect(element(by.id('last-name-input'))).toBeFocused();
    });
  });
});
