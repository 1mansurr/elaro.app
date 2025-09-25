// Create this new Edge Function to handle securely deleting a lecture.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req ) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const { lectureId } = await req.json();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Delete the lecture, ensuring the user_id matches.
    // RLS policies will also enforce this, but it's good practice to be explicit.
    const { error } = await supabase
      .from('lectures')
      .delete()
      .eq('id', lectureId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to delete lecture: ${error.message}`);
    }

    return new Response(JSON.stringify({ message: 'Lecture deleted successfully' }), {
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
