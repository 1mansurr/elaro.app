import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req ) => {
  // This function is public and does not require authentication,
  // as it's used during the onboarding process before a user might be fully logged in.
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { username } = await req.json();

    if (!username) {
      return new Response(JSON.stringify({ error: 'Username is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if the username exists in the users table.
    // We convert both to lowercase to ensure case-insensitive uniqueness.
    const { count, error } = await supabaseClient
      .from('users')
      .select('username', { count: 'exact', head: true })
      .ilike('username', username);

    if (error) {
      throw error;
    }

    const isAvailable = count === 0;

    return new Response(JSON.stringify({ isAvailable }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error checking username availability:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
