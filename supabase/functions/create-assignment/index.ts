// FILE: supabase/functions/create-assignment/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { checkTaskLimit } from '../_shared/check-task-limit.ts';
import { encrypt } from '../_shared/encryption.ts';
import { checkRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';

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
    console.log('--- Create Assignment Function Invoked ---');
    
    const supabase = getSupabaseClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    
    console.log(`Authenticated user: ${user.id}`);

    // Apply rate limiting check
    try {
      await checkRateLimit(supabase, user.id, 'create-assignment');
    } catch (error) {
      if (error instanceof RateLimitError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 429,
          headers: corsHeaders,
        });
      }
      console.error('An unexpected error occurred during rate limit check:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Check unified task limit
    const limitError = await checkTaskLimit(supabase, user.id);
    if (limitError) return limitError;

    const { course_id, title, description, submission_method, submission_link, due_date, reminders } = await req.json();
    
    console.log('Received payload:', { course_id, title, due_date, reminders: reminders?.length || 0 });

    if (!course_id || !title || !due_date) {
      return new Response(
        JSON.stringify({ error: 'Course, title, and due date are required.' }),
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
    const encryptedTitle = await encrypt(title, ENCRYPTION_KEY);
    const encryptedDescription = description ? await encrypt(description, ENCRYPTION_KEY) : null;

    console.log(`Attempting to insert assignment for user: ${user.id}`);

    const { data, error } = await supabase
      .from('assignments')
      .insert({
        user_id: user.id,
        course_id,
        title: encryptedTitle,
        description: encryptedDescription,
        submission_method,
        submission_link,
        due_date,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting assignment:', error.message);
      throw error;
    } else {
      console.log(`Successfully created assignment with ID: ${data.id}`);
    }

    // Create reminders if provided
    if (data && reminders && reminders.length > 0) {
      console.log(`Creating ${reminders.length} reminders for assignment ID: ${data.id}`);
      const dueDate = new Date(due_date);
      const remindersToInsert = reminders.map((reminderMinutes: number) => {
        const reminderTime = new Date(dueDate.getTime() - reminderMinutes * 60000);
        return {
          user_id: user.id,
          assignment_id: data.id,
          reminder_time: reminderTime.toISOString(),
          reminder_type: 'assignment',
          // The following fields are for compatibility or can be derived.
          reminder_date: reminderTime.toISOString(),
          day_number: Math.ceil(reminderMinutes / (24 * 60)),
          completed: false,
        };
      });

      const { error: reminderError } = await supabase
        .from('reminders')
        .insert(remindersToInsert);

      if (reminderError) {
        // Log the error, but don't fail the whole request since the assignment was created.
        // The user can add reminders manually later.
        console.error('Failed to create reminders for assignment:', data.id, reminderError);
      } else {
        console.log('Successfully created reminders.');
      }
    }

    console.log('--- Create Assignment Function Finished ---');
    
    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    );
  } catch (error) {
    console.error('--- Create Assignment Function Error ---');
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
