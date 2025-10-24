const { device, element, by, expect } = require('detox');

describe('Main App Functionality', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Navigation', () => {
    it('should navigate between main tabs', async () => {
      // Should start on home tab
      await expect(element(by.id('home-tab'))).toBeVisible();
      await expect(element(by.id('home-screen'))).toBeVisible();
      
      // Navigate to calendar tab
      await element(by.id('calendar-tab')).tap();
      await expect(element(by.id('calendar-screen'))).toBeVisible();
      
      // Navigate to profile tab
      await element(by.id('profile-tab')).tap();
      await expect(element(by.id('profile-screen'))).toBeVisible();
    });

    it('should maintain navigation state', async () => {
      // Navigate to calendar
      await element(by.id('calendar-tab')).tap();
      await expect(element(by.id('calendar-screen'))).toBeVisible();
      
      // Background and foreground app
      await device.sendToHome();
      await device.launchApp();
      
      // Should still be on calendar tab
      await expect(element(by.id('calendar-screen'))).toBeVisible();
    });
  });

  describe('Home Screen', () => {
    it('should display upcoming assignments', async () => {
      await expect(element(by.id('home-screen'))).toBeVisible();
      await expect(element(by.id('upcoming-assignments'))).toBeVisible();
      
      // Should show assignment cards
      await expect(element(by.id('assignment-card-1'))).toBeVisible();
    });

    it('should display study sessions', async () => {
      await expect(element(by.id('study-sessions-section'))).toBeVisible();
      await expect(element(by.id('study-session-card-1'))).toBeVisible();
    });

    it('should show add task button', async () => {
      await expect(element(by.id('add-task-fab'))).toBeVisible();
    });

    it('should open add task modal', async () => {
      await element(by.id('add-task-fab')).tap();
      await expect(element(by.id('add-task-modal'))).toBeVisible();
    });
  });

  describe('Add Task Flow', () => {
    beforeEach(async () => {
      // Open add task modal
      await element(by.id('add-task-fab')).tap();
      await expect(element(by.id('add-task-modal'))).toBeVisible();
    });

    it('should create new assignment', async () => {
      // Select assignment type
      await element(by.id('assignment-type-button')).tap();
      
      // Fill assignment details
      await element(by.id('task-title-input')).typeText('Test Assignment');
      await element(by.id('task-description-input')).typeText('This is a test assignment');
      await element(by.id('due-date-picker')).tap();
      await element(by.id('date-picker-confirm')).tap();
      
      // Select course
      await element(by.id('course-selector')).tap();
      await element(by.id('course-option-1')).tap();
      
      // Save assignment
      await element(by.id('save-task-button')).tap();
      
      // Modal should close and show success
      await expect(element(by.id('add-task-modal'))).not.toBeVisible();
      await expect(element(by.id('success-message'))).toBeVisible();
    });

    it('should create new study session', async () => {
      // Select study session type
      await element(by.id('study-session-type-button')).tap();
      
      // Fill session details
      await element(by.id('task-title-input')).typeText('Math Study Session');
      await element(by.id('session-duration-picker')).tap();
      await element(by.id('duration-60-min')).tap();
      
      // Select course
      await element(by.id('course-selector')).tap();
      await element(by.id('course-option-1')).tap();
      
      // Save session
      await element(by.id('save-task-button')).tap();
      
      // Should show success
      await expect(element(by.id('success-message'))).toBeVisible();
    });

    it('should validate required fields', async () => {
      // Try to save without filling required fields
      await element(by.id('save-task-button')).tap();
      
      // Should show validation errors
      await expect(element(by.id('validation-error'))).toBeVisible();
      await expect(element(by.text('Title is required'))).toBeVisible();
    });

    it('should cancel task creation', async () => {
      // Fill some data
      await element(by.id('task-title-input')).typeText('Test Task');
      
      // Cancel
      await element(by.id('cancel-task-button')).tap();
      
      // Modal should close without saving
      await expect(element(by.id('add-task-modal'))).not.toBeVisible();
    });
  });

  describe('Calendar Screen', () => {
    beforeEach(async () => {
      await element(by.id('calendar-tab')).tap();
      await expect(element(by.id('calendar-screen'))).toBeVisible();
    });

    it('should display calendar view', async () => {
      await expect(element(by.id('calendar-view'))).toBeVisible();
      await expect(element(by.id('calendar-header'))).toBeVisible();
    });

    it('should navigate between months', async () => {
      // Go to next month
      await element(by.id('next-month-button')).tap();
      
      // Go to previous month
      await element(by.id('prev-month-button')).tap();
    });

    it('should show events on calendar', async () => {
      // Should show assignment due dates
      await expect(element(by.id('calendar-event-1'))).toBeVisible();
      
      // Should show study sessions
      await expect(element(by.id('calendar-event-2'))).toBeVisible();
    });

    it('should handle date selection', async () => {
      // Tap on a date
      await element(by.id('calendar-date-15')).tap();
      
      // Should show events for that date
      await expect(element(by.id('selected-date-events'))).toBeVisible();
    });
  });

  describe('Profile Screen', () => {
    beforeEach(async () => {
      await element(by.id('profile-tab')).tap();
      await expect(element(by.id('profile-screen'))).toBeVisible();
    });

    it('should display user information', async () => {
      await expect(element(by.id('user-name'))).toBeVisible();
      await expect(element(by.id('user-email'))).toBeVisible();
      await expect(element(by.id('user-university'))).toBeVisible();
    });

    it('should show subscription status', async () => {
      await expect(element(by.id('subscription-status'))).toBeVisible();
      await expect(element(by.id('subscription-tier'))).toBeVisible();
    });

    it('should allow profile editing', async () => {
      await element(by.id('edit-profile-button')).tap();
      await expect(element(by.id('edit-profile-modal'))).toBeVisible();
      
      // Edit name
      await element(by.id('edit-first-name-input')).clearText();
      await element(by.id('edit-first-name-input')).typeText('Updated Name');
      
      // Save changes
      await element(by.id('save-profile-button')).tap();
      
      // Should show success
      await expect(element(by.id('success-message'))).toBeVisible();
    });

    it('should show settings options', async () => {
      await expect(element(by.id('settings-section'))).toBeVisible();
      await expect(element(by.id('notification-settings'))).toBeVisible();
      await expect(element(by.id('privacy-settings'))).toBeVisible();
    });
  });

  describe('Notifications', () => {
    it('should request notification permissions', async () => {
      // Should show permission request
      await expect(element(by.id('notification-permission-dialog'))).toBeVisible();
      
      // Grant permission
      await element(by.id('allow-notifications-button')).tap();
      
      // Permission dialog should disappear
      await expect(element(by.id('notification-permission-dialog'))).not.toBeVisible();
    });

    it('should handle notification settings', async () => {
      await element(by.id('profile-tab')).tap();
      await element(by.id('notification-settings')).tap();
      
      await expect(element(by.id('notification-settings-screen'))).toBeVisible();
      
      // Toggle notifications
      await element(by.id('notifications-toggle')).tap();
      
      // Set quiet hours
      await element(by.id('quiet-hours-toggle')).tap();
      await element(by.id('quiet-start-time')).tap();
      await element(by.id('time-picker-22-00')).tap();
      
      // Save settings
      await element(by.id('save-notification-settings')).tap();
      
      await expect(element(by.id('success-message'))).toBeVisible();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      await device.setURLBlacklist(['.*']);
      
      // Try to create a task
      await element(by.id('add-task-fab')).tap();
      await element(by.id('assignment-type-button')).tap();
      await element(by.id('task-title-input')).typeText('Test Assignment');
      await element(by.id('save-task-button')).tap();
      
      // Should show error message
      await expect(element(by.id('error-message'))).toBeVisible();
      await expect(element(by.text('Network error. Please check your connection.'))).toBeVisible();
      
      // Restore network
      await device.clearURLBlacklist();
    });

    it('should handle offline mode', async () => {
      // Go offline
      await device.setURLBlacklist(['.*']);
      
      // App should still function
      await expect(element(by.id('home-screen'))).toBeVisible();
      await expect(element(by.id('offline-indicator'))).toBeVisible();
      
      // Restore network
      await device.clearURLBlacklist();
    });
  });

  describe('Performance', () => {
    it('should load screens quickly', async () => {
      const startTime = Date.now();
      
      await element(by.id('calendar-tab')).tap();
      await expect(element(by.id('calendar-screen'))).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
    });

    it('should handle large data sets', async () => {
      // Navigate to assignments list
      await element(by.id('assignments-tab')).tap();
      
      // Should handle many assignments
      await expect(element(by.id('assignments-list'))).toBeVisible();
      
      // Scroll through list
      await element(by.id('assignments-list')).scroll(200, 'down');
      await element(by.id('assignments-list')).scroll(200, 'up');
    });
  });

  describe('Accessibility', () => {
    it('should support screen reader', async () => {
      await device.setAccessibilityMode(true);
      
      // Navigate through app with screen reader
      await expect(element(by.id('home-screen'))).toBeVisible();
      
      // Screen reader should announce content
      await expect(element(by.id('home-title'))).toBeVisible();
      
      await device.setAccessibilityMode(false);
    });

    it('should have proper focus management', async () => {
      // Navigate through interactive elements
      await element(by.id('add-task-fab')).tap();
      
      // First input should be focused
      await expect(element(by.id('task-title-input'))).toBeFocused();
    });
  });
});
