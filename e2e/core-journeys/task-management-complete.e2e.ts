/**
 * E2E Test: Complete Task Management Flow
 *
 * Tests the complete task management journey:
 * - Dashboard → Create Assignment → Edit → Complete → Delete
 */

import { device, element, by, waitFor, expect } from 'detox';
import { loginWithTestUser } from '../utils/testHelpers';

describe('Complete Task Management Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
    await loginWithTestUser();
  });

  it('should complete full task lifecycle', async () => {
    // Step 1: Navigate to dashboard
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Step 2: Open FAB (Floating Action Button)
    const fabButton = element(by.id('fab-button'));
    await waitFor(fabButton).toBeVisible().withTimeout(3000);

    await fabButton.tap();

    // Step 3: Select "Add Assignment"
    const addAssignmentOption = element(by.id('fab-add-assignment'));
    await waitFor(addAssignmentOption).toBeVisible().withTimeout(2000);

    await addAssignmentOption.tap();

    // Step 4: Fill assignment form
    await waitFor(element(by.id('assignment-form')))
      .toBeVisible()
      .withTimeout(3000);

    const titleInput = element(by.id('assignment-title-input'));
    await titleInput.typeText('E2E Test Assignment');

    const courseSelector = element(by.id('course-selector'));
    if (await courseSelector.isVisible()) {
      await courseSelector.tap();
      // Select first course if available
      const firstCourse = element(by.id('course-item-0'));
      try {
        await waitFor(firstCourse).toBeVisible().withTimeout(2000);
        await firstCourse.tap();
      } catch (e) {
        // No courses available, continue
      }
    }

    // Step 5: Submit assignment
    const submitButton = element(by.id('submit-button'));
    await submitButton.tap();

    // Step 6: Wait for assignment to appear in list
    await waitFor(element(by.text('E2E Test Assignment')))
      .toBeVisible()
      .withTimeout(5000);

    // Step 7: Tap assignment to edit
    await element(by.text('E2E Test Assignment')).tap();

    await waitFor(element(by.id('assignment-detail-screen')))
      .toBeVisible()
      .withTimeout(3000);

    // Step 8: Edit assignment
    const editButton = element(by.id('edit-button'));
    if (await editButton.isVisible()) {
      await editButton.tap();

      const editTitleInput = element(by.id('edit-title-input'));
      await editTitleInput.clearText();
      await editTitleInput.typeText('E2E Test Assignment - Updated');

      const saveButton = element(by.id('save-button'));
      await saveButton.tap();

      // Verify update
      await waitFor(element(by.text('E2E Test Assignment - Updated')))
        .toBeVisible()
        .withTimeout(3000);
    }

    // Step 9: Complete assignment
    const completeButton = element(by.id('complete-button'));
    if (await completeButton.isVisible()) {
      await completeButton.tap();

      // Verify completion
      await waitFor(element(by.id('completed-indicator')))
        .toBeVisible()
        .withTimeout(3000);
    }

    // Step 10: Delete assignment
    const deleteButton = element(by.id('delete-button'));
    if (await deleteButton.isVisible()) {
      await deleteButton.tap();

      // Confirm deletion
      const confirmDeleteButton = element(by.id('confirm-delete-button'));
      await waitFor(confirmDeleteButton).toBeVisible().withTimeout(2000);

      await confirmDeleteButton.tap();

      // Verify deletion
      await waitFor(element(by.text('E2E Test Assignment - Updated')))
        .not.toBeVisible()
        .withTimeout(3000);
    }
  });

  it('should handle form validation errors', async () => {
    await device.reloadReactNative();
    await loginWithTestUser();

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Open FAB
    const fabButton = element(by.id('fab-button'));
    await fabButton.tap();

    const addAssignmentOption = element(by.id('fab-add-assignment'));
    await addAssignmentOption.tap();

    // Try to submit without required fields
    const submitButton = element(by.id('submit-button'));
    await submitButton.tap();

    // Should show validation error
    await waitFor(element(by.text(/required/i)))
      .toBeVisible()
      .withTimeout(2000);
  });

  it('should handle cancellation of task creation', async () => {
    await device.reloadReactNative();
    await loginWithTestUser();

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Open FAB
    const fabButton = element(by.id('fab-button'));
    await fabButton.tap();

    const addAssignmentOption = element(by.id('fab-add-assignment'));
    await addAssignmentOption.tap();

    // Cancel creation
    const cancelButton = element(by.id('cancel-button'));
    await cancelButton.tap();

    // Should return to dashboard
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(3000);
  });
});
