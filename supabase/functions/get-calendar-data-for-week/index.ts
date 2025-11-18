/**
 * Get Calendar Data for Week
 * Returns all tasks (lectures, study sessions, assignments) for a given week
 */
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
import { decrypt } from '../_shared/encryption.ts';
import { z } from 'zod';

const GetCalendarDataSchema = z.object({
  date: z.string().datetime(),
});

async function handleGetCalendarData(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);

  await logger.info(
    'Fetching calendar data for week',
    { user_id: user.id },
    traceContext,
  );

  try {
    const { date } = body;
    if (!date) {
      throw new AppError(
        'Date parameter is required.',
        400,
        ERROR_CODES.MISSING_REQUIRED_FIELD,
      );
    }

    const targetDate = new Date(date);

    // Calculate start of the week (Sunday)
    const dayOfWeek = targetDate.getUTCDay(); // 0 = Sunday
    const weekStart = new Date(targetDate);
    weekStart.setUTCDate(targetDate.getUTCDate() - dayOfWeek);
    weekStart.setUTCHours(0, 0, 0, 0);

    // Calculate end of the week (Saturday)
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    // --- Run all queries in parallel ---
    const [lecturesPromise, studySessionsPromise, assignmentsPromise] = [
      supabaseClient
        .from('lectures')
        .select('*, courses(course_name)')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .gte('lecture_date', weekStart.toISOString())
        .lte('lecture_date', weekEnd.toISOString()),
      supabaseClient
        .from('study_sessions')
        .select('*, courses(course_name)')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .gte('session_date', weekStart.toISOString())
        .lte('session_date', weekEnd.toISOString()),
      supabaseClient
        .from('assignments')
        .select('*, courses(course_name)')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .gte('due_date', weekStart.toISOString())
        .lte('due_date', weekEnd.toISOString()),
    ];

    const [
      { data: lectures, error: lecturesError },
      { data: studySessions, error: studySessionsError },
      { data: assignments, error: assignmentsError },
    ] = await Promise.all([
      lecturesPromise,
      studySessionsPromise,
      assignmentsPromise,
    ]);

    if (lecturesError) throw handleDbError(lecturesError);
    if (studySessionsError) throw handleDbError(studySessionsError);
    if (assignmentsError) throw handleDbError(assignmentsError);

    // Encryption key from environment for decryption
    const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');
    if (!ENCRYPTION_KEY) {
      throw new AppError(
        'Encryption key not configured.',
        500,
        ERROR_CODES.CONFIG_ERROR,
      );
    }

    // --- Process and normalize results (without setting conflicting name fields) ---
    const allTasks = [
      ...(lectures || []).map(t => ({
        ...t,
        type: 'lecture',
        date: t.lecture_date,
      })),
      ...(studySessions || []).map(t => ({
        ...t,
        type: 'study_session',
        date: t.session_date,
      })),
      ...(assignments || []).map(t => ({
        ...t,
        type: 'assignment',
        date: t.due_date,
      })),
    ];

    // Decrypt sensitive fields and standardize to { name, description }
    interface Task {
      lecture_name?: string;
      title?: string;
      topic?: string;
      description?: string;
      notes?: string;
      date: string;
      [key: string]: unknown;
    }

    const decryptTask = async (task: Task) => {
      const nameField = task.lecture_name || task.title || task.topic || '';
      const descField = task.description ?? task.notes ?? null;

      const decryptedName = nameField
        ? await decrypt(nameField as string, ENCRYPTION_KEY!)
        : nameField;
      const decryptedDescription = descField
        ? await decrypt(descField as string, ENCRYPTION_KEY!)
        : null;

      return {
        ...task,
        name: decryptedName,
        description: decryptedDescription,
        lecture_name: undefined,
        title: undefined,
        topic: undefined,
        notes: undefined,
      };
    };

    const decryptedTasks = await Promise.all(allTasks.map(decryptTask));

    // Group tasks by date
    const groupedByDay = decryptedTasks.reduce(
      (acc: Record<string, Task[]>, task: Task) => {
        const taskDate = new Date(task.date).toISOString().split('T')[0]; // Get YYYY-MM-DD
        if (!acc[taskDate]) {
          acc[taskDate] = [];
        }
        acc[taskDate].push(task);
        return acc;
      },
      {} as Record<string, Task[]>,
    );

    // Sort tasks within each day
    for (const day in groupedByDay) {
      groupedByDay[day].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    }

    await logger.info(
      'Successfully fetched calendar data',
      {
        user_id: user.id,
        task_count: decryptedTasks.length,
      },
      traceContext,
    );

    return groupedByDay;
  } catch (error) {
    await logger.error(
      'Error fetching calendar data',
      {
        user_id: user.id,
        error: error instanceof Error ? error.message : String(error),
      },
      traceContext,
    );
    throw error;
  }
}

serve(
  createAuthenticatedHandler(handleGetCalendarData, {
    rateLimitName: 'get-calendar-data-for-week',
    schema: GetCalendarDataSchema,
  }),
);
