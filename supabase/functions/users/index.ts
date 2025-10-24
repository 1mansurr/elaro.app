/**
 * Consolidated Users Edge Function
 * 
 * This function consolidates all user-related operations including
 * profile management, account operations, and user analytics.
 * 
 * Routes:
 * - GET /users/profile - Get user profile
 * - PUT /users/profile - Update user profile
 * - POST /users/complete-onboarding - Complete onboarding
 * - POST /users/soft-delete-account - Soft delete account
 * - POST /users/restore-account - Restore account
 * - GET /users/analytics - Get user analytics
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AppError } from '../_shared/function-handler.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { 
  initializeEventDrivenArchitecture, 
  DatabaseEventEmitter 
} from '../_shared/event-driven-architecture.ts';

// Schemas for validation
const UpdateProfileSchema = z.object({
  first_name: z.string().min(1).max(50).optional(),
  last_name: z.string().min(1).max(50).optional(),
  university: z.string().max(100).optional(),
  program: z.string().max(100).optional(),
  country: z.string().max(50).optional(),
  date_of_birth: z.string().date().optional(),
  marketing_opt_in: z.boolean().optional()
});

const CompleteOnboardingSchema = z.object({
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  university: z.string().max(100).optional(),
  program: z.string().max(100).optional(),
  country: z.string().max(50).optional(),
  date_of_birth: z.string().date().optional(),
  marketing_opt_in: z.boolean().default(false)
});

const SoftDeleteAccountSchema = z.object({
  reason: z.string().optional()
});

// User service class
class UserService {
  constructor(private supabaseClient: any) {}

  async getUserProfile(userId: string) {
    const { data: profile, error } = await this.supabaseClient
      .from('users')
      .select(`
        *,
        notification_preferences(*),
        courses(count),
        assignments(count),
        lectures(count),
        study_sessions(count)
      `)
      .eq('id', userId)
      .single();

    if (error) throw new AppError(error.message, 500, 'PROFILE_FETCH_ERROR');
    return profile;
  }

  async updateUserProfile(userId: string, data: any) {
    const { data: profile, error } = await this.supabaseClient
      .from('users')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500, 'PROFILE_UPDATE_ERROR');
    return profile;
  }

  async completeOnboarding(userId: string, data: any) {
    const { data: profile, error } = await this.supabaseClient
      .from('users')
      .update({
        ...data,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500, 'ONBOARDING_COMPLETE_ERROR');

    // Setup default notification preferences
    await this.supabaseClient
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        email_notifications: true,
        push_notifications: true,
        reminder_notifications: true,
        marketing_notifications: data.marketing_opt_in || false
      });

    // Emit user created event for business logic
    const eventEmitter = new DatabaseEventEmitter(this.supabaseClient);
    await eventEmitter.emitUserCreated({
      userId,
      email: profile.email,
      firstName: data.first_name,
      lastName: data.last_name
    });

    return profile;
  }

  async softDeleteAccount(userId: string, reason?: string) {
    const now = new Date().toISOString();
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 7); // 7 days from now

    const { data, error } = await this.supabaseClient
      .from('users')
      .update({
        account_status: 'deleted',
        deleted_at: now,
        deletion_scheduled_at: deletionDate.toISOString(),
        updated_at: now
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500, 'ACCOUNT_DELETE_ERROR');

    // Sign out the user from all sessions
    await this.supabaseClient.auth.signOut({ scope: 'global' });

    return { success: true, message: 'Account scheduled for deletion' };
  }

  async restoreAccount(userId: string) {
    const { data, error } = await this.supabaseClient
      .from('users')
      .update({
        account_status: 'active',
        deleted_at: null,
        deletion_scheduled_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500, 'ACCOUNT_RESTORE_ERROR');
    return { success: true, message: 'Account restored successfully' };
  }

  async getUserAnalytics(userId: string) {
    // Get user statistics
    const [
      { data: courses },
      { data: assignments },
      { data: lectures },
      { data: studySessions },
      { data: completedTasks }
    ] = await Promise.all([
      this.supabaseClient
        .from('courses')
        .select('id, created_at')
        .eq('user_id', userId)
        .is('deleted_at', null),
      
      this.supabaseClient
        .from('assignments')
        .select('id, created_at, completed, due_date')
        .eq('user_id', userId)
        .is('deleted_at', null),
      
      this.supabaseClient
        .from('lectures')
        .select('id, created_at, start_time')
        .eq('user_id', userId)
        .is('deleted_at', null),
      
      this.supabaseClient
        .from('study_sessions')
        .select('id, created_at, duration_minutes, session_date')
        .eq('user_id', userId)
        .is('deleted_at', null),
      
      this.supabaseClient
        .from('assignments')
        .select('id, completed_at')
        .eq('user_id', userId)
        .eq('completed', true)
        .is('deleted_at', null)
    ]);

    // Calculate analytics
    const totalCourses = courses?.length || 0;
    const totalAssignments = assignments?.length || 0;
    const totalLectures = lectures?.length || 0;
    const totalStudySessions = studySessions?.length || 0;
    const completedAssignments = completedTasks?.length || 0;
    
    const totalStudyTime = studySessions?.reduce((sum, session) => 
      sum + (session.duration_minutes || 0), 0) || 0;

    const completionRate = totalAssignments > 0 
      ? Math.round((completedAssignments / totalAssignments) * 100) 
      : 0;

    // Calculate streaks (simplified)
    const studyStreak = this.calculateStudyStreak(studySessions || []);
    const taskStreak = this.calculateTaskStreak(assignments || []);

    return {
      totalCourses,
      totalAssignments,
      totalLectures,
      totalStudySessions,
      completedAssignments,
      totalStudyTime,
      completionRate,
      studyStreak,
      taskStreak,
      accountStatus: 'active'
    };
  }

  private calculateStudyStreak(studySessions: any[]): number {
    // Simplified streak calculation
    const sortedSessions = studySessions
      .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());
    
    let streak = 0;
    let currentDate = new Date();
    
    for (const session of sortedSessions) {
      const sessionDate = new Date(session.session_date);
      const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
        currentDate = sessionDate;
      } else {
        break;
      }
    }
    
    return streak;
  }

  private calculateTaskStreak(assignments: any[]): number {
    // Simplified task completion streak
    const completedAssignments = assignments
      .filter(a => a.completed)
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
    
    let streak = 0;
    let currentDate = new Date();
    
    for (const assignment of completedAssignments) {
      const completedDate = new Date(assignment.completed_at);
      const daysDiff = Math.floor((currentDate.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
        currentDate = completedDate;
      } else {
        break;
      }
    }
    
    return streak;
  }
}

// Main handler function
async function handleUsersRequest({ user, supabaseClient, body, url }: any) {
  const userService = new UserService(supabaseClient);
  const path = new URL(url).pathname;
  const method = new URL(url).searchParams.get('method') || 'GET';

  // Initialize event-driven architecture
  initializeEventDrivenArchitecture(supabaseClient);

  // Route handling
  if (method === 'GET' && path.endsWith('/profile')) {
    return await userService.getUserProfile(user.id);
  }

  if (method === 'PUT' && path.endsWith('/profile')) {
    const validatedData = UpdateProfileSchema.parse(body);
    return await userService.updateUserProfile(user.id, validatedData);
  }

  if (method === 'POST' && path.endsWith('/complete-onboarding')) {
    const validatedData = CompleteOnboardingSchema.parse(body);
    return await userService.completeOnboarding(user.id, validatedData);
  }

  if (method === 'POST' && path.endsWith('/soft-delete-account')) {
    const validatedData = SoftDeleteAccountSchema.parse(body);
    return await userService.softDeleteAccount(user.id, validatedData.reason);
  }

  if (method === 'POST' && path.endsWith('/restore-account')) {
    return await userService.restoreAccount(user.id);
  }

  if (method === 'GET' && path.endsWith('/analytics')) {
    return await userService.getUserAnalytics(user.id);
  }

  throw new AppError('Invalid route or method', 404, 'INVALID_ROUTE');
}

// Serve the function
serve(createAuthenticatedHandler(
  handleUsersRequest,
  {
    rateLimitName: 'users',
    checkTaskLimit: false
  }
));
