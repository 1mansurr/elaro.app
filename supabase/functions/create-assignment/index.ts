import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AppError,
} from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { CreateAssignmentSchema } from '../_shared/schemas/assignment.ts';
import { encrypt } from '../_shared/encryption.ts';
import { logger } from '../_shared/logging.ts';

const encryptionKey = Deno.env.get('ENCRYPTION_KEY');

serve(
  createAuthenticatedHandler(
    async ({ user, supabaseClient, body }) => {
      // Validation is now handled automatically by the handler using CreateAssignmentSchema

      // 1. Get validated data from the request body
      const {
        course_id,
        title,
        description,
        due_date,
        submission_method,
        submission_link,
        reminders,
      } = body;

      // 2. SECURITY: Verify course ownership
      const { data: course, error: courseError } = await supabaseClient
        .from('courses')
        .select('id')
        .eq('id', course_id)
        .eq('user_id', user.id)
        .single();

      if (courseError || !course) {
        throw new AppError(
          'Course not found or access denied.',
          404,
          ERROR_CODES.DB_NOT_FOUND,
        );
      }

      // 3. Core Business Logic
      const encryptedTitle = await encrypt(title, encryptionKey);
      const encryptedDescription = description
        ? await encrypt(description, encryptionKey)
        : null;

      const { data: newAssignment, error: insertError } = await supabaseClient
        .from('assignments')
        .insert({
          user_id: user.id,
          course_id,
          title: encryptedTitle,
          description: encryptedDescription,
          due_date,
          submission_method,
          submission_link,
        })
        .select()
        .single();

      if (insertError) {
        throw handleDbError(insertError);
      }

      // 4. Reminder creation logic
      if (newAssignment && reminders && reminders.length > 0) {
        const dueDate = new Date(due_date);
        const remindersToInsert = reminders.map((mins: number) => ({
          user_id: user.id,
          assignment_id: newAssignment.id,
          reminder_time: new Date(
            dueDate.getTime() - mins * 60000,
          ).toISOString(),
          reminder_type: 'assignment',
          day_number: Math.ceil(mins / (24 * 60)),
          completed: false,
        }));

        const { error: reminderError } = await supabaseClient
          .from('reminders')
          .insert(remindersToInsert);
        if (reminderError) {
          await logger.error('Failed to create reminders for assignment', {
            assignment_id: newAssignment.id,
            error: reminderError.message,
          });
          // Non-critical error, so we don't throw. The assignment was still created.
        }
      }

      // 5. Return the result
      return newAssignment;
    },
    {
      rateLimitName: 'create-assignment',
      checkTaskLimit: true,
      schema: CreateAssignmentSchema,
    },
  ),
);
