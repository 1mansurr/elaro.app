import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { checkTaskLimit } from '../_shared/check-task-limit.ts';
import { encrypt } from '../_shared/encryption.ts';

// Helper function to get an authenticated Supabase client
const getSupabaseClient = (req: Request): SupabaseClient => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! }
      }
    }
  );
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('--- Create Study Session Function Invoked ---');
    
    const supabaseClient = getSupabaseClient(req);
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    
    console.log(`Authenticated user: ${user.id}`);

    // Check unified task limit
    const limitError = await checkTaskLimit(supabaseClient, user.id);
    if (limitError) return limitError;

    const { course_id, topic, notes, session_date, has_spaced_repetition, reminders } = await req.json();
    
    console.log('Received payload:', { course_id, topic, session_date, has_spaced_repetition, reminders: reminders?.length || 0 });

    if (!course_id || !topic || !session_date) {
      return new Response(
        JSON.stringify({ error: 'Course, topic, and date are required.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Encryption key from environment
    const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');
    if (!ENCRYPTION_KEY) {
      return new Response('Encryption key not configured.', {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Encrypt sensitive fields
    const encryptedTopic = await encrypt(topic, ENCRYPTION_KEY);
    const encryptedDescription = notes ? await encrypt(notes, ENCRYPTION_KEY) : null;

    console.log(`Attempting to insert study session for user: ${user.id}`);

    const { data: newSession, error: sessionError } = await supabaseClient
      .from('study_sessions')
      .insert({
        user_id: user.id,
        course_id,
        topic: encryptedTopic,
        notes: encryptedDescription,
        session_date,
        has_spaced_repetition,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error inserting study session:', sessionError.message);
      throw sessionError;
    } else {
      console.log(`Successfully created study session with ID: ${newSession.id}`);
    }

    // If spaced repetition is enabled, invoke the schedule-reminders function
    if (has_spaced_repetition) {
      console.log(`Scheduling spaced repetition reminders for session ID: ${newSession.id}`);
      const { error: reminderError } = await supabaseClient.functions.invoke('schedule-reminders', {
        body: {
          session_id: newSession.id,
          session_date: newSession.session_date,
        },
      });

      if (reminderError) {
        // Log the error but don't fail the whole request, as the session was still created
        console.error('Failed to schedule reminders:', reminderError.message);
      }
    }

    // Create immediate reminders if provided
    if (newSession && reminders && reminders.length > 0) {
      console.log(`Creating ${reminders.length} immediate reminders for session ID: ${newSession.id}`);
      const sessionDate = new Date(session_date);
      const remindersToInsert = reminders.map((reminderMinutes: number) => {
        const reminderTime = new Date(sessionDate.getTime() - reminderMinutes * 60000);
        return {
          user_id: user.id,
          session_id: newSession.id, // Note: The column is session_id, not study_session_id
          reminder_time: reminderTime.toISOString(),
          reminder_type: 'study_session',
          reminder_date: reminderTime.toISOString(),
          day_number: Math.ceil(reminderMinutes / (24 * 60)),
          completed: false,
        };
      });

      const { error: immediateReminderError } = await supabaseClient
        .from('reminders')
        .insert(remindersToInsert);

      if (immediateReminderError) {
        console.error('Failed to create immediate reminders:', immediateReminderError.message);
      } else {
        console.log('Successfully created immediate reminders.');
      }
    }

    console.log('--- Create Study Session Function Finished ---');
    
    return new Response(
      JSON.stringify(newSession),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    );
  } catch (error) {
    console.error('--- Create Study Session Function Error ---');
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('--- End Error ---');
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
