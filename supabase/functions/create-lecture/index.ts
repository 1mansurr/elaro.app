import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { checkTaskLimit } from '../_shared/check-task-limit.ts';
import { encrypt } from '../_shared/encryption.ts';
import { checkRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    // Apply rate limiting check
    try {
      await checkRateLimit(supabaseClient, user.id, 'create-lecture');
    } catch (error) {
      if (error instanceof RateLimitError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 429, // Too Many Requests
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
    const limitError = await checkTaskLimit(supabaseClient, user.id);
    if (limitError) return limitError;

    const { course_id, lecture_date, is_recurring, recurring_pattern, lecture_name, description } = await req.json();

    if (!course_id || !lecture_date) {
      return new Response(
        JSON.stringify({ error: 'Course ID and lecture date are required.' }),
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

    // Encrypt sensitive fields if provided
    const encryptedLectureName = typeof lecture_name === 'string' && lecture_name.length > 0
      ? await encrypt(lecture_name, ENCRYPTION_KEY)
      : null;
    const encryptedDescription = typeof description === 'string' && description.length > 0
      ? await encrypt(description, ENCRYPTION_KEY)
      : null;

    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      course_id,
      lecture_date,
      is_recurring,
      recurring_pattern,
    };

    if (lecture_name !== undefined) insertPayload.lecture_name = encryptedLectureName;
    if (description !== undefined) insertPayload.description = encryptedDescription;

    const { data: newLecture, error } = await supabaseClient
      .from('lectures')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify(newLecture),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
