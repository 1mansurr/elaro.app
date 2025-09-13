import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Get authenticated user
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Parse request body
    const { course_id, lecture_date, is_recurring, recurring_pattern } = await req.json();

    // Validate required fields
    if (!course_id) {
      return new Response(
        JSON.stringify({ error: 'Course ID is required.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    if (!lecture_date) {
      return new Response(
        JSON.stringify({ error: 'Lecture date is required.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Verify the course belongs to the user
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('id, user_id')
      .eq('id', course_id)
      .eq('user_id', user.id)
      .single();

    if (courseError || !course) {
      return new Response(
        JSON.stringify({ error: 'Course not found or access denied.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Create the lecture
    const { data: newLecture, error: insertError } = await supabaseClient
      .from('lectures')
      .insert({
        user_id: user.id,
        course_id,
        lecture_date,
        is_recurring: is_recurring || false,
        recurring_pattern: recurring_pattern || null,
      })
      .select(`
        *,
        courses (
          id,
          course_name,
          course_code
        )
      `)
      .single();

    if (insertError) {
      throw insertError;
    }

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
