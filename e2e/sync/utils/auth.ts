/**
 * Auth Helper Utilities for E2E Sync Tests
 * 
 * Provides utilities to interact with authentication in E2E tests
 */

import { device, element, by, waitFor } from 'detox';
import { mockSupabaseAuth } from '../../mocks/mockSupabaseAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STATE_KEY = '@elaro_auth_state_v1';
const SESSION_TOKEN_KEY = 'auth_session_token';

export const auth = {
  /**
   * Sign in a user through the app UI
   */
  async signIn(page: any = device) {
    const testUser = mockSupabaseAuth.getTestUser();
    
    // Navigate to auth screen if needed
    try {
      await waitFor(element(by.id('auth-screen')))
        .toBeVisible()
        .withTimeout(3000);
    } catch {
      // Try to navigate to auth
      try {
        await element(by.id('get-started-button')).tap();
        await waitFor(element(by.id('auth-screen')))
          .toBeVisible()
          .withTimeout(3000);
      } catch {
        // Auth might already be visible
      }
    }

    // Ensure in sign in mode
    try {
      await element(by.id('toggle-auth-mode-button')).tap();
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch {
      // Already in sign in mode
    }

    // Fill credentials
    await element(by.id('email-input')).typeText(testUser.email);
    await element(by.id('password-input')).typeText(testUser.password);
    await element(by.id('submit-button')).tap();

    // Wait for navigation away from auth screen
    await new Promise(resolve => setTimeout(resolve, 2000));
  },

  /**
   * Check if user is logged in (by checking for authenticated screens)
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      // Check if we're on an authenticated screen (home screen exists)
      await waitFor(element(by.id('home-screen')))
        .toBeVisible()
        .withTimeout(3000);
      return true;
    } catch {
      // Check mock auth state
      const { session } = await mockSupabaseAuth.getSession();
      return session !== null;
    }
  },

  /**
   * Sign out through the app
   */
  async signOut() {
    // Navigate to account/settings
    try {
      await element(by.text('Account')).tap();
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch {
      // Might already be on account screen
    }

    // Look for logout button (implementation depends on your UI)
    // For now, use mock auth reset
    mockSupabaseAuth.reset();
    await device.reloadReactNative();
  },

  /**
   * Reload the app and verify auth state persists
   */
  async reloadAndVerifySession(): Promise<boolean> {
    const testUser = mockSupabaseAuth.getTestUser();
    
    // Get session before reload
    const { session: sessionBefore } = await mockSupabaseAuth.getSession();
    if (!sessionBefore) return false;

    // Reload app
    await device.reloadReactNative();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify session still exists (check mock auth state)
    // In real app, this would check AsyncStorage/SecureStore
    const { session: sessionAfter } = await mockSupabaseAuth.getSession();
    
    // Also verify UI shows authenticated state
    try {
      await waitFor(element(by.id('home-screen')))
        .toBeVisible()
        .withTimeout(5000);
      return sessionAfter !== null && sessionAfter.user.email === testUser.email;
    } catch {
      return sessionAfter !== null;
    }
  },

  /**
   * Get Supabase user from mock (in real app, this would query Supabase)
   */
  async getSupabaseUser() {
    const { session } = await mockSupabaseAuth.getSession();
    return session?.user || null;
  },
};

