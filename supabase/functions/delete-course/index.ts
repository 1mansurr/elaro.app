// FILE: supabase/functions/delete-course/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';

// Helper to get an authenticated Supabase client
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
      await checkRateLimit(supabase, user.id, 'delete-course');
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

    const { courseId } = await req.json();

    if (!courseId) {
      return new Response(
        JSON.stringify({ error: 'courseId is required.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // RLS policy will enforce that the user can only delete their own course.
    // Perform soft delete by setting deleted_at timestamp
    const { error: updateError } = await supabase
      .from('courses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', courseId)
      .eq('user_id', user.id); // Double-check ownership for security

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ message: 'Course moved to recycle bin successfully.' }),
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
