// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AuthenticatedRequest,
} from '../_shared/function-handler.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { CreateCourseAndLectureSchema } from '../_shared/schemas/courseAndLecture.ts';

async function handleCreateCourse(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);

  await logger.info(
    'Creating course and lecture',
    { user_id: user.id },
    traceContext,
  );

  // 1. Validate the input (already validated by handler, but extract for use)
  const {
    courseName,
    courseCode,
    courseDescription,
    startTime,
    endTime,
    recurrence,
    venue,
    reminders,
  } = body;

  // --- Start Database Transaction ---
  // We'll call a PostgreSQL function to handle the transaction.
  const { data, error } = await supabaseClient.rpc(
    'create_course_and_lectures_transaction',
    {
      p_user_id: user.id,
      p_course_name: courseName,
      p_course_code: courseCode,
      p_course_description: courseDescription,
      p_start_time: startTime,
      p_end_time: endTime,
      p_recurrence_type: recurrence,
      p_venue: venue,
      p_reminders: reminders,
    },
  );

  if (error) {
    await logger.error(
      'RPC Error creating course and lectures',
      {
        user_id: user.id,
        error: error.message,
      },
      traceContext,
    );
    throw handleDbError(error);
  }

  await logger.info(
    'Successfully created course and lectures',
    { user_id: user.id },
    traceContext,
  );

  return { message: 'Course and lecture(s) created successfully', data };
}

serve(
  createAuthenticatedHandler(handleCreateCourse, {
    rateLimitName: 'create-course',
    schema: CreateCourseAndLectureSchema,
    requireIdempotency: true,
  }),
);
