/**
 * Auth State Synchronization Service
 *
 * Manages synchronization between:
 * - Supabase auth session
 * - Global AuthContext state
 * - Secure local storage (for sensitive tokens)
 *
 * NOTE: This service uses minimal direct Supabase auth calls (getSession, onAuthStateChange)
 * which are acceptable for low-level session management. These cannot be easily abstracted
 * as they are core Supabase auth features needed for session synchronization.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';
import { cache } from '@/utils/cache';

// Storage keys
const AUTH_STATE_KEY = '@elaro_auth_state_v1';
const SESSION_TOKEN_KEY = 'auth_session_token'; // SecureStore

interface AuthStateSnapshot {
  session: Session | null;
  userId: string | null;
  lastSyncedAt: number;
  version: string;
}

const AUTH_STATE_VERSION = 'v1';

/**
 * AuthSyncService - Centralized auth state synchronization
 */
class AuthSyncService {
  private listeners: Set<(session: Session | null) => void> = new Set();
  private isInitialized = false;

  /**
   * Initialize auth sync
   * Loads session from Supabase storage and syncs with local cache
   */
  async initialize(): Promise<Session | null> {
    if (this.isInitialized) {
      return await this.getCurrentSession();
    }

    console.log('🔄 AuthSync: Initializing...');

    try {
      // 1. Get session from Supabase (primary source of truth)
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ AuthSync: Failed to get session:', error);
        await this.clearAuthState();
        return null;
      }

      // 2. Sync to local cache
      if (session) {
        await this.saveAuthState(session);
        await this.notifyListeners(session);
      } else {
        await this.clearAuthState();
      }

      this.isInitialized = true;
      console.log(
        '✅ AuthSync: Initialized',
        session ? `(user: ${session.user.id})` : '(no session)',
      );

      return session;
    } catch (error) {
      console.error('❌ AuthSync: Initialization error:', error);
      return null;
    }
  }

  /**
   * Save auth state to local storage
   */
  async saveAuthState(session: Session | null): Promise<void> {
    try {
      const snapshot: AuthStateSnapshot = {
        session,
        userId: session?.user?.id || null,
        lastSyncedAt: Date.now(),
        version: AUTH_STATE_VERSION,
      };

      // Save non-sensitive state to AsyncStorage
      await AsyncStorage.setItem(
        AUTH_STATE_KEY,
        JSON.stringify({
          userId: snapshot.userId,
          lastSyncedAt: snapshot.lastSyncedAt,
          version: snapshot.version,
          expiresAt: session?.expires_at || null,
        }),
      );

      // Save sensitive token to SecureStore (if session exists)
      if (session?.access_token) {
        await SecureStore.setItemAsync(SESSION_TOKEN_KEY, session.access_token);
      } else {
        await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
      }

      // Cache user profile reference (non-sensitive)
      if (session?.user?.id) {
        await cache.setMedium('auth:user_id', session.user.id);
      }

      console.log('💾 AuthSync: State saved to local storage');
    } catch (error) {
      console.error('❌ AuthSync: Failed to save state:', error);
    }
  }

  /**
   * Get current session from Supabase (primary source)
   */
  async getCurrentSession(): Promise<Session | null> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error('❌ AuthSync: Failed to get session:', error);
        return null;
      }
      return session;
    } catch (error) {
      console.error('❌ AuthSync: Error getting session:', error);
      return null;
    }
  }

  /**
   * Get cached auth state (for fast initial load)
   */
  async getCachedAuthState(): Promise<{
    userId: string | null;
    lastSyncedAt: number;
  } | null> {
    try {
      const cached = await AsyncStorage.getItem(AUTH_STATE_KEY);
      if (!cached) return null;

      // Guard: Only parse if cached is valid
      if (!cached.trim() || cached === 'undefined' || cached === 'null') {
        return null;
      }

      let state: AuthStateSnapshot;
      try {
        state = JSON.parse(cached);
      } catch {
        return null;
      }

      // Check version
      if (state.version !== AUTH_STATE_VERSION) {
        console.log('⚠️ AuthSync: Version mismatch, clearing old state');
        await this.clearAuthState();
        return null;
      }

      // Check expiration (if token expired, clear cache)
      const expiresAt = state.session?.expires_at;
      if (expiresAt && Date.now() / 1000 > expiresAt) {
        console.log('⏰ AuthSync: Cached token expired, clearing');
        await this.clearAuthState();
        return null;
      }

      return {
        userId: state.userId,
        lastSyncedAt: state.lastSyncedAt,
      };
    } catch (error) {
      console.error('❌ AuthSync: Failed to get cached state:', error);
      return null;
    }
  }

  /**
   * Clear all auth state
   */
  async clearAuthState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(AUTH_STATE_KEY);
      await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
      await cache.remove('auth:user_id');
      await this.notifyListeners(null);
      console.log('🗑️ AuthSync: Auth state cleared');
    } catch (error) {
      console.error('❌ AuthSync: Failed to clear state:', error);
    }
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthChange(callback: (session: Session | null) => void): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of session change
   */
  private async notifyListeners(session: Session | null): Promise<void> {
    this.listeners.forEach(callback => {
      try {
        callback(session);
      } catch (error) {
        console.error('❌ AuthSync: Listener error:', error);
      }
    });
  }

  /**
   * Force refresh session from Supabase
   */
  async refreshSession(): Promise<Session | null> {
    console.log('🔄 AuthSync: Refreshing session...');

    try {
      // Supabase auto-refreshes, so just get the latest
      const session = await this.getCurrentSession();

      if (session) {
        await this.saveAuthState(session);
        await this.notifyListeners(session);
      } else {
        await this.clearAuthState();
      }

      return session;
    } catch (error) {
      console.error('❌ AuthSync: Failed to refresh session:', error);
      return null;
    }
  }

  /**
   * Handle app resume (check session validity)
   */
  async onAppResume(): Promise<Session | null> {
    console.log('📱 AuthSync: App resumed, checking session...');

    const cached = await this.getCachedAuthState();

    if (!cached) {
      // No cached state, verify with Supabase
      return await this.refreshSession();
    }

    // Check if session needs refresh (synced more than 5 minutes ago)
    const timeSinceSync = Date.now() - cached.lastSyncedAt;
    if (timeSinceSync > 5 * 60 * 1000) {
      console.log('⏰ AuthSync: Cache stale, refreshing from Supabase');
      return await this.refreshSession();
    }

    // Quick path: get session from Supabase (but don't force full refresh)
    const session = await this.getCurrentSession();

    if (session && session.user.id === cached.userId) {
      // Still valid, update cache timestamp
      await this.saveAuthState(session);
      return session;
    } else {
      // User changed or session invalid, clear and refresh
      await this.clearAuthState();
      return await this.refreshSession();
    }
  }
}

export const authSyncService = new AuthSyncService();
