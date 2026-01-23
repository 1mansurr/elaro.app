// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AuthenticatedRequest,
  AppError,
} from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { CreateLectureSchema } from '../_shared/schemas/lecture.ts';
import { encrypt } from '../_shared/encryption.ts';

// The core business logic for creating a lecture
async function handleCreateLecture(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const {
    course_id,
    lecture_name,
    start_time,
    end_time,
    description,
    is_recurring,
    recurring_pattern,
    reminders,
  } = body;

  const traceContext = extractTraceContext(req as unknown as Request);
  await logger.info(
    'Verifying course ownership',
    { user_id: user.id, course_id },
    traceContext,
  );

  // SECURITY: Verify the user owns the course they are adding a lecture to.
  const { data: course, error: courseError } = await supabaseClient
    .from('courses')
    .select('id')
    .eq('id', course_id)
    .eq('user_id', user.id)
    .single();

  if (courseError || !course) {
    if (courseError) {
      throw handleDbError(courseError);
    }
    throw new AppError(
      'Course not found or access denied.',
      404,
      ERROR_CODES.DB_NOT_FOUND,
    );
  }

  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey)
    throw new AppError(
      'Encryption key not configured.',
      500,
      ERROR_CODES.CONFIG_ERROR,
    );

  // Type guards for encryption
  if (typeof lecture_name !== 'string') {
    throw new AppError(
      'lecture_name is required and must be a string',
      400,
      ERROR_CODES.INVALID_INPUT,
    );
  }

  const [encryptedLectureName, encryptedDescription] = await Promise.all([
    encrypt(lecture_name, encryptionKey),
    description && typeof description === 'string' ? encrypt(description, encryptionKey) : null,
  ]);

  const { data: newLecture, error: insertError } = await supabaseClient
    .from('lectures')
    .insert({
      user_id: user.id,
      course_id,
      lecture_name: encryptedLectureName,
      description: encryptedDescription,
      start_time,
      end_time: end_time || null,
      lecture_date: start_time, // For backward compatibility
      is_recurring: is_recurring || false,
      recurring_pattern: recurring_pattern || null,
    })
    .select('id')
    .single();

  if (insertError) throw handleDbError(insertError);
  
  const newLectureTyped = newLecture as { id: string };
  
  await logger.info(
    'Successfully created lecture',
    { user_id: user.id, lecture_id: newLectureTyped.id },
    traceContext,
  );

  // Reminder creation logic
  const remindersArray = Array.isArray(reminders) ? reminders.filter((r): r is number => typeof r === 'number') : [];
  if (remindersArray.length > 0) {
    const startTimeTyped = typeof start_time === 'string' ? new Date(start_time) : new Date(start_time as string | number | Date);
    const remindersToInsert = remindersArray.map((mins: number) => ({
      user_id: user.id,
      lecture_id: newLectureTyped.id,
      reminder_time: new Date(
        startTimeTyped.getTime() - mins * 60000,
      ).toISOString(),
      reminder_type: 'lecture',
    }));

    const { error: reminderError } = await supabaseClient
      .from('reminders')
      .insert(remindersToInsert);
    if (reminderError) {
      await logger.error(
        'Failed to create reminders for lecture',
        {
          user_id: user.id,
          lecture_id: newLectureTyped.id,
          error: reminderError.message,
        },
        traceContext,
      );
    } else {
      await logger.info(
        'Successfully created reminders',
        {
          user_id: user.id,
          lecture_id: newLectureTyped.id,
          reminder_count: remindersArray.length,
        },
        traceContext,
      );
    }
  }

  return newLectureTyped as Record<string, unknown>;
}

// Wrap the business logic with our secure, generic handler
serve(
  createAuthenticatedHandler(handleCreateLecture, {
    rateLimitName: 'create-lecture',
    checkTaskLimit: true,
    schema: CreateLectureSchema,
  }),
);
