import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req ) => {
  // This function requires the user to be authenticated.
  const authHeader = req.headers.get('Authorization')!;
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { firstName, lastName, university, program } = await req.json();

    // We are not allowing username changes for now.
    const updates = {
      first_name: firstName,
      last_name: lastName,
      university: university,
      program: program,
      updated_at: new Date().toISOString(), // Manually update the timestamp
    };

    const { error } = await supabaseClient
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ message: 'Profile updated successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
