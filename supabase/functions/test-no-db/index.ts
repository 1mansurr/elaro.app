// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  console.log('Test no-db function called');
  const origin = req.headers.get('Origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }

  try {
    console.log('Creating Supabase client');
    // @ts-expect-error - Deno global is available at runtime
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    // @ts-expect-error - Deno global is available at runtime
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
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
        headers: {
          ...getCorsHeaders(origin),
          'Content-Type': 'application/json',
        },
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
      headers: {
        ...getCorsHeaders(origin),
        'Content-Type': 'application/json',
      },
      status: 200,
    });
  } catch (error: unknown) {
    console.error('Error in test no-db function:', error);
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    const errorDetails =
      error instanceof Error ? error.toString() : String(error);
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorDetails,
      }),
      {
        headers: {
          ...getCorsHeaders(origin),
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    );
  }
});
