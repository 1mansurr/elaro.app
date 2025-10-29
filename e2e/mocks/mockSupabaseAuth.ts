/**
 * Mock Supabase Auth Service for E2E Testing
 * Provides in-memory authentication state without real Supabase calls
 */

import { Session, User as SupabaseUser } from '@supabase/supabase-js';

export interface MockSession extends Session {
  expires_at?: number;
}

export interface MockAuthUser extends SupabaseUser {
  email: string;
}

class MockSupabaseAuth {
  private currentSession: MockSession | null = null;
  private currentUser: MockAuthUser | null = null;
  private users: Map<string, { email: string; password: string; firstName?: string; lastName?: string }> = new Map();
  private authStateCallbacks: Array<(event: string, session: Session | null) => void> = [];

  // Pre-seeded test user
  private readonly TEST_USER = {
    id: 'test-user-id-123',
    email: 'test@elaro.app',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
  };

  constructor() {
    // Pre-seed test user
    this.users.set(this.TEST_USER.email, {
      email: this.TEST_USER.email,
      password: this.TEST_USER.password,
      firstName: this.TEST_USER.firstName,
      lastName: this.TEST_USER.lastName,
    });
  }

  /**
   * Sign up a new user
   */
  async signUp(email: string, password: string, options?: { data?: { first_name?: string; last_name?: string } }): Promise<{ user: MockAuthUser | null; session: MockSession | null }> {
    if (this.users.has(email)) {
      throw new Error('User already registered');
    }

    const userId = `user-${Date.now()}`;
    const user: MockAuthUser = {
      id: userId,
      email,
      aud: 'authenticated',
      role: 'authenticated',
      email_confirmed_at: new Date().toISOString(),
      phone: null,
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {
        first_name: options?.data?.first_name,
        last_name: options?.data?.last_name,
      },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_anonymous: false,
    };

    const session: MockSession = {
      access_token: `mock-token-${userId}`,
      refresh_token: `mock-refresh-${userId}`,
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user,
    };

    this.users.set(email, { email, password, firstName: options?.data?.first_name, lastName: options?.data?.last_name });
    this.currentSession = session;
    this.currentUser = user;

    // Trigger auth state change
    this.notifyAuthStateChange('SIGNED_UP', session);

    return { user, session };
  }

  /**
   * Sign in with email and password
   */
  async signInWithPassword(email: string, password: string): Promise<{ user: MockAuthUser | null; session: MockSession | null }> {
    const storedUser = this.users.get(email);

    if (!storedUser || storedUser.password !== password) {
      throw new Error('Invalid email or password');
    }

    const userId = email === this.TEST_USER.email ? this.TEST_USER.id : `user-${Date.now()}`;
    const user: MockAuthUser = {
      id: userId,
      email,
      aud: 'authenticated',
      role: 'authenticated',
      email_confirmed_at: new Date().toISOString(),
      phone: null,
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {
        first_name: storedUser.firstName,
        last_name: storedUser.lastName,
      },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_anonymous: false,
    };

    const session: MockSession = {
      access_token: `mock-token-${userId}`,
      refresh_token: `mock-refresh-${userId}`,
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user,
    };

    this.currentSession = session;
    this.currentUser = user;

    // Trigger auth state change
    this.notifyAuthStateChange('SIGNED_IN', session);

    return { user, session };
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    const previousSession = this.currentSession;
    this.currentSession = null;
    this.currentUser = null;

    // Trigger auth state change
    this.notifyAuthStateChange('SIGNED_OUT', null);
  }

  /**
   * Get the current session
   */
  async getSession(): Promise<{ session: MockSession | null }> {
    return { session: this.currentSession };
  }

  /**
   * Get the current user
   */
  async getUser(): Promise<{ user: MockAuthUser | null }> {
    return { user: this.currentUser };
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: Session | null) => void): { data: { subscription: { unsubscribe: () => void } } } {
    this.authStateCallbacks.push(callback);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const index = this.authStateCallbacks.indexOf(callback);
            if (index > -1) {
              this.authStateCallbacks.splice(index, 1);
            }
          },
        },
      },
    };
  }

  /**
   * Notify all subscribers of auth state changes
   */
  private notifyAuthStateChange(event: string, session: Session | null): void {
    this.authStateCallbacks.forEach(callback => {
      try {
        callback(event, session);
      } catch (error) {
        console.error('Error in auth state callback:', error);
      }
    });
  }

  /**
   * Reset auth state (for test cleanup)
   */
  reset(): void {
    this.currentSession = null;
    this.currentUser = null;
    this.notifyAuthStateChange('SIGNED_OUT', null);
  }

  /**
   * Get test user credentials
   */
  getTestUser() {
    return {
      email: this.TEST_USER.email,
      password: this.TEST_USER.password,
      firstName: this.TEST_USER.firstName,
      lastName: this.TEST_USER.lastName,
    };
  }
}

// Singleton instance
export const mockSupabaseAuth = new MockSupabaseAuth();

