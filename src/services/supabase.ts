import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';
import {
  executeSupabaseQuery,
  executeSupabaseQueryNullable,
  executeSupabaseMutation,
} from '@/utils/supabaseQueryWrapper';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Custom fetch wrapper that enforces a timeout on all requests.
 * Uses AbortController to cancel requests that exceed the timeout duration.
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (same as native fetch)
 * @param timeoutMs - Timeout duration in milliseconds (default: 15000ms / 15 seconds)
 * @returns Promise<Response> - The fetch response
 * @throws Error - If the request times out
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 15000,
): Promise<Response> => {
  // Create an AbortController for this request
  const controller = new AbortController();

  // Set up a timeout that will abort the request
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    // Make the fetch request with the abort signal
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    // Clear the timeout if the request completes successfully
    clearTimeout(timeoutId);

    return response;
  } catch (error: unknown) {
    // Clear the timeout on error
    clearTimeout(timeoutId);

    // Check if the error is due to timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Request timeout: The server did not respond within ${timeoutMs}ms`,
      );
    }

    // Re-throw other errors
    throw error;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fetchWithTimeout as unknown as typeof fetch,
  },
});

// Authentication Services
export const authService = {
  async signUp(email: string, password: string, name?: string) {
    const data = await executeSupabaseQuery(
      async () => {
        const result = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
          },
        });
        return { data: result.data, error: result.error };
      },
      {
        operationName: 'auth_signUp',
        retryOnFailure: true,
        maxRetries: 2, // Lower retries for auth operations
      },
    );

    // Create user profile
    if (data.user) {
      await this.createUserProfile(data.user.id, email, name);
    }

    return data;
  },

  async signIn(email: string, password: string) {
    return await executeSupabaseQuery(
      async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        return { data, error };
      },
      {
        operationName: 'auth_signIn',
        retryOnFailure: true,
        maxRetries: 2,
      },
    );
  },

  async signOut() {
    await executeSupabaseQuery(
      async () => {
        const { error } = await supabase.auth.signOut();
        return { data: null, error };
      },
      {
        operationName: 'auth_signOut',
        retryOnFailure: false, // Sign out should not retry
        maxRetries: 1,
      },
    );
  },

  async getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  },

  async createUserProfile(userId: string, email: string, name?: string) {
    await executeSupabaseMutation(
      async () => {
        const { error } = await supabase.from('users').insert({
          id: userId,
          email,
          name,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        return { data: null, error };
      },
      {
        operationName: 'createUserProfile',
        retryOnFailure: false, // No retry for mutations (idempotency concerns)
      },
    );
  },

  async getUserProfile(userId: string): Promise<User | null> {
    const data = await executeSupabaseQueryNullable(
      async () => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        return { data, error };
      },
      {
        operationName: 'getUserProfile',
        retryOnFailure: true,
      },
    );

    if (!data) return null;

    // Type guard for Supabase user data row
    interface SupabaseUserRow {
      id: string;
      email?: string;
      name?: string;
      first_name?: string;
      last_name?: string;
      university?: string;
      program?: string;
      role?: string;
      onboarding_completed?: boolean;
      subscription_tier?: string | null;
      subscription_status?: string | null;
      subscription_expires_at?: string | null;
      account_status?: string;
      deleted_at?: string | null;
      deletion_scheduled_at?: string | null;
      suspension_end_date?: string | null;
      created_at: string;
      updated_at: string;
    }

    const row = data as SupabaseUserRow;

    const userProfile: User = {
      id: row.id,
      email: row.email ?? '',
      name: row.name,
      first_name: row.first_name,
      last_name: row.last_name,
      university: row.university,
      program: row.program,
      role: (row.role as 'user' | 'admin') ?? 'user', // Default to 'user' role
      onboarding_completed: row.onboarding_completed ?? false,
      subscription_tier:
        (row.subscription_tier as 'free' | 'oddity' | null) ?? null,
      subscription_status:
        (row.subscription_status as
          | 'trialing'
          | 'active'
          | 'past_due'
          | 'canceled'
          | null) ?? null,
      subscription_expires_at: row.subscription_expires_at ?? null,
      account_status:
        (row.account_status as 'active' | 'deleted' | 'suspended') ?? 'active',
      deleted_at: row.deleted_at ?? null,
      deletion_scheduled_at: row.deletion_scheduled_at ?? null,
      suspension_end_date: row.suspension_end_date ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user_metadata: {
        first_name: row.first_name,
        last_name: row.last_name,
        name: row.name,
        university: row.university,
        program: row.program,
      },
    };

    return userProfile;
  },

  async updateUserProfile(userId: string, updates: Partial<User>) {
    await executeSupabaseMutation(
      async () => {
        const { error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', userId);
        return { data: null, error };
      },
      {
        operationName: 'updateUserProfile',
        retryOnFailure: false, // No retry for mutations
      },
    );
  },
};

// Study Session Services - removed (uses deleted StudySession type)
export const sessionService = {
  // Methods removed as they reference deleted StudySession type
};

// Task/Event Services - removed (uses deleted TaskEvent type)
export const taskService = {
  // Methods removed as they reference deleted TaskEvent type
};

// Spaced Repetition Services - removed (uses deleted SpacedRepetitionReminder type)
export const srService = {
  // Methods removed as they reference deleted SpacedRepetitionReminder type
};

// TODO: Streak service logic was here. Re-implement from scratch if/when streaks are reintroduced.

// Analytics Services - removed (uses deleted UserEvent type)
export const analyticsService = {
  // Methods removed as they reference deleted UserEvent type
};

// Subscription Services - removed (uses deleted Subscription type)
export const subscriptionService = {
  // Methods removed as they reference deleted Subscription type
};

// Utility Functions
export const dbUtils = {
  async deleteUserAccount(userId: string) {
    // Delete in order to respect foreign key constraints
    await supabase
      .from('spaced_repetition_reminders')
      .delete()
      .eq('user_id', userId);
    await supabase.from('user_events').delete().eq('user_id', userId);
    await supabase.from('study_sessions').delete().eq('user_id', userId);
    await supabase.from('streaks').delete().eq('user_id', userId);
    await supabase.from('users').delete().eq('id', userId);

    // Delete auth user
    await supabase.auth.admin.deleteUser(userId);
  },

  async getUserStats(userId: string) {
    // Simplified stats - services removed due to deleted types
    return {
      totalSessions: 0,
      completedSessions: 0,
      totalTasks: 0,
      completedTasks: 0,
      activeReminders: 0,
    };
  },
};
