import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
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

  console.log(`Verifying ownership for user: ${user.id}, course: ${course_id}`);

  // SECURITY: Verify the user owns the course they are adding a lecture to.
  const { data: course, error: courseError } = await supabaseClient
    .from('courses')
    .select('id')
    .eq('id', course_id)
    .eq('user_id', user.id)
    .single();

  if (courseError || !course) {
    throw new AppError('Course not found or access denied.', 404, 'NOT_FOUND');
  }

  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey) throw new AppError('Encryption key not configured.', 500, 'CONFIG_ERROR');

  const [encryptedLectureName, encryptedDescription] = await Promise.all([
    encrypt(lecture_name, encryptionKey),
    description ? encrypt(description, encryptionKey) : null,
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

  if (insertError) throw new AppError(insertError.message, 500, 'DB_INSERT_ERROR');
  console.log(`Successfully created lecture with ID: ${newLecture.id}`);

  // Reminder creation logic
  if (reminders && reminders.length > 0) {
    const lectureStartTime = new Date(start_time);
    const remindersToInsert = reminders.map((mins: number) => ({
      user_id: user.id,
      lecture_id: newLecture.id,
      reminder_time: new Date(lectureStartTime.getTime() - mins * 60000).toISOString(),
      reminder_type: 'lecture',
    }));
    
    const { error: reminderError } = await supabaseClient.from('reminders').insert(remindersToInsert);
    if (reminderError) {
      console.error('Failed to create reminders for lecture:', newLecture.id, reminderError);
    } else {
      console.log(`Successfully created ${reminders.length} reminders.`);
    }
  }

  return newLecture;
}

// Wrap the business logic with our secure, generic handler
serve(createAuthenticatedHandler(
  handleCreateLecture,
  {
    rateLimitName: 'create-lecture',
    checkTaskLimit: true,
    schema: CreateLectureSchema,
  }
));