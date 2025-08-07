import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  StudySession,
  TaskEvent,
  SpacedRepetitionReminder,
  Subscription,
  UserEvent,
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
      is_subscribed_to_oddity: false,
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

    if (error) return null;
    return data;
  },

  async updateUserProfile(userId: string, updates: Partial<User>) {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
  },
};

// Study Session Services
export const sessionService = {
  async createSession(session: Omit<StudySession, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('study_sessions')
      .insert(session)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserSessions(userId: string): Promise<StudySession[]> {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('date_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async updateSession(sessionId: string, updates: Partial<StudySession>) {
    const { error } = await supabase
      .from('study_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (error) throw error;
  },

  async deleteSession(sessionId: string) {
    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  },

  async markSessionComplete(sessionId: string) {
    await this.updateSession(sessionId, { completed: true });
  },
};

// Task/Event Services
export const taskService = {
  async createTask(task: Omit<TaskEvent, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('tasks_events')
      .insert(task)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserTasks(userId: string): Promise<TaskEvent[]> {
    const { data, error } = await supabase
      .from('tasks_events')
      .select('*')
      .eq('user_id', userId)
      .order('date_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async updateTask(taskId: string, updates: Partial<TaskEvent>) {
    const { error } = await supabase
      .from('tasks_events')
      .update(updates)
      .eq('id', taskId);

    if (error) throw error;
  },

  async deleteTask(taskId: string) {
    const { error } = await supabase
      .from('tasks_events')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  },

  async markTaskComplete(taskId: string) {
    await this.updateTask(taskId, { completed: true });
  },

  /**
   * Returns the number of tasks/events created by the user this week.
   * Usage: After deleting a task, call this to get the updated count.
   */
  async getWeeklyTaskCount(userId: string): Promise<number> {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('tasks_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfWeek.toISOString());

    if (error) throw error;
    return count || 0;
  },

  /**
   * There is no explicit decrement function for usage count, since the count is based on the number of rows in tasks_events for the week.
   * To decrement, delete the task/event, then call getWeeklyTaskCount to get the new value.
   */
  async getActiveTasks(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('tasks_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('completed', false);

    if (error) throw error;
    return count || 0;
  },
};

// Spaced Repetition Services
export const srService = {
  async createReminders(
    reminders: Omit<SpacedRepetitionReminder, 'id' | 'created_at'>[],
  ) {
    const { data, error } = await supabase
      .from('spaced_repetition_reminders')
      .insert(reminders)
      .select();

    if (error) throw error;
    return data;
  },

  async getUserReminders(userId: string): Promise<SpacedRepetitionReminder[]> {
    const { data, error } = await supabase
      .from('spaced_repetition_reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async markReminderComplete(reminderId: string) {
    const { error } = await supabase
      .from('spaced_repetition_reminders')
      .update({ completed: true })
      .eq('id', reminderId);

    if (error) throw error;
  },

  async getActiveReminderCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('spaced_repetition_reminders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('completed', false);

    if (error) throw error;
    return count || 0;
  },

  async deleteSessionReminders(sessionId: string) {
    const { error } = await supabase
      .from('spaced_repetition_reminders')
      .update({ is_active: false })
      .eq('session_id', sessionId);

    if (error) throw error;
  },
};

// TODO: Streak service logic was here. Re-implement from scratch if/when streaks are reintroduced.

// Analytics Services
export const analyticsService = {
  async logEvent(
    userId: string,
    eventType: UserEvent['event_type'],
    metadata?: Record<string, any>,
  ) {
    const { error } = await supabase.from('user_events').insert({
      user_id: userId,
      event_type: eventType,
      metadata,
    });

    if (error) console.error('Analytics error:', error);
  },

  async getEventCount(
    userId: string,
    eventType: UserEvent['event_type'],
  ): Promise<number> {
    const { count, error } = await supabase
      .from('user_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('event_type', eventType);

    if (error) return 0;
    return count || 0;
  },
};

// Subscription Services
export const subscriptionService = {
  async getSubscription(userId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return data;
  },

  async updateSubscription(userId: string, updates: Partial<Subscription>) {
    const { error } = await supabase.from('subscriptions').upsert({
      user_id: userId,
      ...updates,
    });

    if (error) throw error;
  },

  async activateOdditySubscription(userId: string) {
    await this.updateSubscription(userId, {
      is_subscribed_to_oddity: true,
      subscription_started_at: new Date().toISOString(),
      subscription_expires_at: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      payment_status: 'active',
    });

    // Update user profile
    await authService.updateUserProfile(userId, {
      is_subscribed_to_oddity: true,
    });
  },

  async deactivateSubscription(userId: string) {
    await this.updateSubscription(userId, {
      is_subscribed_to_oddity: false,
      payment_status: 'cancelled',
    });

    // Update user profile
    await authService.updateUserProfile(userId, {
      is_subscribed_to_oddity: false,
    });
  },
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
    await supabase.from('tasks_events').delete().eq('user_id', userId);
    await supabase.from('study_sessions').delete().eq('user_id', userId);
    await supabase.from('streaks').delete().eq('user_id', userId);
    await supabase.from('subscriptions').delete().eq('user_id', userId);
    await supabase.from('users').delete().eq('id', userId);

    // Delete auth user
    await supabase.auth.admin.deleteUser(userId);
  },

  async getUserStats(userId: string) {
    const [sessions, tasks, reminders] = await Promise.all([
      sessionService.getUserSessions(userId),
      taskService.getUserTasks(userId),
      srService.getUserReminders(userId),
      // streakService.getUserStreak(userId), // This line is removed
    ]);

    return {
      totalSessions: sessions.length,
      completedSessions: sessions.filter(s => s.completed).length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.completed).length,
      activeReminders: reminders.filter(r => !r.completed).length,
      // TODO: Streak stats were returned here. Re-add if/when streaks are reintroduced.
    };
  },
};
