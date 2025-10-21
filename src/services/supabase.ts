import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
} from '../types';

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
  timeoutMs: number = 15000
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
  } catch (error: any) {
    // Clear the timeout on error
    clearTimeout(timeoutId);
    
    // Check if the error is due to timeout
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout: The server did not respond within ${timeoutMs}ms`);
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) throw error;

    // Create user profile
    if (data.user) {
      await this.createUserProfile(data.user.id, email, name);
    }

    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  },

  async createUserProfile(userId: string, email: string, name?: string) {
    const { error } = await supabase.from('users').insert({
      id: userId,
      email,
      name,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    if (error) throw error;
  },

  async getUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    if (!data) return null;

    const userProfile: User = {
      id: (data as any).id,
      email: (data as any).email,
      name: (data as any).name,
      first_name: (data as any).first_name,
      last_name: (data as any).last_name,
      university: (data as any).university,
      program: (data as any).program,
      role: (data as any).role ?? 'user', // Default to 'user' role
      onboarding_completed: (data as any).onboarding_completed ?? false,
      subscription_tier: (data as any).subscription_tier ?? null,
      subscription_status: (data as any).subscription_status ?? null,
      subscription_expires_at: (data as any).subscription_expires_at ?? null,
      account_status: (data as any).account_status ?? 'active',
      deleted_at: (data as any).deleted_at ?? null,
      deletion_scheduled_at: (data as any).deletion_scheduled_at ?? null,
      suspension_end_date: (data as any).suspension_end_date ?? null,
      created_at: (data as any).created_at,
      updated_at: (data as any).updated_at,
      user_metadata: {
        first_name: (data as any).first_name,
        last_name: (data as any).last_name,
        name: (data as any).name,
        university: (data as any).university,
        program: (data as any).program,
      },
    };

    return userProfile;
  },

  async updateUserProfile(userId: string, updates: Partial<User>) {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
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
