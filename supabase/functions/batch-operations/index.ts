// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AppError,
} from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { z } from 'zod';
// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const BatchOperationSchema = z.object({
  operations: z
    .array(
      z.object({
        type: z.enum(['assignment', 'lecture', 'study_session', 'course']),
        action: z.enum(['create', 'update', 'delete', 'restore', 'list']),
        table: z.string().min(1).max(50),
        data: z.record(z.unknown()).optional(),
        filters: z.record(z.unknown()).optional(),
        pageParam: z.number().int().min(0).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      }),
    )
    .min(1, 'At least one operation is required')
    .max(50, 'Maximum 50 operations per batch'), // Limit batch size
});

// Table-specific schemas for validation
const AssignmentDataSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  due_date: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  reminders: z.array(z.number().int().positive()).optional(),
});

const LectureDataSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  location: z.string().max(200).optional(),
  reminders: z.array(z.number().int().positive()).optional(),
});

const StudySessionDataSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().optional(),
  location: z.string().max(200).optional(),
});

const CourseDataSchema = z.object({
  course_name: z.string().min(1).max(100),
  course_code: z.string().min(1).max(20).optional(),
  about_course: z.string().max(5000).optional(),
  university: z.string().max(200).optional(),
  program: z.string().max(200).optional(),
});

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function validateOperationData(
  operation: z.infer<typeof BatchOperationSchema>['operations'][0],
) {
  if (
    !operation.data &&
    (operation.action === 'create' || operation.action === 'update')
  ) {
    throw new AppError(
      `Operation ${operation.action} requires data`,
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  // Validate data against table-specific schemas
  if (operation.data) {
    switch (operation.type) {
      case 'assignment':
        if (operation.table !== 'assignments') {
          throw new AppError(
            'Type assignment must use table assignments',
            400,
            ERROR_CODES.VALIDATION_ERROR,
          );
        }
        // PASS 1: Use safeParse to prevent ZodError from crashing worker
        const assignmentValidation = AssignmentDataSchema.safeParse(
          operation.data,
        );
        if (!assignmentValidation.success) {
          const zodError = assignmentValidation.error;
          const flattened = zodError.flatten();
          throw new AppError(
            'Validation failed for assignment data',
            400,
            ERROR_CODES.VALIDATION_ERROR,
            {
              errors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          );
        }
        break;
      case 'lecture':
        if (operation.table !== 'lectures') {
          throw new AppError(
            'Type lecture must use table lectures',
            400,
            ERROR_CODES.VALIDATION_ERROR,
          );
        }
        // PASS 1: Use safeParse to prevent ZodError from crashing worker
        const lectureValidation = LectureDataSchema.safeParse(operation.data);
        if (!lectureValidation.success) {
          const zodError = lectureValidation.error;
          const flattened = zodError.flatten();
          throw new AppError(
            'Validation failed for lecture data',
            400,
            ERROR_CODES.VALIDATION_ERROR,
            {
              errors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          );
        }
        break;
      case 'study_session':
        if (operation.table !== 'study_sessions') {
          throw new AppError(
            'Type study_session must use table study_sessions',
            400,
            ERROR_CODES.VALIDATION_ERROR,
          );
        }
        // PASS 1: Use safeParse to prevent ZodError from crashing worker
        const studySessionValidation = StudySessionDataSchema.safeParse(
          operation.data,
        );
        if (!studySessionValidation.success) {
          const zodError = studySessionValidation.error;
          const flattened = zodError.flatten();
          throw new AppError(
            'Validation failed for study session data',
            400,
            ERROR_CODES.VALIDATION_ERROR,
            {
              errors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          );
        }
        break;
      case 'course':
        if (operation.table !== 'courses') {
          throw new AppError(
            'Type course must use table courses',
            400,
            ERROR_CODES.VALIDATION_ERROR,
          );
        }
        // PASS 1: Use safeParse to prevent ZodError from crashing worker
        const courseValidation = CourseDataSchema.safeParse(operation.data);
        if (!courseValidation.success) {
          const zodError = courseValidation.error;
          const flattened = zodError.flatten();
          throw new AppError(
            'Validation failed for course data',
            400,
            ERROR_CODES.VALIDATION_ERROR,
            {
              errors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          );
        }
        break;
      default:
        throw new AppError(
          `Unknown operation type: ${operation.type}`,
          400,
          ERROR_CODES.VALIDATION_ERROR,
        );
    }
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(
  createAuthenticatedHandler(
    async ({ body, supabaseClient, user }) => {
      const { operations } = body;

      // Type guard for operations
      if (!Array.isArray(operations)) {
        throw new AppError(
          'operations must be an array',
          400,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      // Validate each operation
      const operationsTyped = operations as z.infer<typeof BatchOperationSchema>['operations'];
      for (const operation of operationsTyped) {
        validateOperationData(operation);

        // Ensure user can only operate on their own data
        if (operation.filters && !operation.filters.user_id) {
          operation.filters.user_id = user.id;
        } else if (!operation.filters) {
          operation.filters = { user_id: user.id };
        } else {
          // Override any user_id in filters to prevent user spoofing
          operation.filters.user_id = user.id;
        }
      }

      // Process operations in batch
      const results = await processBatchOperations(
        operationsTyped,
        supabaseClient,
        user.id,
      );

      return { results } as Record<string, unknown>;
    },
    {
      rateLimitName: 'batch-operations',
      schema: BatchOperationSchema,
      requireIdempotency: true,
    },
  ),
);

// ============================================================================
// PROCESSING FUNCTIONS
// ============================================================================

async function processBatchOperations(
  operations: z.infer<typeof BatchOperationSchema>['operations'],
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const results = [];

  for (const operation of operations) {
    try {
      const result = await executeOperation(operation, supabase, userId);
      results.push({ success: true, data: result });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorCode =
        error instanceof AppError ? error.code : 'OPERATION_ERROR';
      results.push({
        success: false,
        error: errorMessage,
        code: errorCode,
      });
    }
  }

  return results;
}

async function executeOperation(
  operation: z.infer<typeof BatchOperationSchema>['operations'][0],
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const { table, action, data, filters, pageParam, pageSize } = operation;

  // Ensure user_id is always in filters
  const safeFilters = { ...filters, user_id: userId };

  switch (action) {
    case 'create': {
      if (!data)
        throw new AppError(
          'Create operation requires data',
          400,
          ERROR_CODES.VALIDATION_ERROR,
        );
      // Ensure user_id is set
      const createData = { ...data, user_id: userId };
      const { data: created, error: createError } = await supabase
        .from(table)
        .insert(createData)
        .select()
        .single();
      if (createError) throw handleDbError(createError);
      return created;
    }

    case 'update': {
      if (!data)
        throw new AppError(
          'Update operation requires data',
          400,
          ERROR_CODES.VALIDATION_ERROR,
        );
      let updateQuery = supabase.from(table).update(data);
      Object.entries(safeFilters).forEach(([key, value]) => {
        updateQuery = updateQuery.eq(key, value);
      });
      const { data: updated, error: updateError } = await updateQuery
        .select()
        .single();
      if (updateError) throw handleDbError(updateError);
      return updated;
    }

    case 'delete': {
      let deleteQuery = supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() });
      Object.entries(safeFilters).forEach(([key, value]) => {
        deleteQuery = deleteQuery.eq(key, value);
      });
      const { data: deleted, error: deleteError } = await deleteQuery
        .select()
        .single();
      if (deleteError) throw handleDbError(deleteError);
      return deleted;
    }

    case 'restore': {
      let restoreQuery = supabase.from(table).update({ deleted_at: null });
      Object.entries(safeFilters).forEach(([key, value]) => {
        restoreQuery = restoreQuery.eq(key, value);
      });
      const { data: restored, error: restoreError } = await restoreQuery
        .select()
        .single();
      if (restoreError) throw handleDbError(restoreError);
      return restored;
    }

    case 'list': {
      const defaultPageSize = pageSize || 50;
      const defaultPageParam = pageParam || 0;

      let listQuery = supabase
        .from(table)
        .select('*', { count: 'exact' }) // Add count for pagination metadata
        .eq('user_id', userId) // Always filter by user_id
        .is('deleted_at', null) // Only non-deleted items
        .order('created_at', { ascending: false });

      // Apply pagination (offset-based, consistent with other APIs)
      const from = defaultPageParam;
      const to = defaultPageParam + defaultPageSize - 1;
      listQuery = listQuery.range(from, to);

      const { data: listData, error: listError } = await listQuery;
      if (listError) throw handleDbError(listError);
      return listData;
    }

    default:
      throw new AppError(
        `Unknown action: ${action}`,
        400,
        ERROR_CODES.VALIDATION_ERROR,
      );
  }
}
