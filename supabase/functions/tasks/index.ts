/**
 * Consolidated Tasks Edge Function
 *
 * This function consolidates all task-related operations (assignments, lectures, study sessions)
 * that were previously spread across 20+ separate Edge Functions.
 *
 * Routes:
 * - POST /tasks/assignments - Create assignment
 * - PUT /tasks/assignments/:id - Update assignment
 * - DELETE /tasks/assignments/:id - Delete assignment
 * - POST /tasks/lectures - Create lecture
 * - PUT /tasks/lectures/:id - Update lecture
 * - DELETE /tasks/lectures/:id - Delete lecture
 * - POST /tasks/study-sessions - Create study session
 * - PUT /tasks/study-sessions/:id - Update study session
 * - DELETE /tasks/study-sessions/:id - Delete study session
 * - POST /tasks/batch - Batch operations
 */

// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AppError,
  isValidUUID,
  AuthenticatedRequest,
} from '../_shared/function-handler.ts';
import {
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { z } from 'zod';
import {
  initializeEventDrivenArchitecture,
  DatabaseEventEmitter,
} from '../_shared/event-driven-architecture.ts';

// Schemas for validation
const CreateAssignmentSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  due_date: z.string().datetime(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  reminders: z.array(z.number()).optional(),
});

const UpdateAssignmentSchema = CreateAssignmentSchema.partial();

const CreateLectureSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  location: z.string().optional(),
  reminders: z.array(z.number()).optional(),
});

const UpdateLectureSchema = CreateLectureSchema.partial();

const CreateStudySessionSchema = z.object({
  subject: z.string().min(1).max(100),
  duration_minutes: z.number().min(1).max(480), // Max 8 hours
  session_date: z.string().datetime(),
  notes: z.string().optional(),
  reminders: z.array(z.number()).optional(),
});

const UpdateStudySessionSchema = CreateStudySessionSchema.partial();

const BatchOperationSchema = z.object({
  operations: z.array(
    z.object({
      type: z.enum(['create', 'update', 'delete']),
      table: z.enum(['assignments', 'lectures', 'study_sessions']),
      data: z.record(z.any()),
      id: z.string().uuid().optional(),
    }),
  ),
});

// Task service class
class TaskService {
  constructor(private supabaseClient: SupabaseClient) {}

  // Assignment operations
  async createAssignment(data: Record<string, unknown>, userId: string) {
    const { data: assignment, error } = await this.supabaseClient
      .from('assignments')
      .insert({
        ...data,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error)
      throw new AppError(error.message, 500, 'ASSIGNMENT_CREATE_ERROR');

    if (!assignment) {
      throw new AppError('Failed to create assignment', 500, 'ASSIGNMENT_CREATE_ERROR');
    }

    // Emit event
    const eventEmitter = new DatabaseEventEmitter(this.supabaseClient);
    await eventEmitter.emitTaskCompleted({
      taskId: (assignment as { id: string }).id,
      taskType: 'assignment',
      userId,
      completedAt: new Date().toISOString(),
    });

    return assignment as Record<string, unknown>;
  }

  async updateAssignment(
    id: string,
    data: Record<string, unknown>,
    userId: string,
  ) {
    const { data: assignment, error } = await this.supabaseClient
      .from('assignments')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error)
      throw new AppError(error.message, 500, 'ASSIGNMENT_UPDATE_ERROR');
    return assignment;
  }

  async deleteAssignment(id: string, userId: string) {
    // Use centralized soft delete function
    const { error } = await this.supabaseClient.rpc('soft_delete_record', {
      table_name: 'assignments',
      record_id: id,
      user_id: userId,
    });

    if (error)
      throw new AppError(error.message, 500, 'ASSIGNMENT_DELETE_ERROR');
    return { success: true };
  }

