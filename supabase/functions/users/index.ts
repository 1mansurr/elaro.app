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
import {
  createAuthenticatedHandler,
  AppError,
  AuthenticatedRequest,
} from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { z } from 'zod';
import {
  initializeEventDrivenArchitecture,
  DatabaseEventEmitter,
} from '../_shared/event-driven-architecture.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { decrypt } from '../_shared/encryption.ts';
import { RegisterDeviceSchema } from '../_shared/schemas/user.ts';

// Schemas for validation
const UpdateProfileSchema = z.object({
  first_name: z.string().min(1).max(50).optional(),
  last_name: z.string().min(1).max(50).optional(),
  university: z.string().max(100).optional(),
  program: z.string().max(100).optional(),
  country: z.string().max(50).optional(),
  date_of_birth: z
    .string()
    .refine(val => {
      if (!val) return true; // Optional field
      const date = new Date(val);
      return !isNaN(date.getTime()) && val.match(/^\d{4}-\d{2}-\d{2}$/);
    }, 'Invalid date format. Expected YYYY-MM-DD')
    .optional(),
  marketing_opt_in: z.boolean().optional(),
});

const CompleteOnboardingSchema = z.object({
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  university: z.string().max(100).optional(),
  program: z.string().max(100).optional(),
  country: z.string().max(50).optional(),
  date_of_birth: z
    .string()
    .refine(val => {
      if (!val) return true; // Optional field
      const date = new Date(val);
      return !isNaN(date.getTime()) && val.match(/^\d{4}-\d{2}-\d{2}$/);
    }, 'Invalid date format. Expected YYYY-MM-DD')
    .optional(),
  marketing_opt_in: z.boolean().default(false),
});

const SoftDeleteAccountSchema = z.object({
  reason: z.string().optional(),
});

// Schema for handler validation
// Union schema that covers all possible request body types for this function
// This ensures proper validation at the handler level while allowing
// route-specific validation in individual handlers
const UsersRequestSchema = z.union([
  UpdateProfileSchema,
  CompleteOnboardingSchema,
  SoftDeleteAccountSchema,
  RegisterDeviceSchema,
  z.object({}), // For routes without body (e.g., restore-account)
]);

// User service class
class UserService {
  constructor(private supabaseClient: ReturnType<typeof createClient>) {}

