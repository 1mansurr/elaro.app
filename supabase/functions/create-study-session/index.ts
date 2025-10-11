import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
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

  console.log(`Verifying ownership for user: ${user.id}, course: ${course_id}`);

  // SECURITY: Verify course ownership
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

  const [encryptedTopic, encryptedNotes] = await Promise.all([
    encrypt(topic, encryptionKey),
    notes ? encrypt(notes, encryptionKey) : null,
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

  if (insertError) throw new AppError(insertError.message, 500, 'DB_INSERT_ERROR');
  console.log(`Successfully created study session with ID: ${newSession.id}`);

  // Spaced Repetition Reminder Logic
  if (has_spaced_repetition) {
    console.log(`Scheduling spaced repetition reminders for session ID: ${newSession.id}`);
    const { error: reminderError } = await supabaseClient.functions.invoke('schedule-reminders', {
      body: {
        session_id: newSession.id,
        session_date: newSession.session_date,
        topic: topic, // Pass the original, unencrypted topic
      },
    });

    if (reminderError) {
      // Log the error but don't fail the whole request, as the session was still created
      console.error('Failed to schedule reminders:', reminderError.message);
    }
  }

  // Immediate Reminder Logic
  if (reminders && reminders.length > 0) {
    console.log(`Creating ${reminders.length} immediate reminders for session ID: ${newSession.id}`);
    const sessionDate = new Date(session_date);
    const remindersToInsert = reminders.map((mins: number) => {
      const reminderTime = new Date(sessionDate.getTime() - mins * 60000);
      return {
        user_id: user.id,
        session_id: newSession.id,
        reminder_time: reminderTime.toISOString(),
        reminder_type: 'study_session',
        day_number: Math.ceil(mins / (24 * 60)),
        completed: false,
      };
    });
    
    const { error: reminderError } = await supabaseClient.from('reminders').insert(remindersToInsert);
    if (reminderError) {
      console.error('Failed to create immediate reminders for session:', newSession.id, reminderError);
    } else {
      console.log('Successfully created immediate reminders.');
    }
  }

  return newSession;
}

// Wrap the business logic with our secure, generic handler
serve(createAuthenticatedHandler(
  handleCreateStudySession,
  {
    rateLimitName: 'create-study-session',
    checkTaskLimit: true,
    schema: CreateStudySessionSchema,
  }
));
