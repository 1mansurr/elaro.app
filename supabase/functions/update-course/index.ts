// FILE: supabase/functions/update-course/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
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
    const supabase = getSupabaseClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Apply rate limiting check
    try {
      await checkRateLimit(supabase, user.id, 'update-course');
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

    const { courseId, course_name, course_code, about_course } = await req.json();

    if (!courseId || !course_name) {
      return new Response(
        JSON.stringify({ error: 'courseId and course_name are required.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const { data, error } = await supabase
      .from('courses')
      .update({
        course_name,
        course_code,
        about_course,
        updated_at: new Date().toISOString(),
      })
      .eq('id', courseId)
      .eq('user_id', user.id) // Ensure user owns the course
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
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
