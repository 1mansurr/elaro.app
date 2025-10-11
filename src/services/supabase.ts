import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
} from '../types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
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
      .select(`
        *,
        subscriptions (
          subscription_tier,
          subscription_status,
          subscription_expires_at
        )
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile with subscription:', error);
      return null;
    }

    if (!data) return null;

    // Flatten subscription (array) into single record
    const subscriptionData = Array.isArray((data as any).subscriptions)
      ? (data as any).subscriptions[0]
      : (data as any).subscriptions;

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
      subscription_tier: subscriptionData?.subscription_tier ?? null,
      subscription_status: subscriptionData?.subscription_status ?? null,
      subscription_expires_at: subscriptionData?.subscription_expires_at ?? null,
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
    await supabase.from('subscriptions').delete().eq('user_id', userId);
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
