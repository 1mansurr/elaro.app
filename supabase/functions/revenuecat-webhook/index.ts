import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createWebhookHandler } from '../_shared/function-handler.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

interface RevenueCatWebhookPayload {
  api_version: string;
  event: {
    id: string;
    type: string;
    app_user_id: string;
    original_app_user_id: string;
    product_id: string;
    period_type: string;
    purchased_at_ms: number;
    expiration_at_ms?: number;
    environment: string;
    entitlement_id?: string;
    entitlement_ids?: string[];
    presented_offering_id?: string;
    transaction_id: string;
    original_transaction_id: string;
    is_family_share: boolean;
    country_code: string;
    app_id: string;
    offer_code?: string;
    currency: string;
    price: number;
    price_in_purchased_currency: number;
    subscriber_attributes: Record<string, any>;
    store: string;
    takehome_percentage: number;
    commission_percentage: number;
  };
}

async function handleRevenueCatWebhook(
  supabaseAdmin: SupabaseClient, 
  payload: RevenueCatWebhookPayload, 
  eventType: string
) {
  console.log('📬 Received RevenueCat webhook event:', eventType);
  console.log('👤 User ID:', payload.event.app_user_id);
  console.log('🛍️ Product ID:', payload.event.product_id);
  console.log('🎫 Entitlements:', payload.event.entitlement_ids);

  const { app_user_id, product_id, expiration_at_ms, entitlement_ids } = payload.event;

  // Validate required fields
  if (!app_user_id) {
    console.error('❌ No app_user_id in RevenueCat webhook');
    return { status: 'error', message: 'Missing app_user_id' };
  }

  try {
    // Determine subscription tier based on entitlements
    let subscriptionTier = 'free';
    let expirationDate: Date | null = null;

    // Check if user has oddity entitlement
    const hasOddityEntitlement = 
      entitlement_ids?.includes('oddity') || 
      payload.event.entitlement_id === 'oddity';

    if (hasOddityEntitlement) {
      subscriptionTier = 'oddity';
      
      // Set expiration date if provided
      if (expiration_at_ms) {
        expirationDate = new Date(expiration_at_ms);
      } else {
        // Fallback: calculate expiration based on product type (monthly subscription)
        expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      }
      
      console.log(`✅ User ${app_user_id} has active Oddity subscription`);
      console.log(`📅 Expires at: ${expirationDate?.toISOString()}`);
    }

    // Handle different event types
    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
        console.log(`💰 Processing ${eventType} for user ${app_user_id}, product ${product_id}`);
        
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            subscription_tier: subscriptionTier,
            subscription_expires_at: expirationDate?.toISOString() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', app_user_id);

        if (updateError) {
          console.error(`❌ Webhook Error: Failed to update subscription for user ${app_user_id}`, updateError);
          throw new Error('Failed to update user subscription.');
        }

        console.log(`✅ Subscription for user ${app_user_id} successfully updated to ${subscriptionTier}`);
        return { 
          status: 'success', 
          message: 'Subscription updated successfully',
          subscriptionTier,
          expirationDate: expirationDate?.toISOString() 
        };

      case 'CANCELLATION':
      case 'EXPIRATION':
      case 'BILLING_ISSUE':
        console.log(`⚠️ Processing ${eventType} for user ${app_user_id}`);

        const { error: cancelError } = await supabaseAdmin
          .from('users')
          .update({
            subscription_tier: 'free',
            subscription_expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', app_user_id);

        if (cancelError) {
          console.error(`❌ Webhook Error: Failed to cancel subscription for user ${app_user_id}`, cancelError);
          throw new Error('Failed to cancel user subscription.');
        }

        console.log(`✅ User ${app_user_id} subscription cancelled/expired`);
        return { 
          status: 'success', 
          message: 'Subscription cancelled successfully' 
        };

      case 'NON_RENEWING_PURCHASE':
        console.log(`📦 Processing non-renewing purchase for user ${app_user_id}, product ${product_id}`);
        return { 
          status: 'acknowledged', 
          message: 'Non-renewing purchase acknowledged' 
        };

      case 'TRANSFER':
        console.log(`🔄 Processing subscription transfer for user ${app_user_id}`);
        return { 
          status: 'acknowledged', 
          message: 'Subscription transfer acknowledged' 
        };

      default:
        console.log(`ℹ️ Unhandled RevenueCat event type: ${eventType}`);
        return { 
          status: 'acknowledged', 
          message: 'Event acknowledged but not processed' 
        };
    }
  } catch (error) {
    console.error(`❌ Error processing RevenueCat webhook for user ${app_user_id}:`, error);
    throw error;
  }
}

// Initialize webhook handler with proper configuration
serve(createWebhookHandler(handleRevenueCatWebhook, {
  secretKeyEnvVar: 'REVENUECAT_AUTH_HEADER_SECRET',
  headerName: 'authorization'
}));