  // Lecture operations
  async createLecture(data: Record<string, unknown>, userId: string) {
    const { data: lecture, error } = await this.supabaseClient
      .from('lectures')
      .insert({
        ...data,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500, 'LECTURE_CREATE_ERROR');

    if (!lecture) {
      throw new AppError('Failed to create lecture', 500, 'LECTURE_CREATE_ERROR');
    }

    // Emit event
    const eventEmitter = new DatabaseEventEmitter(this.supabaseClient);
    await eventEmitter.emitTaskCompleted({
      taskId: (lecture as { id: string }).id,
      taskType: 'lecture',
      userId,
      completedAt: new Date().toISOString(),
    });

    return lecture as Record<string, unknown>;
  }

  async updateLecture(
    id: string,
    data: Record<string, unknown>,
    userId: string,
  ) {
    const { data: lecture, error } = await this.supabaseClient
      .from('lectures')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500, 'LECTURE_UPDATE_ERROR');
    return lecture;
  }

  async deleteLecture(id: string, userId: string) {
    const { error } = await this.supabaseClient.rpc('soft_delete_record', {
      table_name: 'lectures',
      record_id: id,
      user_id: userId,
    });

    if (error) throw new AppError(error.message, 500, 'LECTURE_DELETE_ERROR');
    return { success: true };
  }

  // Study session operations
  async createStudySession(data: Record<string, unknown>, userId: string) {
    const { data: session, error } = await this.supabaseClient
      .from('study_sessions')
      .insert({
        ...data,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error)
      throw new AppError(error.message, 500, 'STUDY_SESSION_CREATE_ERROR');

    if (!session) {
      throw new AppError('Failed to create study session', 500, 'STUDY_SESSION_CREATE_ERROR');
    }

    // Emit event
    const eventEmitter = new DatabaseEventEmitter(this.supabaseClient);
    await eventEmitter.emitTaskCompleted({
      taskId: (session as { id: string }).id,
      taskType: 'study_session',
      userId,
      completedAt: new Date().toISOString(),
    });

    return session as Record<string, unknown>;
  }

  async updateStudySession(
    id: string,
    data: Record<string, unknown>,
    userId: string,
  ) {
    const { data: session, error } = await this.supabaseClient
      .from('study_sessions')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error)
      throw new AppError(error.message, 500, 'STUDY_SESSION_UPDATE_ERROR');
    return session;
  }

  async deleteStudySession(id: string, userId: string) {
    const { error } = await this.supabaseClient.rpc('soft_delete_record', {
      table_name: 'study_sessions',
      record_id: id,
      user_id: userId,
    });

    if (error)
      throw new AppError(error.message, 500, 'STUDY_SESSION_DELETE_ERROR');
    return { success: true };
  }

  // Batch operations
  async batchOperations(operations: Array<{
    type: 'create' | 'update' | 'delete';
    table: 'assignments' | 'lectures' | 'study_sessions';
    data: Record<string, unknown>;
    id?: string;
  }>, userId: string) {
    const results = [];

    for (const operation of operations) {
      try {
        let result;

        switch (operation.type) {
          case 'create':
            if (operation.table === 'assignments') {
              result = await this.createAssignment(operation.data, userId);
            } else if (operation.table === 'lectures') {
              result = await this.createLecture(operation.data, userId);
            } else if (operation.table === 'study_sessions') {
              result = await this.createStudySession(operation.data, userId);
            }
            break;

          case 'update':
            if (!operation.id) {
              throw new AppError('ID is required for update operations', 400, 'VALIDATION_ERROR');
            }
            if (operation.table === 'assignments') {
              result = await this.updateAssignment(
                operation.id,
                operation.data,
                userId,
              );
            } else if (operation.table === 'lectures') {
              result = await this.updateLecture(
                operation.id,
                operation.data,
                userId,
              );
            } else if (operation.table === 'study_sessions') {
              result = await this.updateStudySession(
                operation.id,
                operation.data,
                userId,
              );
            }
            break;

          case 'delete':
            if (!operation.id) {
              throw new AppError('ID is required for delete operations', 400, 'VALIDATION_ERROR');
            }
            if (operation.table === 'assignments') {
              result = await this.deleteAssignment(operation.id, userId);
            } else if (operation.table === 'lectures') {
              result = await this.deleteLecture(operation.id, userId);
            } else if (operation.table === 'study_sessions') {
              result = await this.deleteStudySession(operation.id, userId);
            }
            break;
        }

        results.push({ success: true, operation, result });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        results.push({ success: false, operation, error: errorMessage });
      }
    }

    return results;
  }
}

