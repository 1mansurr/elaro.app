import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

const COURSE_LIMIT = 2;

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
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

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const { course_name, course_code, about_course } = await req.json();

    if (!course_name) {
      return new Response(
        JSON.stringify({ error: 'Course name is required.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // --- MVP LIMIT LOGIC ---
    const { count, error: countError } = await supabaseClient
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      throw countError;
    }

    if (count !== null && count >= COURSE_LIMIT) {
      return new Response(
        JSON.stringify({ error: `Course limit of ${COURSE_LIMIT} reached.` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403, // Forbidden
        }
      );
    }
    // --- END OF MVP LIMIT LOGIC ---

    const { data: newCourse, error: insertError } = await supabaseClient
      .from('courses')
      .insert({
        user_id: user.id,
        course_name,
        course_code,
        about_course,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify(newCourse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201, // Created
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