  async getUserProfile(userId: string) {
    const { data: profile, error } = await this.supabaseClient
      .from('users')
      .select(
        `
        *,
        notification_preferences(*),
        courses(count),
        assignments(count),
        lectures(count),
        study_sessions(count)
      `,
      )
      .eq('id', userId)
      .single();

    if (error) throw new AppError(error.message, 500, 'PROFILE_FETCH_ERROR');

    // Decrypt sensitive fields (first_name, last_name, university, and program) before returning
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (encryptionKey && profile) {
      const decryptedProfile = { ...profile };

      // Decrypt first_name if it exists and appears to be encrypted
      if (
        decryptedProfile.first_name &&
        typeof decryptedProfile.first_name === 'string'
      ) {
        try {
          // Only attempt decryption if the string looks like base64-encoded encrypted data
          // Encrypted data is typically long and contains base64 characters
          if (decryptedProfile.first_name.length > 20) {
            decryptedProfile.first_name = await decrypt(
              decryptedProfile.first_name,
              encryptionKey,
            );
          }
        } catch (decryptError) {
          // If decryption fails, the data might not be encrypted (legacy data)
          // or might be corrupted - log warning but don't fail the request
          console.warn(
            `Failed to decrypt first_name for user ${userId}:`,
            decryptError,
          );
          // Keep the original value if decryption fails
        }
      }

      // Decrypt last_name if it exists and appears to be encrypted
      if (
        decryptedProfile.last_name &&
        typeof decryptedProfile.last_name === 'string'
      ) {
        try {
          // Only attempt decryption if the string looks like base64-encoded encrypted data
          if (decryptedProfile.last_name.length > 20) {
            decryptedProfile.last_name = await decrypt(
              decryptedProfile.last_name,
              encryptionKey,
            );
          }
        } catch (decryptError) {
          // If decryption fails, the data might not be encrypted (legacy data)
          // or might be corrupted - log warning but don't fail the request
          console.warn(
            `Failed to decrypt last_name for user ${userId}:`,
            decryptError,
          );
          // Keep the original value if decryption fails
        }
      }

      // Decrypt university if it exists and appears to be encrypted
      if (
        decryptedProfile.university &&
        typeof decryptedProfile.university === 'string'
      ) {
        try {
          // Only attempt decryption if the string looks like base64-encoded encrypted data
          // Encrypted data is typically long and contains base64 characters
          if (decryptedProfile.university.length > 20) {
            decryptedProfile.university = await decrypt(
              decryptedProfile.university,
              encryptionKey,
            );
          }
        } catch (decryptError) {
          // If decryption fails, the data might not be encrypted (legacy data)
          // or might be corrupted - log warning but don't fail the request
          console.warn(
            `Failed to decrypt university for user ${userId}:`,
            decryptError,
          );
          // Keep the original value if decryption fails
        }
      }

      // Decrypt program if it exists and appears to be encrypted
      if (
        decryptedProfile.program &&
        typeof decryptedProfile.program === 'string'
      ) {
        try {
          // Only attempt decryption if the string looks like base64-encoded encrypted data
          if (decryptedProfile.program.length > 20) {
            decryptedProfile.program = await decrypt(
              decryptedProfile.program,
              encryptionKey,
            );
          }
        } catch (decryptError) {
          // If decryption fails, the data might not be encrypted (legacy data)
          // or might be corrupted - log warning but don't fail the request
          console.warn(
            `Failed to decrypt program for user ${userId}:`,
            decryptError,
          );
          // Keep the original value if decryption fails
        }
      }

      return decryptedProfile;
    }

    return profile;
  }

