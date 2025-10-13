import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';

serve(async (req) => {
  try {
    const supabase = createSupabaseClient(req);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not authenticated' }), { status: 401 });
    }

    // Set a long expiration date for the free premium access, e.g., 100 years from now.
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 100);

    const { data, error } = await supabase
      .from('users')
      .update({
        subscription_tier: 'oddity',
        subscription_status: 'active',
        subscription_expires_at: expirationDate.toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ message: 'Premium access granted successfully.', user: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
