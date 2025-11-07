/**
 * Consolidated Courses Edge Function
 *
 * This function consolidates all course-related operations that were
 * previously spread across multiple separate Edge Functions.
 *
 * Routes:
 * - POST /courses - Create course
 * - PUT /courses/:id - Update course
 * - DELETE /courses/:id - Delete course
 * - GET /courses - List courses
 * - GET /courses/:id - Get course details
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AppError,
} from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import {
  initializeEventDrivenArchitecture,
  DatabaseEventEmitter,
} from '../_shared/event-driven-architecture.ts';

// Schemas for validation
const CreateCourseSchema = z.object({
  course_name: z.string().min(1).max(100),
  course_code: z.string().min(1).max(20),
  about_course: z.string().optional(),
  university: z.string().optional(),
  program: z.string().optional(),
});

const UpdateCourseSchema = CreateCourseSchema.partial();

// Course service class
class CourseService {
  constructor(private supabaseClient: any) {}

  // Course operations
  async createCourse(data: any, userId: string) {
    // Check course limits based on subscription tier
    const { data: userProfile } = await this.supabaseClient
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    const courseLimits = {
      free: 2,
      oddity: 7,
    };

    const userTier = userProfile?.subscription_tier || 'free';
    const courseLimit =
      courseLimits[userTier as keyof typeof courseLimits] || courseLimits.free;

    // Check current course count
    const { count } = await this.supabaseClient
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (count >= courseLimit) {
      throw new AppError(
        `You have reached the course limit of ${courseLimit} for the '${userTier}' plan.`,
        403,
        'COURSE_LIMIT_EXCEEDED',
      );
    }

    const { data: course, error } = await this.supabaseClient
      .from('courses')
      .insert({
        ...data,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500, 'COURSE_CREATE_ERROR');
    return course;
  }

  async updateCourse(id: string, data: any, userId: string) {
    const { data: course, error } = await this.supabaseClient
      .from('courses')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500, 'COURSE_UPDATE_ERROR');
    return course;
  }

  async deleteCourse(id: string, userId: string) {
    // Get course details for event emission
    const { data: course } = await this.supabaseClient
      .from('courses')
      .select('course_name')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    // Use centralized soft delete function
    const { data, error } = await this.supabaseClient.rpc(
      'soft_delete_record_cascade',
      {
        table_name: 'courses',
        record_id: id,
        user_id: userId,
        cascade_tables: ['assignments', 'lectures'],
      },
    );

    if (error) throw new AppError(error.message, 500, 'COURSE_DELETE_ERROR');

    // Emit course deleted event
    const eventEmitter = new DatabaseEventEmitter(this.supabaseClient);
    await eventEmitter.emitCourseDeleted({
      courseId: id,
      userId,
      courseName: course?.course_name || 'Unknown Course',
      cascadeCount: 0, // This would be calculated by the cascade function
    });

    return { success: true };
  }

  async getCourses(userId: string, includeDeleted: boolean = false) {
    let query = this.supabaseClient
      .from('courses')
      .select(
        `
        *,
        assignments:assignments(count),
        lectures:lectures(count)
      `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    const { data: courses, error } = await query;

    if (error) throw new AppError(error.message, 500, 'COURSE_FETCH_ERROR');
    return courses;
  }

  async getCourseDetails(id: string, userId: string) {
    const { data: course, error } = await this.supabaseClient
      .from('courses')
      .select(
        `
        *,
        assignments:assignments(*),
        lectures:lectures(*)
      `,
      )
      .eq('id', id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error) throw new AppError(error.message, 500, 'COURSE_FETCH_ERROR');
    return course;
  }

  async restoreCourse(id: string, userId: string) {
    const { data, error } = await this.supabaseClient.rpc(
      'restore_soft_deleted_record',
      {
        table_name: 'courses',
        record_id: id,
        user_id: userId,
      },
    );

    if (error) throw new AppError(error.message, 500, 'COURSE_RESTORE_ERROR');
    return { success: true };
  }
}

// Main handler function
async function handleCoursesRequest({ user, supabaseClient, body, url }: any) {
  const courseService = new CourseService(supabaseClient);
  const path = new URL(url).pathname;
  const method = new URL(url).searchParams.get('method') || 'GET';

  // Initialize event-driven architecture
  initializeEventDrivenArchitecture(supabaseClient);

  // Route handling
  if (method === 'POST' && path.endsWith('/courses')) {
    const validatedData = CreateCourseSchema.parse(body);
    return await courseService.createCourse(validatedData, user.id);
  }

  if (method === 'PUT' && path.includes('/courses/')) {
    const id = path.split('/').pop();
    const validatedData = UpdateCourseSchema.parse(body);
    return await courseService.updateCourse(id, validatedData, user.id);
  }

  if (method === 'DELETE' && path.includes('/courses/')) {
    const id = path.split('/').pop();
    return await courseService.deleteCourse(id, user.id);
  }

  if (method === 'GET' && path.endsWith('/courses')) {
    const includeDeleted =
      new URL(url).searchParams.get('include_deleted') === 'true';
    return await courseService.getCourses(user.id, includeDeleted);
  }

  if (method === 'GET' && path.includes('/courses/')) {
    const id = path.split('/').pop();
    return await courseService.getCourseDetails(id, user.id);
  }

  if (
    method === 'POST' &&
    path.includes('/courses/') &&
    path.includes('/restore')
  ) {
    const id = path.split('/')[path.split('/').length - 2]; // Get ID before 'restore'
    return await courseService.restoreCourse(id, user.id);
  }

  throw new AppError('Invalid route or method', 404, ERROR_CODES.NOT_FOUND);
}

// Serve the function
serve(
  createAuthenticatedHandler(handleCoursesRequest, {
    rateLimitName: 'courses',
    checkTaskLimit: false,
    requireIdempotency: true,
  }),
);
