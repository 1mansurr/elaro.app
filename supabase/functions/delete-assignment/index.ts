// Create this new Edge Function to handle securely deleting an assignment.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';

serve(async (req ) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const { assignmentId } = await req.json();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Apply rate limiting check
    try {
      await checkRateLimit(supabase, user.id, 'delete-assignment');
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

    // Delete the assignment, ensuring the user_id matches.
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to delete assignment: ${error.message}`);
    }

    return new Response(JSON.stringify({ message: 'Assignment deleted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
