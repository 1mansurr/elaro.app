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
import { CreateStudySessionSchema } from '../_shared/schemas/studySession.ts';
import { encrypt } from '../_shared/encryption.ts';

// The core business logic for creating a study session
async function handleCreateStudySession(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const {
    course_id,
    topic,
    notes,
    session_date,
    has_spaced_repetition,
    reminders,
  } = body;

  const traceContext = extractTraceContext(req as unknown as Request);
  await logger.info(
    'Verifying course ownership',
    { user_id: user.id, course_id },
    traceContext,
  );

  // SECURITY: Verify course ownership
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
  if (typeof topic !== 'string') {
    throw new AppError(
      'topic is required and must be a string',
      400,
      ERROR_CODES.INVALID_INPUT,
    );
  }

  const [encryptedTopic, encryptedNotes] = await Promise.all([
    encrypt(topic, encryptionKey),
    notes && typeof notes === 'string' ? encrypt(notes, encryptionKey) : null,
  ]);

  const { data: newSession, error: insertError } = await supabaseClient
    .from('study_sessions')
    .insert({
      user_id: user.id,
      course_id,
      topic: encryptedTopic,
      notes: encryptedNotes,
      session_date,
      has_spaced_repetition,
    })
    .select('id, topic, session_date')
    .single();

  if (insertError) throw handleDbError(insertError);

  const newSessionTyped = newSession as {
    id: string;
    topic: string;
    session_date: string;
  };

  await logger.info(
    'Successfully created study session',
    { user_id: user.id, session_id: newSessionTyped.id },
    traceContext,
  );

  // Spaced Repetition Reminder Logic
  if (has_spaced_repetition) {
    await logger.info(
      'Scheduling spaced repetition reminders',
      { user_id: user.id, session_id: newSessionTyped.id },
      traceContext,
    );

    // Call the schedule-reminders function via HTTP instead of functions.invoke
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (supabaseUrl && supabaseAnonKey) {
      const scheduleRemindersUrl = `${supabaseUrl}/functions/v1/schedule-reminders`;
      const scheduleResponse = await fetch(scheduleRemindersUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          session_id: newSessionTyped.id,
          session_date: newSessionTyped.session_date,
          topic: topic, // Pass the original, unencrypted topic
        }),
      });

      if (!scheduleResponse.ok) {
        // Log the error but don't fail the whole request, as the session was still created
        await logger.error(
          'Failed to schedule reminders',
          {
            user_id: user.id,
            session_id: newSessionTyped.id,
            error: `HTTP ${scheduleResponse.status}: ${await scheduleResponse.text()}`,
          },
          traceContext,
        );
      }
    }
  }

  // Immediate Reminder Logic
  const remindersArray = Array.isArray(reminders)
    ? reminders.filter((r): r is number => typeof r === 'number')
    : [];
  if (remindersArray.length > 0) {
    await logger.info(
      'Creating immediate reminders',
      {
        user_id: user.id,
        session_id: newSessionTyped.id,
        reminder_count: remindersArray.length,
      },
      traceContext,
    );

    const sessionDateTyped =
      typeof session_date === 'string'
        ? new Date(session_date)
        : new Date(session_date as string | number | Date);
    const remindersToInsert = remindersArray.map((mins: number) => {
      const reminderTime = new Date(sessionDateTyped.getTime() - mins * 60000);
      return {
        user_id: user.id,
        session_id: newSessionTyped.id,
        reminder_time: reminderTime.toISOString(),
        reminder_type: 'study_session',
        day_number: Math.ceil(mins / (24 * 60)),
        completed: false,
      };
    });

    const { error: reminderError } = await supabaseClient
      .from('reminders')
      .insert(remindersToInsert);
    if (reminderError) {
      await logger.error(
        'Failed to create immediate reminders',
        {
          user_id: user.id,
          session_id: newSessionTyped.id,
          error: reminderError.message,
        },
        traceContext,
      );
    } else {
      await logger.info(
        'Successfully created immediate reminders',
        { user_id: user.id, session_id: newSessionTyped.id },
        traceContext,
      );
    }
  }

  return newSessionTyped as Record<string, unknown>;
}

// Wrap the business logic with our secure, generic handler
serve(
  createAuthenticatedHandler(handleCreateStudySession, {
    rateLimitName: 'create-study-session',
    checkTaskLimit: true,
    schema: CreateStudySessionSchema,
  }),
);
