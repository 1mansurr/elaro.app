import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { CustomerInfo } from 'https://esm.sh/react-native-purchases@7.0.0';

interface UpdateSubscriptionRequest {
  customerInfo: CustomerInfo;
  userId?: string;
}

async function handleUpdateSubscription({ user, body }: AuthenticatedRequest) {
  const { customerInfo, userId } = body as UpdateSubscriptionRequest;
  
  // Use the userId from the request body if provided, otherwise use the authenticated user
  const targetUserId = userId || user.id;
  
  if (!customerInfo) {
    throw new AppError('Customer info is required', 400, 'MISSING_CUSTOMER_INFO');
  }

  console.log(`Updating subscription for user ${targetUserId}`);

  try {
    // Determine subscription tier based on active entitlements
    let subscriptionTier = 'free';
    let expirationDate: string | null = null;

    // Check if user has oddity entitlement
    if (customerInfo.entitlements.active['oddity']) {
      subscriptionTier = 'oddity';
      const oddityEntitlement = customerInfo.entitlements.active['oddity'];
      expirationDate = oddityEntitlement.expirationDate;
    }

    // Update user subscription in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_tier: subscriptionTier,
        subscription_expires_at: expirationDate,
      })
      .eq('id', targetUserId);

    if (updateError) {
      console.error(`Failed to update subscription for user ${targetUserId}:`, updateError);
      throw new AppError('Failed to update user subscription', 500, 'DB_UPDATE_ERROR');
    }

    console.log(`Successfully updated subscription for user ${targetUserId} to ${subscriptionTier}`);
    
    return {
      success: true,
      message: 'Subscription updated successfully',
      subscriptionTier,
      expirationDate,
    };
  } catch (error) {
    console.error(`Error updating subscription for user ${targetUserId}:`, error);
    throw error;
  }
}

serve(createAuthenticatedHandler(
  handleUpdateSubscription,
  {
    method: 'POST',
    schema: {
      body: {
        type: 'object',
        properties: {
          customerInfo: { type: 'object' },
          userId: { type: 'string' }
        },
        required: ['customerInfo']
      }
    }
  }
));
