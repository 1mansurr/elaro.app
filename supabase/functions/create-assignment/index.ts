import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { createAuthenticatedHandler, AppError } from '../_shared/function-handler.ts';
import { encrypt } from '../_shared/encryption.ts';

const encryptionKey = Deno.env.get('ENCRYPTION_KEY');

// Define the validation schema
const CreateAssignmentSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(1, { message: "Title is required." }).max(200),
  description: z.string().max(5000).optional(),
  due_date: z.string().datetime(),
  submission_method: z.enum(['online', 'in-person']).optional(),
  submission_link: z.string().url().optional().or(z.literal('')),
  reminders: z.array(z.number().int().positive()).optional(),
});

serve(createAuthenticatedHandler(
  async ({ user, supabaseClient, body }) => {
    // 1. Get data from the request body
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
    console.log(`Verifying ownership for user: ${user.id}, course: ${course_id}`);
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('id')
      .eq('id', course_id)
      .eq('user_id', user.id)
      .single();

    if (courseError || !course) {
      throw new AppError('Course not found or access denied.', 404, 'NOT_FOUND');
    }

    // 3. Validation is now handled automatically by Zod schema

    // 4. Core Business Logic
    const encryptedTitle = await encrypt(title, encryptionKey);
    const encryptedDescription = description ? await encrypt(description, encryptionKey) : null;

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
      throw new AppError(insertError.message, 500, 'DB_INSERT_ERROR');
    }

    // 5. Reminder creation logic
    if (newAssignment && reminders && reminders.length > 0) {
      const dueDate = new Date(due_date);
      const remindersToInsert = reminders.map((mins: number) => ({
        user_id: user.id,
        assignment_id: newAssignment.id,
        reminder_time: new Date(dueDate.getTime() - mins * 60000).toISOString(),
        reminder_type: 'assignment',
        day_number: Math.ceil(mins / (24 * 60)),
        completed: false,
      }));
      
      const { error: reminderError } = await supabaseClient.from('reminders').insert(remindersToInsert);
      if (reminderError) {
        console.error('Failed to create reminders for assignment:', newAssignment.id, reminderError);
        // Non-critical error, so we don't throw. The assignment was still created.
      }
    }

    // 6. Return the result
    return newAssignment;
  },
  { 
    rateLimitName: 'create-assignment', 
    checkTaskLimit: true,
    schema: CreateAssignmentSchema
  }
));