// Main handler function
async function handleTasksRequest({
  user,
  supabaseClient,
  body,
  url,
}: AuthenticatedRequest & { url: string }) {
  const taskService = new TaskService(supabaseClient);
  const path = new URL(url).pathname;
  const method = new URL(url).searchParams.get('method') || 'GET';

  // Initialize event-driven architecture
  initializeEventDrivenArchitecture(supabaseClient);

  // Route handling
  if (path.includes('/assignments')) {
    if (method === 'POST') {
      // PASS 1: Use safeParse to prevent ZodError from crashing worker
      const validationResult = CreateAssignmentSchema.safeParse(body);
      if (!validationResult.success) {
        const zodError = validationResult.error;
        const flattened = zodError.flatten();
        throw new AppError(
          'Validation failed',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          {
            message: 'Request body validation failed',
            errors: flattened.fieldErrors,
            formErrors: flattened.formErrors,
          },
        );
      }
      const validatedData = validationResult.data;
      return await taskService.createAssignment(validatedData, user.id);
    } else if (method === 'PUT') {
      // PASS 2: Validate path parameter (UUID format, non-empty)
      const id = path.split('/').pop();
      if (!id || !isValidUUID(id)) {
        throw new AppError(
          'Invalid assignment ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          { field: 'id', message: 'Assignment ID must be a valid UUID' },
        );
      }
      // PASS 1: Use safeParse to prevent ZodError from crashing worker
      const validationResult = UpdateAssignmentSchema.safeParse(body);
      if (!validationResult.success) {
        const zodError = validationResult.error;
        const flattened = zodError.flatten();
        throw new AppError(
          'Validation failed',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          {
            message: 'Request body validation failed',
            errors: flattened.fieldErrors,
            formErrors: flattened.formErrors,
          },
        );
      }
      const validatedData = validationResult.data;
      return await taskService.updateAssignment(id, validatedData, user.id);
    } else if (method === 'DELETE') {
      // PASS 2: Validate path parameter (UUID format, non-empty)
      const id = path.split('/').pop();
      if (!id || !isValidUUID(id)) {
        throw new AppError(
          'Invalid assignment ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          { field: 'id', message: 'Assignment ID must be a valid UUID' },
        );
      }
      return await taskService.deleteAssignment(id, user.id);
    }
  }

  if (path.includes('/lectures')) {
    if (method === 'POST') {
      // PASS 1: Use safeParse to prevent ZodError from crashing worker
      const validationResult = CreateLectureSchema.safeParse(body);
      if (!validationResult.success) {
        const zodError = validationResult.error;
        const flattened = zodError.flatten();
        throw new AppError(
          'Validation failed',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          {
            message: 'Request body validation failed',
            errors: flattened.fieldErrors,
            formErrors: flattened.formErrors,
          },
        );
      }
      const validatedData = validationResult.data;
      return await taskService.createLecture(validatedData, user.id);
    } else if (method === 'PUT') {
      // PASS 2: Validate path parameter (UUID format, non-empty)
      const id = path.split('/').pop();
      if (!id || !isValidUUID(id)) {
        throw new AppError(
          'Invalid lecture ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          { field: 'id', message: 'Lecture ID must be a valid UUID' },
        );
      }
      // PASS 1: Use safeParse to prevent ZodError from crashing worker
      const validationResult = UpdateLectureSchema.safeParse(body);
      if (!validationResult.success) {
        const zodError = validationResult.error;
        const flattened = zodError.flatten();
        throw new AppError(
          'Validation failed',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          {
            message: 'Request body validation failed',
            errors: flattened.fieldErrors,
            formErrors: flattened.formErrors,
          },
        );
      }
      const validatedData = validationResult.data;
      return await taskService.updateLecture(id, validatedData, user.id);
    } else if (method === 'DELETE') {
      // PASS 2: Validate path parameter (UUID format, non-empty)
      const id = path.split('/').pop();
      if (!id || !isValidUUID(id)) {
        throw new AppError(
          'Invalid lecture ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          { field: 'id', message: 'Lecture ID must be a valid UUID' },
        );
      }
      return await taskService.deleteLecture(id, user.id);
    }
  }

  if (path.includes('/study-sessions')) {
    if (method === 'POST') {
      // PASS 1: Use safeParse to prevent ZodError from crashing worker
      const validationResult = CreateStudySessionSchema.safeParse(body);
      if (!validationResult.success) {
        const zodError = validationResult.error;
        const flattened = zodError.flatten();
        throw new AppError(
          'Validation failed',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          {
            message: 'Request body validation failed',
            errors: flattened.fieldErrors,
            formErrors: flattened.formErrors,
          },
        );
      }
      const validatedData = validationResult.data;
      return await taskService.createStudySession(validatedData, user.id);
    } else if (method === 'PUT') {
      // PASS 2: Validate path parameter (UUID format, non-empty)
      const id = path.split('/').pop();
      if (!id || !isValidUUID(id)) {
        throw new AppError(
          'Invalid study session ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          { field: 'id', message: 'Study session ID must be a valid UUID' },
        );
      }
      // PASS 1: Use safeParse to prevent ZodError from crashing worker
      const validationResult = UpdateStudySessionSchema.safeParse(body);
      if (!validationResult.success) {
        const zodError = validationResult.error;
        const flattened = zodError.flatten();
        throw new AppError(
          'Validation failed',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          {
            message: 'Request body validation failed',
            errors: flattened.fieldErrors,
            formErrors: flattened.formErrors,
          },
        );
      }
      const validatedData = validationResult.data;
      return await taskService.updateStudySession(id, validatedData, user.id);
    } else if (method === 'DELETE') {
      // PASS 2: Validate path parameter (UUID format, non-empty)
      const id = path.split('/').pop();
      if (!id || !isValidUUID(id)) {
        throw new AppError(
          'Invalid study session ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          { field: 'id', message: 'Study session ID must be a valid UUID' },
        );
      }
      return await taskService.deleteStudySession(id, user.id);
    }
  }

  if (path.includes('/batch')) {
    if (method === 'POST') {
      // PASS 1: Use safeParse to prevent ZodError from crashing worker
      const validationResult = BatchOperationSchema.safeParse(body);
      if (!validationResult.success) {
        const zodError = validationResult.error;
        const flattened = zodError.flatten();
        throw new AppError(
          'Validation failed',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          {
            message: 'Request body validation failed',
            errors: flattened.fieldErrors,
            formErrors: flattened.formErrors,
          },
        );
      }
      const validatedData = validationResult.data;
      return await taskService.batchOperations(
        validatedData.operations as Array<{
          type: 'create' | 'update' | 'delete';
          table: 'assignments' | 'lectures' | 'study_sessions';
          data: Record<string, unknown>;
          id?: string;
        }>,
        user.id,
      );
    }
  }

  throw new AppError('Invalid route or method', 404, ERROR_CODES.NOT_FOUND);
}

// Type assertion helper to ensure return type matches expected signature
async function handleTasksRequestTyped(
  req: AuthenticatedRequest & { url: string },
): Promise<Record<string, unknown> | Response> {
  const result = await handleTasksRequest(req);
  return result as Record<string, unknown> | Response;
}

// Serve the function
serve(
  createAuthenticatedHandler(handleTasksRequestTyped, {
    rateLimitName: 'tasks',
    checkTaskLimit: true,
    requireIdempotency: true,
  }),
);
