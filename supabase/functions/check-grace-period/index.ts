import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendPushNotification } from '../_shared/send-push-notification.ts';

async function handleGracePeriodCheck(supabaseAdmin: any) {
  console.log('🔍 Checking for users in grace period...');
  try {
    const { data: activeUsers, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, subscription_expires_at')
      .eq('subscription_tier', 'oddity')
      .not('subscription_expires_at', 'is', null);

    if (fetchError) throw fetchError;

    let notifiedCount = 0;
    for (const user of activeUsers) {
      const revenueCatApiKey = Deno.env.get('REVENUECAT_API_KEY');
      const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${user.id}`, {
        headers: { 'Authorization': `Bearer ${revenueCatApiKey}` },
      });

      if (!response.ok) {
        console.error(`Failed to fetch RevenueCat data for user ${user.id}`);
        continue;
      }

      const rcData = await response.json();
      const oddityEntitlement = rcData?.subscriber?.entitlements?.oddity;

      if (oddityEntitlement?.is_in_grace_period) {
        const { data: devices } = await supabaseAdmin.from('user_devices').select('push_token').eq('user_id', user.id);
        if (devices && devices.length > 0) {
          const tokens = devices.map(d => d.push_token).filter(Boolean);
          const expirationDate = new Date(oddityEntitlement.expires_date).toLocaleDateString();
          await sendPushNotification(
            supabaseAdmin,
            tokens,
            '⚠️ Payment Issue',
            `Your ELARO subscription payment failed. Please update your payment method by ${expirationDate} to keep your Oddity access.`,
            { type: 'grace_period_warning', userId: user.id }
          );
          notifiedCount++;
        }
      }
    }
    return { success: true, message: `Grace period check completed. Notified ${notifiedCount} users.` };
  } catch (error) {
    console.error('Error in grace period check:', error);
    throw error;
  }
}

serve(createScheduledHandler(handleGracePeriodCheck, { 
  requireSecret: true, 
  secretEnvVar: 'CRON_SECRET' 
}));

