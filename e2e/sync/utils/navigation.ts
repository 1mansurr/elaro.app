/**
 * Navigation Helper Utilities for E2E Sync Tests
 * 
 * Provides utilities to navigate and verify navigation state
 */

import { device, element, by, waitFor } from 'detox';

export const navigation = {
  /**
   * Navigate to a specific screen by text or testID
   */
  async goTo(screenName: string, method: 'text' | 'testid' = 'text') {
    try {
      if (method === 'text') {
        await element(by.text(screenName)).tap();
      } else {
        await element(by.id(screenName)).tap();
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`⚠️ Could not navigate to ${screenName}:`, error);
    }
  },

  /**
   * Navigate through a series of screens
   */
  async navigateSequence(screens: string[]) {
    for (const screen of screens) {
      await this.goTo(screen);
    }
  },

  /**
   * Verify current screen by checking for element
   */
  async verifyScreen(screenId: string): Promise<boolean> {
    try {
      await waitFor(element(by.id(screenId)))
        .toBeVisible()
        .withTimeout(3000);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Navigate back using device back button
   */
  async goBack() {
    await device.pressBack();
    await new Promise(resolve => setTimeout(resolve, 500));
  },

  /**
   * Navigate to Dashboard/Home
   */
  async goToDashboard() {
    try {
      await element(by.text('Home')).tap();
      await waitFor(element(by.id('home-screen')))
        .toBeVisible()
        .withTimeout(3000);
    } catch {
      // Try alternative navigation
      await navigation.goTo('Main', 'testid');
    }
  },

  /**
   * Navigate to Profile
   */
  async goToProfile() {
    await navigation.goTo('Account');
    // Wait for account screen
    await new Promise(resolve => setTimeout(resolve, 1000));
  },

  /**
   * Navigate to Settings
   */
  async goToSettings() {
    try {
      // First go to account
      await navigation.goToProfile();
      // Then navigate to settings
      await element(by.id('settings-navigation-button')).tap();
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch {
      console.log('⚠️ Could not navigate to Settings');
    }
  },
};