  async updateUserProfile(userId: string, data: Record<string, unknown>) {
    const { data: profile, error } = await this.supabaseClient
      .from('users')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500, 'PROFILE_UPDATE_ERROR');
    return profile;
  }

  async completeOnboarding(userId: string, data: Record<string, unknown>) {
    const { data: profile, error } = await this.supabaseClient
      .from('users')
      .update({
        ...data,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error)
      throw new AppError(error.message, 500, 'ONBOARDING_COMPLETE_ERROR');

    // Setup default notification preferences
    await this.supabaseClient.from('notification_preferences').upsert({
      user_id: userId,
      email_notifications: true,
      push_notifications: true,
      reminder_notifications: true,
      marketing_notifications: data.marketing_opt_in || false,
    });

    // Emit user created event for business logic
    const eventEmitter = new DatabaseEventEmitter(this.supabaseClient);
    await eventEmitter.emitUserCreated({
      userId,
      email: profile.email,
      firstName: data.first_name,
      lastName: data.last_name,
    });

    return profile;
  }

  async softDeleteAccount(userId: string, _reason?: string) {
    const now = new Date().toISOString();
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 7); // 7 days from now

    const { error } = await this.supabaseClient
      .from('users')
      .update({
        account_status: 'deleted',
        deleted_at: now,
        deletion_scheduled_at: deletionDate.toISOString(),
        updated_at: now,
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
    const { error } = await this.supabaseClient
      .from('users')
      .update({
        account_status: 'active',
        deleted_at: null,
        deletion_scheduled_at: null,
        updated_at: new Date().toISOString(),
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
      { data: completedTasks },
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
        .is('deleted_at', null),
    ]);

    // Calculate analytics
    const totalCourses = courses?.length || 0;
    const totalAssignments = assignments?.length || 0;
    const totalLectures = lectures?.length || 0;
    const totalStudySessions = studySessions?.length || 0;
    const completedAssignments = completedTasks?.length || 0;

    const totalStudyTime =
      studySessions?.reduce(
        (sum, session) => sum + (session.duration_minutes || 0),
        0,
      ) || 0;

    const completionRate =
      totalAssignments > 0
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
      accountStatus: 'active',
    };
  }

  private calculateStudyStreak(
    studySessions: Array<{ session_date: string }>,
  ): number {
    // Simplified streak calculation
    const sortedSessions = studySessions.sort(
      (a, b) =>
        new Date(b.session_date).getTime() - new Date(a.session_date).getTime(),
    );

    let streak = 0;
    let currentDate = new Date();

    for (const session of sortedSessions) {
      const sessionDate = new Date(session.session_date);
      const daysDiff = Math.floor(
        (currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff === streak) {
        streak++;
        currentDate = sessionDate;
      } else {
        break;
      }
    }

    return streak;
  }

  private calculateTaskStreak(
    assignments: Array<{ completed: boolean; completed_at: string }>,
  ): number {
    // Simplified task completion streak
    const completedAssignments = assignments
      .filter(a => a.completed)
      .sort(
        (a, b) =>
          new Date(b.completed_at).getTime() -
          new Date(a.completed_at).getTime(),
      );

    let streak = 0;
    let currentDate = new Date();

    for (const assignment of completedAssignments) {
      const completedDate = new Date(assignment.completed_at);
      const daysDiff = Math.floor(
        (currentDate.getTime() - completedDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysDiff === streak) {
        streak++;
        currentDate = completedDate;
      } else {
        break;
      }
    }

    return streak;
  }

  async getUserDevices(userId: string) {
    const { data: devices, error } = await this.supabaseClient
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw new AppError(error.message, 500, 'DEVICES_FETCH_ERROR');
    return devices || [];
  }

  async registerDevice(
    userId: string,
    deviceData: { push_token: string; platform: string; updated_at?: string },
  ) {
    try {
      // Direct database operation
      // Note: Edge Functions have built-in execution time limits, so explicit timeout wrapper
      // may cause issues. If timeout is needed, it should be handled at the Edge Function level.
      const { data, error } = await this.supabaseClient
        .from('user_devices')
        .upsert(
          {
            user_id: userId,
            push_token: deviceData.push_token,
            platform: deviceData.platform,
            updated_at: deviceData.updated_at || new Date().toISOString(),
          },
          { onConflict: 'user_id,platform' },
        )
        .select()
        .single();

      if (error) {
        // Log the actual database error for debugging
        console.error('Database error in registerDevice:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          userId,
          platform: deviceData.platform,
        });
        throw new AppError(error.message, 500, 'DEVICE_REGISTER_ERROR');
      }

      return data;
    } catch (error) {
      // Re-throw AppError as-is (already properly formatted)
      if (error instanceof AppError) {
        throw error;
      }

      // Wrap unexpected errors with proper logging
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Unexpected error in registerDevice:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        platform: deviceData.platform,
      });

      throw new AppError(
        'Failed to register device. Please try again.',
        500,
        'DEVICE_REGISTER_ERROR',
      );
    }
  }

  async deleteDevice(userId: string, deviceId: string) {
    // Verify ownership
    const { data: device, error: checkError } = await this.supabaseClient
      .from('user_devices')
      .select('user_id')
      .eq('id', deviceId)
      .single();

    if (checkError)
      throw new AppError(checkError.message, 404, 'DEVICE_NOT_FOUND');
    if (device.user_id !== userId) {
      throw new AppError(
        'You can only delete your own devices',
        403,
        ERROR_CODES.FORBIDDEN,
      );
    }

    const { error } = await this.supabaseClient
      .from('user_devices')
      .delete()
      .eq('id', deviceId);

    if (error) throw new AppError(error.message, 500, 'DEVICE_DELETE_ERROR');
    return { success: true, message: 'Device removed successfully' };
  }

  async getLoginHistory(userId: string, limit: number = 50) {
    // Use RPC function if available, otherwise query directly
    try {
      const { data, error } = await this.supabaseClient.rpc(
        'get_recent_login_activity',
        {
          p_user_id: userId,
          p_limit: limit,
        },
      );

      if (error) {
        // Fallback to direct query if RPC doesn't exist
        const { data: fallbackData, error: fallbackError } =
          await this.supabaseClient
            .from('user_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (fallbackError)
          throw new AppError(fallbackError.message, 500, 'LOGIN_HISTORY_ERROR');
        return fallbackData || [];
      }

      return data || [];
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get login history';
      throw new AppError(errorMessage, 500, 'LOGIN_HISTORY_ERROR');
    }
  }

  async getSubscription(userId: string) {
    const { data: user, error } = await this.supabaseClient
      .from('users')
      .select(
        'subscription_tier, subscription_status, subscription_expires_at, account_status',
      )
      .eq('id', userId)
      .single();

    if (error)
      throw new AppError(error.message, 500, 'SUBSCRIPTION_FETCH_ERROR');

    return {
      tier: user.subscription_tier || 'free',
      status: user.subscription_status || 'inactive',
      expiresAt: user.subscription_expires_at || null,
      accountStatus: user.account_status || 'active',
      hasActiveSubscription:
        user.subscription_status === 'active' &&
        (!user.subscription_expires_at ||
          new Date(user.subscription_expires_at) > new Date()),
    };
  }
}

