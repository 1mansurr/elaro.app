import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';
import { CreateCourseAndLectureSchema } from '../_shared/schemas/courseAndLecture.ts';

// Main function to handle the request
serve(async (req ) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Apply rate limiting
    await checkRateLimit(supabaseClient, user.id, 'create-course-and-lecture');

    const body = await req.json();
    
    // 1. Validate the input
    const {
      courseName,
      courseCode,
      courseDescription,
      startTime,
      endTime,
      recurrence,
      reminders,
    } = CreateCourseAndLectureSchema.parse(body);

    // --- Start Database Transaction ---
    // We'll call a PostgreSQL function to handle the transaction.
    const { data, error } = await supabaseClient.rpc('create_course_and_lectures_transaction', {
      p_user_id: user.id,
      p_course_name: courseName,
      p_course_code: courseCode,
      p_course_description: courseDescription,
      p_start_time: startTime,
      p_end_time: endTime,
      p_recurrence_type: recurrence,
      p_reminders: reminders,
    });

    if (error) {
      console.error('RPC Error:', error);
      throw new Error('Failed to create course and lectures: ' + error.message);
    }

    return new Response(JSON.stringify({ message: 'Course and lecture(s) created successfully', data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    if (error instanceof RateLimitError) {
      return new Response(JSON.stringify({ error: error.message }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.error('Main Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
