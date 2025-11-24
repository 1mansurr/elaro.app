import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

serve(async req => {
  console.log('Test no-db function called');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Creating Supabase client');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      },
    );

    console.log('Getting user');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log('User:', user?.id || 'No user');

    if (!user) {
      console.log('No user, returning unauthorized');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    console.log('Returning success response');
    const responseData = {
      nextUpcomingTask: null,
      todayOverview: {
        lectures: 0,
        study_sessions: 0,
        assignments: 0,
        reviews: 0,
      },
      weeklyTaskCount: 0,
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in test no-db function:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
