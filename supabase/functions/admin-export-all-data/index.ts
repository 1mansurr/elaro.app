// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAdminHandler,
} from '../_shared/admin-handler.ts';
import {
  AuthenticatedRequest,
} from '../_shared/function-handler.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';

// Define the shape of the final export
interface FullExport {
  exportedAt: string;
  users: unknown[];
  courses: unknown[];
  assignments: unknown[];
  lectures: unknown[];
  studySessions: unknown[];
  reminders: unknown[];
}

async function handleAdminExport(req: AuthenticatedRequest) {
  const { supabaseClient, user } = req;
  const traceContext = extractTraceContext(req as unknown as Request);

  await logger.info(
    'Admin initiating data export',
    { admin_id: user.id },
    traceContext,
  );

  // Fetch all data from all critical tables
  const [users, courses, assignments, lectures, studySessions, reminders] =
    await Promise.all([
      supabaseClient.from('users').select('*'),
      supabaseClient.from('courses').select('*'),
      supabaseClient.from('assignments').select('*'),
      supabaseClient.from('lectures').select('*'),
      supabaseClient.from('study_sessions').select('*'),
      supabaseClient.from('reminders').select('*'),
    ]);

  // Check for errors - use first error found
  if (users.error) throw handleDbError(users.error);
  if (courses.error) throw handleDbError(courses.error);
  if (assignments.error) throw handleDbError(assignments.error);
  if (lectures.error) throw handleDbError(lectures.error);
  if (studySessions.error) throw handleDbError(studySessions.error);
  if (reminders.error) throw handleDbError(reminders.error);

  // Construct the final JSON output
  const exportData: FullExport = {
    exportedAt: new Date().toISOString(),
    users: (users.data as unknown[]) || [],
    courses: (courses.data as unknown[]) || [],
    assignments: (assignments.data as unknown[]) || [],
    lectures: (lectures.data as unknown[]) || [],
    studySessions: (studySessions.data as unknown[]) || [],
    reminders: (reminders.data as unknown[]) || [],
  };

  await logger.info(
    'Admin data export completed',
    {
      admin_id: user.id,
      user_count: (users.data as unknown[])?.length || 0,
      course_count: (courses.data as unknown[])?.length || 0,
      assignment_count: (assignments.data as unknown[])?.length || 0,
      lecture_count: (lectures.data as unknown[])?.length || 0,
      study_session_count: (studySessions.data as unknown[])?.length || 0,
      reminder_count: (reminders.data as unknown[])?.length || 0,
    },
    traceContext,
  );

  return exportData as unknown as Record<string, unknown>;
}

serve(
  createAdminHandler(
    handleAdminExport,
    'admin-export-all-data',
    undefined, // No schema needed for read operation
    false, // No idempotency needed for read operation
  ),
);
