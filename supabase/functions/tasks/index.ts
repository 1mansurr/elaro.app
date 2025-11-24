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

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AppError,
} from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { z } from 'zod';
import {
  initializeEventDrivenArchitecture,
  DatabaseEventEmitter,
  EventUtils,
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
  constructor(private supabaseClient: any) {}

  // Assignment operations
  async createAssignment(data: any, userId: string) {
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

    // Emit event
    const eventEmitter = new DatabaseEventEmitter(this.supabaseClient);
    await eventEmitter.emitTaskCompleted({
      taskId: assignment.id,
      taskType: 'assignment',
      userId,
      completedAt: new Date().toISOString(),
    });

    return assignment;
  }

  async updateAssignment(id: string, data: any, userId: string) {
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
    const { data, error } = await this.supabaseClient.rpc(
      'soft_delete_record',
      {
        table_name: 'assignments',
        record_id: id,
        user_id: userId,
      },
    );

    if (error)
      throw new AppError(error.message, 500, 'ASSIGNMENT_DELETE_ERROR');
    return { success: true };
  }

  // Lecture operations
  async createLecture(data: any, userId: string) {
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

    // Emit event
    const eventEmitter = new DatabaseEventEmitter(this.supabaseClient);
    await eventEmitter.emitTaskCompleted({
      taskId: lecture.id,
      taskType: 'lecture',
      userId,
      completedAt: new Date().toISOString(),
    });

    return lecture;
  }

  async updateLecture(id: string, data: any, userId: string) {
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
    const { data, error } = await this.supabaseClient.rpc(
      'soft_delete_record',
      {
        table_name: 'lectures',
        record_id: id,
        user_id: userId,
      },
    );

    if (error) throw new AppError(error.message, 500, 'LECTURE_DELETE_ERROR');
    return { success: true };
  }

  // Study session operations
  async createStudySession(data: any, userId: string) {
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

    // Emit event
    const eventEmitter = new DatabaseEventEmitter(this.supabaseClient);
    await eventEmitter.emitTaskCompleted({
      taskId: session.id,
      taskType: 'study_session',
      userId,
      completedAt: new Date().toISOString(),
    });

    return session;
  }

  async updateStudySession(id: string, data: any, userId: string) {
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
    const { data, error } = await this.supabaseClient.rpc(
      'soft_delete_record',
      {
        table_name: 'study_sessions',
        record_id: id,
        user_id: userId,
      },
    );

    if (error)
      throw new AppError(error.message, 500, 'STUDY_SESSION_DELETE_ERROR');
    return { success: true };
  }

  // Batch operations
  async batchOperations(operations: any[], userId: string) {
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
            if (operation.table === 'assignments') {
              result = await this.updateAssignment(
                operation.id!,
                operation.data,
                userId,
              );
            } else if (operation.table === 'lectures') {
              result = await this.updateLecture(
                operation.id!,
                operation.data,
                userId,
              );
            } else if (operation.table === 'study_sessions') {
              result = await this.updateStudySession(
                operation.id!,
                operation.data,
                userId,
              );
            }
            break;

          case 'delete':
            if (operation.table === 'assignments') {
              result = await this.deleteAssignment(operation.id!, userId);
            } else if (operation.table === 'lectures') {
              result = await this.deleteLecture(operation.id!, userId);
            } else if (operation.table === 'study_sessions') {
              result = await this.deleteStudySession(operation.id!, userId);
            }
            break;
        }

        results.push({ success: true, operation, result });
      } catch (error) {
        results.push({ success: false, operation, error: error.message });
      }
    }

    return results;
  }
}

// Main handler function
async function handleTasksRequest({ user, supabaseClient, body, url }: any) {
  const taskService = new TaskService(supabaseClient);
  const path = new URL(url).pathname;
  const method = new URL(url).searchParams.get('method') || 'GET';

  // Initialize event-driven architecture
  initializeEventDrivenArchitecture(supabaseClient);

  // Route handling
  if (path.includes('/assignments')) {
    if (method === 'POST') {
      const validatedData = CreateAssignmentSchema.parse(body);
      return await taskService.createAssignment(validatedData, user.id);
    } else if (method === 'PUT') {
      const id = path.split('/').pop();
      const validatedData = UpdateAssignmentSchema.parse(body);
      return await taskService.updateAssignment(id, validatedData, user.id);
    } else if (method === 'DELETE') {
      const id = path.split('/').pop();
      return await taskService.deleteAssignment(id, user.id);
    }
  }

  if (path.includes('/lectures')) {
    if (method === 'POST') {
      const validatedData = CreateLectureSchema.parse(body);
      return await taskService.createLecture(validatedData, user.id);
    } else if (method === 'PUT') {
      const id = path.split('/').pop();
      const validatedData = UpdateLectureSchema.parse(body);
      return await taskService.updateLecture(id, validatedData, user.id);
    } else if (method === 'DELETE') {
      const id = path.split('/').pop();
      return await taskService.deleteLecture(id, user.id);
    }
  }

  if (path.includes('/study-sessions')) {
    if (method === 'POST') {
      const validatedData = CreateStudySessionSchema.parse(body);
      return await taskService.createStudySession(validatedData, user.id);
    } else if (method === 'PUT') {
      const id = path.split('/').pop();
      const validatedData = UpdateStudySessionSchema.parse(body);
      return await taskService.updateStudySession(id, validatedData, user.id);
    } else if (method === 'DELETE') {
      const id = path.split('/').pop();
      return await taskService.deleteStudySession(id, user.id);
    }
  }

  if (path.includes('/batch')) {
    if (method === 'POST') {
      const validatedData = BatchOperationSchema.parse(body);
      return await taskService.batchOperations(
        validatedData.operations,
        user.id,
      );
    }
  }

  throw new AppError('Invalid route or method', 404, ERROR_CODES.NOT_FOUND);
}

// Serve the function
serve(
  createAuthenticatedHandler(handleTasksRequest, {
    rateLimitName: 'tasks',
    checkTaskLimit: true,
    requireIdempotency: true,
  }),
);
