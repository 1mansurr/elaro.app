import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { initSentry, captureException } from '../_shared/sentry.ts';

serve(async req => {
  // This is needed for browser-based invocations.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Initialize Sentry for error monitoring
  initSentry();
  try {
    // Create a Supabase client with the Auth context of the user.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      },
    );

    // Get the user from the auth header.
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Fetch the user's streak information.
    const { data: streakData, error: streakError } = await supabaseClient
      .from('streaks')
      .select('current_streak, longest_streak')
      .eq('user_id', user.id)
      .single();
    // .single() expects exactly one row or returns an error.
    if (streakError) {
      // If the error is because no row was found, that's not a server error.
      // It just means the user hasn't started a streak yet.
      if (streakError.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ current_streak: 0, longest_streak: 0 }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        );
      }
      // For any other error, we throw it to be caught by Sentry.
      throw streakError;
    }

    // If data is null but there was no error, default to 0.
    const responseData = streakData || { current_streak: 0, longest_streak: 0 };
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    // Capture the error with Sentry and return a generic error response.
    captureException(error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
