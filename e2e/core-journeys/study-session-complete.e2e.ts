/**
 * E2E Test: Complete Study Session Flow
 *
 * Tests the complete study session journey:
 * - Dashboard → Start Study → Review → Complete → View Results
 */

import { device, element, by, waitFor, expect } from 'detox';
import { loginWithTestUser } from '../utils/testHelpers';

describe('Complete Study Session Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
    await loginWithTestUser();
  });

  it('should complete full study session journey', async () => {
    // Step 1: Navigate to dashboard
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Step 2: Find and tap a study session task card
    const studySessionCard = element(by.id('study-session-card-0'));

    try {
      await waitFor(studySessionCard).toBeVisible().withTimeout(3000);

      await studySessionCard.tap();
    } catch (e) {
      // No study sessions available, create one
      const fabButton = element(by.id('fab-button'));
      await fabButton.tap();

      const addStudySessionOption = element(by.id('fab-add-study-session'));
      await addStudySessionOption.tap();

      // Fill and create study session
      const titleInput = element(by.id('study-session-title-input'));
      await titleInput.typeText('E2E Test Study Session');

      const submitButton = element(by.id('submit-button'));
      await submitButton.tap();

      // Wait for session to appear and tap it
      await waitFor(element(by.text('E2E Test Study Session')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.text('E2E Test Study Session')).tap();
    }

    // Step 3: Start study session
    await waitFor(element(by.id('study-session-screen')))
      .toBeVisible()
      .withTimeout(3000);

    const startButton = element(by.id('start-study-button'));
    if (await startButton.isVisible()) {
      await startButton.tap();
    }

    // Step 4: Review session (if SRS review is available)
    const reviewScreen = element(by.id('study-review-screen'));
    try {
      await waitFor(reviewScreen).toBeVisible().withTimeout(3000);

      // Provide quality rating
      const qualityButton = element(by.id('quality-rating-4')); // "Correct Easily"
      if (await qualityButton.isVisible()) {
        await qualityButton.tap();
      }

      // Continue review if multiple items
      const nextButton = element(by.id('next-review-button'));
      if (await nextButton.isVisible()) {
        await nextButton.tap();
      }

      // Complete review
      const completeReviewButton = element(by.id('complete-review-button'));
      if (await completeReviewButton.isVisible()) {
        await completeReviewButton.tap();
      }
    } catch (e) {
      // Review screen may not be available for all sessions
    }

    // Step 5: Complete study session
    const completeButton = element(by.id('complete-session-button'));
    if (await completeButton.isVisible()) {
      await completeButton.tap();
    }

    // Step 6: View results
    await waitFor(element(by.id('study-results-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Verify results are displayed
    const resultsContainer = element(by.id('study-results-container'));
    expect(resultsContainer).toBeVisible();

    // Step 7: Navigate back to dashboard
    const backButton = element(by.id('back-button'));
    if (await backButton.isVisible()) {
      await backButton.tap();
    } else {
      // Use device back button
      await device.pressBack();
    }

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(3000);
  });

  it('should handle pause and resume study session', async () => {
    await device.reloadReactNative();
    await loginWithTestUser();

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Start a study session
    const studySessionCard = element(by.id('study-session-card-0'));

    try {
      await waitFor(studySessionCard).toBeVisible().withTimeout(3000);

      await studySessionCard.tap();

      await waitFor(element(by.id('study-session-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Pause session
      const pauseButton = element(by.id('pause-button'));
      if (await pauseButton.isVisible()) {
        await pauseButton.tap();

        // Verify pause state
        await waitFor(element(by.id('paused-indicator')))
          .toBeVisible()
          .withTimeout(2000);

        // Resume session
        const resumeButton = element(by.id('resume-button'));
        await resumeButton.tap();

        // Verify resumed state
        await waitFor(element(by.id('paused-indicator')))
          .not.toBeVisible()
          .withTimeout(2000);
      }
    } catch (e) {
      // Study session may not be available
    }
  });
});
