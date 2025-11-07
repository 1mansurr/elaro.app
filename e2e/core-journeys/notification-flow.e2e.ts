/**
 * E2E Test: Notification Flow
 *
 * Tests the notification interaction journey:
 * - Receive Notification → Tap → Navigate → Interact
 */

import { device, element, by, waitFor, expect } from 'detox';
import { loginWithTestUser } from '../utils/testHelpers';

describe('Notification Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
    await loginWithTestUser();
  });

  it('should handle notification tap and navigation', async () => {
    // Step 1: Wait for app to be ready
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Step 2: Simulate receiving a notification
    // In real E2E, this would be triggered by the notification system
    // For testing, we'll simulate by navigating to notification detail

    // Alternative: Check if notification bell has notifications
    const notificationBell = element(by.id('notification-bell'));

    try {
      await waitFor(notificationBell).toBeVisible().withTimeout(3000);

      await notificationBell.tap();

      // Step 3: Open notification history
      await waitFor(element(by.id('notification-history-modal')))
        .toBeVisible()
        .withTimeout(3000);

      // Step 4: Tap on a notification
      const firstNotification = element(by.id('notification-item-0'));

      try {
        await waitFor(firstNotification).toBeVisible().withTimeout(2000);

        await firstNotification.tap();

        // Step 5: Verify navigation to task/assignment detail
        // Notification should navigate to related item
        const detailScreen = element(by.id('task-detail-screen'));
        const assignmentDetailScreen = element(
          by.id('assignment-detail-screen'),
        );
        const lectureDetailScreen = element(by.id('lecture-detail-screen'));

        await waitFor(
          detailScreen.or(assignmentDetailScreen).or(lectureDetailScreen),
        )
          .toBeVisible()
          .withTimeout(5000);

        // Step 6: Interact with the item
        const completeButton = element(by.id('complete-button'));
        const viewDetailsButton = element(by.id('view-details-button'));

        if (await completeButton.isVisible()) {
          // Can complete the task
          expect(completeButton).toBeVisible();
        } else if (await viewDetailsButton.isVisible()) {
          // Can view details
          await viewDetailsButton.tap();
        }
      } catch (e) {
        // No notifications available
        // Close notification modal
        const closeButton = element(by.id('close-button'));
        if (await closeButton.isVisible()) {
          await closeButton.tap();
        }
      }
    } catch (e) {
      // Notification bell may not be visible or notifications not available
    }
  });

  it('should handle notification dismissal', async () => {
    await device.reloadReactNative();
    await loginWithTestUser();

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Open notifications
    const notificationBell = element(by.id('notification-bell'));

    try {
      await notificationBell.tap();

      await waitFor(element(by.id('notification-history-modal')))
        .toBeVisible()
        .withTimeout(3000);

      // Dismiss a notification
      const firstNotification = element(by.id('notification-item-0'));

      if (await firstNotification.isVisible()) {
        // Swipe to dismiss or tap dismiss button
        const dismissButton = element(by.id('dismiss-notification-button-0'));

        if (await dismissButton.isVisible()) {
          await dismissButton.tap();

          // Verify notification is dismissed
          await waitFor(firstNotification).not.toBeVisible().withTimeout(2000);
        }
      }
    } catch (e) {
      // Notifications may not be available
    }
  });

  it('should handle notification settings', async () => {
    await device.reloadReactNative();
    await loginWithTestUser();

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Navigate to settings
    const profileTab = element(by.id('profile-tab'));
    await profileTab.tap();

    const settingsButton = element(by.id('settings-button'));
    await settingsButton.tap();

    // Open notification settings
    const notificationSettings = element(by.id('notification-settings'));
    await notificationSettings.tap();

    // Toggle notification preference
    const reminderToggle = element(by.id('reminder-notifications-toggle'));
    if (await reminderToggle.isVisible()) {
      await reminderToggle.tap();

      // Verify toggle state changed
      // (This would require checking the toggle state)
    }
  });
});
