import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createWebhookHandler } from '../_shared/function-handler.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

async function handlePaystackWebhook(supabaseAdmin: SupabaseClient, payload: any, eventType: string) {
  console.log('Received Paystack event:', eventType);

  if (eventType === 'charge.success') {
    const customerEmail = payload.data.customer.email;
    console.log(`Processing successful charge for ${customerEmail}`);

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', customerEmail)
      .single();

    if (userError || !user) {
      console.error(`Webhook Error: User with email ${customerEmail} not found.`);
      return { status: 'User not found, but event acknowledged.' };
    }

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30); // Assume 30-day subscription

    const { error: updateError } = await supabaseAdmin
      .from('users') // Assuming subscription info is on the users table
      .update({
        subscription_tier: 'oddity',
        subscription_expires_at: expirationDate.toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error(`Webhook Error: Failed to update profile for user ${user.id}`, updateError);
      throw new Error('Failed to update user subscription.');
    }

    console.log(`Subscription for user ${user.id} successfully updated.`);
    return { status: 'success' };
  }

  return { status: 'acknowledged' };
}

serve(createWebhookHandler(handlePaystackWebhook, {
  secretKeyEnvVar: 'PAYSTACK_SECRET_KEY',
  signatureHeader: 'x-paystack-signature',
}));
