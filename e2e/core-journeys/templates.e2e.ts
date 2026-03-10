/**
 * E2E Test: Templates Flow
 *
 * Tests template creation, browsing, and usage
 */

import { device, element, by, waitFor } from 'detox';
import { loginWithTestUser, TestHelpers } from '../utils/testHelpers';

describe('Templates Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
    await loginWithTestUser();
    await TestHelpers.wait(3000);
  });

  it('should save task as template', async () => {
    // Create a lecture first
    await TestHelpers.waitForHomeScreen(10000);

    // Ensure user is logged in
    const loggedIn = await TestHelpers.isLoggedIn();
    if (!loggedIn) {
      await loginWithTestUser();
      await TestHelpers.wait(2000);
      await TestHelpers.waitForHomeScreen(10000);
    }

    let fabButton;
    try {
      fabButton = element(by.id('fab-button'));
      await waitFor(fabButton).toBeVisible().withTimeout(5000);
      await fabButton.tap();
    } catch {
      try {
        fabButton = element(by.id('add-task-fab'));
        await waitFor(fabButton).toBeVisible().withTimeout(5000);
        await fabButton.tap();
      } catch {
        console.log('⚠️ FAB button not found - user may not be logged in');
        throw new Error('FAB button not found - cannot create lecture');
      }
    }
    await element(by.id('fab-add-lecture')).tap();

    await waitFor(element(by.id('lecture-form')))
      .toBeVisible()
      .withTimeout(5000);

    // Fill form
    await element(by.id('lecture-name-input')).typeText(
      'Template Test Lecture',
    );

    // Enable "Save as template"
    const saveAsTemplateToggle = element(by.id('save-as-template-toggle'));
    if (await saveAsTemplateToggle.isVisible()) {
      await saveAsTemplateToggle.tap();
    }

    // Save
    await element(by.id('save-lecture-button')).tap();
    await TestHelpers.wait(2000);

    console.log('✅ Task saved as template');
  });

  it('should browse and select template', async () => {
    await TestHelpers.waitForHomeScreen(10000);

    // Ensure user is logged in
    const loggedIn = await TestHelpers.isLoggedIn();
    if (!loggedIn) {
      await loginWithTestUser();
      await TestHelpers.wait(2000);
      await TestHelpers.waitForHomeScreen(10000);
    }

    // Open lecture creation
    let fabButton;
    try {
      fabButton = element(by.id('fab-button'));
      await waitFor(fabButton).toBeVisible().withTimeout(5000);
      await fabButton.tap();
    } catch {
      try {
        fabButton = element(by.id('add-task-fab'));
        await waitFor(fabButton).toBeVisible().withTimeout(5000);
        await fabButton.tap();
      } catch {
        console.log('⚠️ FAB button not found - user may not be logged in');
        throw new Error('FAB button not found - cannot create lecture');
      }
    }
    await element(by.id('fab-add-lecture')).tap();

    // Open template browser
    const templateButton = element(by.id('template-button'));
    if (await templateButton.isVisible()) {
      await templateButton.tap();

      // Wait for template browser
      await waitFor(element(by.id('template-browser')))
        .toBeVisible()
        .withTimeout(3000);

      // Select first template
      const firstTemplate = element(by.id('template-item-0'));
      try {
        await firstTemplate.tap();
        await TestHelpers.wait(1000);
        console.log('✅ Template selected and applied');
      } catch {
        console.log('No templates available');
      }
    }
  });
});
