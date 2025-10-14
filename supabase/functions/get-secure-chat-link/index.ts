import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { corsHeaders } from '../_shared/cors.ts';
import * as hmac from 'https://deno.land/x/hmac@v2.0.1/mod.ts';

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 1. Get the currently authenticated user
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // 2. Fetch the user's profile to get their name and email
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      throw new Error('Could not retrieve user profile.');
    }

    // 3. Retrieve the secret API key from Supabase secrets
    const apiKey = Deno.env.get('TAWK_TO_API_KEY');
    if (!apiKey) {
      throw new Error('TAWK_TO_API_KEY is not set in Supabase secrets.');
    }

    const userId = user.id; // Using user ID for a stable, unique identifier
    const userName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email;
    const userEmail = userProfile.email;

    // 4. Generate the HMAC-SHA256 hash
    const hash = hmac.hmac('sha256', apiKey, userId, 'hex');

    // 5. Construct the secure URL
    const tawkToChatId = '685fb69800ff9419109c4db9/default'; // Your Tawk.to chat ID
    const secureUrl = `https://tawk.to/chat/${tawkToChatId}?$name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}&userId=${encodeURIComponent(userId)}&hash=${hash}`;

    return new Response(JSON.stringify({ secureUrl }), {
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