// Main handler function
async function handleUsersRequest({
  user,
  supabaseClient,
  body,
  url,
  method: requestMethod,
}: AuthenticatedRequest & { url: string }) {
  const userService = new UserService(supabaseClient);
  const path = new URL(url).pathname;
  // PASS 2: Validate query parameter (enum)
  const methodParam = new URL(url).searchParams.get('method');
  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  const method = requestMethod ||
    (methodParam && validMethods.includes(methodParam.toUpperCase())
      ? methodParam.toUpperCase()
      : 'GET');
  if (methodParam && !validMethods.includes(method.toUpperCase())) {
    // Return JSON response instead of throwing
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'INVALID_INPUT',
        details: {
          field: 'method',
          message: `Method must be one of: ${validMethods.join(', ')}`,
        },
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Initialize event-driven architecture
  initializeEventDrivenArchitecture(supabaseClient);

  // Route handling
  if (method === 'GET' && path.endsWith('/profile')) {
    return await userService.getUserProfile(user.id);
  }

  if (method === 'PUT' && path.endsWith('/profile')) {
    // Use safeParse to prevent ZodError from crashing worker
    const validationResult = UpdateProfileSchema.safeParse(body);
    if (!validationResult.success) {
      // Return JSON response instead of throwing
      const zodError = validationResult.error;
      const flattened = zodError.flatten();
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'INVALID_INPUT',
          details: {
            errors: flattened.fieldErrors,
            formErrors: flattened.formErrors,
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    const validatedData = validationResult.data;
    return await userService.updateUserProfile(user.id, validatedData);
  }

  if (method === 'POST' && path.endsWith('/complete-onboarding')) {
    // Use safeParse to prevent ZodError from crashing worker
    const validationResult = CompleteOnboardingSchema.safeParse(body);
    if (!validationResult.success) {
      // Return JSON response instead of throwing
      const zodError = validationResult.error;
      const flattened = zodError.flatten();
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'INVALID_INPUT',
          details: {
            errors: flattened.fieldErrors,
            formErrors: flattened.formErrors,
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    const validatedData = validationResult.data;
    return await userService.completeOnboarding(user.id, validatedData);
  }

  if (method === 'POST' && path.endsWith('/soft-delete-account')) {
    // Use safeParse to prevent ZodError from crashing worker
    const validationResult = SoftDeleteAccountSchema.safeParse(body);
    if (!validationResult.success) {
      // Return JSON response instead of throwing
      const zodError = validationResult.error;
      const flattened = zodError.flatten();
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'INVALID_INPUT',
          details: {
            errors: flattened.fieldErrors,
            formErrors: flattened.formErrors,
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    const validatedData = validationResult.data;
    return await userService.softDeleteAccount(user.id, validatedData.reason);
  }

  if (method === 'POST' && path.endsWith('/restore-account')) {
    return await userService.restoreAccount(user.id);
  }

  if (method === 'GET' && path.endsWith('/analytics')) {
    return await userService.getUserAnalytics(user.id);
  }

  // New endpoints for Phase 4 migration
  if (
    method === 'GET' &&
    path.includes('/devices') &&
    !path.match(/\/devices\/[^/]+$/)
  ) {
    // GET /devices (list devices)
    return await userService.getUserDevices(user.id);
  }

  if (
    method === 'POST' &&
    path.includes('/devices') &&
    !path.match(/\/devices\/[^/]+$/)
  ) {
    // POST /devices (register device)
    
    // ============================================================================
    // EXPLICIT VALIDATION: Check required fields BEFORE Zod parsing
    // ============================================================================
    
    // Ensure body exists and is an object
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      // Return JSON response instead of throwing
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'INVALID_INPUT',
          details: {
            message: 'Request body must be a valid JSON object',
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Explicit check: push_token must exist - return skipped response if missing
    if (body.push_token === undefined || body.push_token === null) {
      // Return success with skipped flag (race condition safe)
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: 'push_token_not_ready',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Explicit check: platform must exist - return skipped response if missing
    if (body.platform === undefined || body.platform === null) {
      // Return success with skipped flag (race condition safe)
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: 'push_token_not_ready',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // ============================================================================
    // ZOD VALIDATION: Use safeParse to prevent ZodError from crashing worker
    // ============================================================================
    
    const validationResult = RegisterDeviceSchema.safeParse(body);
    
    if (!validationResult.success) {
      // Return JSON response instead of throwing
      const zodError = validationResult.error;
      const flattened = zodError.flatten();
      
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'INVALID_INPUT',
          details: {
            errors: flattened.fieldErrors,
            formErrors: flattened.formErrors,
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Use validated data (guaranteed to be valid)
    const validatedData = validationResult.data;
    return await userService.registerDevice(user.id, validatedData);
  }

  if (method === 'DELETE' && path.includes('/devices')) {
    // Extract and validate device ID from path
    const pathParts = path.split('/').filter(Boolean);
    const deviceIndex = pathParts.indexOf('devices');
    if (deviceIndex === -1 || deviceIndex === pathParts.length - 1) {
      // Return JSON response instead of throwing
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'INVALID_INPUT',
          details: {
            message: 'Device ID is required',
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    const deviceId = pathParts[deviceIndex + 1];
    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
      // Return JSON response instead of throwing
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'INVALID_INPUT',
          details: {
            field: 'deviceId',
            message: 'Device ID is missing or invalid',
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    return await userService.deleteDevice(user.id, deviceId);
  }

  if (method === 'GET' && path.endsWith('/login-history')) {
    // Validate query parameter (type, range)
    const limitParam = new URL(url).searchParams.get('limit');
    let limit = 50; // Default
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        // Return JSON response instead of throwing
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'INVALID_INPUT',
            details: {
              field: 'limit',
              message: 'Limit must be between 1 and 100',
            },
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      limit = parsedLimit;
    }
    return await userService.getLoginHistory(user.id, limit);
  }

  if (method === 'GET' && path.endsWith('/subscription')) {
    return await userService.getSubscription(user.id);
  }

  // Return JSON response instead of throwing
  return new Response(
    JSON.stringify({
      ok: false,
      error: 'NOT_FOUND',
      details: {
        message: 'Invalid route or method',
      },
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

// Serve the function
serve(
  createAuthenticatedHandler(handleUsersRequest, {
    rateLimitName: 'users',
    checkTaskLimit: false,
    requireIdempotency: true,
    schema: UsersRequestSchema, // Union schema for all possible request types
  }),
);
